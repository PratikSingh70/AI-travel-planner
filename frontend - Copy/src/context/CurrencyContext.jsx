import { createContext, useContext, useState, useEffect } from "react";

const CurrencyContext = createContext();

const FALLBACK_RATES = {
  INR: 1,
  USD: 0.012,
  EUR: 0.011,
  GBP: 0.0094,
  JPY: 1.83,
  AUD: 0.018,
  CAD: 0.016,
  CNY: 0.087,
  CHF: 0.0105,
  HKD: 0.093,
  SGD: 0.016,
  KRW: 16.2,
  AED: 0.044,
  ZAR: 0.22,
  NGN: 19.5,
  KES: 1.55,
  EGP: 0.59,
  MAD: 0.12,
  GHS: 0.18,
  TZS: 32.4,
  UGX: 44.5,
  XOF: 7.25,
  ETB: 1.38,
  BRL: 0.070,
  MXN: 0.22,
};

const CURRENCIES = {
  INR: { symbol: "₹",  name: "Indian Rupee",          flag: "🇮🇳", countries: ["India"] },
  USD: { symbol: "$",  name: "US Dollar",             flag: "🇺🇸", countries: ["United States", "USA", "America", "Ecuador", "El Salvador", "Panama"] },
  EUR: { symbol: "€",  name: "Euro",                  flag: "🇪🇺", countries: ["Germany", "France", "Italy", "Spain", "Netherlands", "Portugal", "Greece", "Ireland", "Austria", "Belgium", "Finland", "Croatia", "Estonia", "Latvia", "Lithuania", "Luxembourg", "Malta", "Slovakia", "Slovenia", "Cyprus"] },
  GBP: { symbol: "£",  name: "British Pound",         flag: "🇬🇧", countries: ["United Kingdom", "UK", "England", "Scotland", "Wales"] },
  JPY: { symbol: "¥",  name: "Japanese Yen",          flag: "🇯🇵", countries: ["Japan"] },
  AUD: { symbol: "A$", name: "Australian Dollar",     flag: "🇦🇺", countries: ["Australia"] },
  CAD: { symbol: "C$", name: "Canadian Dollar",       flag: "🇨🇦", countries: ["Canada"] },
  CNY: { symbol: "¥",  name: "Chinese Yuan",          flag: "🇨🇳", countries: ["China"] },
  CHF: { symbol: "Fr", name: "Swiss Franc",           flag: "🇨🇭", countries: ["Switzerland", "Liechtenstein"] },
  HKD: { symbol: "HK$", name: "Hong Kong Dollar",     flag: "🇭🇰", countries: ["Hong Kong"] },
  SGD: { symbol: "S$", name: "Singapore Dollar",      flag: "🇸🇬", countries: ["Singapore"] },
  KRW: { symbol: "₩",  name: "South Korean Won",      flag: "🇰🇷", countries: ["South Korea", "Korea"] },
  AED: { symbol: "د.إ", name: "UAE Dirham",           flag: "🇦🇪", countries: ["United Arab Emirates", "UAE", "Dubai", "Abu Dhabi"] },

  ZAR: { symbol: "R",   name: "South African Rand",   flag: "🇿🇦", countries: ["South Africa", "Namibia", "Lesotho", "Eswatini"] },
  NGN: { symbol: "₦",   name: "Nigerian Naira",       flag: "🇳🇬", countries: ["Nigeria"] },
  KES: { symbol: "KSh", name: "Kenyan Shilling",      flag: "🇰🇪", countries: ["Kenya"] },
  EGP: { symbol: "E£",  name: "Egyptian Pound",       flag: "🇪🇬", countries: ["Egypt"] },
  MAD: { symbol: "DH",  name: "Moroccan Dirham",      flag: "🇲🇦", countries: ["Morocco"] },
  GHS: { symbol: "₵",   name: "Ghanaian Cedi",        flag: "🇬🇭", countries: ["Ghana"] },
  TZS: { symbol: "TSh", name: "Tanzanian Shilling",   flag: "🇹🇿", countries: ["Tanzania"] },
  UGX: { symbol: "USh", name: "Ugandan Shilling",     flag: "🇺🇬", countries: ["Uganda"] },
  XOF: { symbol: "CFA", name: "West African CFA Franc", flag: "🌍", countries: ["Senegal", "Ivory Coast", "Mali", "Burkina Faso", "Niger", "Togo", "Benin", "Guinea-Bissau"] },
  ETB: { symbol: "Br",  name: "Ethiopian Birr",       flag: "🇪🇹", countries: ["Ethiopia"] },

  BRL: { symbol: "R$",  name: "Brazilian Real",       flag: "🇧🇷", countries: ["Brazil"] },
  MXN: { symbol: "MX$", name: "Mexican Peso",         flag: "🇲🇽", countries: ["Mexico"] },
};

