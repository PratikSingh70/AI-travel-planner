import { useEffect, useRef, forwardRef } from "react";
import "./LiquidMetalButton.css";

const LiquidMetalButton = forwardRef(
  (
    {
      children = "Generate Trip",
      onClick,
      disabled = false,
      loading = false,
      type = "button",
    },
    ref
  ) => {
    const turbRef = useRef(null);

    // Animate the SVG turbulence filter for organic liquid flow
    useEffect(() => {
      const turb = turbRef.current;
      if (!turb) return;

      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (reduce) return;

      let t = 0;
      let prev = 0;
      let rafId = null;

      const loop = (now) => {
        if (now - prev > 40) {
          prev = now;
          t += 0.04;

          const fx =
            0.012 + Math.sin(t * 0.7) * 0.004 + Math.sin(t * 1.9) * 0.0015;
          const fy =
            0.018 + Math.cos(t * 0.55) * 0.005 + Math.cos(t * 1.4) * 0.0018;

          turb.setAttribute(
            "baseFrequency",
            fx.toFixed(5) + " " + fy.toFixed(5)
          );
        }
        rafId = requestAnimationFrame(loop);
      };

      rafId = requestAnimationFrame(loop);
      return () => {
        if (rafId) cancelAnimationFrame(rafId);
      };
    }, []);

    const isDisabled = disabled || loading;

    return (
      <>
        {/* SVG filter host — only rendered once per page load */}
        <svg
          className="lm-defs"
          aria-hidden="true"
          focusable="false"
          style={{
            position: "absolute",
            width: 0,
            height: 0,
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          <filter
            id="liquidBorder"
            x="-20%"
            y="-40%"
            width="140%"
            height="180%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              ref={turbRef}
              type="fractalNoise"
              baseFrequency="0.012 0.018"
              numOctaves="2"
              seed="4"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="6"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </svg>

        <button
          ref={ref}
          type={type}
          className="liquid-metal-btn"
          onClick={onClick}
          disabled={isDisabled}
          aria-busy={loading}
        >
          <span className="lmb-icon-container">
            {loading ? (
              <span className="lmb-spinner" />
            ) : (
              <svg
                className="lmb-plane"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 2L11 13" />
                <path d="M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            )}
          </span>
          <span className="lmb-text">
            {loading ? "Generating..." : children}
          </span>
        </button>
      </>
    );
  }
);

LiquidMetalButton.displayName = "LiquidMetalButton";

export default LiquidMetalButton;