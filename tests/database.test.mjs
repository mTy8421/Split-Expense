import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("PostgreSQL schema: tenant isolation, foreign keys, transactional replacement and rollback", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      await readFile(
        new URL("../database/schema.sql", import.meta.url),
        "utf8",
      ),
    );
    await db.exec("INSERT INTO users(id) VALUES ('a'),('b')");
    for (const owner of ["a", "b"]) {
      await db.query(
        "INSERT INTO groups(owner_id,id,name,date,position) VALUES($1,'same-trip','Trip','2026-09-17',0)",
        [owner],
      );
      for (const [i, member] of ["m1", "m2"].entries())
        await db.query(
          "INSERT INTO group_members(owner_id,group_id,id,name,position) VALUES($1,'same-trip',$2,$2,$3)",
          [owner, member, i],
        );
      await db.query(
        "INSERT INTO expenses(owner_id,group_id,id,name,amount,payer_id,category,date,split_mode,position) VALUES($1,'same-trip','e1','Dinner',10000,'m1','food','2026-09-17','equal',0)",
        [owner],
      );
      for (const [i, member] of ["m1", "m2"].entries())
        await db.query(
          "INSERT INTO expense_participants(owner_id,group_id,expense_id,member_id,amount,position) VALUES($1,'same-trip','e1',$2,5000,$3)",
          [owner, member, i],
        );
      await db.query(
        "INSERT INTO settlements(owner_id,group_id,id,from_member_id,to_member_id,amount,paid_at,position) VALUES($1,'same-trip','s1','m2','m1',5000,now(),0)",
        [owner],
      );
    }
    assert.equal(
      (await db.query("SELECT * FROM groups WHERE owner_id='a'")).rows.length,
      1,
    );
    await assert.rejects(() =>
      db.exec("DELETE FROM group_members WHERE owner_id='a' AND id='m1'"),
    );
    assert.equal(
      (await db.query("SELECT * FROM group_members WHERE owner_id='a'")).rows
        .length,
      2,
    );
    await db.transaction(async (tx) => {
      await tx.query("DELETE FROM groups WHERE owner_id=$1", ["a"]);
      await tx.query("UPDATE users SET revision=revision+1 WHERE id=$1", ["a"]);
    });
    for (const table of [
      "groups",
      "group_members",
      "expenses",
      "expense_participants",
      "settlements",
    ]) {
      assert.equal(
        (await db.query("SELECT * FROM " + table + " WHERE owner_id='a'")).rows
          .length,
        0,
      );
      assert.ok(
        (await db.query("SELECT * FROM " + table + " WHERE owner_id='b'")).rows
          .length > 0,
      );
    }
    await assert.rejects(() =>
      db.transaction(async (tx) => {
        await tx.exec("DELETE FROM groups WHERE owner_id='b'");
        throw new Error("simulate write failure");
      }),
    );
    assert.equal(
      (await db.query("SELECT * FROM expenses WHERE owner_id='b'")).rows.length,
      1,
    );
    assert.equal(
      (await db.query("SELECT revision FROM users WHERE id='a'")).rows[0]
        .revision,
      1,
    );
  } finally {
    await db.close();
  }
});
