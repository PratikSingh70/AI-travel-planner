import { useEffect, useRef, useState } from "react";
import "./ImageSlideshow.css";

const fallbackUrl = (title) =>
  `https://picsum.photos/seed/${encodeURIComponent(title || "travel")}/1600/686`;

const ImageSlideshow = ({
  slides = [],
  interval = 3000,
  className = "",
  onChange,
}) => {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loaded, setLoaded] = useState({});
  const [noTransition, setNoTransition] = useState(false);
  const timerRef = useRef(null);
  const touchStartX = useRef(0);

  const total = slides.length;
  const extended = total > 0 ? [...slides, slides[0]] : [];

  useEffect(() => {
    if (total <= 1 || paused) return;
    timerRef.current = setInterval(() => {
      setCurrent((c) => {
        if (c >= total) return 0;
        const next = c + 1;
        const realIndex = next % total;
        if (onChange) {
          setTimeout(() => onChange(slides[realIndex], realIndex), 0);
        }
        return next;
      });
    }, interval);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, paused, interval, slides]);

  const handleTransitionEnd = () => {
    if (current === total) {
      setNoTransition(true);
      setCurrent(0);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setNoTransition(false));
      });
    }
  };

  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const handleTouchStart = (e) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };
  const handleTouchEnd = (e) => {
    const delta = e.changedTouches[0].screenX - touchStartX.current;
    if (Math.abs(delta) > 50) {
      setPaused(false);
      setCurrent((c) => {
        let next = c + (delta < 0 ? 1 : -1);
        if (next < 0) next = 0;
        if (next > total) next = total;
        return next;
      });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowRight") {
      setCurrent((c) => Math.min(c + 1, total));
    }
    if (e.key === "ArrowLeft") {
      setCurrent((c) => Math.max(c - 1, 0));
    }
  };

  if (!total) return null;

  return (
    <div
      className={`slideshow ${className}`}
      tabIndex={0}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
    >
      <div
        className={`slides-track ${noTransition ? "no-transition" : ""}`}
        style={{ transform: `translateX(-${current * 100}%)` }}
        onTransitionEnd={handleTransitionEnd}
      >
        {extended.map((s, i) => (
          <div
            key={i}
            className={`slide ${i === current ? "active" : ""} ${
              loaded[i % total] ? "loaded" : ""
            }`}
          >
            <img
              src={s.image}
              alt={s.title}
              loading="eager"
              decoding="async"
              referrerPolicy="no-referrer"
              onLoad={() =>
                setLoaded((prev) => ({ ...prev, [i % total]: true }))
              }
              onError={(e) => {
                if (e.target.dataset.fallback === "1") return;
                e.target.dataset.fallback = "1";
                e.target.src = fallbackUrl(s.title);
              }}
            />
            <div className="slide-overlay" />
            <div className="slide-content">
              {s.pill && <div className="slide-pill">{s.pill}</div>}
              {s.title && <h3 className="slide-title">{s.title}</h3>}
            </div>
          </div>
        ))}
      </div>

      <div className="slides-dots">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`slides-dot ${current % total === i ? "active" : ""}`}
            onClick={() => {
              setPaused(false);
              setCurrent(i);
            }}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default ImageSlideshow;