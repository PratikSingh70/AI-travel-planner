import { useState, useRef, useEffect } from "react";
import { useCurrency } from "../context/CurrencyContext";
import "./CurrencyToggle.css";

const CurrencyToggle = () => {
  const { currency, setCurrency, currencies } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="ct-wrap" ref={ref}>
      <button
        type="button"
        className={`ct-btn ${open ? "open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Change currency"
        aria-expanded={open}
      >
        <span className="ct-symbol">{currencies[currency].symbol}</span>
        <span className="ct-code">{currency}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="ct-menu">
          {Object.entries(currencies).map(([code, info]) => (
            <button
              key={code}
              type="button"
              className={`ct-item ${currency === code ? "active" : ""}`}
              onClick={() => {
                setCurrency(code);
                setOpen(false);
              }}
            >
              <span className="ct-item-sym">{info.symbol}</span>
              <span className="ct-item-info">
                <span className="ct-item-code">{code}</span>
                <span className="ct-item-name">{info.name}</span>
              </span>
              {currency === code && <span className="ct-item-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CurrencyToggle;