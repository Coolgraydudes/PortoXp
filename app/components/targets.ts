// Daftar hal yang boleh dibukakan Kinoko. Dipakai di 3 tempat:
//  - route.ts       : memberi tahu AI id apa saja yang ada
//  - KinokoPet.tsx  : membaca tag [[open:id]] dari balasan AI, dan perintah langsung ("buka my documents")
//  - DesktopIcons.tsx : benar-benar membuka jendelanya
// Hanya id di daftar ini yang bisa dibuka, jadi AI tidak bisa membuka hal lain.
// Kalau kamu menambah folder/file baru di fs.ts, tambahkan juga di sini supaya Kinoko bisa membukanya.

export type OpenTarget =
  | { kind: "entry"; label: string } // ikon di desktop (label sama dengan ENTRIES di DesktopIcons)
  | { kind: "folder"; title: string; path: string[]; drive?: boolean } // buka File Explorer di folder itu
  | { kind: "file"; path: string[] } // buka file (teks / gambar)
  | { kind: "messenger" }
  | { kind: "kinoko" } // panggil Kinoko kalau sudah di-install, kalau belum buka halaman download di Internet Explorer
  | { kind: "text"; title: string; text: string } // jendela teks sederhana (mis. help.txt)
  | { kind: "closeAll" };

type Def = { name: string; desc: string; t: OpenTarget; alias: string[]; hidden?: boolean }; // hidden = tidak diberitahukan ke AI

const DOCS = ["Desktop", "My Documents"];
const C = ["Desktop", "My Computer", "Local Disk (C:)"];

export const TARGETS: Record<string, Def> = {
  "my-computer": { name: "My Computer", desc: "the My Computer window", t: { kind: "entry", label: "My Computer" }, alias: ["my computer", "komputer saya", "komputerku"] },
  "my-documents": { name: "My Documents", desc: "the My Documents folder (small things.txt, to do.txt, untitled.txt)", t: { kind: "entry", label: "My Documents" }, alias: ["my documents", "documents", "dokumen"] },
  "internet-explorer": { name: "Internet Explorer", desc: "Internet Explorer", t: { kind: "entry", label: "Internet Explorer" }, alias: ["internet explorer", "browser"] },
  "network-neighborhood": { name: "Network Neighborhood", desc: "Network Neighborhood", t: { kind: "entry", label: "Network Neighborhood" }, alias: ["network neighborhood", "network"] },
  "recycle-bin": { name: "Recycle Bin", desc: "the Recycle Bin (old worries.txt, bad day.txt)", t: { kind: "entry", label: "Recycle Bin" }, alias: ["recycle bin", "recycle", "tempat sampah", "tong sampah"] },
  "shortcut-to-internet": { name: "Shortcut to Internet", desc: "the Shortcut to Internet icon", t: { kind: "entry", label: "Shortcut to Internet" }, alias: ["shortcut to internet", "shortcut"] },
  messenger: { name: "Messenger", desc: "the Messenger window, to talk to the one in the window", t: { kind: "messenger" }, alias: ["messenger", "chat sama dia", "orang di jendela"] },

  "local-disk-c": { name: "Local Disk (C:)", desc: "the Local Disk (C:) drive (Pictures, Old Things, readme.txt)", t: { kind: "folder", title: "Local Disk (C:)", path: C, drive: true }, alias: ["local disk", "disk c", "drive c", "harddisk", "hard disk"] },
  pictures: { name: "Pictures", desc: "the Pictures folder (a day picture and a night picture)", t: { kind: "folder", title: "Pictures", path: [...C, "Pictures"] }, alias: ["pictures", "gambar", "foto"] },
  "old-things": { name: "Old Things", desc: "the Old Things folder (letter.txt, summer.txt)", t: { kind: "folder", title: "Old Things", path: [...C, "Old Things"] }, alias: ["old things", "barang lama"] },

  "small-things": { name: "small things.txt", desc: "the file small things.txt", t: { kind: "file", path: [...DOCS, "small things.txt"] }, alias: ["small things"] },
  "to-do": { name: "to do.txt", desc: "the file to do.txt", t: { kind: "file", path: [...DOCS, "to do.txt"] }, alias: ["to do", "to-do", "todo"] },
  untitled: { name: "untitled.txt", desc: "the file untitled.txt", t: { kind: "file", path: [...DOCS, "untitled.txt"] }, alias: ["untitled"] },
  readme: { name: "readme.txt", desc: "the file readme.txt on drive C:", t: { kind: "file", path: [...C, "readme.txt"] }, alias: ["readme", "read me"] },
  letter: { name: "letter.txt", desc: "the file letter.txt in Old Things", t: { kind: "file", path: [...C, "Old Things", "letter.txt"] }, alias: ["letter", "surat"] },
  summer: { name: "summer.txt", desc: "the file summer.txt in Old Things", t: { kind: "file", path: [...C, "Old Things", "summer.txt"] }, alias: ["summer", "musim panas"] },
  "nobody-online": { name: "nobody online.txt", desc: "the file nobody online.txt in Network Neighborhood", t: { kind: "file", path: ["Desktop", "Network Neighborhood", "nobody online.txt"] }, alias: ["nobody online"] },
  "old-worries": { name: "old worries.txt", desc: "the file old worries.txt in the Recycle Bin", t: { kind: "file", path: ["Desktop", "Recycle Bin", "old worries.txt"] }, alias: ["old worries"] },
  "bad-day": { name: "bad day.txt", desc: "the file bad day.txt in the Recycle Bin", t: { kind: "file", path: ["Desktop", "Recycle Bin", "bad day.txt"] }, alias: ["bad day"] },
  "day-picture": { name: "the day picture", desc: "the day picture (Vintage Countryside Tree and Clouds.png)", t: { kind: "file", path: [...C, "Pictures", "Vintage Countryside Tree and Clouds.png"] }, alias: ["day picture", "gambar siang", "foto siang"] },
  // sengaja tanpa alias: perintah langsung tidak membukanya. Hanya lewat AI, yang akan ragu-ragu dulu.
  "night-picture": { name: "the night picture", desc: "the night picture (Midnight Hill's Hidden Watcher.png)", t: { kind: "file", path: [...C, "Pictures", "Midnight Hill's Hidden Watcher.png"] }, alias: [] },

  kinoko: { name: "Kinoko", desc: "Kinoko itself", t: { kind: "kinoko" }, alias: ["kinoko", "kinoko.exe"], hidden: true },
  help: {
    name: "help.txt",
    desc: "the help.txt window with tips on how to use this computer",
    t: {
      kind: "text",
      title: "help.txt",
      text: [
        "HELP",
        "",
        "- double-click an icon to open it.",
        "- drag a window by its title bar. double-click the title bar to maximize it.",
        "- the _ button hides a window. click its button on the taskbar to bring it back.",
        "- type /msg in the search bar to talk to the one in the window.",
        "- download Kinoko from Internet Explorer. then click Kinoko to talk to it.",
        "- you can ask Kinoko to open things for you.",
        "- Start > Run... opens things by name.",
        "- Start > Shut Down when you are done. or don't.",
        "",
        "- if the screen goes dark, that's normal.",
      ].join("\n"),
    },
    alias: ["help", "bantuan"],
  },

  "close-all": { name: "everything", desc: "closes every open window", t: { kind: "closeAll" }, alias: ["close all", "tutup semua", "tutup semuanya"] },
};

