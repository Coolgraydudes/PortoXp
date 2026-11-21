"use client";

import { useEffect, useRef, useState } from "react";
import { emit, on, setInstalled, usePetInstalled } from "./bus";
import "./Browser.css";

// "Internet" mini: beberapa halaman palsu. Yang penting ada di halaman Kinoko (download).
type PageId = "home" | "kinoko" | "weather" | "guestbook" | "error";

const HOST_HOME = "www.hill-and-tree.net";
const HOST_KINOKO = "www.kinoko-friends.net";

const URLS: Record<Exclude<PageId, "error">, string> = {
  home: `http://${HOST_HOME}/`,
  kinoko: `http://${HOST_KINOKO}/download.html`,
  weather: `http://${HOST_HOME}/weather.html`,
  guestbook: `http://${HOST_HOME}/guestbook.html`,
};

const TITLES: Record<PageId, string> = {
  home: "welcome to the hill",
  kinoko: "Kinoko - a small friend for your desktop",
  weather: "weather on the hill",
  guestbook: "guestbook",
  error: "Cannot find server",
};

// alamat yang diketik -> halaman
function resolve(raw: string): PageId {
  const a = raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (a === HOST_HOME || a === `${HOST_HOME}/index.html`) return "home";
  if (a === HOST_KINOKO || a === `${HOST_KINOKO}/download.html` || a === "kinoko" || a === "kinoko.exe") return "kinoko";
  if (a === `${HOST_HOME}/weather.html`) return "weather";
  if (a === `${HOST_HOME}/guestbook.html`) return "guestbook";
  return "error";
}

type Dl =
  | null
  | { step: "prompt" }
  | { step: "progress"; pct: number }
  | { step: "done" }
  | { step: "run" };

const SIZE_KB = 1240;

