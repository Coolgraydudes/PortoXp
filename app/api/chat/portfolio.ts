// Isi data portofoliomu di sini. Kinoko HANYA menjawab pertanyaan tentang portofolio berdasarkan data ini
// (dia tidak boleh mengarang). Kolom yang kosong akan dijawab "aku belum tahu bagian itu".
export const PORTFOLIO_DATA = {
  name: "Izzam",
  role: "UI/UX Designer & Frontend Developer",

  about:
    "I'm a creative designer and developer who enjoys building meaningful digital experiences. I focus on UI/UX design and frontend development, turning ideas into clean, intuitive, and functional interfaces.",

  skills: [
    "UI/UX Design",
    "Figma",
    "React",
    "TypeScript",
    "Tailwind CSS",
    "JavaScript",
    "HTML",
    "CSS",
    "Git",
    "GitHub"
  ],

  projects: [
    {
      name: "Setapak",
      description:
        "A trip planning platform designed to help travelers discover hidden gems, explore local cultures, and create meaningful travel experiences.",
      link: ""
    },
    {
      name: "Santri App",
      description:
        "A web application designed to simplify student management, attendance tracking, examinations, and academic administration.",
      link: ""
    }
  ],

  contact: [
    {
      label: "GitHub",
      value: "https://github.com/Coolgraydude"
    },
    {
      label: "Portfolio",
      value: "https://izzam.vercel.app"
    }
  ],
};

const d = PORTFOLIO_DATA;
const lines = [
  d.name && `Owner name: ${d.name}`,
  d.role && `Role: ${d.role}`,
  d.about && `About: ${d.about}`,
  d.skills.length > 0 && `Skills: ${d.skills.join(", ")}`,
  d.projects.length > 0 &&
    `Projects:\n${d.projects.map((p) => `- ${p.name}: ${p.description}${p.link ? ` (${p.link})` : ""}`).join("\n")}`,
  d.contact.length > 0 && `Contact:\n${d.contact.map((c) => `- ${c.label}: ${c.value}`).join("\n")}`,
].filter(Boolean);

export const PORTFOLIO = lines.length ? lines.join("\n") : "(nothing filled in yet)";