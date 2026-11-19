"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { emit, on, takeFresh, usePetInstalled } from "./bus";
import "./KinokoPet.css";

/* ============================================================
   Kinoko, peliharaan di desktop.
   Sprite: /public/pet/kinoko.png  (6 kolom x 3 baris, 18 frame)
   Baris 1 (frame 0-5)   = diam / napas
   Baris 2-3 (6-17)      = jalan, goyang, menengok
   ============================================================ */

const FW = 84; // lebar 1 frame di layar (px)
const FH = 88; // tinggi 1 frame di layar (px)
const COLS = 6;

const FRAMES = {
  idle: [0, 1, 2, 3, 4, 5],
  walk: [12, 13, 14, 15, 16, 6, 8, 9],
  look: [10, 11, 10, 17],
  dangle: [7, 10, 11, 17], // lagi diangkat
  scared: [7, 10],
};
const FPS: Record<string, number> = { idle: 5, walk: 9, look: 4, dangle: 7, scared: 14, talk: 4, fall: 7, sleep: 1 };

type Mode = "idle" | "walk" | "look" | "drag" | "fall" | "scared" | "talk" | "sleep";

// ---------- kalimat lokal (tidak memakai kuota AI) ----------
const IDLE_DAY = [
  "hm.",
  "the grass is warm today.",
  "puk puk.",
  "i wonder what's inside my documents.",
  "did you see the clouds?",
  "*wiggles*",
  "sini, duduk dulu.",
  "anginnya enak hari ini.",
  "psst. you can click me.",
  "the tree hasn't moved. i checked.",
];
const IDLE_NIGHT = [
  "it's dark...",
  "stay close, okay?",
  "the hill looks different now.",
  "*looks at the far hilltop*",
  "shh. listen.",
  "udah malam ya...",
  "i don't like the quiet part.",
  "...",
];
const WELCOME = ["hi! i'm kinoko.", "oh. it's so bright out here.", "puk! i'm out!"];
const GREET = ["puk?", "hi hi.", "hm? you called?", "hehe. hello."];
const MESSENGER = [
  "that's the one who lives in the window. be nice.",
  "they talk a lot. i mostly listen.",
  "say hi to them for me.",
];
const SCARED = [
  "shh! don't say that word.",
  "no no no. other topic please.",
  "...it can hear you.",
  "i didn't see anything. really.",
];
const SORRY = ["puk... my voice went away for a second.", "hm. say that again?"];

const ENTITY_RX = /entity|midnight|tengah malam|siluet|silhouette|the one at midnight|bayangan|hilltop|watcher/i;

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const isNight = () => typeof document !== "undefined" && document.documentElement.dataset.time === "night";

type ChatMsg = { role: "user" | "assistant"; content: string; local?: boolean };

export default function KinokoPet() {
  const installed = usePetInstalled();
  if (!installed) return null;
  return <Pet />;
}

