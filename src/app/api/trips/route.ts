import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { getPool } from "@/lib/db";
import { validateTrips, type Trip } from "@/lib/engine";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function identity(request: NextRequest) {
  const raw = request.cookies.get("harnkan_session")?.value;
  const token =
    raw && /^[a-f0-9]{64}$/.test(raw) ? raw : randomBytes(32).toString("hex");
  return { token, id: createHash("sha256").update(token).digest("hex") };
}
function respond(data: unknown, token?: string, status = 200) {
  const response = NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
  if (token)
    response.cookies.set("harnkan_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  return response;
}
export async function GET(request: NextRequest) {
  if (!process.env.DATABASE_URL) return respond({ mode: "local" });
  const { id, token } = identity(request);
  const client = await getPool()
    .connect()
    .catch(() => null);
  if (!client)
    return respond({ error: "เชื่อมต่อฐานข้อมูลไม่ได้" }, undefined, 503);
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ");
    await client.query(
      "INSERT INTO users(id) VALUES($1) ON CONFLICT DO NOTHING",
      [id],
    );
    const user = await client.query("SELECT revision FROM users WHERE id=$1", [
      id,
    ]);
    const groups = await client.query(
      "SELECT id,name,to_char(date,'YYYY-MM-DD') AS date FROM groups WHERE owner_id=$1 ORDER BY position",
      [id],
    );
    const members = await client.query(
      "SELECT group_id,id,name FROM group_members WHERE owner_id=$1 ORDER BY position",
      [id],
    );
    const expenses = await client.query(
      "SELECT *,to_char(date,'YYYY-MM-DD') AS date FROM expenses WHERE owner_id=$1 ORDER BY position",
      [id],
    );
    const shares = await client.query(
      "SELECT * FROM expense_participants WHERE owner_id=$1 ORDER BY position",
      [id],
    );
    const settlements = await client.query(
      "SELECT * FROM settlements WHERE owner_id=$1 ORDER BY position",
      [id],
    );
    const trips: Trip[] = groups.rows.map((g) => ({
      ...g,
      members: members.rows
        .filter((m) => m.group_id === g.id)
        .map((m) => ({ id: m.id, name: m.name })),
      expenses: expenses.rows
        .filter((e) => e.group_id === g.id)
        .map((e) => ({
          id: e.id,
          name: e.name,
          amount: Number(e.amount),
          payerId: e.payer_id,
          category: e.category,
          date: e.date,
          mode: e.split_mode,
          inputs: e.split_inputs,
          shares: Object.fromEntries(
            shares.rows
              .filter((s) => s.group_id === g.id && s.expense_id === e.id)
              .map((s) => [s.member_id, Number(s.amount)]),
          ),
        })),
      settlements: settlements.rows
        .filter((s) => s.group_id === g.id)
        .map((s) => ({
          id: s.id,
          from: s.from_member_id,
          to: s.to_member_id,
          amount: Number(s.amount),
          paidAt: new Date(s.paid_at).toISOString(),
        })),
    }));
    validateTrips(trips);
    await client.query("COMMIT");
    return respond(
      { mode: "postgres", version: user.rows[0].revision, trips },
      token,
    );
  } catch {
    await client.query("ROLLBACK");
    return respond(
      { error: "อ่านข้อมูลไม่สำเร็จ ตรวจสอบการตั้งค่าฐานข้อมูล" },
      undefined,
      503,
    );
  } finally {
    client.release();
  }
}
export async function PUT(request: NextRequest) {
  if (!process.env.DATABASE_URL)
    return respond({ error: "ยังไม่ได้เชื่อมต่อฐานข้อมูล" }, undefined, 503);
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).host !== request.headers.get("host"))
    return respond({ error: "Invalid origin" }, undefined, 403);
  if (!request.cookies.get("harnkan_session")?.value)
    return respond({ error: "Session required" }, undefined, 401);
  let input: { trips: Trip[]; version: number };
  try {
    if (Number(request.headers.get("content-length") || 0) > 5000000)
      return respond({ error: "ข้อมูลใหญ่เกินไป" }, undefined, 413);
    const raw = await request.text();
    if (raw.length > 5000000)
      return respond({ error: "ข้อมูลใหญ่เกินไป" }, undefined, 413);
    input = JSON.parse(raw);
    validateTrips(input.trips);
    if (!Number.isSafeInteger(input.version) || input.version < 0)
      throw new Error("Invalid version");
  } catch (e) {
    return respond(
      { error: e instanceof Error ? e.message : "ข้อมูลไม่ถูกต้อง" },
      undefined,
      400,
    );
  }
  const { id } = identity(request);
  const client = await getPool()
    .connect()
    .catch(() => null);
  if (!client)
    return respond({ error: "เชื่อมต่อฐานข้อมูลไม่ได้" }, undefined, 503);
  try {
    await client.query("BEGIN");
    const user = await client.query(
      "SELECT revision FROM users WHERE id=$1 FOR UPDATE",
      [id],
    );
    if (!user.rows.length) {
      await client.query("ROLLBACK");
      return respond({ error: "Session not found" }, undefined, 401);
    }
    if (user.rows[0].revision !== input.version) {
      await client.query("ROLLBACK");
      return respond(
        { error: "ข้อมูลถูกแก้ไขจากหน้าต่างอื่น" },
        undefined,
        409,
      );
    }
    await client.query("DELETE FROM groups WHERE owner_id=$1", [id]);
    for (const [gi, g] of input.trips.entries()) {
      await client.query(
        "INSERT INTO groups(owner_id,id,name,date,position) VALUES($1,$2,$3,$4,$5)",
        [id, g.id, g.name, g.date, gi],
      );
      for (const [mi, m] of g.members.entries())
        await client.query(
          "INSERT INTO group_members(owner_id,group_id,id,name,position) VALUES($1,$2,$3,$4,$5)",
          [id, g.id, m.id, m.name, mi],
        );
      for (const [ei, e] of g.expenses.entries()) {
        await client.query(
          "INSERT INTO expenses(owner_id,group_id,id,name,amount,payer_id,category,date,split_mode,split_inputs,position) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
          [
            id,
            g.id,
            e.id,
            e.name,
            e.amount,
            e.payerId,
            e.category,
            e.date,
            e.mode,
            JSON.stringify(e.inputs),
            ei,
          ],
        );
        for (const [si, [mid, amount]] of Object.entries(e.shares).entries())
          await client.query(
            "INSERT INTO expense_participants(owner_id,group_id,expense_id,member_id,amount,position) VALUES($1,$2,$3,$4,$5,$6)",
            [id, g.id, e.id, mid, amount, si],
          );
      }
      for (const [si, s] of g.settlements.entries())
        await client.query(
          "INSERT INTO settlements(owner_id,group_id,id,from_member_id,to_member_id,amount,paid_at,position) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
          [id, g.id, s.id, s.from, s.to, s.amount, s.paidAt, si],
        );
    }
    await client.query("UPDATE users SET revision=revision+1 WHERE id=$1", [
      id,
    ]);
    await client.query("COMMIT");
    return respond({ version: input.version + 1 });
  } catch {
    await client.query("ROLLBACK");
    return respond(
      { error: "บันทึกไม่สำเร็จ ไม่มีข้อมูลถูกเปลี่ยนแปลง" },
      undefined,
      500,
    );
  } finally {
    client.release();
  }
}
