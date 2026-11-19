"use client";

import { useEffect, useRef, useState } from "react";
import Browser from "./Browser";
import Explorer from "./Explorer";
import PopupWindow, { Ico } from "./PopupWindow";
import { ICONS } from "./fs";

type Entry = { label: string; icon: string; open?: string[]; compact?: boolean; text?: string; browser?: boolean };
type WinData = { id: number; title: string; icon: string; x: number; y: number; z: number; text?: string; image?: string; explorer?: string[]; compact?: boolean; browser?: boolean };

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
  const topZ = useRef(1);

  useEffect(() => {
    const away = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest(".icon")) setSel(null);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, []);

  const focus = (id: number) => {
    const z = ++topZ.current;
    setWins((ws) => ws.map((w) => (w.id === id ? { ...w, z } : w)));
  };

  const open = (data: { title: string; icon: string; text?: string; image?: string; explorer?: string[]; compact?: boolean; browser?: boolean }) => {
    const existing = wins.find((w) => w.title === data.title);
    if (existing) return focus(existing.id);
    const id = nextId.current++;
    const x = Math.min(130 + (id % 6) * 28, Math.max(0, window.innerWidth - 320));
    const y = 90 + (id % 6) * 28;
    const z = ++topZ.current;
    setWins((ws) => [...ws, { ...data, id, x, y, z }]);
  };

  const openEntry = (e: Entry) =>
    e.browser
      ? open({ title: e.label, icon: e.icon, browser: true })
      : e.open
        ? open({ title: e.label, icon: e.icon, explorer: e.open, compact: e.compact })
        : open({ title: e.label, icon: e.icon, text: e.text });

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
          if (w.browser) {
            return (
              <PopupWindow
                key={w.id}
                w={w}
                onFocus={() => focus(w.id)}
                onClose={close}
                onOpenFile={() => {}}
                size={[640, 480]}
                menu={["File", "Edit", "View", "Favorites", "Tools", "Help"]}
              >
                <Browser />
              </PopupWindow>
            );
          }
          return w.explorer ? (
            <Explorer
              key={w.id}
              w={w}
              onFocus={() => focus(w.id)}
              onClose={close}
              onOpenFile={(f) => open({ title: f.name, icon: f.icon, text: f.text ?? "", image: f.image })}
            />
          ) : (
            <PopupWindow key={w.id} w={w} onFocus={() => focus(w.id)} onClose={close} onOpenFile={() => {}} />
          );
        })}
      </div>
    </>
  );
}