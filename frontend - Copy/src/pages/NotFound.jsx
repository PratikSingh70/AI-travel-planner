import { useState } from "react";
import { Link } from "react-router-dom";

const NotFound = () => {
  const [copied, setCopied] = useState(false);
  const promptText =
    "Plan a 5-day all-inclusive tropical beach vacation for 2.";

  const copyPrompt = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(promptText);
      } else {
        const ta = document.createElement("textarea");
        ta.value = promptText;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
        } catch {}
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <div className="notfound-wrapper">
      <main className="notfound-card">
        <svg
          className="notfound-scene"
          viewBox="0 0 640 420"
          role="img"
          aria-label="A tiny deserted tropical island with a bent palm tree, a beach chair and a message in a bottle containing a 404 note"
        >
          <defs>
            <linearGradient id="nf-skyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c7ecff" />
              <stop offset="100%" stopColor="#f2fbff" />
            </linearGradient>
            <linearGradient id="nf-oceanGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7fd8f5" />
              <stop offset="45%" stopColor="#2fc4e0" />
              <stop offset="100%" stopColor="#0a94b8" />
            </linearGradient>
            <radialGradient id="nf-sunGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fde68a" stopOpacity=".95" />
              <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="nf-sandTop" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fdeccd" />
              <stop offset="100%" stopColor="#f7d9a3" />
            </linearGradient>
            <linearGradient id="nf-trunkGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#c98f52" />
              <stop offset="100%" stopColor="#a86a34" />
            </linearGradient>
            <filter id="nf-softShadow" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="6" stdDeviation="9" floodColor="#a4b6c2" floodOpacity=".35" />
            </filter>
            <filter id="nf-sandShadow" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#0e7490" floodOpacity=".28" />
            </filter>
            <clipPath id="nf-chairClip">
              <path d="M-36 -34 L14 -34 L22 -16 L-28 -16 Z" />
              <path d="M-40 -34 L-58 -64 L-34 -70 L-20 -40 Z" />
            </clipPath>
          </defs>

          {/* Sky */}
          <rect x="0" y="0" width="640" height="256" fill="url(#nf-skyGrad)" />

          {/* Sun */}
          <circle className="notfound-pulse" cx="548" cy="76" r="70" fill="url(#nf-sunGlow)" />
          <circle cx="548" cy="76" r="40" fill="#fbbf24" />
          <circle cx="548" cy="76" r="31" fill="#fcd34d" />

          {/* Clouds */}
          <g className="notfound-float-slow" opacity=".95">
            <ellipse cx="106" cy="80" rx="52" ry="24" fill="#ffffff" />
            <ellipse cx="146" cy="72" rx="34" ry="18" fill="#ffffff" />
            <ellipse cx="68" cy="90" rx="28" ry="14" fill="#ffffff" />
          </g>
          <g className="notfound-float-mid" opacity=".8">
            <ellipse cx="418" cy="58" rx="40" ry="19" fill="#ffffff" />
            <ellipse cx="448" cy="66" rx="26" ry="13" fill="#ffffff" />
            <ellipse cx="390" cy="68" rx="22" ry="11" fill="#ffffff" />
          </g>
          <g className="notfound-float-fast" opacity=".65">
            <ellipse cx="272" cy="112" rx="30" ry="14" fill="#ffffff" />
            <ellipse cx="296" cy="118" rx="19" ry="9" fill="#ffffff" />
          </g>

          {/* Seagulls */}
          <g className="notfound-drift" stroke="#8fa9bb" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".8">
            <path d="M158 148 q9 -9 18 0 q9 -9 18 0" />
            <path d="M212 170 q7 -7 14 0 q7 -7 14 0" />
          </g>

          {/* Ocean */}
          <rect x="0" y="252" width="640" height="168" fill="url(#nf-oceanGrad)" />
          <rect x="0" y="252" width="640" height="5" fill="#bdeaf8" opacity=".85" />

          {/* Ocean sparkle */}
          <g stroke="#e0f7ff" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".55">
            <path d="M46 288 q13 -9 26 0" />
            <path d="M120 316 q11 -8 22 0" />
            <path d="M540 296 q13 -9 26 0" />
            <path d="M572 336 q11 -8 22 0" />
            <path d="M488 372 q13 -9 26 0" />
            <path d="M62 366 q11 -8 22 0" />
          </g>

          {/* Shallow lagoon */}
          <ellipse cx="300" cy="358" rx="234" ry="72" fill="#a5f3fc" opacity=".55" />
          <ellipse cx="300" cy="358" rx="196" ry="60" fill="#cffafe" opacity=".55" />

          {/* Island */}
          <g filter="url(#nf-sandShadow)">
            <ellipse cx="300" cy="352" rx="162" ry="48" fill="#f0c88a" />
            <ellipse cx="300" cy="342" rx="152" ry="41" fill="url(#nf-sandTop)" />
          </g>

          {/* Sand speckles */}
          <g fill="#e8c58c" opacity=".7">
            <circle cx="196" cy="344" r="3" />
            <circle cx="232" cy="362" r="2.4" />
            <circle cx="386" cy="356" r="2.8" />
            <circle cx="424" cy="340" r="2.2" />
            <circle cx="330" cy="330" r="2" />
            <circle cx="160" cy="358" r="2.4" />
          </g>

          {/* Palm trunk */}
          <g>
            <path
              d="M242 340 C246 292 258 226 296 166 L316 176 C282 232 272 294 270 342 Z"
              fill="url(#nf-trunkGrad)"
              stroke="#96602c"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <g stroke="#96602c" strokeWidth="3" fill="none" opacity=".55" strokeLinecap="round">
              <path d="M249 308 Q262 303 273 307" />
              <path d="M254 272 Q266 267 277 271" />
              <path d="M264 234 Q274 229 285 233" />
              <path d="M278 198 Q287 194 297 197" />
            </g>
          </g>

          {/* Palm fronds */}
          <g className="notfound-sway">
            <path d="M304 162 C280 122 248 96 208 88 C246 110 278 136 304 162 Z" fill="#2fbf8f" />
            <path d="M304 162 C264 156 224 166 196 188 C238 176 274 170 304 162 Z" fill="#26a97d" />
            <path d="M304 162 C270 136 230 128 192 134 C234 142 272 152 304 162 Z" fill="#3fd39f" />
            <path d="M304 162 C294 118 286 80 290 42 C310 78 310 118 304 162 Z" fill="#34cb99" />
            <path d="M304 162 C328 122 360 96 400 88 C362 110 330 136 304 162 Z" fill="#2fbf8f" />
            <path d="M304 162 C338 136 378 128 416 134 C374 142 336 152 304 162 Z" fill="#3fd39f" />
            <path d="M304 162 C344 156 384 166 412 188 C370 176 334 170 304 162 Z" fill="#26a97d" />

            {/* Coconuts */}
            <circle cx="294" cy="170" r="8" fill="#b45309" />
            <circle cx="311" cy="174" r="7.5" fill="#92400e" />
            <circle cx="303" cy="183" r="7" fill="#a16207" />
            <circle cx="295" cy="168" r="2.6" fill="#d97706" opacity=".7" />
          </g>

          {/* Beach chair */}
          <g transform="translate(392,342)" filter="url(#nf-softShadow)">
            <line x1="-30" y1="0" x2="10" y2="-34" stroke="#c2874a" strokeWidth="6" strokeLinecap="round" />
            <line x1="30" y1="0" x2="-8" y2="-34" stroke="#c2874a" strokeWidth="6" strokeLinecap="round" />
            <line x1="-8" y1="-34" x2="-46" y2="-62" stroke="#c2874a" strokeWidth="6" strokeLinecap="round" />
            <path d="M-36 -34 L14 -34 L22 -16 L-28 -16 Z" fill="#ff8a9b" />
            <path d="M-40 -34 L-58 -64 L-34 -70 L-20 -40 Z" fill="#ff8a9b" />
            <g clipPath="url(#nf-chairClip)">
              <path d="M-56 -80 L-50 20" stroke="#fff1f2" strokeWidth="5" />
              <path d="M-34 -80 L-28 20" stroke="#fff1f2" strokeWidth="5" />
              <path d="M-16 -80 L-10 20" stroke="#fff1f2" strokeWidth="5" />
              <path d="M2 -80 L8 20" stroke="#fff1f2" strokeWidth="5" />
            </g>
            <ellipse cx="-30" cy="-46" rx="13" ry="9" fill="#fffaf0" opacity=".95" transform="rotate(-38 -30 -46)" />
          </g>

          {/* Bottle with 404 note */}
          <g transform="translate(288,374) rotate(-8)">
            <g className="notfound-bob">
              <rect
                x="-54"
                y="-22"
                width="88"
                height="44"
                rx="20"
                fill="rgba(165,243,252,.6)"
                stroke="#22d3ee"
                strokeWidth="3"
              />
              <rect
                x="30"
                y="-12"
                width="26"
                height="24"
                rx="7"
                fill="rgba(165,243,252,.6)"
                stroke="#22d3ee"
                strokeWidth="3"
              />
              <rect x="52" y="-11" width="16" height="22" rx="5" fill="#c2874a" stroke="#a1662f" strokeWidth="2" />
              <line x1="56" y1="-6" x2="64" y2="-6" stroke="#a1662f" strokeWidth="2" />
              <line x1="56" y1="0" x2="64" y2="0" stroke="#a1662f" strokeWidth="2" />
              <line x1="56" y1="6" x2="64" y2="6" stroke="#a1662f" strokeWidth="2" />
              <rect x="-30" y="-14" width="52" height="28" rx="6" fill="#fffaf0" stroke="#e2cfa8" strokeWidth="2" />
              <text
                x="-4"
                y="5"
                textAnchor="middle"
                fontFamily="'Roboto Mono', monospace"
                fontSize="14"
                fontWeight="700"
                fill="#fb7185"
              >
                404
              </text>
              <path d="M-42 -11 q12 -7 26 -7" stroke="#ffffff" strokeWidth="4" fill="none" strokeLinecap="round" opacity=".85" />
              <path d="M36 -6 h14" stroke="#ffffff" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".7" />
            </g>
          </g>

          {/* Starfish */}
          <g transform="translate(432,368) rotate(12)" fill="#fb923c">
            <path d="M0 -14 L4 -4 L14 -4 L6 3 L9 13 L0 7 L-9 13 L-6 3 L-14 -4 L-4 -4 Z" />
            <circle cx="0" cy="0" r="2.4" fill="#ffedd5" />
          </g>

          {/* Shell */}
          <g transform="translate(196,372)">
            <path d="M-11 6 A11 11 0 0 1 11 6 Z" fill="#fda4af" />
            <path d="M0 -5 L0 6 M-6 -1 L-4 6 M6 -1 L4 6" stroke="#fecdd3" strokeWidth="2" strokeLinecap="round" />
          </g>

          {/* Crab */}
          <g transform="translate(168,340)">
            <path d="M-15 0 l-9 -7 M15 0 l9 -7" stroke="#fb7185" strokeWidth="3.4" strokeLinecap="round" />
            <ellipse cx="0" cy="2" rx="15" ry="10" fill="#fb7185" />
            <circle cx="-5" cy="-5" r="3.2" fill="#1f2d3d" />
            <circle cx="5" cy="-5" r="3.2" fill="#1f2d3d" />
            <path d="M-6 9 q6 5 12 0" stroke="#e11d48" strokeWidth="2" fill="none" strokeLinecap="round" />
          </g>

          {/* Sparkles */}
          <g fill="#fbbf24">
            <path className="notfound-float-fast" d="M462 118 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z" />
            <path className="notfound-float-mid" d="M232 106 l2.4 5.6 5.6 2.4 -5.6 2.4 -2.4 5.6 -2.4 -5.6 -5.6 -2.4 5.6 -2.4 z" />
          </g>
          <circle className="notfound-pulse" cx="130" cy="214" r="3.6" fill="#34d399" />
          <circle className="notfound-pulse" cx="500" cy="196" r="3" fill="#22d3ee" />
        </svg>

        <div>
          <span className="notfound-eyebrow">
            <span className="dot"></span> Error 404 · Castaway Status
          </span>
        </div>

        <h1 className="notfound-title">
          Mayday! You've Washed Up on{" "}
          <span className="accent">Page 404</span>
        </h1>

        <p className="notfound-subtext">
          No resorts, no Wi-Fi, and definitely no breakfast buffet here. Don't
          panic — our rescue boat is ready to take you back to safety.
        </p>

        <div className="notfound-ai-box">
          <div className="notfound-ai-icon" aria-hidden="true">
            🌴
          </div>
          <div className="notfound-ai-content">
            <div className="notfound-ai-label">Ask AI</div>
            <p className="notfound-ai-prompt">{promptText}</p>
          </div>
          <button
            className={`notfound-copy-btn ${copied ? "copied" : ""}`}
            type="button"
            onClick={copyPrompt}
          >
            {copied ? "Copied ✓" : "Copy prompt"}
          </button>
        </div>

        <div className="notfound-actions">
          <Link to="/" className="notfound-btn notfound-btn-primary">
            🛟 Rescue Me Home
          </Link>
          <Link to="/trips/new" className="notfound-btn notfound-btn-ghost">
            🏝️ Plan a Real Trip
          </Link>
        </div>

        <p className="notfound-footnote">
          Last known coordinates: <code>/404</code> · No coconuts were harmed in
          the making of this page.
        </p>
      </main>
    </div>
  );
};

export default NotFound;