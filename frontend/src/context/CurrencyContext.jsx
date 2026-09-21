import { createContext, useContext, useState, useEffect } from "react";

const CurrencyContext = createContext();

const FALLBACK_RATES = {
  INR: 1,
  USD: 0.012,
  EUR: 0.011,
  GBP: 0.0094,
  JPY: 1.83,
};

const CURRENCIES = {
  INR: { symbol: "₹", name: "Indian Rupee" },
  USD: { symbol: "$", name: "US Dollar" },
  EUR: { symbol: "€", name: "Euro" },
  GBP: { symbol: "£", name: "British Pound" },
  JPY: { symbol: "¥", name: "Japanese Yen" },
};

const STORAGE_KEY = "aitp.currency";
const RATES_CACHE_KEY = "aitp.rates";
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
          parsed.time &&
          Date.now() - parsed.time < CACHE_TTL &&
          parsed.rates
        ) {
          setRates(parsed.rates);
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
              JSON.stringify({ time: Date.now(), rates: wanted })
            );
          } catch {}
        }
      })
      .catch(() => {
        /* keep fallback */
      });
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