export default function Browser({ initial = "home" }: { initial?: "home" | "kinoko" }) {
  const installed = usePetInstalled();
  const [hist, setHist] = useState<{ page: PageId; bad?: string }[]>([{ page: initial }]);
  const [idx, setIdx] = useState(0);
  const [addr, setAddr] = useState(URLS[initial]);
  const [loading, setLoading] = useState(false);
  const [dl, setDl] = useState<Dl>(null);
  const loadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cur = hist[idx];

  const show = (i: number, h = hist) => {
    const e = h[i];
    setAddr(e.page === "error" ? e.bad ?? "" : URLS[e.page]);
    setLoading(true);
    if (loadTimer.current) clearTimeout(loadTimer.current);
    loadTimer.current = setTimeout(() => setLoading(false), 450);
  };

  const go = (page: PageId, bad?: string) => {
    const h = [...hist.slice(0, idx + 1), { page, bad }];
    setHist(h);
    setIdx(h.length - 1);
    show(h.length - 1, h);
  };

  // dipanggil dari luar (mis. Start > Programs > Kinoko) waktu jendela IE sudah terbuka
  const goRef = useRef(go);
  goRef.current = go;
  useEffect(
    () =>
      on("browser:go", (d) => {
        const page = (d as { page?: string } | undefined)?.page;
        if (page === "home" || page === "kinoko") goRef.current(page);
      }),
    []
  );

  const navigate = (raw: string) => {
    const page = resolve(raw);
    go(page, page === "error" ? raw.trim() : undefined);
  };

  const back = () => {
    if (idx <= 0) return;
    setIdx(idx - 1);
    show(idx - 1);
  };
  const forward = () => {
    if (idx >= hist.length - 1) return;
    setIdx(idx + 1);
    show(idx + 1);
  };

  useEffect(
    () => () => {
      if (loadTimer.current) clearTimeout(loadTimer.current);
    },
    []
  );

  // ---- simulasi download: ada jeda sebentar di sekitar 70% supaya terasa "internet jaman dulu" ----
  const stall = useRef(0);
  useEffect(() => {
    if (dl?.step !== "progress") return;
    stall.current = 0;
    const t = setInterval(() => {
      setDl((d) => {
        if (!d || d.step !== "progress") return d;
        if (d.pct >= 100) return { step: "done" };
        if (d.pct >= 71 && d.pct < 74 && stall.current < 9) {
          stall.current++;
          return d;
        }
        return { step: "progress", pct: Math.min(100, d.pct + 0.6 + Math.random() * 3.4) };
      });
    }, 120);
    return () => clearInterval(t);
  }, [dl?.step]);

  const pct = dl?.step === "progress" ? Math.floor(dl.pct) : 100;
  const copied = Math.round((SIZE_KB * pct) / 100);
  const left = Math.max(1, Math.round(((100 - pct) / 100) * 8));

  const link = (page: PageId, text: string) => (
    <a
      href={URLS[page as Exclude<PageId, "error">] ?? "#"}
      onClick={(e) => {
        e.preventDefault();
        go(page);
      }}
    >
      {text}
    </a>
  );

  return (
    <div className="ie">
      <div className="ie-bar">
        <button onClick={back} disabled={idx <= 0}>◀ Back</button>
        <button onClick={forward} disabled={idx >= hist.length - 1}>▶ Forward</button>
        <button onClick={() => show(idx)}>⟳ Refresh</button>
        <button onClick={() => go("home")}>⌂ Home</button>
      </div>
      <form
        className="ie-addr"
        onSubmit={(e) => {
          e.preventDefault();
          navigate(addr);
        }}
      >
        <span>Address</span>
        <input value={addr} onChange={(e) => setAddr(e.target.value)} spellCheck={false} aria-label="Address" />
        <button type="submit">Go</button>
      </form>

      <div className="ie-page" data-loading={loading || undefined}>
        {cur.page === "home" && (
          <div className="pg">
            <h1>~ welcome to the hill ~</h1>
            <p className="small">this page has been under construction since 2003.</p>
            <hr />
            <ul>
              <li>
                {link("kinoko", "Kinoko")} - a small friend for your desktop <b className="new">NEW!</b>
              </li>
              <li>{link("weather", "Weather on the hill")}</li>
              <li>{link("guestbook", "Guestbook")} (0 entries)</li>
            </ul>
            <hr />
            <p className="small">
              you are visitor number <span className="counter">000314</span>
              <br />
              best viewed at 800x600, late in the afternoon.
            </p>
          </div>
        )}

        {cur.page === "weather" && (
          <div className="pg">
            <h1>weather on the hill</h1>
            <p>
              today: <b>sunny, probably.</b>
              <br />
              tonight: <b>the hill looks different.</b>
              <br />
              tomorrow: <b>same hill.</b>
            </p>
            <p className="small">{link("home", "← back to the hill")}</p>
          </div>
        )}

        {cur.page === "guestbook" && (
          <div className="pg">
            <h1>guestbook</h1>
            <p>nobody has signed yet. you could be the first.</p>
            <p className="small">(the form is broken. it has been broken for a long time.)</p>
            <p className="small">{link("home", "← back to the hill")}</p>
          </div>
        )}

        {cur.page === "error" && (
          <div className="pg err">
            <h2>Cannot find server</h2>
            <p>
              The page you are looking for is taking a break.
              {cur.bad ? (
                <>
                  <br />
                  <span className="small">({cur.bad})</span>
                </>
              ) : null}
            </p>
            <p className="small">{link("home", "go back to the hill")}</p>
          </div>
        )}

        {cur.page === "kinoko" && (
          <div className="pg">
            <h1>Kinoko</h1>
            <p className="tag">a small friend for your desktop. free. mostly harmless.</p>
            <hr />
            <p>
              Kinoko is small, shy, and walks around your desktop on its own. it likes grass, quiet people, and
              being picked up (gently). talk to it and it talks back.
            </p>
            <p className="small">
              Requirements: one computer, a little patience.
              <br />
              Warning: please do not ask Kinoko about midnight.
            </p>

            {installed ? (
              <div className="box ok">
                <b>✓ Kinoko is installed.</b>
                <p>it is somewhere on your desktop right now. be kind.</p>
                <div className="row">
                  <button className="btn" onClick={() => emit("pet:call")}>Call Kinoko</button>
                  <button className="btn" onClick={() => setInstalled(false)}>Uninstall</button>
                </div>
              </div>
            ) : (
              <div className="box">
                <button className="dlbtn" onClick={() => setDl({ step: "prompt" })}>
                  ⬇ Download Kinoko.exe
                </button>
                <p className="small">version 1.0 · 1.2 MB · no ads, no spyware (we promise)</p>
              </div>
            )}

            <p className="small">{link("home", "← back to the hill")}</p>
          </div>
        )}
      </div>

      <div className="ie-status">
        <span>{loading ? `Opening page ${URLS[cur.page === "error" ? "home" : cur.page]} ...` : "Done"}</span>
        <span>Internet zone</span>
      </div>

      {dl && (
        <div className="ie-dlg-wrap">
          {dl.step === "prompt" && (
            <div className="dlg" role="dialog" aria-label="File Download">
              <div className="dlg-t">File Download</div>
              <div className="dlg-b">
                <p>You have chosen to download a file from this location.</p>
                <p><b>kinoko.exe</b> from {HOST_KINOKO}</p>
                <p>What would you like to do with this file?</p>
                <label><input type="radio" checked readOnly /> Save this program to disk</label>
                <label className="dis"><input type="radio" disabled /> Run this program from its current location</label>
                <div className="row end">
                  <button className="btn" onClick={() => setDl({ step: "progress", pct: 0 })}>OK</button>
                  <button className="btn" onClick={() => setDl(null)}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {dl.step === "progress" && (
            <div className="dlg" role="dialog" aria-label="Saving">
              <div className="dlg-t">{pct}% of kinoko.exe Completed</div>
              <div className="dlg-b">
                <p>Saving: <b>kinoko.exe</b> from {HOST_KINOKO}</p>
                <div className="bar" aria-label={`${pct}%`}>
                  <i style={{ width: `${pct}%` }} />
                </div>
                <p className="small">
                  Estimated time left: {left} sec ({copied} KB of {SIZE_KB} KB copied)
                  <br />
                  Download to: C:\Windows\Temp\kinoko.exe
                  <br />
                  Transfer rate: {pct >= 71 && pct < 74 ? "0.0" : "4.7"} KB/Sec
                </p>
                <div className="row end">
                  <button className="btn" onClick={() => setDl(null)}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {dl.step === "done" && (
            <div className="dlg" role="dialog" aria-label="Download complete">
              <div className="dlg-t">Download complete</div>
              <div className="dlg-b">
                <p><b>Download Complete</b></p>
                <p className="small">Saved: kinoko.exe from {HOST_KINOKO}<br />Downloaded: {SIZE_KB} KB in 7 sec</p>
                <div className="row end">
                  <button className="btn" onClick={() => setDl({ step: "run" })}>Open</button>
                  <button className="btn" onClick={() => setDl(null)}>Close</button>
                </div>
              </div>
            </div>
          )}

          {dl.step === "run" && (
            <div className="dlg" role="dialog" aria-label="Security Warning">
              <div className="dlg-t">Security Warning</div>
              <div className="dlg-b">
                <p>Do you want to run this software?</p>
                <p className="small">
                  Name: <b>kinoko.exe</b>
                  <br />
                  Publisher: <b>Unknown</b> (it seems nice though)
                </p>
                <div className="row end">
                  <button
                    className="btn"
                    onClick={() => {
                      setDl(null);
                      setInstalled(true);
                    }}
                  >
                    Run
                  </button>
                  <button className="btn" onClick={() => setDl(null)}>Don&apos;t Run</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}