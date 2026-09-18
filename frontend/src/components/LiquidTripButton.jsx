import { useEffect, useRef, useState } from "react";

const LiquidTripButton = ({
  label = "Generate Trip",
  loadingLabel = "Curating Your Itinerary",
  doneLabel = "🎉 Itinerary Ready!",
  disabled = false,
  loading = false, // external control
  onClick,
  onComplete,
  autoCompleteAfter = 0,
}) => {
  const btnRef = useRef(null);
  const particlesRef = useRef(null);
  const spawnerRef = useRef(null);
  const [state, setState] = useState("idle");

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- Particle spawner ----
  const spawnParticle = () => {
    if (prefersReducedMotion) return;
    const container = particlesRef.current;
    if (!container) return;

    const isSpark = Math.random() < 0.35;
    const el = document.createElement("span");
    el.className = isSpark ? "liquid-btn__spark" : "liquid-btn__bubble";

    const size = isSpark ? 5 + Math.random() * 5 : 3 + Math.random() * 6;
    el.style.width = size.toFixed(1) + "px";
    el.style.height = size.toFixed(1) + "px";
    el.style.left = (4 + Math.random() * 92).toFixed(1) + "%";
    el.style.setProperty("--dx", (Math.random() * 44 - 22).toFixed(0) + "px");

    const dur = 1.1 + Math.random() * 1.1;
    el.style.animationDuration = dur.toFixed(2) + "s";
    el.style.animationDelay = (Math.random() * 0.25).toFixed(2) + "s";

    container.appendChild(el);
    setTimeout(() => el.remove(), (dur + 0.7) * 1000);
  };

  const startParticles = () => {
    if (prefersReducedMotion) return;
    stopParticles();
    spawnerRef.current = setInterval(spawnParticle, 80);
    for (let i = 0; i < 6; i++) setTimeout(spawnParticle, i * 60);
  };

  const stopParticles = () => {
    if (spawnerRef.current) {
      clearInterval(spawnerRef.current);
      spawnerRef.current = null;
    }
  };

  // ---- State methods ----
  const setLoadingState = () => {
    if (state === "loading") return;
    setState("loading");
    startParticles();
  };

  const setCompleteState = () => {
    if (state === "complete") return;
    stopParticles();
    setState("complete");
    if (!prefersReducedMotion) {
      for (let i = 0; i < 10; i++) setTimeout(spawnParticle, i * 50);
    }
    if (typeof onComplete === "function") onComplete();
  };

  const resetState = () => {
    if (state === "idle") return;
    stopParticles();
    setState("idle");
  };

  // ---- External control via window (used by TripDetail) ----
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.__liquidTripBtn = {
      setComplete: () => setCompleteState(),
      setLoading: () => setLoadingState(),
      reset: () => resetState(),
    };
    return () => {
      delete window.__liquidTripBtn;
    };
  }, [state]);

  // ---- Sync with external `loading` prop ----
  useEffect(() => {
    if (loading && state === "idle") {
      setLoadingState();
    }
  }, [loading, state]);

  // ---- Click handler ----
  const handleClick = () => {
    if (state !== "idle" || disabled) return;
    setLoadingState();
    if (typeof onClick === "function") onClick();
  };

  // ---- Auto-complete after N ms ----
  useEffect(() => {
    if (autoCompleteAfter > 0 && state === "loading") {
      const t = setTimeout(() => setCompleteState(), autoCompleteAfter);
      return () => clearTimeout(t);
    }
  }, [state, autoCompleteAfter]);

  // ---- Auto reset after complete ----
  useEffect(() => {
    if (state === "complete") {
      const t = setTimeout(() => resetState(), 3200);
      return () => clearTimeout(t);
    }
  }, [state]);

  // ---- Cleanup on unmount ----
  useEffect(() => {
    return () => stopParticles();
  }, []);

  const cls = [
    "liquid-btn",
    state === "loading" ? "is-loading" : "",
    state === "complete" ? "is-complete" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={btnRef}
      type="button"
      className={cls}
      onClick={handleClick}
      disabled={disabled}
      aria-live="polite"
      aria-busy={state === "loading"}
    >
      <span className="liquid-btn__liquid" aria-hidden="true">
        <span className="liquid-btn__wave liquid-btn__wave--a">
          <svg viewBox="0 0 1200 40" preserveAspectRatio="none">
            <path
              d="M0 20 Q150 0 300 20 T600 20 T900 20 T1200 20 V40 H0 Z"
              fill="#A8D84A"
            />
          </svg>
        </span>
        <span className="liquid-btn__wave liquid-btn__wave--b">
          <svg viewBox="0 0 1200 40" preserveAspectRatio="none">
            <path
              d="M0 20 Q150 40 300 20 T600 20 T900 20 T1200 20 V40 H0 Z"
              fill="#C4E570"
            />
          </svg>
        </span>
      </span>

      <span
        className="liquid-btn__particles"
        aria-hidden="true"
        ref={particlesRef}
      ></span>
      <span className="liquid-btn__flash" aria-hidden="true"></span>

      <span className="liquid-btn__content">
        <span className="liquid-btn__icon-wrap" aria-hidden="true">
          <svg
            className="liquid-btn__ic liquid-btn__ic--compass"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="9.1"
              stroke="currentColor"
              strokeWidth="1.5"
              opacity=".55"
            />
            <path
              d="M15.9 8.1 13.4 13.4 8.1 15.9 10.6 10.6 Z"
              fill="currentColor"
            />
            <path
              d="M12 1.4v2.1M12 20.5v2.1M1.4 12h2.1M20.5 12h2.1"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              opacity=".7"
            />
          </svg>
          <svg
            className="liquid-btn__ic liquid-btn__ic--check"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              className="liquid-btn__check-path"
              d="M5 12.5 10 17.5 19 7"
              stroke="#E5F0C8"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        <span className="liquid-btn__label-stack">
          <span className="liquid-btn__label liquid-btn__label--idle">
            {label}
          </span>
          <span className="liquid-btn__label liquid-btn__label--loading">
            {loadingLabel}
            <span className="liquid-btn__dots">
              <i></i>
              <i></i>
              <i></i>
            </span>
          </span>
          <span className="liquid-btn__label liquid-btn__label--done">
            {doneLabel}
          </span>
        </span>
      </span>
    </button>
  );
};

export default LiquidTripButton;