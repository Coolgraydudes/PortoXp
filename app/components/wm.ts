"use client";

// "Window manager" kecil: daftar jendela yang sedang terbuka (untuk taskbar) dan urutan tumpukannya (z-index).
// Pemilik jendela (DesktopIcons untuk jendela biasa, ChatSearch untuk Messenger) melaporkan jendelanya lewat
// setGroup(); Taskbar membaca daftarnya dan mengirim event kembali:
//   "wm:focus" / "wm:restore" / "wm:minimize"  { key }     "wm:closeall"

import { useSyncExternalStore } from "react";

export const TB_H = 32; // tinggi taskbar (px)

export type WinInfo = { key: string; title: string; icon: string; z: number; min: boolean; t: number };

// z-index global: setiap jendela yang difokuskan naik ke paling atas, di semua pemilik jendela
let z = 10;
export const nextZ = () => ++z;

// urutan buka (supaya tombol di taskbar berurutan sesuai kapan jendelanya dibuka)
let seq = 0;
export const nextOrder = () => ++seq;

const groups = new Map<string, WinInfo[]>();
let snapshot: WinInfo[] = [];
const EMPTY: WinInfo[] = [];
const listeners = new Set<() => void>();

/** Ganti semua jendela milik satu pemilik (mis. "desk" atau "chat"). */
export function setGroup(owner: string, items: WinInfo[]) {
  if (items.length) groups.set(owner, items);
  else groups.delete(owner);
  snapshot = [...groups.values()].flat().sort((a, b) => a.t - b.t);
  listeners.forEach((l) => l());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

export function useWindows(): WinInfo[] {
  return useSyncExternalStore(subscribe, () => snapshot, () => EMPTY);
}

/** Jendela aktif = yang z-index-nya paling tinggi di antara yang tidak di-minimize. */
export function activeKey(list: WinInfo[]): string | null {
  let best: WinInfo | null = null;
  for (const w of list) if (!w.min && (!best || w.z > best.z)) best = w;
  return best ? best.key : null;
}