function Pet() {
  const boxRef = useRef<HTMLDivElement>(null);
  const sprRef = useRef<HTMLDivElement>(null);

  const [mode, setModeState] = useState<Mode>("idle");
  const [hop, setHop] = useState(0); // naik tiap kali loncat (untuk restart animasi CSS)
  const [ring, setRing] = useState(0);
  const [say, setSay] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const sayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chatOpenRef = useRef(false);
  chatOpenRef.current = chatOpen;

  // semua state gerak disimpan di ref supaya animasi 60fps tidak memicu render React
  const S = useRef({
    x: 240,
    y: 600,
    vy: 0,
    land: 600,
    dir: 1,
    mode: "idle" as Mode,
    t: 0, // timer di mode sekarang
    wait: 2, // tunggu sebelum aksi berikutnya
    tx: 0,
    ty: 0,
    arrive: "" as "" | "called",
    ftime: 0,
    lastFrame: -1,
    nextTalk: rand(15, 30),
    quiet: 0, // lama tidak disentuh (untuk tidur di malam hari)
    drag: null as null | { dx: number; dy: number; sx: number; sy: number; moved: boolean },
  });

  const setMode = useCallback((m: Mode) => {
    const s = S.current;
    if (s.mode === m) return;
    s.mode = m;
    s.t = 0;
    s.ftime = 0;
    setModeState(m);
  }, []);

  const speak = useCallback((text: string, ms = 3800, force = false) => {
    if (chatOpenRef.current && !force) return;
    setSay(text);
    if (sayTimer.current) clearTimeout(sayTimer.current);
    sayTimer.current = setTimeout(() => setSay(null), ms);
  }, []);

  const wake = useCallback(() => {
    const s = S.current;
    s.quiet = 0;
    if (s.mode === "sleep") {
      setMode("idle");
      s.wait = 1.5;
    }
  }, [setMode]);

  const doHop = useCallback(() => setHop((h) => h + 1), []);

  // ---------- awal: muncul (jatuh dari atas kalau baru di-install) ----------
  useEffect(() => {
    const s = S.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const top = Math.max(vh * 0.7, 260);
    const bot = vh - 16;
    const fresh = takeFresh();
    s.x = fresh ? rand(vw * 0.25, vw * 0.55) : rand(FW, vw - FW);
    s.land = rand(top + 10, bot - 6);
    if (fresh) {
      s.y = -FH - 30;
      s.vy = 0;
      s.mode = "fall";
      setModeState("fall");
      const t1 = setTimeout(() => speak(pick(WELCOME), 4200), 900);
      return () => clearTimeout(t1);
    }
    s.y = s.land;
    return undefined;
  }, [speak]);

  // ---------- loop animasi ----------
  useEffect(() => {
    const el = boxRef.current;
    const spr = sprRef.current;
    if (!el || !spr) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = S.current;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const top = Math.max(vh * 0.7, 260);
      const bot = vh - 16;
      s.t += dt;
      s.ftime += dt;
      if (s.mode === "idle" || s.mode === "walk" || s.mode === "look") s.quiet += dt; // lama tidak disentuh

      switch (s.mode) {
        case "idle": {
          if (isNight() && s.quiet > 45 && !chatOpenRef.current) {
            setMode("sleep");
            break;
          }
          if (s.t > s.wait) {
            const r = Math.random();
            if (r < 0.65 && !reduce) {
              let tx = rand(FW, vw - FW);
              if (Math.abs(tx - s.x) < 120) tx = clamp(s.x + (Math.random() < 0.5 ? -1 : 1) * rand(140, 320), FW, vw - FW);
              s.tx = tx;
              s.ty = rand(top, bot);
              s.arrive = "";
              setMode("walk");
            } else if (r < 0.85) {
              setMode("look");
            } else {
              s.t = 0;
              s.wait = rand(2, 5);
            }
          }
          break;
        }
        case "walk": {
          const speed = isNight() ? 30 : 42;
          const dx = s.tx - s.x;
          const dy = s.ty - s.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 4) {
            const a = s.arrive;
            s.arrive = "";
            setMode("idle");
            s.wait = rand(1.5, 5);
            if (a === "called") {
              doHop();
              speak(pick(GREET));
            }
          } else {
            const v = s.arrive === "called" ? speed * 1.9 : speed;
            s.x += (dx / dist) * v * dt;
            s.y += (dy / dist) * v * 0.6 * dt;
            if (Math.abs(dx) > 2) s.dir = dx > 0 ? 1 : -1;
          }
          break;
        }
        case "look":
          if (s.t > 1.8) {
            setMode("idle");
            s.wait = rand(1.5, 4);
          }
          break;
        case "scared":
          if (s.t > 3) {
            setMode("idle");
            s.wait = rand(2, 4);
          }
          break;
        case "drag": {
          s.y = clamp(s.y, FH * 0.6, vh);
          break;
        }
        case "fall": {
          s.vy += 2200 * dt;
          s.y += s.vy * dt;
          if (s.y >= s.land) {
            s.y = s.land;
            s.vy = 0;
            setMode("idle");
            s.wait = rand(1.5, 3);
            doHop();
            setRing((r) => r + 1);
          }
          break;
        }
        default:
          break; // talk / sleep: diam
      }

      s.x = clamp(s.x, FW / 2, vw - FW / 2);
      if (s.mode !== "fall" && s.mode !== "drag") s.y = clamp(s.y, top, bot);

      // ucapan acak
      if (s.mode === "idle" || s.mode === "walk") {
        s.nextTalk -= dt;
        if (s.nextTalk <= 0) {
          s.nextTalk = rand(25, 50);
          if (!document.hidden && !chatOpenRef.current) speak(pick(isNight() ? IDLE_NIGHT : IDLE_DAY));
        }
      }

      // frame sprite
      const key = s.mode === "drag" ? "dangle" : s.mode === "fall" ? "dangle" : s.mode === "talk" || s.mode === "sleep" ? "idle" : s.mode;
      const list = FRAMES[key as keyof typeof FRAMES] ?? FRAMES.idle;
      const f = list[Math.floor(s.ftime * (FPS[s.mode] ?? 5)) % list.length];
      if (f !== s.lastFrame) {
        s.lastFrame = f;
        spr.style.backgroundPosition = `${-(f % COLS) * FW}px ${-Math.floor(f / COLS) * FH}px`;
      }

      // posisi, skala (makin ke bawah makin besar), arah
      const depth = clamp((s.y - top) / Math.max(1, bot - top), 0, 1);
      const k = 0.82 + 0.38 * depth;
      el.style.transform = `translate3d(${s.x - FW / 2}px, ${s.y - FH}px, 0)`;
      spr.style.transform = `scale(${k}) scaleX(${s.dir})`;
      el.style.setProperty("--k", String(k));
      const half = 122;
      const shift = s.x < half + 8 ? half + 8 - s.x : s.x > vw - half - 8 ? -(s.x - (vw - half - 8)) : 0;
      el.style.setProperty("--bs", `${shift}px`);

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [setMode, speak, doHop]);

  // ---------- dengar event dari bagian lain ----------
  useEffect(() => {
    const offs = [
      on("pet:call", () => {
        const s = S.current;
        wake();
        if (s.mode === "drag" || s.mode === "fall") return;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        s.tx = clamp(vw / 2 + rand(-120, 120), FW, vw - FW);
        s.ty = rand(Math.max(vh * 0.7, 260) + 10, vh - 24);
        s.arrive = "called";
        setMode("walk");
      }),
      on("chat:opened", () => {
        wake();
        const s = S.current;
        if (s.mode === "idle" || s.mode === "walk") {
          s.dir = 1; // Messenger ada di sisi kanan
          if (Math.random() < 0.7) speak(pick(MESSENGER), 4500);
        }
      }),
      on("chat:user", (d) => {
        wake();
        const text = String((d as { text?: string } | undefined)?.text ?? "");
        const s = S.current;
        if (ENTITY_RX.test(text) && s.mode !== "drag" && s.mode !== "fall") {
          setMode("scared");
          speak(pick(SCARED), 3500, true);
        }
      }),
    ];
    return () => offs.forEach((o) => o());
  }, [setMode, speak, wake]);

  // siang <-> malam
  useEffect(() => {
    let prev = isNight();
    const id = setInterval(() => {
      const n = isNight();
      if (n === prev) return;
      prev = n;
      wake();
      speak(n ? "it's getting dark... stay close." : "morning. the hill is warm again.", 4500);
    }, 4000);
    return () => clearInterval(id);
  }, [speak, wake]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [msgs, busy, chatOpen]);

  // ---------- pointer: seret & klik ----------
  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest(".k-chat")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const s = S.current;
    s.drag = { dx: e.clientX - s.x, dy: e.clientY - s.y, sx: e.clientX, sy: e.clientY, moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const s = S.current;
    const d = s.drag;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 5) {
      d.moved = true;
      wake();
      setSay(null);
      setMode("drag");
    }
    if (d.moved) {
      s.x = e.clientX - d.dx;
      s.y = e.clientY - d.dy;
    }
  };
  const onUp = () => {
    const s = S.current;
    const d = s.drag;
    s.drag = null;
    if (!d) return;
    if (d.moved) {
      const vh = window.innerHeight;
      const top = Math.max(vh * 0.7, 260);
      const bot = vh - 16;
      s.land = clamp(s.y, top, bot);
      s.vy = 0;
      if (s.y >= s.land) {
        s.y = s.land;
        setMode("idle");
        s.wait = 1.5;
        doHop();
      } else {
        setMode("fall");
      }
      return;
    }
    // klik biasa: loncat + buka/tutup kotak ngobrol
    wake();
    doHop();
    if (chatOpenRef.current) {
      setChatOpen(false);
      if (S.current.mode === "talk") setMode("idle");
    } else {
      setSay(null);
      setChatOpen(true);
      setMode("talk");
      setMsgs((m) => (m.length ? m : [{ role: "assistant", content: pick(GREET), local: true }]));
    }
  };

  const closeChat = () => {
    setChatOpen(false);
    if (S.current.mode === "talk") {
      setMode("idle");
      S.current.wait = 1.5;
    }
  };

  // ---------- ngobrol dengan AI ----------
  const send = async (text: string) => {
    const content = text.trim().slice(0, 300);
    if (!content || busy) return;
    const next: ChatMsg[] = [...msgs, { role: "user", content }];
    setMsgs(next);
    setBusy(true);
    emit("pet:user", { text: content });
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          who: "pet",
          messages: next.filter((m) => !m.local).map(({ role, content }) => ({ role, content })),
          time: isNight() ? "night" : "day",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.reply) throw new Error(data.error ?? "failed");
      setMsgs([...next, { role: "assistant", content: String(data.reply) }]);
      if (ENTITY_RX.test(content)) {
        setMode("scared");
        setTimeout(() => chatOpenRef.current && S.current.mode === "scared" && setMode("talk"), 2500);
      }
    } catch {
      setMsgs([...next, { role: "assistant", content: pick(SORRY), local: true }]);
    } finally {
      setBusy(false);
    }
  };

  const night = typeof document !== "undefined" && isNight();

  return (
    <div className="k-layer" aria-live="polite">
      <div
        ref={boxRef}
        className={`k-box k-${mode}`}
        style={{ width: FW, height: FH }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="k-shadow" />
        {ring > 0 && <span key={ring} className="k-ring" />}
        <div className={`k-hop${hop ? (hop % 2 ? " goA" : " goB") : ""}`}>
          <div
            ref={sprRef}
            className="k-spr"
            style={{ width: FW, height: FH, backgroundSize: `${FW * COLS}px ${FH * 3}px` }}
          />
        </div>
        {mode === "sleep" && <span className="k-zzz">z<i>z</i><b>Z</b></span>}

        {say && !chatOpen && mode !== "drag" && (
          <div className="k-bubble" role="status">
            {say}
          </div>
        )}

        {chatOpen && mode !== "drag" && (
          <div className="k-bubble k-chat" onPointerDown={(e) => e.stopPropagation()}>
            <div className="k-chat-head">
              <span>Kinoko</span>
              <button aria-label="Close" onClick={closeChat}>×</button>
            </div>
            <div className="k-log" ref={logRef}>
              {msgs.map((m, i) => (
                <p key={i} className={m.role === "user" ? "me" : "them"}>
                  <b>{m.role === "user" ? "you" : "kinoko"}:</b> {m.content}
                </p>
              ))}
              {busy && (
                <p className="them">
                  <b>kinoko:</b> …
                </p>
              )}
            </div>
            <form
              className="k-send"
              onSubmit={(e) => {
                e.preventDefault();
                const t = draft;
                setDraft("");
                send(t);
              }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={300}
                placeholder={night ? "shh... say something" : "say something"}
                aria-label="Message to Kinoko"
                autoFocus
              />
              <button type="submit" disabled={busy}>Send</button>
            </form>
            <button className="k-link" onClick={() => emit("messenger:open")}>
              → talk to the one in the window
            </button>
          </div>
        )}
      </div>
    </div>
  );
}