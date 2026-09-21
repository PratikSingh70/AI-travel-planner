import { useState, useRef, useEffect, useMemo } from "react";
import { useCurrency } from "../context/CurrencyContext";
import "./CurrencyToggle.css";

const CurrencyToggle = () => {
  const { currency, setCurrency, currencies } = useCurrency();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);

  // Close on outside click + Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Clear search when menu closes
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  // Filter list by symbol, code, or name
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const entries = Object.entries(currencies);
    if (!q) return entries;
    return entries.filter(([code, info]) => {
      return (
        code.toLowerCase().includes(q) ||
        info.name.toLowerCase().includes(q) ||
        info.symbol.toLowerCase().includes(q)
      );
    });
  }, [currencies, query]);

  const handlePick = (code) => {
    setCurrency(code);
    setOpen(false);
  };

  return (
    <div className="ct-wrap" ref={ref}>
      {/* Top button: symbol + code */}
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
          {/* Scrollable list */}
          <div className="ct-list">
            {filtered.length === 0 ? (
              <div className="ct-empty">No currency found</div>
            ) : (
              filtered.map(([code, info]) => (
                <button
                  key={code}
                  type="button"
                  className={`ct-item ${currency === code ? "active" : ""}`}
                  onClick={() => handlePick(code)}
                >
                  <span className="ct-item-sym">{info.symbol}</span>
                  <span className="ct-item-info">
                    <span className="ct-item-code">{code}</span>
                    <span className="ct-item-name">{info.name}</span>
                  </span>
                  {currency === code && (
                    <span className="ct-item-check">✓</span>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Search box pinned at bottom (per sketch) */}
          <div className="ct-search">
            <span className="ct-search-icon">🔍</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search currency"
              className="ct-search-input"
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                className="ct-search-clear"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrencyToggle;