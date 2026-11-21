"use client";

import { useRef, useState, type CSSProperties } from "react";
import { TB_H } from "./wm";
import "./PopupWindow.css";

type FileItem = { name: string; icon: string; text: string; image?: string; size?: string };
type WinData = { id: number; title: string; icon: string; x: number; y: number; z: number; files?: FileItem[]; text?: string; image?: string };
type Box = { x: number; y: number; width: number; height: number };
type Dir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const DIRS: Dir[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
const MIN_W = 300;
const MIN_H = 200;
const sizeOf = (f: FileItem) => f.size ?? `${f.text.length} bytes`;

// icon boleh emoji ("📁") atau path gambar ("/icons/folder.png")
export function Ico({ src, size }: { src: string; size: number }) {
  const isImg = src.startsWith("/") || src.startsWith("http");
  return isImg ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={size} height={size} draggable={false} />
  ) : (
    <span className="w98-emoji" style={{ fontSize: size }} aria-hidden>{src}</span>
  );
}

export default function PopupWindow({ w, onFocus, onClose, onOpenFile, children, menu, size, minimized, onMinimize }: {
  w: WinData;
  onFocus: () => void;
  onClose: () => void;
  onOpenFile: (f: FileItem) => void;
  children?: React.ReactNode;
  menu?: string[];
  size?: [number, number];
  minimized?: boolean; // disembunyikan (tombol di taskbar masih ada)
  onMinimize?: () => void;
}) {
  const [box, setBox] = useState<Box>(() => {
    const vw = typeof window === "undefined" ? 1024 : window.innerWidth;
    const vh = typeof window === "undefined" ? 768 : window.innerHeight;
    return {
      x: w.x,
      y: w.y,
      width: Math.min(size?.[0] ?? (w.image ? 600 : children ? 420 : 520), vw * 0.94),
      height: Math.min(size?.[1] ?? (w.files ? 380 : w.image ? 460 : children ? 440 : 220), vh - 40),
    };
  });
  const [max, setMax] = useState(false);
  const [sel, setSel] = useState<FileItem | null>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const rs = useRef<{ dir: Dir; sx: number; sy: number; b: Box } | null>(null);

  const files = w.files;
  const title = w.image
    ? `${w.title} - Paint`
    : !files && w.title.endsWith(".txt")
      ? `${w.title} - Notepad`
      : w.title;
  const path = w.title === "My Computer" ? "My Computer" : `C:\\${w.title}`;
  const style: CSSProperties = max
    ? { left: 0, top: 0, width: "100%", height: `calc(100% - ${TB_H}px)`, zIndex: w.z }
    : { left: box.x, top: box.y, width: box.width, height: box.height, zIndex: w.z };
  if (minimized) style.display = "none"; // sengaja tidak di-unmount supaya isi jendela (mis. unduhan, folder) tetap utuh

  const resizeMove = (e: React.PointerEvent) => {
    const r = rs.current;
    if (!r) return;
    const dx = e.clientX - r.sx;
    const dy = e.clientY - r.sy;
    const { b, dir } = r;
    let { x, y, width, height } = b;
    if (dir.includes("e")) width = Math.max(MIN_W, b.width + dx);
    if (dir.includes("s")) height = Math.max(MIN_H, b.height + dy);
    if (dir.includes("w")) {
      width = Math.max(MIN_W, b.width - dx);
      x = b.x + b.width - width;
    }
    if (dir.includes("n")) {
      height = Math.max(MIN_H, b.height - dy);
      y = b.y + b.height - height;
      if (y < 0) {
        height += y;
        y = 0;
      }
    }
    setBox({ x, y, width, height });
  };

  return (
    <div className={`w98${max ? " w98-max" : ""}`} style={style} onPointerDown={onFocus}>
      <div
        className="w98-title"
        onPointerDown={(e) => {
          if (max) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { dx: e.clientX - box.x, dy: e.clientY - box.y };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (d) setBox((b) => ({ ...b, x: e.clientX - d.dx, y: Math.max(0, e.clientY - d.dy) }));
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onDoubleClick={() => setMax(!max)}
      >
        <span className="w98-name"><Ico src={w.icon} size={14} />{title}</span>
        <span className="w98-btns" onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
          {onMinimize && <button aria-label="Minimize" onClick={onMinimize}>_</button>}
          <button aria-label="Maximize" onClick={() => setMax(!max)}>{max ? "❐" : "□"}</button>
          <button aria-label="Close" onClick={onClose}>×</button>
        </span>
      </div>

      <div className="w98-menu">
        {(menu ?? (files
          ? ["File", "Edit", "View", "Go", "Favorites", "Help"]
          : children
            ? ["File", "Edit", "View", "Help"]
            : w.image
              ? ["File", "Edit", "View", "Image", "Colors", "Help"]
              : ["File", "Edit", "Search", "Help"]
        )).map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>

      {files ? (
        <>
          <div className="w98-tools">
            {["◀ Back", "▶ Forward", "▲ Up", "✂ Cut", "⧉ Copy", "📋 Paste", "✕ Delete"].map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <div className="w98-addr">
            <span>Address</span>
            <div className="w98-field"><Ico src={w.icon} size={14} />{path}</div>
          </div>
          <div className="w98-body">
            <aside className="w98-side">
              <h2>{w.title}</h2>
              {sel ? (
                <>
                  <b>{sel.name}</b>
                  <p>{sel.image ? "PNG Image" : "Text Document"}<br />Size: {sizeOf(sel)}</p>
                </>
              ) : (
                <p>Select an item to view its description.</p>
              )}
            </aside>
            <div className="w98-files" onClick={() => setSel(null)}>
              {files.map((f) => (
                <div
                  key={f.name}
                  className={`w98-file${sel?.name === f.name ? " sel" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSel(f);
                  }}
                  onDoubleClick={() => onOpenFile(f)}
                >
                  <Ico src={f.icon} size={32} />
                  <span>{f.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="w98-status">
            <span>{sel ? "1 object(s) selected" : `${files.length} object(s)`}</span>
            <span>{sel ? sizeOf(sel) : "My Computer"}</span>
          </div>
        </>
      ) : (
        children ? (
          children
        ) : w.image ? (
          <div className="w98-img">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={w.image} alt={w.title} draggable={false} />
          </div>
        ) : (
          <pre className="w98-text">{w.text}</pre>
        )
      )}

      {!max &&
        DIRS.map((d) => (
          <div
            key={d}
            className={`w98-rs w98-rs-${d}`}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              rs.current = { dir: d, sx: e.clientX, sy: e.clientY, b: box };
            }}
            onPointerMove={resizeMove}
            onPointerUp={() => {
              rs.current = null;
            }}
          />
        ))}
    </div>
  );
}