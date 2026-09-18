import { useRef, useState, useEffect } from "react";

const loadHtml2Pdf = () => {
  if (window.html2pdf) return Promise.resolve(window.html2pdf);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src =
      "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    s.onload = () => resolve(window.html2pdf);
    s.onerror = reject;
    document.head.appendChild(s);
  });
};

const ExportPDFButton = ({ targetId, filename, holderId }) => {
  const srRef = useRef(null);
  const [running, setRunning] = useState(false);
  const [win, setWin] = useState(false);
  const busyRef = useRef(false);
  const audioRef = useRef({ ac: null, noiseBuf: null });

  const getAudio = () => {
    const a = audioRef.current;
    if (!a.ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      a.ac = new AC();
      const len = a.ac.sampleRate * 1.5;
      a.noiseBuf = a.ac.createBuffer(1, len, a.ac.sampleRate);
      const d = a.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (a.ac.state === "suspended") a.ac.resume();
    return a.ac;
  };

  useEffect(() => {
    const unlock = () => {
      getAudio();
      window.removeEventListener("pointerdown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  const sPress = (t) => {
    const ctx = getAudio();
    if (!ctx) return;
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.setValueAtTime(820, t);
    o.frequency.exponentialRampToValueAtTime(230, t + 0.05);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.085, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.09);
  };

  const sDescent = (t, dur) => {
    const ctx = getAudio();
    if (!ctx) return;
    const a = audioRef.current;
    const n = ctx.createBufferSource();
    n.buffer = a.noiseBuf;
    n.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.7;
    bp.frequency.setValueAtTime(3200, t);
    bp.frequency.exponentialRampToValueAtTime(640, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.1, t + 0.1);
    g.gain.linearRampToValueAtTime(0.085, t + dur * 0.68);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    n.connect(bp).connect(g).connect(ctx.destination);
    n.start(t);
    n.stop(t + dur + 0.06);
  };

  const sThud = (t) => {
    const ctx = getAudio();
    if (!ctx) return;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(50, t + 0.22);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.38, t + 0.009);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.33);
  };

  const sPing = (t) => {
    const ctx = getAudio();
    if (!ctx) return;
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(1200, t);
    o.frequency.exponentialRampToValueAtTime(1188, t + 0.45);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.135, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.48);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.52);
  };

  const sVictory = (t) => {
    const ctx = getAudio();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const st = t + i * 0.075;
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.095, st + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 0.72);
      o.connect(g).connect(ctx.destination);
      o.start(st);
      o.stop(st + 0.78);
    });
  };

  const playFull = () => {
    const ctx = getAudio();
    if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    sPress(t);
    sDescent(t + 0.1, 0.6);
    sThud(t + 0.9);
    sPing(t + 1.0);
    sVictory(t + 1.2);
  };

  const runExport = async () => {
    const target = document.getElementById(targetId);
    const holder = holderId ? document.getElementById(holderId) : null;

    if (!target) {
      console.warn("[Export] Target not found:", targetId);
      return;
    }

    if (holder) holder.classList.add("is-exporting");

    await new Promise((r) => setTimeout(r, 300));

    try {
      const html2pdf = await loadHtml2Pdf();

      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename: filename || "itinerary.pdf",
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
            scrollX: 0,
            scrollY: 0,
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: {
            mode: ["css", "legacy"],
            avoid: [".itn-day", ".itn-hotel", ".itn-table tr", ".itn-foot"],
          },
        })
        .from(target)
        .save();
    } catch (err) {
      console.warn("[Export] html2pdf failed, falling back to print:", err);
      window.print();
    } finally {
      if (holder) holder.classList.remove("is-exporting");
    }
  };

  const handleClick = () => {
    if (busyRef.current) return;
    busyRef.current = true;

    playFull();
    setRunning(true);
    setWin(false);

    setTimeout(() => {
      setWin(true);
      if (srRef.current) srRef.current.textContent = "Itinerary downloaded.";
    }, 1200);

    setTimeout(() => {
      runExport();
    }, 1400);

    setTimeout(() => {
      setRunning(false);
      setWin(false);
      busyRef.current = false;
      if (srRef.current) srRef.current.textContent = "";
    }, 4000);
  };

  const cls = ["pdf-btn", running ? "running" : "", win ? "win" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={cls}
      onClick={handleClick}
      aria-label="Export PDF Itinerary"
    >
      <span className="sr-only" ref={srRef} role="status" aria-live="polite"></span>

      <span className="pdf-btn__skin" aria-hidden="true" />

      <span className="pdf-btn__icon-zone" aria-hidden="true">
        <span className="pdf-btn__trail" />
        <span className="pdf-btn__shockwave" />

        <svg
          className="pdf-btn__payload"
          viewBox="0 0 40 46"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="cpGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#C4E570" />
              <stop offset="1" stopColor="#8FBF2E" />
            </linearGradient>
            <linearGradient id="crateGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffe2a0" />
              <stop offset="1" stopColor="#d99b2b" />
            </linearGradient>
            <linearGradient id="packGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#A8D84A" />
              <stop offset="1" stopColor="#1A2E1A" />
            </linearGradient>
          </defs>

          <g className="canopy-g">
            <path
              d="M20 1 C8 1 1 8 1 16 L39 16 C39 8 32 1 20 1 Z"
              fill="url(#cpGrad)"
            />
            <circle cx="7" cy="16" r="6" fill="url(#cpGrad)" />
            <circle cx="20" cy="16" r="6" fill="url(#cpGrad)" />
            <circle cx="33" cy="16" r="6" fill="url(#cpGrad)" />
            <path
              d="M20 1 C8 1 1 8 1 16"
              fill="none"
              stroke="#DCF0A0"
              strokeWidth=".9"
              opacity=".55"
            />
            <path
              d="M20 1 C32 1 39 8 39 16"
              fill="none"
              stroke="#DCF0A0"
              strokeWidth=".9"
              opacity=".55"
            />
            <path d="M20 1 L20 16" stroke="#DCF0A0" strokeWidth=".7" opacity=".4" />
          </g>

          <g stroke="#DCF0A0" strokeWidth=".9" opacity=".85" fill="none">
            <line x1="7" y1="20" x2="17" y2="29" />
            <line x1="20" y1="21" x2="20" y2="29" />
            <line x1="33" y1="20" x2="23" y2="29" />
          </g>

          <g className="crate-g">
            <rect
              x="15"
              y="24"
              width="10"
              height="6"
              rx="1.6"
              fill="url(#packGrad)"
            />
            <rect
              x="11"
              y="28"
              width="18"
              height="15"
              rx="2.2"
              fill="url(#crateGrad)"
              stroke="#8a5a10"
              strokeWidth=".9"
            />
            <line x1="20" y1="28" x2="20" y2="43" stroke="#8a5a10" strokeWidth="1" />
            <line
              x1="11"
              y1="35.5"
              x2="29"
              y2="35.5"
              stroke="#8a5a10"
              strokeWidth="1"
            />
            <rect
              x="17.5"
              y="31.5"
              width="5"
              height="4"
              rx=".8"
              fill="#1A2E1A"
              opacity=".85"
            />
          </g>
        </svg>
      </span>

      <span className="pdf-btn__label-stack">
        <span className="pdf-btn__lbl pdf-btn__lbl-default">
          Export PDF Itinerary
        </span>
        <span className="pdf-btn__lbl pdf-btn__lbl-done">
          Itinerary Downloaded!
        </span>
      </span>

      <span className="pdf-btn__badge" aria-hidden="true">
        <svg viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg">
          <circle
            cx="11"
            cy="11"
            r="9.6"
            fill="#1A2E1A"
            stroke="#A8D84A"
            strokeWidth="1.6"
          />
          <path
            d="M6.6 11.4 L9.6 14.3 L15.4 8.2"
            fill="none"
            stroke="#A8D84A"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
};

export default ExportPDFButton;