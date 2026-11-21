"use client";

import { useEffect, useRef, useState } from "react";
import Browser from "./Browser";
import Explorer from "./Explorer";
import PopupWindow, { Ico } from "./PopupWindow";
import { emit, isPetInstalled, on } from "./bus";
import { ICONS, getNode } from "./fs";
import { TARGETS } from "./targets";
import { nextOrder, nextZ, setGroup } from "./wm";

type Entry = { label: string; icon: string; open?: string[]; compact?: boolean; text?: string; browser?: boolean };
type WinData = {
  id: number; t: number; min?: boolean; title: string; icon: string; x: number; y: number; z: number;
  text?: string; image?: string; explorer?: string[]; compact?: boolean; browser?: boolean; page?: "home" | "kinoko";
};
type OpenData = { title: string; icon: string; text?: string; image?: string; explorer?: string[]; compact?: boolean; browser?: boolean; page?: "home" | "kinoko" };

// `open` = buka File Explorer di folder itu. `compact: true` = panel folder di kiri tertutup dulu (bisa dibuka lewat tombol Folders). `text` = jendela teks sederhana.
// Isi folder & file diatur di fs.ts, ikon di ICONS (juga di fs.ts).
const ENTRIES: Entry[] = [
  { label: "My Computer", icon: ICONS.computer, open: ["Desktop", "My Computer"] },
  { label: "My Documents", icon: ICONS.documents, open: ["Desktop", "My Documents"], compact: true },
  { label: "Internet Explorer", icon: ICONS.ie, browser: true }, // halaman & download Kinoko ada di Browser.tsx
  { label: "Network Neighborhood", icon: ICONS.network, open: ["Desktop", "Network Neighborhood"] },
  { label: "Recycle Bin", icon: ICONS.recycle, open: ["Desktop", "Recycle Bin"] },
  { label: "Shortcut to Internet", icon: ICONS.shortcut, text: "This shortcut points to nowhere in particular." },
];

