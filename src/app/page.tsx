"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  Coffee,
  Copy,
  Home,
  Plus,
  ReceiptText,
  Share2,
  Users,
  Wallet,
  X,
  Utensils,
  Car,
  BedDouble,
  Ticket,
  Pencil,
  Trash2,
  CalendarDays,
  Mountain,
  Sparkles,
  CheckCircle2,
  Search,
  History,
  LoaderCircle,
  Leaf,
} from "lucide-react";
import {
  balances,
  demoTrip,
  money,
  simplify,
  uid,
  validateTrips,
  type Expense,
  type Trip,
} from "@/lib/engine";
import {
  Avatar,
  Modal,
  TripForm,
  ExpenseForm,
  categories,
  dateText,
} from "@/components/forms";
const icons = {
  food: Utensils,
  travel: Car,
  hotel: BedDouble,
  coffee: Coffee,
  ticket: Ticket,
  other: ReceiptText,
};
const colors = {
  food: "orange",
  travel: "blue",
  hotel: "purple",
  coffee: "pink",
  ticket: "yellow",
  other: "green",
};
type Tab = "home" | "expenses" | "summary" | "members" | "history";
const tabs = [
  { id: "home", name: "หน้าหลัก", icon: Home },
  { id: "expenses", name: "ค่าใช้จ่าย", icon: ReceiptText },
  { id: "summary", name: "สรุปยอด", icon: Wallet },
  { id: "members", name: "สมาชิก", icon: Users },
] as const;
export default function Page() {
  const [trips, setTrips] = useState<Trip[]>([demoTrip()]);
  const [selected, setSelected] = useState("demo-chiangmai");
  const [tab, setTab] = useState<Tab>("home");
  const [loaded, setLoaded] = useState(false);
  const [storage, setStorage] = useState("กำลังโหลด");
  const [remote, setRemote] = useState(false);
  const version = useRef(0);
  const snapshot = useRef("");
  const saving = useRef(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [modal, setModal] = useState<
    "trip" | "expense" | "share" | "help" | null
  >(null);
  const [editing, setEditing] = useState<Expense>();
  const [detail, setDetail] = useState<Expense>();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [deletion, setDeletion] = useState<Expense>();
  const [memberName, setMemberName] = useState("");
  const [editMember, setEditMember] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      let local: Trip[] | undefined;
      try {
        const raw = localStorage.getItem("harnkan-trips-v1");
        if (raw) {
          const parsed = JSON.parse(raw);
          validateTrips(parsed);
          if (parsed.length) local = parsed;
        }
      } catch {
        setError(
          "อ่านข้อมูลที่บันทึกไว้ไม่ได้ กรุณาตรวจสอบพื้นที่จัดเก็บของเบราว์เซอร์",
        );
      }
      try {
        const res = await fetch("/api/trips");
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!alive) return;
        if (data.mode === "postgres") {
          validateTrips(data.trips);
          const next = data.trips.length ? data.trips : local || [demoTrip()];
          setTrips(next);
          setSelected(next[0].id);
          version.current = data.version;
          snapshot.current = JSON.stringify(data.trips);
          setRemote(true);
          setStorage("เชื่อมต่อฐานข้อมูลแล้ว");
        } else {
          const next = local || [demoTrip()];
          setTrips(next);
          setSelected(next[0].id);
          setStorage("บันทึกในอุปกรณ์นี้");
        }
      } catch {
        if (!alive) return;
        const next = local || [demoTrip()];
        setTrips(next);
        setSelected(next[0].id);
        setStorage("โหมดออฟไลน์ · บันทึกในเครื่อง");
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem("harnkan-trips-v1", JSON.stringify(trips));
    } catch {
      setError("บันทึกในเครื่องไม่สำเร็จ พื้นที่จัดเก็บอาจเต็ม");
    }
  }, [trips, loaded]);
  const latest = useRef(trips);
  latest.current = trips;
  useEffect(() => {
    if (!loaded || !remote) return;
    let stopped = false;
    const sync = async () => {
      const body = JSON.stringify(latest.current);
      if (saving.current || snapshot.current === body) return;
      saving.current = true;
      setStorage("กำลังบันทึก…");
      try {
        const res = await fetch("/api/trips", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trips: JSON.parse(body),
            version: version.current,
          }),
        });
        if (res.status === 409) {
          setRemote(false);
          throw new Error(
            "ข้อมูลถูกแก้ไขจากหน้าต่างอื่น โปรดคัดลอกสรุปแล้วโหลดหน้าใหม่ก่อนแก้ไขต่อ",
          );
        }
        if (!res.ok)
          throw new Error("ซิงก์ไม่สำเร็จ ข้อมูลยังเก็บในเครื่องและจะลองใหม่");
        const data = await res.json();
        version.current = data.version;
        snapshot.current = body;
        if (!stopped) setStorage("บันทึกในฐานข้อมูลแล้ว");
      } catch (e) {
        if (!stopped) {
          setStorage("รอซิงก์ · บันทึกในเครื่องแล้ว");
          setError((e as Error).message);
        }
      } finally {
        saving.current = false;
      }
    };
    const timer = setInterval(sync, 1500);
    void sync();
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [loaded, remote]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  const trip = trips.find((t) => t.id === selected) || trips[0];
  const total = trip.expenses.reduce((n, e) => n + e.amount, 0);
  const people = balances(trip);
  const transfers = simplify(trip);
  const completed = trip.settlements.length;
  const closed = !!trip.expenses.length && !transfers.length;
  const member = (id: string) => trip.members.find((m) => m.id === id);
  const memberIndex = (id: string) =>
    trip.members.findIndex((m) => m.id === id);
  const update = (next: Trip) => {
    const list = trips.map((t) => (t.id === next.id ? next : t));
    validateTrips(list);
    setTrips(list);
  };
  const closeModal = () => {
    setModal(null);
    setEditing(undefined);
  };
  const openExpense = () => {
    setEditing(undefined);
    setModal("expense");
  };
  const shareText = [
    "สรุปค่าใช้จ่าย 🧾",
    "ทริป" + trip.name,
    "ยอดรวม " + money(total) + " บาท",
    "",
    transfers.length ? "รายการที่ต้องโอน" : "✅ ไม่มียอดค้างชำระ",
    ...transfers.map(
      (t) =>
        `${member(t.from)?.name} → ${member(t.to)?.name} ${money(t.amount)} บาท`,
    ),
    "",
    `ชำระแล้ว ${completed} / ${completed + transfers.length} รายการ`,
    "สรุปโดย หารกัน",
  ].join("\n");
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "สรุปค่าใช้จ่าย " + trip.name,
          text: shareText,
        });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    setShareCopied(false);
    setModal("share");
  };
  const saveMember = (e: FormEvent) => {
    e.preventDefault();
    const name = memberName.trim();
    if (!name) return;
    if (trip.members.some((m) => m.name === name && m.id !== editMember)) {
      setError("มีชื่อนี้ในทริปแล้ว");
      return;
    }
    if (!editMember && trip.members.length >= 50) {
      setError("เพิ่มสมาชิกได้ไม่เกิน 50 คน");
      return;
    }
    update({
      ...trip,
      members: editMember
        ? trip.members.map((m) => (m.id === editMember ? { ...m, name } : m))
        : [...trip.members, { id: uid(), name }],
    });
    setMemberName("");
    setEditMember(null);
    setNotice("บันทึกสมาชิกแล้ว");
  };
  const removeMember = (id: string) => {
    if (trip.members.length === 1) {
      setError("ทริปต้องมีสมาชิกอย่างน้อย 1 คน");
      return;
    }
    if (
      trip.expenses.some((e) => e.payerId === id || id in e.shares) ||
      trip.settlements.some((s) => s.from === id || s.to === id)
    ) {
      setError("ลบไม่ได้ สมาชิกนี้มีค่าใช้จ่ายหรือการชำระเงินที่เกี่ยวข้อง");
      return;
    }
    update({ ...trip, members: trip.members.filter((m) => m.id !== id) });
  };
  const markPaid = (payment: { from: string; to: string; amount: number }) => {
    update({
      ...trip,
      settlements: [
        ...trip.settlements,
        { ...payment, id: uid(), paidAt: new Date().toISOString() },
      ],
    });
    setNotice("บันทึกว่าชำระแล้วเรียบร้อย");
  };
  const ExpenseList = () => {
    const list = trip.expenses.filter(
      (e) =>
        e.name.toLowerCase().includes(query.toLowerCase()) &&
        (filter === "all" || e.category === filter),
    );
    return (
      <div className="expense-list">
        {list.length ? (
          list.map((e) => {
            const key = e.category as keyof typeof icons;
            const Icon = icons[key] || ReceiptText;
            return (
              <button
                className="expense-row"
                key={e.id}
                onClick={() => setDetail(e)}
              >
                <span className={`expense-icon ${colors[key] || "green"}`}>
                  <Icon size={21} />
                </span>
                <span className="expense-info">
                  <strong>{e.name}</strong>
                  <span>
                    {member(e.payerId)?.name}จ่าย <i>·</i> หาร{" "}
                    {Object.keys(e.shares).length} คน
                  </span>
                </span>
                <span className="expense-amount">
                  <strong>฿{money(e.amount)}</strong>
                  <span>
                    {e.mode === "equal"
                      ? "หารเท่ากัน"
                      : e.mode === "amount"
                        ? "กำหนดเอง"
                        : "ตามเปอร์เซ็นต์"}
                  </span>
                </span>
                <ChevronRight className="row-chevron" size={17} />
              </button>
            );
          })
        ) : (
          <div className="empty">
            <ReceiptText size={30} />
            <strong>
              {trip.expenses.length
                ? "ไม่พบรายการที่ค้นหา"
                : "ยังไม่มีค่าใช้จ่าย"}
            </strong>
            <p>เริ่มบันทึก แล้วให้หารกันช่วยคิดเลข</p>
            {!trip.expenses.length && (
              <button className="btn primary" onClick={openExpense}>
                <Plus size={17} />
                เพิ่มค่าใช้จ่ายแรก
              </button>
            )}
          </div>
        )}
      </div>
    );
  };
  const Transfers = () => (
    <>
      <div className="section-title">
        <div>
          <h2>
            ใครต้องโอนให้ใคร <span className="count">{transfers.length}</span>
          </h2>
          <p>โอนน้อยครั้ง เคลียร์ยอดได้ครบทุกคน</p>
        </div>
        <ArrowRight size={19} />
      </div>
      <div className="transfer-list">
        {transfers.map((t) => (
          <div className="transfer-card" key={t.from + t.to}>
            <div className="transfer-top">
              <div className="transfer-person">
                <Avatar
                  member={member(t.from)}
                  index={memberIndex(t.from)}
                  small
                />
                <strong>{member(t.from)?.name}</strong>
              </div>
              <span className="transfer-arrow">
                <span>โอนให้</span>
                <ArrowRight size={17} />
              </span>
              <div className="transfer-person">
                <Avatar member={member(t.to)} index={memberIndex(t.to)} small />
                <strong>{member(t.to)?.name}</strong>
              </div>
              <strong className="transfer-money">฿{money(t.amount)}</strong>
            </div>
            <div className="transfer-bottom">
              <span>
                <span className="status-dot" />
                รอชำระ
              </span>
              <button onClick={() => markPaid(t)}>
                <Check size={14} />
                ทำเครื่องหมายว่าจ่ายแล้ว
              </button>
            </div>
          </div>
        ))}
        {!transfers.length && (
          <div className="settled">
            <CheckCircle2 size={38} />
            <h3>
              {closed ? "เคลียร์ครบ จบทริปสบายใจ!" : "ยังไม่มียอดค้างชำระ"}
            </h3>
            <p>
              {closed
                ? "ทุกคนชำระครบแล้ว ขอบคุณที่หารกัน"
                : "เพิ่มค่าใช้จ่ายเพื่อเริ่มคำนวณยอด"}
            </p>
          </div>
        )}
      </div>
      {!!completed && (
        <div className="paid-list">
          {trip.settlements.map((s) => (
            <div key={s.id}>
              <CheckCircle2 size={17} />
              <span>
                {member(s.from)?.name} → {member(s.to)?.name}
                <small>฿{money(s.amount)} · จ่ายแล้ว</small>
              </span>
              <button
                onClick={() =>
                  update({
                    ...trip,
                    settlements: trip.settlements.filter((p) => p.id !== s.id),
                  })
                }
              >
                ยกเลิกสถานะ
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="payment-progress">
        <div>
          <span>ความคืบหน้าการชำระ</span>
          <strong>
            {completed} / {completed + transfers.length} รายการ
          </strong>
        </div>
        <div className="progress-track">
          <div
            style={{
              width: `${completed + transfers.length ? (completed / (completed + transfers.length)) * 100 : 0}%`,
            }}
          />
        </div>
        <p>
          <CheckCheck size={14} />
          {closed
            ? "ชำระครบแล้ว · ปิดทริป"
            : "เมื่อทุกคนจ่ายครบ ก็ปิดทริปได้เลย"}
        </p>
      </div>
    </>
  );
  const BalanceList = () => (
    <div className="balance-list">
      {people.map((m, i) => (
        <div className="balance-row" key={m.id}>
          <Avatar member={m} index={i} />
          <div className="balance-person">
            <strong>{m.name}</strong>
            <span>จ่ายไป ฿{money(m.paid)}</span>
          </div>
          <div
            className={`balance-value ${m.remaining > 0 ? "positive" : m.remaining < 0 ? "negative" : "neutral"}`}
          >
            <strong>
              {m.remaining > 0 ? "+" : m.remaining < 0 ? "−" : ""}฿
              {money(Math.abs(m.remaining))}
            </strong>
            <span>
              {m.remaining > 0
                ? "ต้องได้รับคืน"
                : m.remaining < 0
                  ? "ต้องจ่ายเพิ่ม"
                  : "ยอดลงตัวแล้ว"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            setTab("home");
          }}
        >
          <span className="brand-mark">÷</span>
          <span>
            หารกัน<small>SPLIT EXPENSE</small>
          </span>
        </a>
        <div className="sidebar-label">พื้นที่ของคุณ</div>
        <nav>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={tab === t.id ? "active" : ""}
            >
              <t.icon size={20} />
              {t.name}
              {t.id === "expenses" && (
                <span className="nav-count">{trip.expenses.length}</span>
              )}
            </button>
          ))}
          <button
            onClick={() => setTab("history")}
            className={tab === "history" ? "active" : ""}
          >
            <History size={20} />
            ทริปที่ผ่านมา
          </button>
        </nav>
        <div className="sidebar-divider" />
        <div className="sidebar-label">
          ทริปของคุณ{" "}
          <button aria-label="สร้างทริปใหม่" onClick={() => setModal("trip")}>
            <Plus size={16} />
          </button>
        </div>
        <div className="trip-links">
          {trips.map((t) => (
            <button
              key={t.id}
              className={t.id === trip.id ? "selected" : ""}
              onClick={() => {
                setSelected(t.id);
                setTab("home");
                setQuery("");
                setFilter("all");
                setEditMember(null);
                setMemberName("");
              }}
            >
              <span className="trip-mini">
                <Mountain size={17} />
              </span>
              <span>{t.name}</span>
              {t.id === trip.id && <span className="green-dot" />}
            </button>
          ))}
        </div>
        <button className="new-trip-side" onClick={() => setModal("trip")}>
          <Plus size={17} />
          สร้างทริปใหม่
        </button>
        <div className="sidebar-bottom">
          <div className="friendly-note">
            <span>✌️</span>
            <strong>
              ความทรงจำหารไม่ได้
              <br />
              แต่ค่าใช้จ่ายหารกันได้
            </strong>
            <p>เที่ยวให้เต็มที่ ที่เหลือเราช่วยเอง</p>
          </div>
          <button className="help-button" onClick={() => setModal("help")}>
            <CircleHelp size={18} />
            ใช้งานหารกันอย่างไร
            <ArrowUpRight size={15} />
          </button>
          <div className="guest">
            <Avatar member={{ id: "guest", name: "คุณ" }} index={2} small />
            <div>
              <strong>พื้นที่ส่วนตัวของคุณ</strong>
              <span>{storage}</span>
            </div>
            <Leaf size={17} />
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <div className="breadcrumb">
            <span>ทริปของฉัน</span>
            <ChevronRight size={14} />
            <strong>{trip.name}</strong>
          </div>
          <span className="top-tag">
            <span className="green-dot" />
            เรื่องเงินชัด เพื่อนกันเหมือนเดิม
          </span>
          <a
            className="mobile-brand"
            href="/"
            onClick={(e) => {
              e.preventDefault();
              setTab("home");
            }}
          >
            <span className="brand-mark">÷</span>หารกัน
          </a>
          <button
            className="icon-button mobile-plus"
            aria-label="สร้างทริปใหม่"
            onClick={() => setModal("trip")}
          >
            <Plus size={20} />
          </button>
        </header>
        <main>
          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button aria-label="ปิดข้อความ" onClick={() => setError("")}>
                <X size={17} />
              </button>
            </div>
          )}
          {!loaded ? (
            <div className="loading">
              <LoaderCircle className="spin" size={28} />
              กำลังเตรียมทริปของคุณ…
            </div>
          ) : (
            <>
              {tab === "history" ? (
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">
                        GOOD TIMES, ALL IN ONE PLACE
                      </span>
                      <h1>ทริปของเรา</h1>
                      <p>เก็บทุกความทรงจำ พร้อมค่าใช้จ่ายที่ลงตัว</p>
                    </div>
                    <button
                      className="btn primary"
                      onClick={() => setModal("trip")}
                    >
                      <Plus size={18} />
                      สร้างทริปใหม่
                    </button>
                  </div>
                  <div className="history-grid">
                    {trips.map((t) => (
                      <button
                        className="history-card"
                        key={t.id}
                        onClick={() => {
                          setSelected(t.id);
                          setTab("home");
                          setQuery("");
                          setFilter("all");
                          setEditMember(null);
                          setMemberName("");
                        }}
                      >
                        <div className="history-cover">
                          <Mountain size={50} />
                          <span>{dateText(t.date)}</span>
                        </div>
                        <div>
                          <h2>{t.name}</h2>
                          <p>
                            {t.members.length} คน · {t.expenses.length} รายการ
                          </p>
                          <strong>
                            ฿
                            {money(
                              t.expenses.reduce((n, e) => n + e.amount, 0),
                            )}
                          </strong>
                          <ChevronRight size={20} />
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">
                        {tab === "home"
                          ? "LESS MATH, MORE MEMORIES"
                          : tab === "expenses"
                            ? "EVERY LITTLE MOMENT COUNTS"
                            : tab === "summary"
                              ? "ALL SQUARED UP"
                              : "BETTER TOGETHER"}
                      </span>
                      <h1>
                        {tab === "home"
                          ? "แบ่งค่าใช้จ่ายกับเพื่อนง่าย ๆ"
                          : tab === "expenses"
                            ? "ค่าใช้จ่ายของทริป"
                            : tab === "summary"
                              ? "สรุปยอด ชัดเจนทุกคน"
                              : "เพื่อนร่วมทริป"}
                        <span className="heading-spark">✳</span>
                      </h1>
                      <p>
                        {tab === "home"
                          ? "สนุกกับทุกทริป เรื่องคิดเงินให้เราช่วย"
                          : tab === "expenses"
                            ? "ใครจ่ายอะไร บันทึกไว้แล้วหารกัน"
                            : tab === "summary"
                              ? "คำนวณให้แล้ว เหลือแค่โอนก็เรียบร้อย"
                              : "เพิ่มเพื่อน แล้วออกไปสร้างความทรงจำด้วยกัน"}
                      </p>
                    </div>
                    <button className="btn white share-btn" onClick={share}>
                      <Share2 size={17} />
                      แชร์สรุปค่าใช้จ่าย
                    </button>
                  </div>
                  <section className="trip-banner">
                    <div className="trip-banner-content">
                      <span className="trip-status">
                        <span />
                        {closed ? "ปิดทริปแล้ว" : "ทริปที่กำลังดำเนินอยู่"}
                      </span>
                      <h2>
                        {trip.name} <span>🌿</span>
                      </h2>
                      <div className="trip-meta">
                        <span>
                          <CalendarDays size={15} />
                          {dateText(trip.date)}
                        </span>
                        <span className="meta-divider" />
                        <span>
                          <Users size={16} />
                          {trip.members.length} คนร่วมทริป
                        </span>
                      </div>
                      <div className="trip-people">
                        <div className="avatar-stack">
                          {trip.members.slice(0, 5).map((m, i) => (
                            <Avatar member={m} index={i} small key={m.id} />
                          ))}
                        </div>
                        <span>
                          {trip.members
                            .slice(0, 4)
                            .map((m) => m.name)
                            .join(", ")}
                          {trip.members.length > 4 ? " และเพื่อน ๆ" : ""}
                        </span>
                        <button
                          aria-label="เพิ่มเพื่อนร่วมทริป"
                          onClick={() => setTab("members")}
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                    </div>
                    <div className="landscape" aria-hidden="true">
                      <div className="sun" />
                      <svg viewBox="0 0 480 210" fill="none">
                        <path
                          d="M0 175 85 72 151 145 240 27 345 153 413 92 480 154V210H0Z"
                          fill="#b2c9b3"
                        />
                        <path
                          d="m184 101 56-74 56 70-38-12-19 16-23-18Z"
                          fill="#ecf1df"
                        />
                        <path
                          d="M0 203 113 122 230 204 344 99 480 188V210H0Z"
                          fill="#82ab8c"
                        />
                        <path
                          d="M0 205q108-53 218-8t262-22v35H0Z"
                          fill="#5c916f"
                        />
                        <path
                          d="m386 177 17-37 18 37h-12v22h-11v-22Zm45 10 14-30 15 30h-10v20h-9v-20Z"
                          fill="#376e52"
                        />
                        <path
                          d="M125 210q31-28 95-18t91 18"
                          stroke="#e3ddbb"
                          strokeWidth="15"
                        />
                        <path d="m350 183 25-35 25 35Z" fill="#e5b477" />
                        <path d="m375 148 25 35h-25Z" fill="#cf995d" />
                        <path d="m370 183 5-19 6 19Z" fill="#6e6349" />
                      </svg>
                      <span className="landscape-label">
                        good times together
                      </span>
                    </div>
                  </section>
                  <section className="stats-grid">
                    <div className="stat-card">
                      <div>
                        <span>ค่าใช้จ่ายทั้งหมด</span>
                        <strong>฿{money(total)}</strong>
                        <small>จาก {trip.expenses.length} รายการในทริป</small>
                      </div>
                      <span className="stat-icon green">
                        <Wallet size={22} />
                      </span>
                    </div>
                    <div className="stat-card">
                      <div>
                        <span>เฉลี่ยต่อคน</span>
                        <strong>
                          ฿{money(Math.round(total / trip.members.length))}
                        </strong>
                        <small>สมาชิกทั้งหมด {trip.members.length} คน</small>
                      </div>
                      <span className="stat-icon purple">
                        <Users size={22} />
                      </span>
                    </div>
                    <div className="stat-card">
                      <div>
                        <span>ยอดที่รอชำระ</span>
                        <strong>
                          ฿{money(transfers.reduce((n, t) => n + t.amount, 0))}
                        </strong>
                        <small>
                          <span className="status-dot" />
                          เหลือ {transfers.length} รายการโอน
                        </small>
                      </div>
                      <span className="stat-icon orange">
                        <ArrowRight size={22} />
                      </span>
                    </div>
                  </section>
                  {tab === "home" && (
                    <div className="dashboard-grid">
                      <div className="dashboard-left">
                        <section className="panel expenses-panel">
                          <div className="section-title">
                            <div>
                              <h2>
                                รายการค่าใช้จ่าย{" "}
                                <span className="count">
                                  {trip.expenses.length}
                                </span>
                              </h2>
                              <p>ทุกค่าใช้จ่ายของทริปนี้ อยู่ที่เดียว</p>
                            </div>
                            <button
                              className="btn primary small-btn"
                              onClick={openExpense}
                            >
                              <Plus size={17} />
                              เพิ่มค่าใช้จ่าย
                            </button>
                          </div>
                          <div className="list-date">
                            <span>ค่าใช้จ่ายทั้งหมด</span>
                            <span>จำนวนเงิน (บาท)</span>
                          </div>
                          <ExpenseList />
                          <button
                            className="panel-link"
                            onClick={() => setTab("expenses")}
                          >
                            ดูค่าใช้จ่ายทั้งหมด
                            <ArrowRight size={15} />
                          </button>
                        </section>
                        <section className="tip-card">
                          <span className="tip-icon">
                            <Sparkles size={22} />
                          </span>
                          <div>
                            <strong>เที่ยวด้วยกัน จ่ายแบบที่สบายใจ</strong>
                            <p>
                              บางคนไม่ดื่มกาแฟ? เลือกคนหารแยกได้ในแต่ละรายการ
                            </p>
                          </div>
                          <Coffee size={34} className="tip-coffee" />
                        </section>
                      </div>
                      <section className="panel balance-panel">
                        <div className="section-title">
                          <div>
                            <h2>ยอดของแต่ละคน</h2>
                            <p>ใครต้องได้คืน ใครต้องจ่ายเพิ่ม</p>
                          </div>
                          <button
                            className="icon-button"
                            aria-label="ดูสรุปยอดทั้งหมด"
                            onClick={() => setTab("summary")}
                          >
                            <ArrowUpRight size={19} />
                          </button>
                        </div>
                        <BalanceList />
                        <div className="balance-legend">
                          <span>
                            <i className="green-dot" />
                            ได้รับคืน
                          </span>
                          <span>
                            <i className="red-dot" />
                            จ่ายเพิ่ม
                          </span>
                          <span>
                            <i className="gray-dot" />
                            ลงตัวแล้ว
                          </span>
                        </div>
                      </section>
                      <section className="panel transfers-panel">
                        <Transfers />
                      </section>
                      <section className="share-card">
                        <div className="share-illustration">
                          <ReceiptText size={40} />
                          <span>
                            <Check size={18} />
                          </span>
                        </div>
                        <h2>
                          เคลียร์เงินง่าย ๆ<br />
                          แล้วไปทริปต่อกัน
                        </h2>
                        <p>
                          ส่งสรุปให้เพื่อนใน LINE หรือ Messenger
                          <br />
                          ครบ จบ ไม่ต้องคิดเลขเอง
                        </p>
                        <button className="btn white" onClick={share}>
                          <Share2 size={16} />
                          แชร์ให้เพื่อนเลย
                          <ArrowUpRight size={15} />
                        </button>
                        <span className="share-decoration">✳</span>
                      </section>
                    </div>
                  )}
                  {tab === "expenses" && (
                    <section className="panel">
                      <div className="section-title">
                        <div>
                          <h2>
                            รายการค่าใช้จ่าย{" "}
                            <span className="count">
                              {trip.expenses.length}
                            </span>
                          </h2>
                          <p>กดรายการเพื่อดูรายละเอียด แก้ไข หรือลบ</p>
                        </div>
                        <button className="btn primary" onClick={openExpense}>
                          <Plus size={18} />
                          เพิ่มค่าใช้จ่าย
                        </button>
                      </div>
                      <div className="filters">
                        <label className="search">
                          <Search size={17} />
                          <input
                            aria-label="ค้นหาค่าใช้จ่าย"
                            placeholder="ค้นหารายการ…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                          />
                        </label>
                        <select
                          aria-label="หมวดหมู่"
                          value={filter}
                          onChange={(e) => setFilter(e.target.value)}
                        >
                          <option value="all">ทุกหมวดหมู่</option>
                          {Object.entries(categories).map(([key, c]) => (
                            <option value={key} key={key}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                      <ExpenseList />
                    </section>
                  )}
                  {tab === "summary" && (
                    <div className="summary-grid">
                      <section className="panel">
                        <div className="section-title">
                          <div>
                            <h2>ยอดของแต่ละคน</h2>
                            <p>ยอดสุทธิ = จ่ายไป − ค่าใช้จ่ายจริง</p>
                          </div>
                        </div>
                        {people.map((m, i) => (
                          <div className="member-summary" key={m.id}>
                            <div>
                              <Avatar member={m} index={i} />
                              <h3>{m.name}</h3>
                              <strong
                                className={
                                  m.remaining > 0
                                    ? "positive"
                                    : m.remaining < 0
                                      ? "negative"
                                      : "neutral"
                                }
                              >
                                {m.remaining > 0
                                  ? "+"
                                  : m.remaining < 0
                                    ? "−"
                                    : ""}
                                ฿{money(Math.abs(m.remaining))}
                              </strong>
                            </div>
                            <dl>
                              <div>
                                <dt>จ่ายไปทั้งหมด</dt>
                                <dd>฿{money(m.paid)}</dd>
                              </div>
                              <div>
                                <dt>ค่าใช้จ่ายจริง</dt>
                                <dd>฿{money(m.owed)}</dd>
                              </div>
                              <div>
                                <dt>
                                  {m.remaining > 0
                                    ? "ยังต้องได้รับคืน"
                                    : m.remaining < 0
                                      ? "ยังต้องจ่ายเพิ่ม"
                                      : "ชำระครบแล้ว"}
                                </dt>
                                <dd>฿{money(Math.abs(m.remaining))}</dd>
                              </div>
                            </dl>
                          </div>
                        ))}
                      </section>
                      <section className="panel">
                        <Transfers />
                      </section>
                    </div>
                  )}
                  {tab === "members" && (
                    <section className="panel members-panel">
                      <div className="section-title">
                        <div>
                          <h2>
                            สมาชิกในทริป{" "}
                            <span className="count">{trip.members.length}</span>
                          </h2>
                          <p>สมาชิกที่มีรายการเกี่ยวข้องจะไม่สามารถลบได้</p>
                        </div>
                        <Users size={24} />
                      </div>
                      <form className="member-form" onSubmit={saveMember}>
                        <input
                          aria-label="ชื่อสมาชิก"
                          placeholder={
                            editMember
                              ? "แก้ไขชื่อสมาชิก"
                              : "ชื่อเพื่อนร่วมทริป"
                          }
                          maxLength={60}
                          required
                          value={memberName}
                          onChange={(e) => setMemberName(e.target.value)}
                        />
                        <button className="btn primary" type="submit">
                          {editMember ? (
                            <Check size={17} />
                          ) : (
                            <Plus size={17} />
                          )}{" "}
                          {editMember ? "บันทึก" : "เพิ่มสมาชิก"}
                        </button>
                        {editMember && (
                          <button
                            type="button"
                            className="btn white"
                            onClick={() => {
                              setEditMember(null);
                              setMemberName("");
                            }}
                          >
                            ยกเลิก
                          </button>
                        )}
                      </form>
                      {trip.members.map((m, i) => (
                        <div className="member-row" key={m.id}>
                          <Avatar member={m} index={i} />
                          <strong>{m.name}</strong>
                          <button
                            className="icon-button"
                            aria-label={"แก้ไขชื่อ" + m.name}
                            onClick={() => {
                              setEditMember(m.id);
                              setMemberName(m.name);
                            }}
                          >
                            <Pencil size={17} />
                          </button>
                          <button
                            className="icon-button danger"
                            aria-label={"ลบสมาชิก" + m.name}
                            onClick={() => removeMember(m.id)}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      ))}
                    </section>
                  )}
                </>
              )}
              <footer className="footer">
                <span>
                  <span className="footer-logo">÷</span>หารกัน <i>·</i>{" "}
                  แบ่งค่าใช้จ่าย แบ่งความสุข
                </span>
                <span>
                  <span className="green-dot" />
                  {storage}
                </span>
              </footer>
            </>
          )}
        </main>
      </div>
      <nav className="bottom-nav">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? "active" : ""}
            onClick={() => setTab(t.id)}
          >
            <t.icon size={21} />
            <span>{t.name}</span>
          </button>
        ))}
        <button
          className={tab === "history" ? "active" : ""}
          onClick={() => setTab("history")}
        >
          <History size={21} />
          <span>ทริป</span>
        </button>
      </nav>
      {notice && (
        <div role="status" className="toast">
          <CheckCircle2 size={19} />
          {notice}
        </div>
      )}
      {modal === "trip" && (
        <Modal title="สร้างทริปใหม่" onClose={closeModal}>
          <TripForm
            onSave={(t) => {
              if (trips.length >= 100) {
                setError("สร้างได้ไม่เกิน 100 ทริป");
                closeModal();
                return;
              }
              const next = [...trips, t];
              validateTrips(next);
              setTrips(next);
              setSelected(t.id);
              setTab("home");
              setQuery("");
              setFilter("all");
              closeModal();
              setNotice("สร้างทริปแล้ว เพิ่มค่าใช้จ่ายกันเลย");
            }}
          />
        </Modal>
      )}
      {modal === "expense" && (
        <Modal
          title={editing ? "แก้ไขค่าใช้จ่าย" : "เพิ่มค่าใช้จ่าย"}
          onClose={closeModal}
        >
          <ExpenseForm
            trip={trip}
            expense={editing}
            onSave={(e) => {
              update({
                ...trip,
                expenses: editing
                  ? trip.expenses.map((x) => (x.id === e.id ? e : x))
                  : [...trip.expenses, e],
              });
              closeModal();
              setNotice("บันทึกค่าใช้จ่ายเรียบร้อย");
            }}
          />
        </Modal>
      )}
      {detail && (
        <Modal
          title="รายละเอียดค่าใช้จ่าย"
          onClose={() => setDetail(undefined)}
        >
          <div className="detail-hero">
            <span>
              {categories[detail.category as keyof typeof categories] ||
                "อื่น ๆ"}
            </span>
            <h3>{detail.name}</h3>
            <strong>฿{money(detail.amount)}</strong>
            <p>
              {member(detail.payerId)?.name}จ่าย · {dateText(detail.date)}
            </p>
          </div>
          <h3 className="detail-subtitle">ส่วนแบ่งของแต่ละคน</h3>
          {Object.entries(detail.shares).map(([id, amount]) => (
            <div className="detail-share" key={id}>
              <Avatar member={member(id)} index={memberIndex(id)} small />
              <span>{member(id)?.name}</span>
              <strong>฿{money(amount)}</strong>
            </div>
          ))}
          <div className="modal-actions">
            <button
              className="btn danger-btn"
              onClick={() => {
                setDeletion(detail);
                setDetail(undefined);
              }}
            >
              <Trash2 size={17} />
              ลบรายการ
            </button>
            <button
              className="btn primary"
              onClick={() => {
                setEditing(detail);
                setDetail(undefined);
                setModal("expense");
              }}
            >
              <Pencil size={17} />
              แก้ไขรายการ
            </button>
          </div>
        </Modal>
      )}
      {deletion && (
        <Modal title="ลบค่าใช้จ่ายนี้?" onClose={() => setDeletion(undefined)}>
          <p className="confirm-copy">
            ลบ “{deletion.name}” จำนวน ฿{money(deletion.amount)}{" "}
            ระบบจะคำนวณยอดใหม่ โดยยังเก็บประวัติเงินที่โอนแล้ว
          </p>
          <div className="modal-actions">
            <button
              className="btn white"
              onClick={() => setDeletion(undefined)}
            >
              ยกเลิก
            </button>
            <button
              className="btn danger-btn"
              onClick={() => {
                update({
                  ...trip,
                  expenses: trip.expenses.filter((e) => e.id !== deletion.id),
                });
                setDeletion(undefined);
                setNotice("ลบรายการแล้ว");
              }}
            >
              ยืนยันการลบ
            </button>
          </div>
        </Modal>
      )}
      {modal === "share" && (
        <Modal title="แชร์สรุปค่าใช้จ่าย" onClose={closeModal}>
          <p className="form-intro">
            คัดลอกข้อความ แล้วส่งใน LINE หรือ Messenger ได้เลย
          </p>
          <textarea
            className="share-text"
            value={shareText}
            readOnly
            aria-label="ข้อความสรุป"
          />
          <button
            className="btn primary full"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(shareText);
                setShareCopied(true);
              } catch {
                setError("คัดลอกอัตโนมัติไม่ได้ กรุณาเลือกข้อความและคัดลอกเอง");
              }
            }}
          >
            {shareCopied ? <Check size={18} /> : <Copy size={18} />}{" "}
            {shareCopied ? "คัดลอกแล้ว" : "คัดลอกข้อความ"}
          </button>
        </Modal>
      )}
      {modal === "help" && (
        <Modal title="หารกัน ใช้ง่ายนิดเดียว" onClose={closeModal}>
          <div className="help-steps">
            {[
              "สร้างทริป และเพิ่มชื่อเพื่อน",
              "เพิ่มค่าใช้จ่าย เลือกคนจ่ายและคนหาร",
              "ดูยอดสุทธิ และรายการที่ต้องโอน",
              "โอนจริง แล้วทำเครื่องหมายว่าจ่ายแล้ว",
            ].map((s, i) => (
              <p key={s}>
                <b>{i + 1}</b>
                {s}
              </p>
            ))}
          </div>
          <p className="form-note">
            เลือกหารเท่ากัน กำหนดยอดเอง หรือแบ่งตามเปอร์เซ็นต์ได้
            ระบบจับคู่ยอดที่ตรงกันก่อนเพื่อลดจำนวนการโอน เมื่อแก้ไขค่าใช้จ่าย
            ยอดคงเหลือจะคำนวณใหม่โดยนับเงินที่โอนแล้วด้วย
          </p>
          <p className="form-note">
            {remote
              ? "ข้อมูลบันทึกใน PostgreSQL ผูกกับเบราว์เซอร์นี้"
              : "ขณะนี้ข้อมูลบันทึกในเบราว์เซอร์นี้ การล้างข้อมูลเว็บไซต์จะลบประวัติทริป"}{" "}
            การแชร์เป็นข้อความสรุป ไม่ใช่ลิงก์แก้ไขร่วมกัน
          </p>
        </Modal>
      )}
    </div>
  );
}
