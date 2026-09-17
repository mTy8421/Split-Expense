import { test } from "node:test";
import assert from "node:assert/strict";
import {
  splitAmount,
  demoTrip,
  balances,
  simplify,
  parseAmount,
  validateTrips,
} from "../src/lib/engine";
test("Chiang Mai: exact paid, owed and net amounts", () => {
  const trip = demoTrip();
  validateTrips([trip]);
  assert.deepEqual(
    balances(trip).map((m) => [m.paid, m.owed, m.net]),
    [
      [180000, 130000, 50000],
      [80000, 130000, -50000],
      [240000, 130000, 110000],
      [0, 110000, -110000],
    ],
  );
  assert.equal(simplify(trip).length, 2);
  for (const [i, t] of simplify(trip).entries())
    trip.settlements.push({
      ...t,
      id: "payment-" + i,
      paidAt: new Date().toISOString(),
    });
  assert.ok(balances(trip).every((m) => m.remaining === 0));
  assert.deepEqual(simplify(trip), []);
});
test("remainder is conserved, even with fractional percentages", () => {
  assert.deepEqual(
    Object.values(splitAmount(100, ["a", "b", "c"], "equal")),
    [34, 33, 33],
  );
  assert.deepEqual(
    Object.values(
      splitAmount(101, ["a", "b", "c"], "percent", {
        a: "33.33",
        b: "33.33",
        c: "33.34",
      }),
    ),
    [34, 33, 34],
  );
  assert.deepEqual(
    splitAmount(100000, ["a", "b", "c", "d"], "amount", {
      a: "400",
      b: "300",
      c: "200",
      d: "100",
    }),
    { a: 40000, b: 30000, c: 20000, d: 10000 },
  );
});
test("invalid money and incomplete splits are rejected", () => {
  for (const value of ["NaN", "Infinity", "-1", "1.001", "1e3", ""])
    assert.throws(() => parseAmount(value));
  assert.throws(() => splitAmount(0, ["a"], "equal"));
  assert.throws(() => splitAmount(-1, ["a"], "equal"));
  assert.throws(() => splitAmount(100, [], "equal"));
  assert.throws(() => splitAmount(100, ["a"], "amount", { a: "0.99" }));
  assert.throws(() => splitAmount(100, ["a"], "percent", { a: "99" }));
  const t = demoTrip();
  t.expenses[0].payerId = "missing";
  assert.throws(() => validateTrips([t]));
});
test("settled payments survive subsequent expense changes", () => {
  const t = demoTrip();
  const p = simplify(t)[0];
  t.settlements.push({ ...p, id: "paid", paidAt: new Date().toISOString() });
  const expense = t.expenses[0];
  expense.amount = 120001;
  expense.shares = splitAmount(
    expense.amount,
    t.members.map((m) => m.id),
    "equal",
  );
  for (const [i, p] of simplify(t).entries())
    t.settlements.push({
      ...p,
      id: "extra-" + i,
      paidAt: new Date().toISOString(),
    });
  assert.ok(balances(t).every((m) => m.remaining === 0));
});
test("random trips conserve every satang and settle completely", () => {
  for (let k = 1; k <= 100; k++) {
    const t = demoTrip();
    t.settlements = [];
    t.expenses = t.expenses.map((e, i) => ({
      ...e,
      amount: k * 137 + i + 1,
      shares: splitAmount(
        k * 137 + i + 1,
        t.members.map((m) => m.id),
        "equal",
      ),
    }));
    const transfers = simplify(t);
    assert.ok(transfers.length <= t.members.length - 1);
    assert.equal(
      balances(t).reduce((n, m) => n + m.net, 0),
      0,
    );
    transfers.forEach((p, i) =>
      t.settlements.push({
        ...p,
        id: "p-" + i,
        paidAt: new Date().toISOString(),
      }),
    );
    assert.ok(balances(t).every((m) => m.remaining === 0));
  }
});
