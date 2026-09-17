export type Member = { id: string; name: string };
export type SplitMode = "equal" | "amount" | "percent";
export type Expense = {
  id: string;
  name: string;
  amount: number;
  payerId: string;
  category: string;
  date: string;
  mode: SplitMode;
  shares: Record<string, number>;
  inputs: Record<string, string>;
};
export type Settlement = {
  id: string;
  from: string;
  to: string;
  amount: number;
  paidAt: string;
};
export type Trip = {
  id: string;
  name: string;
  date: string;
  members: Member[];
  expenses: Expense[];
  settlements: Settlement[];
};
export const uid = () => crypto.randomUUID();
export const money = (cents: number) =>
  new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(cents) ? cents / 100 : 0);
export function parseAmount(value: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim()))
    throw new Error("กรอกจำนวนเงินให้ถูกต้อง (ทศนิยมไม่เกิน 2 ตำแหน่ง)");
  const amount = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(amount) || amount > 10000000000)
    throw new Error("จำนวนเงินมากเกินไป");
  return amount;
}
export function splitAmount(
  amount: number,
  ids: string[],
  mode: SplitMode,
  values: Record<string, string> = {},
): Record<string, number> {
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 10000000000)
    throw new Error("จำนวนเงินต้องมากกว่า 0 และไม่เกิน 100 ล้านบาท");
  if (!ids.length || new Set(ids).size !== ids.length)
    throw new Error("เลือกสมาชิกที่ต้องหารอย่างน้อย 1 คน");
  if (mode === "equal")
    return Object.fromEntries(
      ids.map((id, i) => [
        id,
        Math.floor(amount / ids.length) + (i < amount % ids.length ? 1 : 0),
      ]),
    );
  if (mode === "amount") {
    const shares = Object.fromEntries(
      ids.map((id) => [id, parseAmount(values[id] || "0")]),
    );
    if (Object.values(shares).reduce((a, b) => a + b, 0) !== amount)
      throw new Error("ผลรวมที่แบ่งต้องตรงกับยอดค่าใช้จ่ายทั้งหมด");
    return shares;
  }
  if (mode !== "percent") throw new Error("รูปแบบการหารไม่ถูกต้อง");
  const weights = ids.map((id) => parseAmount(values[id] || "0"));
  if (weights.reduce((a, b) => a + b, 0) !== 10000)
    throw new Error("ผลรวมเปอร์เซ็นต์ต้องเท่ากับ 100%");
  const shares = weights.map((w) => Math.floor((amount * w) / 10000));
  let remainder = amount - shares.reduce((a, b) => a + b, 0);
  const order = weights
    .map((w, i) => ({ i, fraction: (amount * w) % 10000 }))
    .sort((a, b) => b.fraction - a.fraction);
  for (const item of order) {
    if (remainder-- > 0) shares[item.i]++;
  }
  return Object.fromEntries(ids.map((id, i) => [id, shares[i]]));
}
export function balances(trip: Trip) {
  return trip.members.map((member) => {
    const paid = trip.expenses
      .filter((e) => e.payerId === member.id)
      .reduce((n, e) => n + e.amount, 0);
    const owed = trip.expenses.reduce(
      (n, e) => n + (e.shares[member.id] || 0),
      0,
    );
    const sent = trip.settlements
      .filter((s) => s.from === member.id)
      .reduce((n, s) => n + s.amount, 0);
    const received = trip.settlements
      .filter((s) => s.to === member.id)
      .reduce((n, s) => n + s.amount, 0);
    return {
      ...member,
      paid,
      owed,
      net: paid - owed,
      remaining: paid - owed + sent - received,
    };
  });
}
export function simplify(trip: Trip) {
  const entries = balances(trip);
  const creditors = entries
    .filter((m) => m.remaining > 0)
    .map((m) => ({ id: m.id, amount: m.remaining }));
  const debtors = entries
    .filter((m) => m.remaining < 0)
    .map((m) => ({ id: m.id, amount: -m.remaining }));
  const transfers: { from: string; to: string; amount: number }[] = [];
  // Exact matches first, then largest balances. At most n-1 transfers; no floating-point money.
  while (creditors.length && debtors.length) {
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);
    let ci = 0,
      di = 0;
    outer: for (let i = 0; i < creditors.length; i++)
      for (let j = 0; j < debtors.length; j++)
        if (creditors[i].amount === debtors[j].amount) {
          ci = i;
          di = j;
          break outer;
        }
    const c = creditors[ci],
      d = debtors[di],
      amount = Math.min(c.amount, d.amount);
    transfers.push({ from: d.id, to: c.id, amount });
    c.amount -= amount;
    d.amount -= amount;
    if (!c.amount) creditors.splice(ci, 1);
    if (!d.amount) debtors.splice(di, 1);
  }
  return transfers;
}
export function validateTrips(input: unknown): asserts input is Trip[] {
  if (!Array.isArray(input) || input.length > 100)
    throw new Error("ข้อมูลทริปไม่ถูกต้อง");
  const allIds = new Set<string>();
  const id = (v: unknown) => {
    if (
      typeof v !== "string" ||
      !/^[a-zA-Z0-9-]{1,80}$/.test(v) ||
      allIds.has(v)
    )
      throw new Error("รหัสข้อมูลไม่ถูกต้องหรือซ้ำกัน");
    allIds.add(v);
  };
  const label = (v: unknown) => {
    if (typeof v !== "string" || !v.trim() || v.length > 120)
      throw new Error("ชื่อไม่ถูกต้อง");
  };
  const date = (v: unknown) => {
    if (
      typeof v !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
      Number.isNaN(Date.parse(v))
    )
      throw new Error("วันที่ไม่ถูกต้อง");
  };
  for (const t of input as Trip[]) {
    id(t.id);
    label(t.name);
    date(t.date);
    if (
      !Array.isArray(t.members) ||
      !t.members.length ||
      t.members.length > 50 ||
      !Array.isArray(t.expenses) ||
      t.expenses.length > 2000 ||
      !Array.isArray(t.settlements) ||
      t.settlements.length > 5000
    )
      throw new Error("จำนวนข้อมูลไม่ถูกต้อง");
    const memberIds = new Set(
      t.members.map((m) => {
        id(m.id);
        label(m.name);
        return m.id;
      }),
    );
    for (const e of t.expenses) {
      id(e.id);
      label(e.name);
      date(e.date);
      label(e.category);
      if (
        !memberIds.has(e.payerId) ||
        !e.shares ||
        typeof e.shares !== "object" ||
        !e.inputs ||
        typeof e.inputs !== "object"
      )
        throw new Error("สมาชิกหรือข้อมูลการหารไม่ถูกต้อง");
      const ids = Object.keys(e.shares);
      if (ids.some((i) => !memberIds.has(i))) throw new Error("ไม่พบสมาชิก");
      const computed = splitAmount(e.amount, ids, e.mode, e.inputs);
      if (ids.some((i) => computed[i] !== e.shares[i]))
        throw new Error("ยอดแบ่งไม่ถูกต้อง");
    }
    for (const s of t.settlements) {
      id(s.id);
      if (
        !memberIds.has(s.from) ||
        !memberIds.has(s.to) ||
        s.from === s.to ||
        !Number.isSafeInteger(s.amount) ||
        s.amount <= 0 ||
        s.amount > 10000000000 ||
        typeof s.paidAt !== "string" ||
        Number.isNaN(Date.parse(s.paidAt))
      )
        throw new Error("ข้อมูลการชำระเงินไม่ถูกต้อง");
    }
  }
}
export function demoTrip(): Trip {
  const members = ["โอ", "ต้น", "บอล", "ฝน"].map((name, i) => ({
    id: "demo-member-" + i,
    name,
  }));
  const rows = [
    ["อาหารเย็น", 120000, 0, "food", 4],
    ["ค่าน้ำมัน", 80000, 1, "travel", 4],
    ["โรงแรม", 240000, 2, "hotel", 4],
    ["กาแฟ", 60000, 0, "coffee", 3],
  ] as const;
  return {
    id: "demo-chiangmai",
    name: "เที่ยวเชียงใหม่",
    date: "2026-09-17",
    members,
    settlements: [],
    expenses: rows.map(([name, amount, payer, category, count], i) => ({
      id: "demo-expense-" + i,
      name,
      amount,
      payerId: members[payer].id,
      category,
      date: "2026-09-17",
      mode: "equal",
      shares: splitAmount(
        amount,
        members.slice(0, count).map((m) => m.id),
        "equal",
      ),
      inputs: {},
    })),
  };
}
