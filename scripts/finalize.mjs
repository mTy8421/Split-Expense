import { readFileSync, writeFileSync } from "node:fs";
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
for (const group of ["dependencies", "devDependencies"])
  for (const name of Object.keys(pkg[group]))
    pkg[group][name] = lock.packages["node_modules/" + name].version;
pkg.scripts.test = "tsx --test tests/*.test.ts tests/*.test.mjs";
pkg.scripts["test:browser"] = "node scripts/browser-test.mjs";
pkg.scripts.format =
  "prettier --write src tests scripts package.json tsconfig.json README.md";
writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
const readme = readFileSync("README.md", "utf8");
writeFileSync(
  "README.md",
  readme +
    "\nทดสอบ UI: เปิดเซิร์ฟเวอร์ด้วย npm run start หรือ npm run dev แล้วรัน npm run test:browser (ใช้ Chrome ที่ติดตั้งในเครื่อง)\nทดสอบ schema ใช้ PGlite ซึ่งเป็น PostgreSQL แบบ embedded ไม่ได้เชื่อมฐานข้อมูล production\n\nอ้างอิงการตั้งค่า: [Next.js App Router](https://nextjs.org/docs/app/getting-started/installation) และ [Tailwind CSS](https://tailwindcss.com/docs/installation/framework-guides/nextjs)\n",
);
