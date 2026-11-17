"use client";

import { Fragment, useEffect, useState } from "react";

type Item = { label: string; children?: Item[]; sep?: boolean };

const MENU: Item[] = [
  { label: "Send to", children: [{ label: "Desktop" }, { label: "My Documents" }] },
  { label: "Cut", sep: true },
  { label: "Copy" },
  {
    label: "Edit",
    sep: true,
    children: [
      { label: "Your body" },
      { label: "Your brain" },
      {
        label: "Your heart",
        children: [
          { label: "to be quiet" },
          { label: "to be sadder" },
          { label: "to be patient" },
          {
            label: "to be happier",
            children: [
              { label: "With money." },
              { label: "With fame." },
              { label: "With the small things." },
              { label: "With success." },
            ],
          },
          { label: "to be brave" },
          { label: "to be curious" },
        ],
      },
      { label: "Your soul" },
    ],
  },
  { label: "Delete", sep: true },
  { label: "Properties" },
];

type MenuProps = {
  items: Item[];
  depth: number;
  path: number[];
  setPath: (p: number[]) => void;
  onClose: () => void;
};

function Menu({ items, depth, path, setPath, onClose }: MenuProps) {
  return (
    <ul className={`menu${depth >= 3 ? " menu-left" : ""}`} role="menu">
      {items.map((it, i) => {
        const active = path[depth] === i;
        const opensLeft = !!it.children && depth + 1 >= 3;
        return (
          <Fragment key={it.label}>
            {it.sep && <li className="sep" role="separator" />}
            <li
              role="menuitem"
              className={`item${active ? " active" : ""}`}
              onMouseEnter={() => setPath([...path.slice(0, depth), i])}
              onClick={() => {
                if (!it.children) onClose();
              }}
            >
              <span className="mark">{opensLeft ? "◂" : ""}</span>
              <span className="text">{it.label}</span>
              <span className="mark">{it.children && !opensLeft ? "▸" : ""}</span>
              {active && it.children && (
                <Menu
                  items={it.children}
                  depth={depth + 1}
                  path={path}
                  setPath={setPath}
                  onClose={onClose}
                />
              )}
            </li>
          </Fragment>
        );
      })}
    </ul>
  );
}

export default function ContextMenu() {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [path, setPath] = useState<number[]>([]);

  useEffect(() => {
    const open = (e: MouseEvent) => {
      // biarkan menu bawaan browser di kotak search (buat paste dll)
      if ((e.target as HTMLElement).closest("input")) return;
      e.preventDefault();
      // geser sedikit kalau terlalu dekat tepi layar, biar submenu muat
      const x = Math.max(0, Math.min(e.clientX, window.innerWidth - 340));
      const y = Math.max(0, Math.min(e.clientY, window.innerHeight - 290));
      setPath([]);
      setPos({ x, y });
    };
    const close = () => setPos(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    document.addEventListener("contextmenu", open);
    document.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    window.addEventListener("blur", close);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("contextmenu", open);
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", close);
      window.removeEventListener("resize", close);
    };
  }, []);

  if (!pos) return null;

  return (
    <div
      className="menu-root"
      style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 10 }}
      onClick={(e) => e.stopPropagation()}
    >
      <Menu items={MENU} depth={0} path={path} setPath={setPath} onClose={() => setPos(null)} />
    </div>
  );
}