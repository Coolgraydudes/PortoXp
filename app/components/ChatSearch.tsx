"use client";

import { useEffect, useRef, useState } from "react";
import PopupWindow from "./PopupWindow";
import { emit, on, usePetInstalled } from "./bus";
import "./ChatSearch.css";

type Msg = { role: "user" | "assistant"; content: string; err?: boolean };

const NAME = "???"; // nama lawan bicara di jendela chat

export default function ChatSearch() {
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const petInstalled = usePetInstalled();

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [msgs, busy, open]);

  // kabari Kinoko kalau Messenger dibuka, dan buka Messenger kalau Kinoko memintanya
  useEffect(() => {
    if (open) emit("chat:opened");
  }, [open]);
  useEffect(() => on("messenger:open", () => setOpen(true)), []);

  const send = async (text: string) => {
    const content = text.trim().slice(0, 500);
    if (!content || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content }];
    setMsgs(next);
    setOpen(true);
    setBusy(true);
    emit("chat:user", { text: content });
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.filter((m) => !m.err).map(({ role, content }) => ({ role, content })),
          time: document.documentElement.dataset.time === "night" ? "night" : "day",
          pet: petInstalled, // kasih tahu AI kalau Kinoko ada di desktop
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.reply) throw new Error(data.error ?? "failed");
      setMsgs([...next, { role: "assistant", content: data.reply }]);
      emit("chat:reply", { text: data.reply });
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      setMsgs([
        ...next,
        {
          role: "assistant",
          err: true,
          content:
            code === "no_key"
              ? "(GROQ_API_KEY belum ada. isi di .env.local lalu restart npm run dev.)"
              : code === "bad_key"
                ? "(GROQ_API_KEY ditolak. cek lagi key-nya di .env.local, lalu restart npm run dev.)"
                : "(sinyalnya putus sebentar. coba lagi.)",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const v = q.trim();
    const cmd = v.match(/^\/msg(?:\s+([\s\S]*))?$/i);
    if (cmd) {
      setQ("");
      if (cmd[1]) send(cmd[1]);
      else setOpen(true);
      return;
    }
    if (v) window.open(`https://www.google.com/search?q=${encodeURIComponent(v)}`, "_blank", "noopener");
  };

  return (
    <>
      <form className="search" onSubmit={onSearch}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" aria-hidden>
          <circle cx="10" cy="10" r="6.5" />
          <path d="M15 15l7 7" strokeLinecap="round" />
        </svg>
        <input
          name="q"
          aria-label="Search"
          autoComplete="off"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </form>

      {open && (
        <div className="windows">
          <PopupWindow
            w={{ id: 0, title: "Messenger", icon: "💬", x: Math.max(8, window.innerWidth - 440), y: 130, z: 50 }}
            onFocus={() => {}}
            onClose={() => setOpen(false)}
            onOpenFile={() => {}}
          >
            <div className="chat">
              <div className="chat-log" ref={logRef}>
                {msgs.length === 0 && <p className="chat-hint">type /msg and say something.</p>}
                {msgs.map((m, i) => (
                  <p key={i} className={m.role === "user" ? "me" : "them"}>
                    <b>{m.role === "user" ? "you" : NAME}:</b> {m.content}
                  </p>
                ))}
                {busy && (
                  <p className="them"><b>{NAME}:</b> …</p>
                )}
              </div>
              <form
                className="chat-send"
                onSubmit={(e) => {
                  e.preventDefault();
                  const t = draft;
                  setDraft("");
                  send(t);
                }}
              >
                <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={500} aria-label="Message" />
                <button type="submit" disabled={busy}>Send</button>
              </form>
            </div>
          </PopupWindow>
        </div>
      )}
    </>
  );
}