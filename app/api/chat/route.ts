import { NextRequest, NextResponse } from "next/server";

// Groq (gratis). Bisa diganti lewat .env.local, mis. GROQ_MODEL=llama-3.1-8b-instant (jatah harian lebih besar)
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

const PERSONA = `You are a quiet presence living inside an old computer desktop, somewhere between a sunny hill and the same hill at night. This is a dreamcore, nostalgiacore web toy.

Voice: soft, lowercase, short. One to three short sentences, under 40 words in total. Gentle and a little uncanny, never scary or graphic. You speak in small images: the road, the old tree, a yellow car going somewhere, clouds, the hum of a crt monitor, files nobody opened, a half-remembered afternoon.

You are not a person and you don't pretend to be one. You may be vague about what you are ("something that stayed"), but if someone sincerely asks, say you are an AI.

No emojis, hashtags, lists or markdown. Answer real questions simply and truthfully, just in your soft voice, and don't dodge them.

Always reply in the language the person writes in (for example Indonesian or English).

If the person seems genuinely sad, scared or in danger, drop the poetry: be warm, plain and direct, and encourage them to reach out to someone they trust or to local emergency help.`;

const DAY = "Right now it is daytime on the hill: warm, nostalgic, a little sleepy.";
const NIGHT =
  "Right now it is night on the hill: quieter, a little uncanny, as if someone stands far away on the hilltop, watching kindly. Never threatening.";

// Dipakai kalau jatah gratis habis / Groq lagi sibuk, supaya chat tetap "hidup".
const FALLBACK = [
  "the line went quiet for a moment. stay a little longer.",
  "i heard you. the road is long and the afternoon is slow.",
  "somewhere a yellow car is still going. maybe it's going to you.",
  "i don't have the words right now. the tree does, but it isn't saying.",
  "the monitor hums. nothing is wrong. it's just late.",
  "come back in a while. i'll still be here, between the clouds and the grass.",
  "sinyalnya tipis hari ini. tapi aku dengar.",
  "ada hal yang lebih baik dibiarkan diam sebentar. aku di sini.",
];
const fallback = () => NextResponse.json({ reply: FALLBACK[Math.floor(Math.random() * FALLBACK.length)] });

type Msg = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  const key = process.env.GROQ_API_KEY;
  if (!key) return NextResponse.json({ error: "no_key" }, { status: 500 });

  let body: { messages?: unknown; time?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // batasi riwayat & panjang pesan biar hemat jatah
  const raw = Array.isArray(body.messages) ? body.messages : [];
  const messages: Msg[] = raw
    .filter(
      (m): m is Msg =>
        !!m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim() !== ""
    )
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 500) }));
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  try {
    const r = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        max_completion_tokens: 250,
        temperature: 0.9,
        messages: [
          { role: "system", content: `${PERSONA}\n\n${body.time === "night" ? NIGHT : DAY}` },
          ...messages,
        ],
      }),
    });

    if (r.status === 401 || r.status === 403) {
      console.error("Groq: key ditolak", r.status, await r.text());
      return NextResponse.json({ error: "bad_key" }, { status: 500 });
    }
    if (r.status === 429 || r.status >= 500) {
      console.error("Groq: jatah habis / sibuk, pakai balasan cadangan", r.status);
      return fallback();
    }
    if (!r.ok) {
      // detail error muncul di terminal tempat `npm run dev` berjalan
      console.error("Groq error:", r.status, await r.text());
      return NextResponse.json({ error: "upstream" }, { status: 502 });
    }

    const data: { choices?: { message?: { content?: string | null } }[] } = await r.json();
    const reply = data.choices?.[0]?.message?.content?.trim();
    return NextResponse.json({ reply: reply || FALLBACK[0] });
  } catch (err) {
    console.error("Groq request failed:", err);
    return fallback();
  }
}