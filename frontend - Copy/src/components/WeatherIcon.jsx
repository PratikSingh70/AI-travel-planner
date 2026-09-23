// frontend/src/components/WeatherIcon.jsx — NEW FILE
import { useMemo } from "react";

/* WMO code → animation type */
export function decodeWeatherCode(code) {
  if (code === 0) return { type: "sun", label: "Clear Sky" };
  if (code === 1) return { type: "partly", label: "Mainly Clear" };
  if (code === 2) return { type: "partly", label: "Partly Cloudy" };
  if (code === 3) return { type: "cloud", label: "Overcast" };
  if (code === 45 || code === 48) return { type: "fog", label: "Foggy" };
  if (code >= 51 && code <= 57) return { type: "drizzle", label: "Drizzle" };
  if (code >= 61 && code <= 67) return { type: "rain", label: "Rain" };
  if (code >= 71 && code <= 77) return { type: "snow", label: "Snow" };
  if (code >= 80 && code <= 82) return { type: "rain", label: "Rain Showers" };
  if (code >= 85 && code <= 86) return { type: "snow", label: "Snow Showers" };
  if (code >= 95 && code <= 99) return { type: "thunder", label: "Thunderstorm" };
  return { type: "cloud", label: "Mixed" };
}

let _uid = 0;

