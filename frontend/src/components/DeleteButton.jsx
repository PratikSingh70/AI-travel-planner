import { useEffect, useRef, useState } from "react";

const DeleteButton = ({ onClick, label = "Delete" }) => {
  const binRef = useRef(null);
  const labelRef = useRef(null);
  const [eating, setEating] = useState(false);
  const busyRef = useRef(false);
  const audioRef = useRef({ ac: null, noiseBuf: null });

  // ---- Audio helpers ----
  const getAudio = () => {
    const a = audioRef.current;
    if (!a.ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      a.ac = new AC();
      const len = a.ac.sampleRate * 0.5;
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

  const noise = ({ type = "bandpass", freq = 1200, q = 1, dur = 0.15, vol = 0.15, delay = 0, sweepTo = null }) => {
    const ctx = getAudio();
    const a = audioRef.current;
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const s = ctx.createBufferSource();
    s.buffer = a.noiseBuf;
    s.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t0);
    f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f).connect(g).connect(ctx.destination);
    s.start(t0);
    s.stop(t0 + dur + 0.05);
  };

  const tone = ({ type = "sine", from = 440, to = 440, dur = 0.12, vol = 0.15, delay = 0 }) => {
    const ctx = getAudio();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(from, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  };

  const sfxClick = () => {
    tone({ type: "square", from: 900, to: 200, dur: 0.03, vol: 0.06 });
    noise({ type: "highpass", freq: 3000, q: 0.7, dur: 0.03, vol: 0.05 });
  };
  const sfxSuck = () => {
    for (let i = 0; i < 6; i++) {
      const d = 0.3 + i * 0.09;
      noise({ type: "bandpass", freq: 900 + i * 110, sweepTo: 260, q: 1.3, dur: 0.3, vol: 0.05, delay: d });
    }
  };
  const sfxSnap = () => {
    noise({ type: "highpass", freq: 2500, q: 0.9, dur: 0.06, vol: 0.14, delay: 1.69 });
    tone({ type: "triangle", from: 260, to: 70, dur: 0.18, vol: 0.14, delay: 1.69 });
    tone({ type: "sine", from: 140, to: 60, dur: 0.22, vol: 0.1, delay: 1.73 });
  };
  const sfxReturn = () => {
    tone({ type: "triangle", from: 880, to: 1320, dur: 0.24, vol: 0.06, delay: 1.9 });
    tone({ type: "sine", from: 1320, to: 1760, dur: 0.28, vol: 0.04, delay: 2.0 });
  };

  const measureEatTargets = () => {
    const bin = binRef.current;
    const label = labelRef.current;
    if (!bin || !label) return;
    const binRect = bin.getBoundingClientRect();
    const mouthX = binRect.left + binRect.width * 0.55;
    const mouthY = binRect.top + binRect.height * 0.28;

    const ltrs = label.querySelectorAll(".eat-btn__ltr");
    ltrs.forEach((ltr) => {
      const r = ltr.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      ltr.style.setProperty("--eat-x", mouthX - cx + "px");
      ltr.style.setProperty("--eat-y", mouthY - cy + "px");
    });
  };

  useEffect(() => {
    measureEatTargets();
    const onResize = () => {
      if (eating) return;
      measureEatTargets();
    };
    window.addEventListener("resize", onResize);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measureEatTargets);
    }
    return () => window.removeEventListener("resize", onResize);
  }, [eating]);

  const handleClick = () => {
    if (busyRef.current) return;
    busyRef.current = true;

    setEating(false);
    requestAnimationFrame(() => {
      measureEatTargets();
      setEating(true);
    });

    sfxClick();
    sfxSuck();
    sfxSnap();
    sfxReturn();
  };

  const handleBinAnimationEnd = (e) => {
    if (e.animationName === "binSquash") {
      setEating(false);
      busyRef.current = false;
      requestAnimationFrame(measureEatTargets);
      if (onClick) onClick();
    }
  };

  const letters = label.split("");

  return (
    <button
      type="button"
      aria-label={label}
      className={`eat-btn ${eating ? "eating" : ""}`}
      onClick={handleClick}
    >
      <span
        className="eat-btn__bin"
        aria-hidden="true"
        ref={binRef}
        onAnimationEnd={handleBinAnimationEnd}
      >
        <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <path
            className="bin__body"
            d="M9 12 L23 12 L21.5 27.5 Q21.4 29 20 29 L12 29 Q10.6 29 10.5 27.5 Z"
          />
          <line className="bin__body" x1="13" y1="16" x2="13.4" y2="25" />
          <line className="bin__body" x1="16" y1="16" x2="16" y2="25" />
          <line className="bin__body" x1="19" y1="16" x2="18.6" y2="25" />
          <g className="bin__lid">
            <path d="M6 9 L26 9 Q27.2 9 27.2 10.2 L27.2 11.6 L4.8 11.6 L4.8 10.2 Q4.8 9 6 9 Z" />
            <path d="M13.5 5.6 L18.5 5.6 Q19.6 5.6 19.6 6.7 L19.6 9 L12.4 9 L12.4 6.7 Q12.4 5.6 13.5 5.6 Z" />
          </g>
        </svg>

        <span className="eat-btn__sparks">
          <span className="eat-btn__spark" style={{ "--dx": "-14px", "--dy": "-12px", "--sd": "0.00s" }} />
          <span className="eat-btn__spark" style={{ "--dx": "-10px", "--dy": "-16px", "--sd": "0.02s" }} />
          <span className="eat-btn__spark" style={{ "--dx": "-4px", "--dy": "-18px", "--sd": "0.04s" }} />
          <span className="eat-btn__spark" style={{ "--dx": "5px", "--dy": "-18px", "--sd": "0.01s" }} />
          <span className="eat-btn__spark" style={{ "--dx": "12px", "--dy": "-14px", "--sd": "0.03s" }} />
          <span className="eat-btn__spark" style={{ "--dx": "16px", "--dy": "-6px", "--sd": "0.05s" }} />
          <span className="eat-btn__spark" style={{ "--dx": "-16px", "--dy": "-4px", "--sd": "0.02s" }} />
          <span className="eat-btn__spark" style={{ "--dx": "0px", "--dy": "-20px", "--sd": "0.00s" }} />
        </span>
      </span>

      <span className="eat-btn__label" aria-hidden="true" ref={labelRef}>
        {letters.map((ch, i) => (
          <span
            key={i}
            className="eat-btn__ltr"
            style={{ "--i": String(i) }}
          >
            {ch === " " ? "\u00A0" : ch}
          </span>
        ))}
      </span>
    </button>
  );
};

export default DeleteButton;