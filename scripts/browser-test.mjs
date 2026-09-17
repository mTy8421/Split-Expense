import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto("http://localhost:3000");
  await page
    .getByRole("heading", { name: "แบ่งค่าใช้จ่ายกับเพื่อนง่าย ๆ" })
    .waitFor();
  await page.evaluate(() => document.fonts.ready);
  await mkdir("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
  assert.equal(await page.locator(".expense-row").count(), 4);
  assert.equal(await page.locator(".transfer-card").count(), 2);
  assert.equal(
    await page.locator(".stat-card").first().locator("strong").textContent(),
    "฿5,000.00",
  );
  await page
    .getByRole("button", { name: "เพิ่มค่าใช้จ่าย", exact: true })
    .click();
  await page.getByLabel("จำนวนเงินทั้งหมด").fill("1000");
  await page.getByPlaceholder("เช่น ค่าอาหารเย็น").fill("ค่าอาหารทดสอบ");
  await page.getByRole("button", { name: "กำหนดยอด", exact: true }).click();
  for (const [name, value] of [
    ["โอ", "400"],
    ["ต้น", "300"],
    ["บอล", "200"],
    ["ฝน", "99"],
  ])
    await page.getByLabel("ส่วนแบ่งของ" + name).fill(value);
  await page
    .getByRole("button", { name: "บันทึกค่าใช้จ่าย", exact: true })
    .click();
  assert.match(await page.locator(".form-error").innerText(), /ผลรวม/);
  await page.getByLabel("ส่วนแบ่งของฝน").fill("100");
  await page
    .getByRole("button", { name: "บันทึกค่าใช้จ่าย", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  assert.equal(await page.locator(".expense-row").count(), 5);
  await page
    .locator(".expense-row")
    .filter({ hasText: "ค่าอาหารทดสอบ" })
    .click();
  await page.getByRole("button", { name: "แก้ไขรายการ", exact: true }).click();
  await page.getByRole("button", { name: "เปอร์เซ็นต์", exact: true }).click();
  for (const [name, value] of [
    ["โอ", "40"],
    ["ต้น", "30"],
    ["บอล", "20"],
    ["ฝน", "10"],
  ])
    await page.getByLabel("ส่วนแบ่งของ" + name).fill(value);
  await page
    .getByRole("button", { name: "บันทึกการแก้ไข", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.reload();
  await page
    .locator(".expense-row")
    .filter({ hasText: "ค่าอาหารทดสอบ" })
    .waitFor();
  await page
    .locator(".expense-row")
    .filter({ hasText: "ค่าอาหารทดสอบ" })
    .click();
  await page.getByRole("button", { name: "ลบรายการ", exact: true }).click();
  await page.getByRole("button", { name: "ยืนยันการลบ", exact: true }).click();
  assert.equal(await page.locator(".expense-row").count(), 4);
  await page
    .locator(".sidebar nav")
    .getByRole("button", { name: "สมาชิก", exact: true })
    .click();
  await page.getByRole("button", { name: "ลบสมาชิกโอ", exact: true }).click();
  assert.match(await page.locator(".error-banner").innerText(), /ลบไม่ได้/);
  await page.getByRole("button", { name: "ปิดข้อความ" }).click();
  await page.getByLabel("ชื่อสมาชิก", { exact: true }).fill("ใหม่");
  await page.getByRole("button", { name: "เพิ่มสมาชิก", exact: true }).click();
  assert.equal(await page.locator(".member-row").count(), 5);
  await page
    .getByRole("button", { name: "แก้ไขชื่อใหม่", exact: true })
    .click();
  await page.getByLabel("ชื่อสมาชิก", { exact: true }).fill("เพื่อนใหม่");
  await page.getByRole("button", { name: "บันทึก", exact: true }).click();
  await page
    .getByRole("button", { name: "ลบสมาชิกเพื่อนใหม่", exact: true })
    .click();
  assert.equal(await page.locator(".member-row").count(), 4);
  await page
    .locator(".sidebar nav")
    .getByRole("button", { name: "หน้าหลัก", exact: true })
    .click();
  await page
    .getByRole("button", { name: "ทำเครื่องหมายว่าจ่ายแล้ว" })
    .first()
    .click();
  assert.equal(await page.locator(".transfer-card").count(), 1);
  await page
    .getByRole("button", { name: "ทำเครื่องหมายว่าจ่ายแล้ว" })
    .first()
    .click();
  await page
    .getByRole("heading", { name: "เคลียร์ครบ จบทริปสบายใจ!" })
    .waitFor();
  assert.equal(await page.locator(".balance-value.neutral").count(), 4);
  await page.reload();
  await page
    .getByRole("heading", { name: "เคลียร์ครบ จบทริปสบายใจ!" })
    .waitFor();
  await page
    .getByRole("button", { name: "ยกเลิกสถานะ", exact: true })
    .first()
    .click();
  assert.equal(await page.locator(".transfer-card").count(), 1);
  await page.evaluate(() =>
    Object.defineProperty(navigator, "share", {
      value: undefined,
      configurable: true,
    }),
  );
  await page
    .getByRole("button", { name: "แชร์สรุปค่าใช้จ่าย", exact: true })
    .click();
  assert.match(await page.getByLabel("ข้อความสรุป").inputValue(), /5,000.00/);
  await page.getByRole("button", { name: "ปิด", exact: true }).click();
  await page.locator(".new-trip-side").click();
  await page.getByPlaceholder("เช่น เที่ยวเชียงใหม่ 3 วัน").fill("ทริปทะเล");
  await page.getByLabel("สมาชิกคนที่ 1", { exact: true }).fill("เอ");
  await page.getByLabel("สมาชิกคนที่ 2", { exact: true }).fill("บี");
  await page.getByRole("button", { name: "สร้างทริป แล้วไปกันเลย" }).click();
  await page
    .locator(".trip-banner h2")
    .filter({ hasText: "ทริปทะเล" })
    .waitFor();
  assert.equal(await page.locator(".expense-row").count(), 0);
  await page
    .locator(".sidebar nav")
    .getByRole("button", { name: "ทริปที่ผ่านมา", exact: true })
    .click();
  assert.equal(await page.locator(".history-card").count(), 2);
  // Fresh mobile context, so the screenshot shows the original demo.
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    deviceScaleFactor: 1,
  });
  const mp = await mobile.newPage();
  mp.on("pageerror", (e) => errors.push(e.message));
  await mp.goto("http://localhost:3000");
  await mp
    .getByRole("heading", { name: "แบ่งค่าใช้จ่ายกับเพื่อนง่าย ๆ" })
    .waitFor();
  await mp.evaluate(() => document.fonts.ready);
  await mp.screenshot({ path: "test-results/mobile.png", fullPage: true });
  assert.ok(await mp.locator(".bottom-nav").isVisible());
  assert.ok(
    await mp.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    "mobile must not overflow horizontally",
  );
  await mp
    .getByRole("button", { name: "เพิ่มค่าใช้จ่าย", exact: true })
    .click();
  await mp.getByLabel("จำนวนเงินทั้งหมด").fill("0");
  await mp.getByPlaceholder("เช่น ค่าอาหารเย็น").fill("ทดสอบศูนย์");
  await mp
    .getByRole("button", { name: "บันทึกค่าใช้จ่าย", exact: true })
    .click();
  assert.match(await mp.locator(".form-error").innerText(), /มากกว่า 0/);
  await mp.getByLabel("จำนวนเงินทั้งหมด").fill("100");
  await mp
    .getByRole("button", { name: "ยกเลิกเลือกทั้งหมด", exact: true })
    .click();
  await mp
    .getByRole("button", { name: "บันทึกค่าใช้จ่าย", exact: true })
    .click();
  assert.match(await mp.locator(".form-error").innerText(), /อย่างน้อย 1/);
  await mp.screenshot({ path: "test-results/mobile-form.png", fullPage: true });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: desktop CRUD, custom/percent splits, validation, persistence, members, settlement/undo, sharing, trip history, mobile layout. No browser errors.",
  );
  await mobile.close();
} finally {
  await browser.close();
}
