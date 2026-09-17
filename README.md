# หารกัน (Split Expense)

แอปภาษาไทยสำหรับหารค่าใช้จ่ายทริป ด้วย Next.js App Router, React, Tailwind CSS และ PostgreSQL API

## เริ่มใช้งาน

```sh
npm install
npm run dev
```

เปิด http://localhost:3000 — มีข้อมูลตัวอย่างเที่ยวเชียงใหม่ให้ทันที ไม่ต้องมีบัญชีหรือฐานข้อมูล
โหมดเริ่มต้นเก็บข้อมูลใน localStorage ของเบราว์เซอร์ การล้างข้อมูลเว็บไซต์จะลบประวัติ
ฟอนต์ Noto Sans Thai โหลดจาก Google Fonts และใช้ sans-serif สำรองเมื่อออฟไลน์

## เชื่อมต่อ PostgreSQL / Supabase Postgres

1. คัดลอก .env.example เป็น .env.local
2. ใส่ DATABASE_URL ของ PostgreSQL (หรือ Supabase server-side connection string)
3. รัน `npm run db:setup`
4. เริ่มเซิร์ฟเวอร์ใหม่

มีตาราง users, groups, group_members, expenses, expense_participants, settlements
API ผูกข้อมูลกับ anonymous session ใน HttpOnly cookie และใช้ optimistic revision ป้องกันการเขียนทับระหว่างหน้าต่าง
ฐานข้อมูลใช้เฉพาะฝั่งเซิร์ฟเวอร์ ห้ามเปิดตารางให้เข้าถึงผ่าน public client key
บัญชีผู้ใช้และ provider/subject เตรียมไว้สำหรับเพิ่ม Login ภายหลัง ยังไม่มีระบบ Login หรือแก้ไขร่วมกันหลายคน
เมื่อเปิดใช้ฐานข้อมูลเป็นครั้งแรกจะนำทริปในเครื่องไปบันทึกให้โดยอัตโนมัติ
หากฐานข้อมูลมีปัญหา แอปเก็บสำเนาในเครื่องและแสดงสถานะรอซิงก์
ฐานข้อมูลต้องมี schema ก่อนใช้งาน API; ไม่มีการสร้างตารางอัตโนมัติบน request

## ฟังก์ชัน

- สร้างทริปพร้อมวันที่ เพิ่ม/แก้ไข/ลบสมาชิก และดูทริปย้อนหลัง
- เพิ่ม/ดู/แก้ไข/ลบรายการ เลือกคนจ่าย คนหาร และหมวดหมู่
- หารเท่ากัน กำหนดยอด หรือเปอร์เซ็นต์ พร้อมตรวจสอบยอด
- สรุปยอดจ่าย ค่าใช้จ่ายจริง ยอดที่ต้องได้คืน/จ่ายเพิ่ม
- แนะนำรายการโอน ทำเครื่องหมายว่าจ่ายแล้ว ยกเลิกสถานะ และแสดงความคืบหน้า
- แชร์ข้อความผ่าน native share บนมือถือ หรือคัดลอกไปส่ง LINE / Messenger
- Responsive layout, bottom navigation, keyboard modal focus trap, Thai money formatting

## หลักคำนวณ

เงินทั้งหมดเป็นจำนวนเต็มหน่วยสตางค์ เพื่อตัดปัญหา floating-point
หารเท่ากันแจกเศษตามลำดับสมาชิก; เปอร์เซ็นต์ใช้ largest remainder
Debt simplification จับคู่ยอดตรงกันก่อน จากนั้นจับคู่ยอดมากที่สุด โดยไม่เกิน n-1 รายการ
เป็น heuristic ที่ลดการโอนได้ดี ไม่รับประกัน global minimum สำหรับทุกกรณี
การชำระแล้วเก็บเป็น ledger จริง เมื่อแก้ไขค่าใช้จ่ายจะคำนวณยอดคงเหลือใหม่โดยไม่ลบเงินที่โอนไปแล้ว

ข้อมูลตัวอย่าง: รวม 5,000 บาท โอจ่าย 1,800 / ต้น 800 / บอล 2,400 / ฝน 0
ค่าใช้จ่ายจริง: โอ 1,300 / ต้น 1,300 / บอล 1,300 / ฝน 1,100
สรุป: ต้น → โอ 500 บาท, ฝน → บอล 1,100 บาท

## ตรวจสอบ

```sh
npm test
npm run typecheck
npm run build
```

ชุดทดสอบครอบคลุมยอดตัวอย่าง เศษสตางค์ ยอดไม่ถูกต้อง การแก้ไขหลังชำระ และ conservation ของเงิน

## ต่อในอนาคต

user_id / auth_provider / auth_subject รองรับการเชื่อมบัญชี Google หรือ LINE;
receipt_url เตรียมสำหรับใบเสร็จและ OCR; currency เตรียมไว้สำหรับหลายสกุลเงิน (UI ปัจจุบันใช้ THB เท่านั้น)
QR PromptPay, การเชิญเพื่อน, PDF/Excel และ notification ยังไม่ได้ติดตั้ง

ทดสอบ UI: เปิดเซิร์ฟเวอร์ด้วย npm run start หรือ npm run dev แล้วรัน npm run test:browser (ใช้ Chrome ที่ติดตั้งในเครื่อง)
ทดสอบ schema ใช้ PGlite ซึ่งเป็น PostgreSQL แบบ embedded ไม่ได้เชื่อมฐานข้อมูล production

อ้างอิงการตั้งค่า: [Next.js App Router](https://nextjs.org/docs/app/getting-started/installation) และ [Tailwind CSS](https://tailwindcss.com/docs/installation/framework-guides/nextjs)
