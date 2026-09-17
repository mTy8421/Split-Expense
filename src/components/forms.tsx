"use client";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import { X, Plus, Check, ArrowRight, CheckCircle2 } from "lucide-react";
import {
  money,
  parseAmount,
  splitAmount,
  uid,
  type Trip,
  type Member,
  type Expense,
  type SplitMode,
} from "@/lib/engine";
export const categories = {
  food: "อาหาร",
  travel: "เดินทาง",
  hotel: "ที่พัก",
  coffee: "เครื่องดื่ม",
  ticket: "ตั๋ว / กิจกรรม",
  other: "อื่น ๆ",
};
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const dateText = (date: string) =>
  new Date(date + "T12:00:00").toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export function Avatar({
  member,
  index = 0,
  small = false,
}: {
  member?: Member;
  index?: number;
  small?: boolean;
}) {
  return (
    <span className={`avatar av-${index % 6} ${small ? "small" : ""}`}>
      {member?.name.slice(0, 2) || "?"}
    </span>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const scroll = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close.current();
      if (e.key === "Tab") {
        const nodes = ref.current?.querySelectorAll<HTMLElement>(
          'button,input,select,textarea,[tabindex="0"]',
        );
        const list = Array.from(nodes || []).filter(
          (n) => !n.hasAttribute("disabled"),
        );
        const first = list[0],
          last = list[list.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = scroll;
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-button" aria-label="ปิด" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function TripForm({ onSave }: { onSave: (t: Trip) => void }) {
  const [name, setName] = useState("");
  const [date, setDate] = useState(today());
  const [names, setNames] = useState(["", "", ""]);
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const clean = names.map((n) => n.trim()).filter(Boolean);
        if (!name.trim() || !date) {
          setError("กรอกชื่อทริปและวันที่");
          return;
        }
        if (!clean.length) {
          setError("เพิ่มสมาชิกอย่างน้อย 1 คน");
          return;
        }
        if (new Set(clean).size !== clean.length) {
          setError("ชื่อสมาชิกต้องไม่ซ้ำกัน");
          return;
        }
        onSave({
          id: uid(),
          name: name.trim(),
          date,
          members: clean.map((name) => ({ id: uid(), name })),
          expenses: [],
          settlements: [],
        });
      }}
    >
      <p className="form-intro">ทริปใหญ่ มื้อเล็ก ก็หารกันได้</p>
      <label className="field">
        ชื่อทริป
        <input
          required
          maxLength={100}
          placeholder="เช่น เที่ยวเชียงใหม่ 3 วัน"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="field">
        วันที่
        <input
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      <label className="field">
        เพื่อนร่วมทริป <span className="muted">รวมตัวคุณด้วยนะ</span>
      </label>
      {names.map((n, i) => (
        <div className="name-input" key={i}>
          <span className={`avatar small av-${i % 6}`}>{i + 1}</span>
          <input
            aria-label={"สมาชิกคนที่ " + (i + 1)}
            maxLength={60}
            placeholder={i === 0 ? "ชื่อของคุณ" : "ชื่อเพื่อน"}
            value={n}
            onChange={(e) =>
              setNames(names.map((v, j) => (j === i ? e.target.value : v)))
            }
          />
          <button
            type="button"
            className="icon-button"
            aria-label={"ลบช่องสมาชิก " + (i + 1)}
            onClick={() => setNames(names.filter((_, j) => j !== i))}
          >
            <X size={17} />
          </button>
        </div>
      ))}
      <button
        className="text-button"
        type="button"
        disabled={names.length >= 50}
        onClick={() => setNames([...names, ""])}
      >
        <Plus size={17} />
        เพิ่มสมาชิก
      </button>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn primary full" type="submit">
        สร้างทริป แล้วไปกันเลย
        <ArrowRight size={18} />
      </button>
    </form>
  );
}
export function ExpenseForm({
  trip,
  expense,
  onSave,
}: {
  trip: Trip;
  expense?: Expense;
  onSave: (e: Expense) => void;
}) {
  const [name, setName] = useState(expense?.name || "");
  const [amount, setAmount] = useState(
    expense ? String(expense.amount / 100) : "",
  );
  const [payer, setPayer] = useState(
    expense?.payerId || trip.members[0]?.id || "",
  );
  const [category, setCategory] = useState(expense?.category || "food");
  const [date, setDate] = useState(expense?.date || today());
  const [mode, setMode] = useState<SplitMode>(expense?.mode || "equal");
  const [ids, setIds] = useState(
    expense ? Object.keys(expense.shares) : trip.members.map((m) => m.id),
  );
  const [values, setValues] = useState<Record<string, string>>(
    expense?.inputs || {},
  );
  const [error, setError] = useState("");
  let preview: Record<string, number> | null = null;
  try {
    preview = splitAmount(parseAmount(amount), ids, mode, values);
  } catch {}
  const submit = (e: FormEvent) => {
    e.preventDefault();
    try {
      if (!name.trim()) throw new Error("กรอกชื่อรายการ");
      if (!trip.members.some((m) => m.id === payer))
        throw new Error("เลือกคนจ่าย");
      const cents = parseAmount(amount);
      const shares = splitAmount(cents, ids, mode, values);
      onSave({
        id: expense?.id || uid(),
        name: name.trim(),
        amount: cents,
        payerId: payer,
        category,
        date,
        mode,
        shares,
        inputs: values,
      });
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <form onSubmit={submit}>
      <div className="amount-input">
        <label htmlFor="expense-amount">จำนวนเงินทั้งหมด</label>
        <div>
          <span>฿</span>
          <input
            id="expense-amount"
            inputMode="decimal"
            placeholder="0.00"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <span>บาท (THB)</span>
      </div>
      <label className="field">
        ชื่อรายการ
        <input
          required
          maxLength={100}
          placeholder="เช่น ค่าอาหารเย็น"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <div className="form-grid">
        <label className="field">
          หมวดหมู่
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {Object.entries(categories).map(([key, c]) => (
              <option key={key} value={key}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          วันที่
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>
      <label className="field">
        ใครเป็นคนจ่าย?
        <select
          value={payer}
          onChange={(e) => setPayer(e.target.value)}
          required
        >
          <option value="">เลือกคนจ่าย</option>
          {trip.members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <div className="split-label">
        <strong>หารกันแบบไหนดี?</strong>
        <span>{ids.length} คน</span>
      </div>
      <div className="split-tabs">
        {(
          [
            ["equal", "หารเท่ากัน"],
            ["amount", "กำหนดยอด"],
            ["percent", "เปอร์เซ็นต์"],
          ] as const
        ).map(([key, label]) => (
          <button
            type="button"
            className={mode === key ? "active" : ""}
            onClick={() => setMode(key)}
            key={key}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="select-all">
        <button
          type="button"
          onClick={() =>
            setIds(
              ids.length === trip.members.length
                ? []
                : trip.members.map((m) => m.id),
            )
          }
        >
          {ids.length === trip.members.length
            ? "ยกเลิกเลือกทั้งหมด"
            : "เลือกทุกคน"}
        </button>
      </div>
      {trip.members.map((m, i) => (
        <div className="split-person" key={m.id}>
          <label>
            <input
              type="checkbox"
              checked={ids.includes(m.id)}
              onChange={(e) =>
                setIds(
                  e.target.checked
                    ? [...ids, m.id]
                    : ids.filter((id) => id !== m.id),
                )
              }
            />
            <Avatar member={m} index={i} small />
            <span>{m.name}</span>
          </label>
          {mode === "equal" ? (
            <strong>฿{money(preview?.[m.id] || 0)}</strong>
          ) : (
            <div className="split-custom">
              <input
                aria-label={`ส่วนแบ่งของ${m.name}`}
                inputMode="decimal"
                disabled={!ids.includes(m.id)}
                placeholder="0"
                value={values[m.id] || ""}
                onChange={(e) =>
                  setValues({ ...values, [m.id]: e.target.value })
                }
              />
              <span>{mode === "percent" ? "%" : "฿"}</span>
            </div>
          )}
        </div>
      ))}
      {preview ? (
        <p className="split-success">
          <CheckCircle2 size={16} />
          แบ่งครบ ฿{money(Object.values(preview).reduce((a, b) => a + b, 0))}
          {mode === "equal" && ids.length > 1
            ? " · เศษสตางค์กระจายตามลำดับ"
            : ""}
        </p>
      ) : (
        <p className="form-note">
          {mode === "percent"
            ? "กรอกเปอร์เซ็นต์รวมให้ครบ 100%"
            : mode === "amount"
              ? "กรอกส่วนแบ่งให้รวมตรงกับยอดทั้งหมด"
              : "เลือกคนหารและกรอกจำนวนเงิน"}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn primary full" type="submit">
        <Check size={18} />
        {expense ? "บันทึกการแก้ไข" : "บันทึกค่าใช้จ่าย"}
      </button>
    </form>
  );
}
