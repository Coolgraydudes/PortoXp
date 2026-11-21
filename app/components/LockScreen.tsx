"use client";

import { useEffect, useRef, useState } from "react";
import { on } from "./bus";
import "./LockScreen.css";

// Layar "Welcome" ala Windows XP: pilih pengguna -> ketik nama (boleh kosong) -> "welcome" -> desktop.
// Cuma muncul sekali per tab (refresh tidak mengulang). Muncul lagi lewat Start > Log Off / Restart (event "sys:lock").

type Stage = "pick" | "pass" | "welcome" | "gone";
const DONE = "lock:done";
const NAME = "user:name";

export default function LockScreen() {
  const [stage, setStage] = useState<Stage>("pick"); // dirender "pick" di server supaya desktop tidak sempat terlihat
  const [name, setName] = useState("");
  const [saved, setSaved] = useState("visitor");
  const [leaving, setLeaving] = useState(false);
  const [note, setNote] = useState("");
  const inRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DONE) === "1") setStage("gone");
      const n = localStorage.getItem(NAME);
      if (n) setSaved(n);
    } catch {
      /* storage diblokir: tidak apa-apa */
    }
  }, []);

  // Restart / Log Off
  useEffect(
    () =>
      on("sys:lock", () => {
        try {
          sessionStorage.removeItem(DONE);
        } catch {}
        setName("");
        setNote("");
        setLeaving(false);
        setStage("pick");
      }),
    []
  );

  // desktop di belakang tidak bisa difokus / diklik selama layar ini ada
  useEffect(() => {
    const el = document.querySelector(".desktop");
    if (!el) return;
    if (stage === "gone") el.removeAttribute("inert");
    else el.setAttribute("inert", "");
    return () => el.removeAttribute("inert");
  }, [stage]);

  useEffect(() => {
    if (stage !== "pass") return;
    // sedikit ditunda: klik yang membuka kolom ini masih memindahkan fokus ke body setelah pointerdown
    const t = setTimeout(() => inRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [stage]);

  // "welcome" sebentar, lalu fade ke desktop
  useEffect(() => {
    if (stage !== "welcome") return;
    try {
      sessionStorage.setItem(DONE, "1");
    } catch {}
    const a = setTimeout(() => setLeaving(true), 1700);
    const b = setTimeout(() => setStage("gone"), 2400);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [stage]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim() || saved;
    setSaved(n);
    try {
      localStorage.setItem(NAME, n);
    } catch {}
    setStage("welcome");
  };

  if (stage === "gone") return null;

  const shown = stage === "welcome" ? saved : name.trim() || saved;

  return (
    <div className={`lk${leaving ? " out" : ""}`} data-s={stage} role="dialog" aria-label="Welcome">
      <div className="lk-top" aria-hidden />
      <div className="lk-bot" aria-hidden />

      {stage !== "welcome" && (
        <div className="lk-main">
          <div className="lk-left">
            <div className="lk-logo" aria-hidden>
              <span className="lk-flag"><i /><i /><i /><i /></span>
              <span className="lk-brand">Porto<b>Xp</b></span>
            </div>
            <p className="lk-begin">To begin, click your user name</p>
          </div>

          <div className="lk-sep" aria-hidden />

          <div className="lk-right">
            <button
              type="button"
              className={`lk-user${stage === "pass" ? " on" : ""}`}
              onClick={() => setStage("pass")}
              aria-label={`Log on as ${saved}`}
            >
              <span className="lk-pic" aria-hidden>🌳</span>
              <span className="lk-name">{shown}</span>
            </button>

            {stage === "pass" && (
              <form className="lk-pw" onSubmit={submit}>
                <p>Type your name, or leave it empty</p>
                <div className="lk-row">
                  <input
                    ref={inRef}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={20}
                    spellCheck={false}
                    autoComplete="off"
                    placeholder={saved}
                    aria-label="User name"
                  />
                  <button type="submit" aria-label="Go">→</button>
                </div>
                <small>(there is no password. there never was.)</small>
              </form>
            )}
            {stage === "pick" && <p className="lk-click">click to continue</p>}
          </div>
        </div>
      )}

      {stage === "welcome" && (
        <div className="lk-wel">
          <p>welcome</p>
          <small>{shown}</small>
        </div>
      )}

      {stage !== "welcome" && (
        <div className="lk-foot">
          <button type="button" className="lk-off" onClick={() => setNote("you can't leave yet.")}>
            <span aria-hidden>⏻</span> Turn off computer
          </button>
          <span className="lk-foot-r">{note || "After you log on, nobody will check."}</span>
        </div>
      )}
    </div>
  );
}