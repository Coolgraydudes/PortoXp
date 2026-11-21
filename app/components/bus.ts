"use client";

// Penghubung kecil antar komponen (Internet Explorer <-> Kinoko <-> Messenger).
// Isinya cuma 2 hal: event sederhana (on/emit) dan status "Kinoko sudah di-install atau belum".

import { useSyncExternalStore } from "react";

type Handler = (data?: unknown) => void;
const subs = new Map<string, Set<Handler>>();

/** Dengarkan event. Mengembalikan fungsi untuk berhenti mendengar. */
export function on(ev: string, fn: Handler) {
  let set = subs.get(ev);
  if (!set) subs.set(ev, (set = new Set()));
  set.add(fn);
  return () => {
    set!.delete(fn);
  };
}

/** Kirim event ke semua yang mendengarkan. */
export function emit(ev: string, data?: unknown) {
  subs.get(ev)?.forEach((fn) => fn(data));
}

/*
 Event yang dipakai:
   "pet:call"        Kinoko dipanggil (dari tombol di Internet Explorer)
   "chat:opened"     jendela Messenger dibuka
   "chat:user"       pengunjung kirim pesan di Messenger   { text }
   "chat:reply"      balasan masuk di Messenger            { text }
   "messenger:open"  minta Messenger dibuka (dari Kinoko)
   "sys:lock"        tampilkan layar login lagi (Restart / Log Off)
*/

// ---- status install (disimpan di localStorage, jadi Kinoko tetap ada waktu halaman di-refresh) ----
const KEY = "kinoko:installed";
let installed = false;
let hydrated = false;
let fresh = false; // true kalau baru saja di-install di sesi ini (untuk animasi jatuh dari atas)
const listeners = new Set<() => void>();

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    installed = localStorage.getItem(KEY) === "1";
  } catch {
    installed = false;
  }
}

export function setInstalled(v: boolean) {
  hydrate();
  installed = v;
  fresh = v;
  try {
    if (v) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    /* localStorage bisa saja diblokir; tidak apa-apa, status tetap hidup selama tab terbuka */
  }
  listeners.forEach((l) => l());
}

/** Cek status install tanpa hook (untuk dipakai di dalam fungsi/event). */
export function isPetInstalled() {
  hydrate();
  return installed;
}

/** Sekali pakai: true kalau Kinoko baru di-install barusan. */
export function takeFresh() {
  const f = fresh;
  fresh = false;
  return f;
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

export function usePetInstalled() {
  return useSyncExternalStore(
    subscribe,
    () => {
      hydrate();
      return installed;
    },
    () => false
  );
}