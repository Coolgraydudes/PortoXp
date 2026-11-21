"use client";

import { useEffect, useRef, useState } from "react";
import { emit, usePetInstalled } from "./bus";
import { ICONS } from "./fs";
import { Ico } from "./PopupWindow";
import { resolveRun } from "./targets";
import { activeKey, useWindows, type WinInfo } from "./wm";
import "./Taskbar.css";

type MItem = {
  label: string;
  icon?: string;
  id?: string; // id target di targets.ts (dibuka lewat event "desktop:open")
  run?: () => void;
  sub?: MItem[];
  sep?: boolean;
};

type Phase = "closing" | "off" | "restart" | "booting";

const isNight = () => document.documentElement.dataset.time === "night";

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);
  if (!now) return <span className="tb-clock" />;
  return (
    <span className="tb-clock" title={now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}>
      {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}
    </span>
  );
}

export default function Taskbar() {
  const wins = useWindows();
  const petInstalled = usePetInstalled();
  const [menu, setMenu] = useState(false);
  const [sub, setSub] = useState<string | null>(null);
  const [dlg, setDlg] = useState<null | "run" | "shutdown">(null);
  const [runText, setRunText] = useState("");
  const [runErr, setRunErr] = useState("");
  const [sdMode, setSdMode] = useState<"off" | "restart">("off");
  const [phase, setPhase] = useState<Phase | null>(null);
  const [night, setNight] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);

  const active = activeKey(wins);

  // tutup menu Start kalau klik di luar atau tekan Escape
  useEffect(() => {
    if (!menu) return;
    const away = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !startRef.current?.contains(t)) {
        setMenu(false);
        setSub(null);
      }
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false);
        setSub(null);
      }
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [menu]);

  const toggleWin = (w: WinInfo) => {
    if (w.min) emit("wm:restore", { key: w.key });
    else if (w.key === active) emit("wm:minimize", { key: w.key });
    else emit("wm:focus", { key: w.key });
  };

  const closeMenu = () => {
    setMenu(false);
    setSub(null);
  };

  const open = (id: string) => emit("desktop:open", { id });

  const items: MItem[] = [
    {
      label: "Programs",
      icon: ICONS.folder,
      sub: [
        { label: "My Computer", icon: ICONS.computer, id: "my-computer" },
        { label: "My Documents", icon: ICONS.documents, id: "my-documents" },
        { label: "Internet Explorer", icon: ICONS.ie, id: "internet-explorer" },
        { label: "Messenger", icon: "💬", id: "messenger" },
        { label: petInstalled ? "Kinoko" : "Kinoko (download)", icon: "🍄", id: "kinoko" },
      ],
    },
    {
      label: "Documents",
      icon: ICONS.documents,
      sub: [
        { label: "small things.txt", icon: ICONS.text, id: "small-things" },
        { label: "to do.txt", icon: ICONS.text, id: "to-do" },
        { label: "untitled.txt", icon: ICONS.text, id: "untitled" },
        { label: "readme.txt", icon: ICONS.text, id: "readme" },
      ],
    },
    {
      label: "Find",
      icon: "🔍",
      run: () => document.querySelector<HTMLInputElement>(".search input")?.focus(),
    },
    { label: "Help", icon: "❓", id: "help" },
    {
      label: "Run...",
      icon: "▶",
      run: () => {
        setRunText("");
        setRunErr("");
        setDlg("run");
      },
    },
    { label: "", sep: true },
    { label: "Log Off...", icon: "🔑", run: () => emit("sys:lock") },
    { label: "Shut Down...", icon: "⏻", run: () => setDlg("shutdown") },
  ];

  const act = (it: MItem) => {
    closeMenu();
    if (it.id) open(it.id);
    else it.run?.();
  };

  // ---------- Run ----------
  const submitRun = (e: React.FormEvent) => {
    e.preventDefault();
    const v = runText.trim();
    if (!v) return;
    const id = resolveRun(v);
    if (!id) {
      setRunErr(`Cannot find '${v}'. Make sure you typed the name correctly, and then try again.`);
      return;
    }
    setDlg(null);
    open(id);
  };

  // ---------- Shut Down / Restart ----------
  const doShutdown = () => {
    setDlg(null);
    emit("wm:closeall");
    setNight(isNight());
    setPhase("closing");
  };

  useEffect(() => {
    if (!phase) return;
    if (phase === "booting") emit("sys:lock"); // layar login muncul di bawah layar hitam yang sedang memudar
    let t: ReturnType<typeof setTimeout> | undefined;
    if (phase === "closing") t = setTimeout(() => setPhase(sdMode), 950);
    else if (phase === "restart") t = setTimeout(() => setPhase("booting"), 1800);
    else if (phase === "booting") t = setTimeout(() => setPhase(null), 1500);
    else if (phase === "off") {
      // di layar "aman dimatikan", sentuhan / tombol apa pun menyalakan komputer lagi
      const wakeUp = () => setPhase("booting");
      const arm = setTimeout(() => {
        window.addEventListener("pointerdown", wakeUp, { once: true });
        window.addEventListener("keydown", wakeUp, { once: true });
      }, 600);
      return () => {
        clearTimeout(arm);
        window.removeEventListener("pointerdown", wakeUp);
        window.removeEventListener("keydown", wakeUp);
      };
    }
    return () => clearTimeout(t);
  }, [phase, sdMode]);

  return (
    <>
      <div className="tb" role="toolbar" aria-label="Taskbar">
        <button
          ref={startRef}
          className={`tb-start${menu ? " on" : ""}`}
          aria-expanded={menu}
          onClick={() => {
            setMenu(!menu);
            setSub(null);
          }}
        >
          <span className="tb-flag" aria-hidden>
            <i /><i /><i /><i />
          </span>
          Start
        </button>
        <span className="tb-div" />

        <div className="tb-wins">
          {wins.map((w) => (
            <button
              key={w.key}
              className={`tb-win${w.key === active ? " act" : ""}`}
              title={w.title}
              onClick={() => toggleWin(w)}
            >
              <Ico src={w.icon} size={16} />
              <span>{w.title}</span>
            </button>
          ))}
        </div>

        <div className="tb-tray">
          {petInstalled && (
            <button className="tb-kin" title="Kinoko (click to call)" aria-label="Call Kinoko" onClick={() => emit("pet:call")} />
          )}
          <Clock />
        </div>
      </div>

      {menu && (
        <div className="tb-menu" ref={menuRef} role="menu">
          <div className="tb-banner" aria-hidden><span>PortoXp</span></div>
          <ul>
            {items.map((it, i) =>
              it.sep ? (
                <li key={`s${i}`} className="tb-sep" role="separator" />
              ) : (
                <li
                  key={it.label}
                  role="menuitem"
                  className={`tb-it${sub === it.label ? " on" : ""}`}
                  onMouseEnter={() => setSub(it.sub ? it.label : null)}
                  onClick={() => (it.sub ? setSub(sub === it.label ? null : it.label) : act(it))}
                >
                  {it.icon && <Ico src={it.icon} size={24} />}
                  <span>{it.label}</span>
                  {it.sub && <i>▶</i>}
                  {it.sub && sub === it.label && (
                    <ul className="tb-subm" role="menu">
                      {it.sub.map((s) => (
                        <li
                          key={s.label}
                          role="menuitem"
                          className="tb-it"
                          onClick={(e) => {
                            e.stopPropagation();
                            act(s);
                          }}
                        >
                          {s.icon && <Ico src={s.icon} size={16} />}
                          <span>{s.label}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            )}
          </ul>
        </div>
      )}

      {dlg === "run" && (
        <form className="tb-dlg" role="dialog" aria-label="Run" onSubmit={submitRun}>
          <div className="tb-dlg-t">
            <span>Run</span>
            <button type="button" aria-label="Close" onClick={() => setDlg(null)}>×</button>
          </div>
          <div className="tb-dlg-b">
            <p>Type the name of a program, folder, document, or Internet resource, and I&apos;ll open it for you.</p>
            <label className="tb-run">
              Open:
              <input
                value={runText}
                onChange={(e) => {
                  setRunText(e.target.value);
                  setRunErr("");
                }}
                spellCheck={false}
                autoComplete="off"
                autoFocus
              />
            </label>
            {runErr && <p className="tb-err">{runErr}</p>}
            <div className="tb-row">
              <button type="submit">OK</button>
              <button type="button" onClick={() => setDlg(null)}>Cancel</button>
            </div>
          </div>
        </form>
      )}

      {dlg === "shutdown" && (
        <div className="tb-dlg" role="dialog" aria-label="Shut Down">
          <div className="tb-dlg-t">
            <span>Shut Down</span>
            <button type="button" aria-label="Close" onClick={() => setDlg(null)}>×</button>
          </div>
          <div className="tb-dlg-b">
            <p>What do you want the computer to do?</p>
            <label className="tb-radio">
              <input type="radio" name="sd" checked={sdMode === "off"} onChange={() => setSdMode("off")} /> Shut down
            </label>
            <label className="tb-radio">
              <input type="radio" name="sd" checked={sdMode === "restart"} onChange={() => setSdMode("restart")} /> Restart
            </label>
            <div className="tb-row">
              <button type="button" onClick={doShutdown}>OK</button>
              <button type="button" onClick={() => setDlg(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {phase && (
        <div className="sd" data-p={phase} role="alert">
          {phase === "off" && (
            <>
              <p>It&apos;s now safe to turn off<br />your computer.</p>
              {night && <p className="sd-ghost">someone is still here.</p>}
              <p className="sd-hint">(click anywhere to turn it back on)</p>
            </>
          )}
          {phase === "restart" && <p>Restarting...</p>}
          {phase === "booting" && <p>Starting up...</p>}
        </div>
      )}
    </>
  );
}