/** Daftar id untuk dimasukkan ke prompt AI. */
export const TARGET_PROMPT = Object.entries(TARGETS)
  .filter(([, d]) => !d.hidden)
  .map(([id, d]) => `- ${id}: ${d.desc}`)
  .join("\n");

const TAG_RX = /\[\[\s*open\s*:\s*([a-z0-9-]+)\s*\]\]/i;
const ANY_TAG_RX = /\s*\[\[[^\]]*\]\]?\s*/g;

/** Ambil id dari tag [[open:id]] di balasan AI (hanya kalau id-nya ada di daftar). */
export function findTag(text: string): string | null {
  const id = TAG_RX.exec(text)?.[1]?.toLowerCase();
  return id && TARGETS[id] ? id : null;
}

/** Buang semua tag supaya tidak tampil ke pengunjung. */
export function stripTags(text: string): string {
  return text.replace(ANY_TAG_RX, " ").trim();
}

// ---- perintah langsung: "buka my documents", "open pictures", "tutup semua" (tidak memakai kuota AI) ----
const VERB_RX = /^(?:(?:tolong|please|kinoko|bisa|coba|dong|ya|hey|hi|halo)[\s,]+)*(?:bukain|bukakan|buka|open|show|tampilkan|lihat|cek|tutup|close)\b/;
const ID_RX = /\b(?:buka|bukain|bukakan|tampilkan|lihat|cek|tutup)\b/;
const SKIP_RX = /malam|night|midnight|watcher|entity|tengah malam/;

const ALIASES: { alias: string; id: string }[] = Object.entries(TARGETS)
  .flatMap(([id, d]) => d.alias.map((alias) => ({ alias, id })))
  .sort((a, b) => b.alias.length - a.alias.length);

export function localCommand(text: string): { id: string; line: string } | null {
  const t = text.trim().toLowerCase().replace(/[.!?]+$/, "");
  if (t.length > 70 || SKIP_RX.test(t) || !VERB_RX.test(t)) return null;
  const hit = ALIASES.find((a) => t.includes(a.alias));
  if (!hit) return null;
  const closing = /\b(tutup|close)\b/.test(t);
  if (closing !== (hit.id === "close-all")) return null; // "tutup X" bukan perintah buka; "close all" hanya untuk close-all
  const id = hit.id;
  const name = TARGETS[id].name;
  const indo = ID_RX.test(t);
  const line =
    id === "close-all"
      ? indo ? "oke, aku tutup semuanya." : "okay. closing everything."
      : indo ? `oke, aku bukain ${name}.` : `okay. opening ${name}.`;
  return { id, line };
}

// ---- Start > Run...: ketik id atau nama ("my documents", "readme.txt", "kinoko.exe", "iexplore") ----
const RUN_EXTRA: Record<string, string> = { iexplore: "internet-explorer", explorer: "my-computer", notepad: "readme", msn: "messenger" };

export function resolveRun(text: string): string | null {
  const t = text.trim().toLowerCase().replace(/^["']|["']$/g, "");
  if (!t) return null;
  if (TARGETS[t] && t !== "night-picture") return t; // id persis
  const bare = t.replace(/\.exe$/, "");
  if (RUN_EXTRA[bare]) return RUN_EXTRA[bare];
  const exact = ALIASES.find((a) => a.alias === t || a.alias === bare);
  if (exact) return exact.id;
  const byName = Object.entries(TARGETS).find(([id, d]) => id !== "night-picture" && d.name.toLowerCase() === t);
  return byName ? byName[0] : null;
}