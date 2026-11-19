// "Hard disk" virtual: semua folder & file ada di sini.
// Folder = punya `children`. File teks = punya `text`. File gambar = punya `image`.

export type FsNode = {
  name: string;
  icon: string; // emoji atau path gambar, mis. "/icons/folder.png"
  type?: string; // kolom Type
  size?: string; // kolom Size
  modified?: string; // kolom Date Modified
  status?: string; // tambahan di status bar (untuk drive)
  children?: FsNode[];
  text?: string;
  image?: string;
};

// Semua ikon ada di sini. Ganti emoji dengan path PNG kalau mau (taruh di /public/icons).
export const ICONS = {
  desktop: "🖥️",
  computer: "/icons/computer.ico",
  documents: "/icons/FolderClosed.png",
  folder: "/icons/FolderClosed.png",
  folderOpen: "/icons/FolderOpened.png",
  network: "/icons/network_neighborhood.ico",
  recycle: "/icons/RecycleFilefolder.png",
  drive: "💽",
  floppy: "💾",
  cd: "💿",
  text: "📄",
  ie: "/icons/internet_explorer.ico",
  shortcut: "/icons/Attach.png",
};

export const DEFAULT_DATE = "08/23/2003 4:12 PM";

const txt = (name: string, text: string): FsNode => ({
  name,
  icon: ICONS.text,
  type: "Text Document",
  size: `${Math.max(1, Math.ceil(text.length / 1024))} KB`,
  text,
});

const img = (name: string, src: string, size: string): FsNode => ({
  name,
  icon: src,
  type: "PNG Image",
  size,
  image: src,
});

export const ROOT: FsNode = {
  name: "Desktop",
  icon: ICONS.desktop,
  children: [
    {
      name: "My Documents",
      icon: ICONS.documents,
      children: [
        txt("small things.txt", "the sun on the road.\na yellow car, going somewhere.\nan old tree that stayed.\n\nit's enough."),
        txt("to do.txt", "1. breathe\n2. drink water\n3. be a little kinder\n4. repeat"),
        txt("untitled.txt", "(you don't have to write anything yet.)"),
      ],
    },
    {
      name: "My Computer",
      icon: ICONS.computer,
      children: [
        { name: "3½ Floppy (A:)", icon: ICONS.floppy, type: "3½-Inch Floppy Disk", children: [] },
        {
          name: "Local Disk (C:)",
          icon: ICONS.drive,
          type: "Local Disk",
          status: "Disk free space: enough",
          children: [
            {
              name: "Pictures",
              icon: ICONS.folder,
              children: [
                img("Vintage Countryside Tree and Clouds.png", "/bg-day.webp", "2.2 MB"),
                img("Midnight Hill's Hidden Watcher.png", "/bg-night.webp", "2.1 MB"),
              ],
            },
            {
              name: "Old Things",
              icon: ICONS.folder,
              children: [
                txt("letter.txt", "dear someone,\nthe road was quiet today.\ni hope you are somewhere warm."),
                txt("summer.txt", "the afternoon went on and on,\nand no one minded."),
              ],
            },
            txt("readme.txt", "this computer remembers a few things for you.\nnothing here is urgent.\nopen what you like."),
          ],
        },
        { name: "CD-ROM (D:)", icon: ICONS.cd, type: "CD Drive", children: [] },
      ],
    },
    {
      name: "Network Neighborhood",
      icon: ICONS.network,
      children: [txt("nobody online.txt", "No one else is online right now.\nThat's okay too.")],
    },
    {
      name: "Recycle Bin",
      icon: ICONS.recycle,
      children: [txt("old worries.txt", "Already let go of."), txt("bad day.txt", "It ended. They always do.")],
    },
  ],
};

export const isFolder = (n: FsNode) => !!n.children;

// path = daftar nama dari root, mis. ["Desktop", "My Computer", "Local Disk (C:)"]
export function getNode(path: string[]): FsNode | undefined {
  if (path[0] !== ROOT.name) return undefined;
  let n: FsNode | undefined = ROOT;
  for (const name of path.slice(1)) n = n?.children?.find((c) => c.name === name);
  return n;
}

export function addrOf(path: string[]): string {
  const d = path.findIndex((n) => n.startsWith("Local Disk"));
  if (d >= 0) return ["C:", ...path.slice(d + 1)].join("\\") + (path.length === d + 1 ? "\\" : "");
  return path.slice(1).join("\\") || "Desktop";
}