export default function DesktopIcons() {
  const [sel, setSel] = useState<string | null>(null);
  const [wins, setWins] = useState<WinData[]>([]);
  const nextId = useRef(1);

  useEffect(() => {
    const away = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest(".icon")) setSel(null);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, []);

  // laporkan daftar jendela ke taskbar
  useEffect(() => {
    setGroup("desk", wins.map((w) => ({ key: `d${w.id}`, title: w.title, icon: w.icon, z: w.z, min: !!w.min, t: w.t })));
  }, [wins]);
  useEffect(() => () => setGroup("desk", []), []);

  // bawa ke depan + keluarkan dari minimize
  const show = (id: number) => {
    const z = nextZ();
    setWins((ws) => ws.map((w) => (w.id === id ? { ...w, z, min: false } : w)));
  };
  const minimize = (id: number) => setWins((ws) => ws.map((w) => (w.id === id ? { ...w, min: true } : w)));
  const focus = (id: number) => {
    const z = nextZ();
    setWins((ws) => ws.map((w) => (w.id === id ? { ...w, z } : w)));
  };

  // perintah dari taskbar
  useEffect(() => {
    const idOf = (d: unknown) => {
      const key = String((d as { key?: string } | undefined)?.key ?? "");
      return key.startsWith("d") ? Number(key.slice(1)) : NaN;
    };
    const offs = [
      on("wm:focus", (d) => {
        const id = idOf(d);
        if (!Number.isNaN(id)) showRef.current(id);
      }),
      on("wm:restore", (d) => {
        const id = idOf(d);
        if (!Number.isNaN(id)) showRef.current(id);
      }),
      on("wm:minimize", (d) => {
        const id = idOf(d);
        if (!Number.isNaN(id)) setWins((ws) => ws.map((w) => (w.id === id ? { ...w, min: true } : w)));
      }),
      on("wm:closeall", () => setWins([])),
    ];
    return () => offs.forEach((o) => o());
  }, []);
  const showRef = useRef(show);
  showRef.current = show;

  const open = (data: OpenData) => {
    const existing = wins.find((w) => w.title === data.title);
    if (existing) {
      show(existing.id);
      if (data.page && existing.browser) emit("browser:go", { page: data.page });
      return;
    }
    const id = nextId.current++;
    const x = Math.min(130 + (id % 6) * 28, Math.max(0, window.innerWidth - 320));
    const y = 90 + (id % 6) * 28;
    setWins((ws) => [...ws, { ...data, id, t: nextOrder(), x, y, z: nextZ() }]);
  };

  const openEntry = (e: Entry) =>
    e.browser
      ? open({ title: e.label, icon: e.icon, browser: true })
      : e.open
        ? open({ title: e.label, icon: e.icon, explorer: e.open, compact: e.compact })
        : open({ title: e.label, icon: e.icon, text: e.text });

  // dipanggil Kinoko, menu Start, dan Run lewat event "desktop:open" (hanya id yang ada di targets.ts)
  const openTarget = (id: string) => {
    const t = TARGETS[id]?.t;
    if (!t) return;
    if (t.kind === "entry") {
      const e = ENTRIES.find((x) => x.label === t.label);
      if (e) openEntry(e);
    } else if (t.kind === "folder") {
      open({ title: t.title, icon: t.drive ? ICONS.drive : ICONS.folder, explorer: t.path });
    } else if (t.kind === "file") {
      const n = getNode(t.path);
      if (n) open({ title: n.name, icon: n.icon, text: n.text ?? "", image: n.image });
    } else if (t.kind === "text") {
      open({ title: t.title, icon: ICONS.text, text: t.text });
    } else if (t.kind === "messenger") {
      emit("messenger:open");
    } else if (t.kind === "kinoko") {
      if (isPetInstalled()) emit("pet:call");
      else open({ title: "Internet Explorer", icon: ICONS.ie, browser: true, page: "kinoko" });
    } else if (t.kind === "closeAll") {
      emit("wm:closeall");
    }
  };
  const openTargetRef = useRef(openTarget);
  openTargetRef.current = openTarget; // selalu versi terbaru (supaya tidak memakai daftar jendela yang basi)
  useEffect(() => on("desktop:open", (d) => openTargetRef.current(String((d as { id?: string } | undefined)?.id ?? ""))), []);

  return (
    <>
      <ul className="icons">
        {ENTRIES.map((e) => (
          <li
            key={e.label}
            className={`icon${sel === e.label ? " sel" : ""}`}
            tabIndex={0}
            onClick={() => setSel(e.label)}
            onDoubleClick={() => openEntry(e)}
            onKeyDown={(ev) => ev.key === "Enter" && openEntry(e)}
          >
            <span className="glyph" aria-hidden><Ico src={e.icon} size={36} /></span>
            <span className="label">{e.label}</span>
          </li>
        ))}
      </ul>

      <div className="windows">
        {wins.map((w) => {
          const close = () => setWins((ws) => ws.filter((x) => x.id !== w.id));
          const common = { onFocus: () => focus(w.id), onClose: close, minimized: w.min, onMinimize: () => minimize(w.id) };
          if (w.browser) {
            return (
              <PopupWindow
                key={w.id}
                w={w}
                {...common}
                onOpenFile={() => {}}
                size={[640, 480]}
                menu={["File", "Edit", "View", "Favorites", "Tools", "Help"]}
              >
                <Browser initial={w.page} />
              </PopupWindow>
            );
          }
          return w.explorer ? (
            <Explorer
              key={w.id}
              w={w}
              {...common}
              onOpenFile={(f) => open({ title: f.name, icon: f.icon, text: f.text ?? "", image: f.image })}
            />
          ) : (
            <PopupWindow key={w.id} w={w} {...common} onOpenFile={() => {}} />
          );
        })}
      </div>
    </>
  );
}