function renderWxSvg(type) {
  const uid = ++_uid;

  const defs = `<defs>
    <radialGradient id="wfSunCore-${uid}" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#fffbe6"/>
      <stop offset="35%" stop-color="#fde047"/>
      <stop offset="70%" stop-color="#facc15"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </radialGradient>
    <radialGradient id="wfSunGlow-${uid}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fde047" stop-opacity="0.85"/>
      <stop offset="55%" stop-color="#fbbf24" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="wfRay-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
    <linearGradient id="wfCloud-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="50%" stop-color="#e2e8f0"/>
      <stop offset="100%" stop-color="#94a3b8"/>
    </linearGradient>
    <linearGradient id="wfCloudBack-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#94a3b8"/>
      <stop offset="100%" stop-color="#475569"/>
    </linearGradient>
    <linearGradient id="wfStorm-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#64748b"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="wfDrop-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e0f2fe"/>
      <stop offset="55%" stop-color="#60a5fa"/>
      <stop offset="100%" stop-color="#2563eb"/>
    </linearGradient>
    <linearGradient id="wfBolt-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fff7cc"/>
      <stop offset="50%" stop-color="#fde047"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
    <filter id="wfBlur-${uid}" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1.4"/>
    </filter>
    <filter id="wfGlow-${uid}" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2.4"/>
    </filter>
  </defs>`;

  const wrap = (inner) =>
    `<svg class="wf-wx-icon" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">${defs}${inner}</svg>`;

  const cloud = `<path d="M22 58 h38 c5 0 9 -4 9 -9 c0 -5 -4 -9 -9 -9 c-1 -8 -8 -14 -16 -14 c-7 0 -13 4 -15 11 c-1 -1 -3 -1 -4 -1 c-5 0 -9 4 -9 9 c0 5 4 9 9 9 z" fill="url(#wfCloud-${uid})" stroke="rgba(255,255,255,0.9)" stroke-width="0.9" stroke-linejoin="round"/>`;
  const cloudBack = `<path d="M22 56 h38 c5 0 9 -4 9 -9 c0 -5 -4 -9 -9 -9 c-1 -8 -8 -14 -16 -14 c-7 0 -13 4 -15 11 c-1 -1 -3 -1 -4 -1 c-5 0 -9 4 -9 9 c0 5 4 9 9 9 z" fill="url(#wfCloudBack-${uid})" stroke="rgba(255,255,255,0.35)" stroke-width="0.8" stroke-linejoin="round"/>`;
  const storm = `<path d="M18 56 h44 c6 0 10 -4 10 -10 c0 -6 -4 -10 -10 -10 c-1 -9 -9 -16 -18 -16 c-8 0 -15 5 -17 13 c-1 -1 -3 -1 -4 -1 c-6 0 -11 5 -11 11 c0 6 5 13 6 13 z" fill="url(#wfStorm-${uid})" stroke="rgba(255,255,255,0.3)" stroke-width="0.8" stroke-linejoin="round"/>`;

  if (type === "sun") {
    const rays = Array.from({ length: 12 }, (_, i) => {
      const a = (i * 360) / 12;
      return `<rect x="38.6" y="6" width="2.8" height="10" rx="1.4" fill="url(#wfRay-${uid})" transform="rotate(${a} 40 40)"/>`;
    }).join("");
    return wrap(`
      <circle class="wf-wx-sun-glow" cx="40" cy="40" r="28" fill="url(#wfSunGlow-${uid})"/>
      <g class="wf-wx-sun-rays">${rays}</g>
      <circle class="wf-wx-sun-core" cx="40" cy="40" r="15" fill="url(#wfSunCore-${uid})"/>
      <ellipse cx="35" cy="33" rx="6" ry="4.5" fill="#ffffff" opacity="0.55" filter="url(#wfBlur-${uid})"/>
      <circle cx="40" cy="40" r="15" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
    `);
  }

  if (type === "cloud") {
    return wrap(`
      <g class="wf-wx-cloud">${cloudBack}${cloud}
        <ellipse cx="30" cy="38" rx="10" ry="5" fill="#ffffff" opacity="0.35" filter="url(#wfBlur-${uid})"/>
      </g>
    `);
  }

  if (type === "partly") {
    const rays = Array.from({ length: 8 }, (_, i) => {
      const a = (i * 360) / 8;
      return `<rect x="54.6" y="6" width="2.8" height="8" rx="1.4" fill="url(#wfRay-${uid})" transform="rotate(${a} 56 10)"/>`;
    }).join("");
    return wrap(`
      <circle class="wf-wx-sun-glow" cx="56" cy="20" r="18" fill="url(#wfSunGlow-${uid})"/>
      <g class="wf-wx-sun-rays" style="transform-origin:56px 20px">${rays}</g>
      <circle class="wf-wx-sun-core" cx="56" cy="20" r="9" fill="url(#wfSunCore-${uid})"/>
      <ellipse cx="53" cy="17" rx="3.5" ry="2.8" fill="#fff" opacity="0.6" filter="url(#wfBlur-${uid})"/>
      <g class="wf-wx-cloud" style="transform-origin:40px 50px">${cloudBack}${cloud}
        <ellipse cx="30" cy="38" rx="10" ry="5" fill="#ffffff" opacity="0.4" filter="url(#wfBlur-${uid})"/>
      </g>
    `);
  }

  if (type === "rain") {
    const drops = [
      [22, 68, 0], [32, 68, 0.28], [42, 68, 0.55], [52, 68, 0.83], [62, 68, 1.1],
    ].map(([x, y, d]) => `
      <g class="wf-wx-raindrop" style="animation-delay:${d}s">
        <path d="M${x} ${y-6} c -3 4 -3 8 0 10 c 3 -2 3 -6 0 -10 z" fill="url(#wfDrop-${uid})" stroke="rgba(255,255,255,0.5)" stroke-width="0.5"/>
        <circle cx="${x}" cy="${y+2}" r="0.9" fill="#ffffff" opacity="0.85"/>
      </g>`).join("");
    return wrap(`<g class="wf-wx-cloud-back" style="transform-origin:40px 40px">${storm}</g><g class="wf-wx-cloud">${cloud}</g>${drops}`);
  }

  if (type === "drizzle") {
    const drops = [[26, 68, 0], [40, 68, 0.35], [54, 68, 0.7]]
      .map(([x, y, d]) => `
      <g class="wf-wx-raindrop" style="animation-delay:${d}s">
        <path d="M${x} ${y-4} c -2 3 -2 6 0 8 c 2 -2 2 -5 0 -8 z" fill="url(#wfDrop-${uid})" stroke="rgba(255,255,255,0.5)" stroke-width="0.4"/>
      </g>`).join("");
    return wrap(`<g class="wf-wx-cloud">${cloud}</g>${drops}`);
  }

  if (type === "thunder") {
    return wrap(`
      <g class="wf-wx-cloud-back" style="transform-origin:40px 40px">${storm}</g>
      <g class="wf-wx-cloud">${cloud}</g>
      <path class="wf-wx-bolt-glow" d="M42 52 L32 64 L40 64 L34 76 L50 60 L42 60 L46 52 Z" fill="#fde047" filter="url(#wfGlow-${uid})"/>
      <path class="wf-wx-bolt" d="M42 52 L32 64 L40 64 L34 76 L50 60 L42 60 L46 52 Z" fill="url(#wfBolt-${uid})" stroke="#fffbe6" stroke-width="1" stroke-linejoin="round"/>
    `);
  }

  if (type === "snow") {
    const flake = (cx, cy, i) => `
      <g class="wf-wx-snowflake" style="animation-delay:${i * 0.75}s;transform-origin:${cx}px ${cy}px">
        <g transform="translate(${cx} ${cy})">
          <line x1="0" y1="-4" x2="0" y2="4" stroke="#f0f9ff" stroke-width="1.6" stroke-linecap="round"/>
          <line x1="-3.5" y1="-2" x2="3.5" y2="2" stroke="#f0f9ff" stroke-width="1.6" stroke-linecap="round"/>
          <line x1="-3.5" y1="2" x2="3.5" y2="-2" stroke="#f0f9ff" stroke-width="1.6" stroke-linecap="round"/>
          <circle cx="0" cy="0" r="1.2" fill="#ffffff"/>
        </g>
      </g>`;
    return wrap(`<g class="wf-wx-cloud">${cloud}</g>${flake(24, 70, 0)}${flake(40, 70, 1)}${flake(56, 70, 2)}`);
  }

  if (type === "fog") {
    return wrap(`
      <g class="wf-wx-cloud">${cloud}</g>
      <g class="wf-wx-fog-wave"><path d="M14 66 q6 -3 12 0 t12 0 t12 0 t12 0" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/></g>
      <g class="wf-wx-fog-wave"><path d="M10 72 q6 -3 12 0 t12 0 t12 0 t12 0" fill="none" stroke="#e2e8f0" stroke-width="2" stroke-linecap="round"/></g>
      <g class="wf-wx-fog-wave"><path d="M14 78 q6 -3 12 0 t12 0 t12 0 t12 0" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/></g>
    `);
  }

  return wrap(`<circle cx="40" cy="40" r="14" fill="none" stroke="#cbd5e1" stroke-width="2"/>`);
}

export default function WeatherIcon({ type, size = 72 }) {
  const svg = useMemo(() => renderWxSvg(type), [type]);
  return (
    <span
      style={{ display: "inline-block", width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}