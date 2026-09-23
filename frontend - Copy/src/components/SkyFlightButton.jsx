import { useEffect, useState } from "react";

const SkyFlightButton = ({
  label = "Generate My Trip",
  loadingLabel = "Curating Your Itinerary",
  doneLabel = "🎉 Itinerary Ready!",
  disabled = false,
  loading = false,
  onClick,
  onComplete,
  autoCompleteAfter = 2000,
}) => {
  const [state, setState] = useState("idle"); // idle | loading | complete

  // ---- External control via window (used by TripDetail) ----
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.__skyTripBtn = {
      setComplete: () => setCompleteState(),
      setLoading: () => setLoadingState(),
      reset: () => resetState(),
    };
    return () => {
      delete window.__skyTripBtn;
    };
  }, [state]);

  // ---- Sync with external `loading` prop ----
  useEffect(() => {
    if (loading && state === "idle") setLoadingState();
  }, [loading, state]);

  const setLoadingState = () => {
    if (state === "loading") return;
    setState("loading");
  };

  const setCompleteState = () => {
    if (state === "complete") return;
    setState("complete");
    if (typeof onComplete === "function") onComplete();
  };

  const resetState = () => {
    if (state === "idle") return;
    setState("idle");
  };

  const handleClick = () => {
    if (state !== "idle" || disabled) return;
    setLoadingState();
    if (typeof onClick === "function") onClick();

    // Auto-complete (also handles case where backend hasn't responded yet)
    if (autoCompleteAfter > 0) {
      setTimeout(() => setCompleteState(), autoCompleteAfter);
    }
  };

  // Auto-reset after complete
  useEffect(() => {
    if (state === "complete") {
      const t = setTimeout(() => resetState(), 2800);
      return () => clearTimeout(t);
    }
  }, [state]);

  const cls = [
    "sky-btn",
    state === "idle" ? "is-idle" : "",
    state === "loading" ? "is-loading" : "",
    state === "complete" ? "is-complete" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={cls}
      onClick={handleClick}
      disabled={disabled || state !== "idle"}
      data-state={state}
      aria-live="polite"
      aria-busy={state === "loading"}
    >
      {/* Sky */}
      <span className="sky-btn__sky" aria-hidden="true">
        <span className="sky-btn__tint"></span>
        <span className="sky-btn__stars"></span>
        <span className="sky-btn__cloud c1"></span>
        <span className="sky-btn__cloud c2"></span>
        <span className="sky-btn__cloud c3"></span>
      </span>

      {/* Flying plane + contrail */}
      <span className="sky-btn__flyer" aria-hidden="true">
        <span className="sky-btn__trail"></span>
        <span className="sky-btn__streak s1"></span>
        <span className="sky-btn__streak s2"></span>
        <span className="sky-btn__streak s3"></span>
        <svg
          className="sky-btn__flyer-svg"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
        </svg>
      </span>

      {/* Completion ripple */}
      {state === "complete" && (
        <span className="sky-btn__ripple" aria-hidden="true"></span>
      )}

      {/* Foreground */}
      <span className="sky-btn__content">
        <span className="sky-btn__icon" aria-hidden="true">
          <svg
            className="sky-btn__icon-plane"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
          </svg>
          <svg
            className="sky-btn__icon-check"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4.5 12.6 9.3 17.4 19.5 7.2" />
          </svg>
        </span>

        <span className="sky-btn__swap">
          <span
            className={`sky-btn__label ${
              state === "idle" ? "is-active" : ""
            }`}
          >
            {label}
          </span>
          <span
            className={`sky-btn__label ${
              state === "loading" ? "is-active" : ""
            }`}
          >
            {loadingLabel}
            <span className="sky-btn__dots" aria-hidden="true">
              <i></i>
              <i></i>
              <i></i>
            </span>
          </span>
          <span
            className={`sky-btn__label ${
              state === "complete" ? "is-active" : ""
            }`}
          >
            {doneLabel}
          </span>
        </span>
      </span>
    </button>
  );
};

export default SkyFlightButton;