/* ──────────────────────────────────────────────────────────
   Detect the local currency from a destination string.
   Example: "Kyoto, Japan" → "JPY"
   ────────────────────────────────────────────────────────── */
export const detectCurrencyFromDestination = (destination) => {
  if (!destination) return null;

  // Build a flat list of { country, code } sorted longest-first
  // so "South Africa" beats "Africa" and "Niger" doesn't steal "Nigeria"
  const flat = [];
  for (const [code, info] of Object.entries(CURRENCIES)) {
    if (Array.isArray(info.countries)) {
      for (const c of info.countries) {
        flat.push({ country: c.toLowerCase(), code });
      }
    }
  }
  flat.sort((a, b) => b.country.length - a.country.length);

  const full = destination.toLowerCase();

  // 1. Prefer matching the tail parts ("Kyoto, Japan" → check "japan")
  const parts = full.split(",").map((p) => p.trim()).filter(Boolean);
  const tail = parts.slice(-3);

  for (const part of tail.reverse()) {
    for (const { country, code } of flat) {
      if (part === country) return code;
    }
  }

  // 2. Fall back to "includes" match on tail parts
  for (const part of tail) {
    for (const { country, code } of flat) {
      // Whole-word-ish boundary check for short names
      if (part.includes(country)) return code;
    }
  }

  // 3. Last resort: match anywhere in the string
  for (const { country, code } of flat) {
    if (full.includes(country)) return code;
  }

  return null;
};

const STORAGE_KEY = "aitp.currency";
const RATES_CACHE_KEY = "aitp.rates";
const RATES_CACHE_VERSION = "v3";
const CACHE_TTL = 24 * 60 * 60 * 1000;

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && CURRENCIES[saved]) return saved;
    } catch {}
    return "INR";
  });

  const [rates, setRates] = useState(FALLBACK_RATES);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(RATES_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (
          parsed.version === RATES_CACHE_VERSION &&
          parsed.time &&
          Date.now() - parsed.time < CACHE_TTL &&
          parsed.rates
        ) {
          setRates({ ...FALLBACK_RATES, ...parsed.rates });
          return;
        }
      }
    } catch {}

    fetch("https://open.er-api.com/v6/latest/INR")
      .then((res) => res.json())
      .then((data) => {
        if (data?.rates) {
          const wanted = {};
          Object.keys(CURRENCIES).forEach((code) => {
            wanted[code] = data.rates[code] || FALLBACK_RATES[code] || 1;
          });
          wanted.INR = 1;
          setRates(wanted);
          try {
            localStorage.setItem(
              RATES_CACHE_KEY,
              JSON.stringify({
                version: RATES_CACHE_VERSION,
                time: Date.now(),
                rates: wanted,
              })
            );
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const setCurrency = (code) => {
    if (!CURRENCIES[code]) return;
    setCurrencyState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {}
  };

  const convert = (amountInINR) => {
    if (amountInINR == null || isNaN(amountInINR)) return 0;
    const rate = rates[currency] || 1;
    return Number(amountInINR) * rate;
  };

  const format = (amountInINR) => {
    const value = convert(amountInINR);
    const sym = CURRENCIES[currency].symbol;
    const rounded =
      value >= 100 ? Math.round(value) : Math.round(value * 100) / 100;
    return `${sym}${rounded.toLocaleString("en-US")}`;
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        convert,
        format,
        currencies: CURRENCIES,
        rates,
        detectCurrencyFromDestination,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx)
    throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}