"use client";

import { useState } from "react";
import PopupWindow, { Ico } from "./PopupWindow";
import { ROOT, DEFAULT_DATE, addrOf, getNode, isFolder, type FsNode } from "./fs";
import "./Explorer.css";

const prefixes = (p: string[]) => p.map((_, i) => p.slice(0, i + 1).join("/"));

type TreeProps = {
  node: FsNode;
  path: string[];
  cur: string;
  open: Set<string>;
  toggle: (key: string) => void;
  go: (p: string[]) => void;
  depth: number;
};

function TreeNode({ node, path, cur, open, toggle, go, depth }: TreeProps) {
  const key = path.join("/");
  const folders = (node.children ?? []).filter(isFolder);
  const isOpen = open.has(key);
  return (
    <>
      <div className={`xp-t${key === cur ? " sel" : ""}`} style={{ paddingLeft: 4 + depth * 14 }}>
        {folders.length ? (
          <span className="xp-tog" onClick={() => toggle(key)}>{isOpen ? "−" : "+"}</span>
        ) : (
          <span className="xp-tog xp-tog-none" />
        )}
        <span className="xp-lbl" onClick={() => go(path)}>
          <Ico src={node.icon} size={16} />
          <span className="nm">{node.name}</span>
        </span>
      </div>
      {isOpen &&
        folders.map((c) => (
          <TreeNode key={c.name} node={c} path={[...path, c.name]} cur={cur} open={open} toggle={toggle} go={go} depth={depth + 1} />
        ))}
    </>
  );
}

export default function Explorer({ w, onFocus, onClose, onOpenFile }: {
  w: { id: number; x: number; y: number; z: number; explorer?: string[]; compact?: boolean };
  onFocus: () => void;
  onClose: () => void;
  onOpenFile: (f: FsNode) => void;
}) {
  const start = w.explorer ?? ["Desktop"];
  const [hist, setHist] = useState<string[][]>([start]);
  const [idx, setIdx] = useState(0);
  const [sel, setSel] = useState<string | null>(null);
  // compact = panel folder di kiri tertutup dulu (bisa dibuka lewat tombol Folders)
  const [tree, setTree] = useState(!w.compact);
  const [open, setOpen] = useState<Set<string>>(() => new Set(prefixes(start)));

  const path = hist[idx];
  const node = getNode(path) ?? ROOT;
  const kids = node.children ?? [];
  const list = [...kids.filter(isFolder), ...kids.filter((n) => !isFolder(n))];
  const selNode = list.find((n) => n.name === sel);

  const reveal = (p: string[]) => setOpen((o) => new Set([...o, ...prefixes(p)]));
  const go = (p: string[]) => {
    if (p.join("/") === path.join("/")) return;
    setHist([...hist.slice(0, idx + 1), p]);
    setIdx(idx + 1);
    setSel(null);
    reveal(p);
  };
  const move = (i: number) => {
    setIdx(i);
    setSel(null);
    reveal(hist[i]);
  };
  const toggle = (key: string) =>
    setOpen((o) => {
      const n = new Set(o);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });

  return (
    <PopupWindow
      w={{ id: w.id, title: node.name, icon: node.icon, x: w.x, y: w.y, z: w.z }}
      onFocus={onFocus}
      onClose={onClose}
      onOpenFile={() => {}}
      menu={["File", "Edit", "View", "Favorites", "Tools", "Help"]}
      size={[640, 440]}
    >
      <div className="xp">
        <div className="xp-bar">
          <button className="xp-btn" disabled={idx === 0} onClick={() => move(idx - 1)}>◀ Back</button>
          <button className="xp-btn" disabled={idx >= hist.length - 1} onClick={() => move(idx + 1)}>▶</button>
          <button className="xp-btn" disabled={path.length < 2} onClick={() => go(path.slice(0, -1))}>▲ Up</button>
          <span className="xp-sep" />
          <button className={`xp-btn${tree ? " on" : ""}`} onClick={() => setTree(!tree)}>📁 Folders</button>
        </div>

        <div className="xp-addr">
          <span>Address</span>
          <div className="xp-field"><Ico src={node.icon} size={14} />{addrOf(path)}</div>
        </div>

        <div className="xp-main">
          {tree && (
            <div className="xp-tree">
              <div className="xp-tree-title">Folders</div>
              <TreeNode node={ROOT} path={[ROOT.name]} cur={path.join("/")} open={open} toggle={toggle} go={go} depth={0} />
            </div>
          )}
          <div className="xp-right" onClick={() => setSel(null)}>
            <table className="xp-list">
              <thead>
                <tr><th>Name</th><th>Size</th><th>Type</th><th>Date Modified</th></tr>
              </thead>
              <tbody>
                {list.map((n) => (
                  <tr
                    key={n.name}
                    className={sel === n.name ? "sel" : ""}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSel(n.name);
                    }}
                    onDoubleClick={() => (isFolder(n) ? go([...path, n.name]) : onOpenFile(n))}
                  >
                    <td><span className="xp-nm"><Ico src={n.icon} size={16} /><span className="t">{n.name}</span></span></td>
                    <td>{n.size ?? ""}</td>
                    <td>{n.type ?? (isFolder(n) ? "File Folder" : "File")}</td>
                    <td>{n.modified ?? DEFAULT_DATE}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!list.length && <p className="xp-empty">This folder is empty.</p>}
          </div>
        </div>

        <div className="w98-status">
          <span>
            {selNode ? "1 object(s) selected" : `${list.length} object(s)${node.status ? ` (${node.status})` : ""}`}
          </span>
          <span>{selNode?.size ?? "My Computer"}</span>
        </div>
      </div>
    </PopupWindow>
  );
}