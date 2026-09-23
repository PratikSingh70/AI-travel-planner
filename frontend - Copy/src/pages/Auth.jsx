import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Auth.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Decode the Google ID token (JWT) payload
const parseJwt = (token) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const Auth = ({ initialMode = "login" }) => {
  const navigate = useNavigate();
  const { login, register, googleLogin, user } = useAuth();

  const [mode, setMode] = useState(initialMode);

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [loginErrors, setLoginErrors] = useState({});
  const [loginLoading, setLoginLoading] = useState(false);

  // Signup form
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [showSignupPwd, setShowSignupPwd] = useState(false);
  const [signupTerms, setSignupTerms] = useState(false);
  const [signupErrors, setSignupErrors] = useState({});
  const [signupLoading, setSignupLoading] = useState(false);

  // Google Identity Services state
  const [gsiReady, setGsiReady] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const googleBtnRef = useRef(null);
  const googleBtnRefSignup = useRef(null);

  // Success overlay
  const [success, setSuccess] = useState({ show: false, title: "", msg: "" });

  const canvasRef = useRef(null);
  const cardRef = useRef(null);

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  // Sync mode when prop changes
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Wait for the GSI script to load
  useEffect(() => {
    if (window.google?.accounts?.id) {
      setGsiReady(true);
      return;
    }
    const t = setInterval(() => {
      if (window.google?.accounts?.id) {
        setGsiReady(true);
        clearInterval(t);
      }
    }, 150);
    return () => clearInterval(t);
  }, []);

  // Handle the credential response from Google
  const handleGoogleCredential = async (response) => {
    setGoogleError("");
    try {
      const payload = parseJwt(response.credential);
      if (!payload) throw new Error("Invalid Google credential");

      await googleLogin({
        email: payload.email,
        name: payload.name,
        googleId: payload.sub,
        avatar: payload.picture,
      });

      setSuccess({
        show: true,
        title: "Welcome!",
        msg: "Signed in with Google. Redirecting…",
      });
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Google sign-in failed. Please try again.";
      setGoogleError(msg);
    }
  };

  // Render Google's button invisibly on top of our custom button
  useEffect(() => {
    if (!gsiReady) return;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId) {
      setGoogleError(
        "Google sign-in not configured. Set VITE_GOOGLE_CLIENT_ID in frontend/.env"
      );
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleCredential,
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    const opts = {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      logo_alignment: "left",
      width: 380,
    };

    if (mode === "login" && googleBtnRef.current) {
      googleBtnRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleBtnRef.current, opts);
    }
    if (mode === "signup" && googleBtnRefSignup.current) {
      googleBtnRefSignup.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleBtnRefSignup.current, opts);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gsiReady, mode]);

  // Star field animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0,
      h = 0,
      stars = [];
    const COUNT = 120;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    let rafId = null;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const build = () => {
      stars = [];
      for (let i = 0; i < COUNT; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.2 + 0.2,
          a: Math.random() * 0.7 + 0.2,
          tw: Math.random() * Math.PI * 2,
          sp: Math.random() * 0.02 + 0.005,
          hue: Math.random() < 0.65 ? 0 : Math.random() < 0.5 ? 100 : 200,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.tw += s.sp;
        const flicker = 0.7 + Math.sin(s.tw) * 0.3;
        const alpha = s.a * flicker;
        const color =
          s.hue === 0
            ? `rgba(255,255,255,${alpha})`
            : s.hue === 100
            ? `rgba(190,242,100,${alpha})`
            : `rgba(165,243,252,${alpha})`;

        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 6);
        g.addColorStop(0, color);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      rafId = requestAnimationFrame(draw);
    };

    const drawStatic = () => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        ctx.fillStyle = `rgba(255,255,255,${s.a})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    resize();
    build();
    if (!reduced) draw();
    else drawStatic();

    const onResize = () => {
      resize();
      build();
      if (reduced) drawStatic();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // 3D card tilt
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (reduced || coarse) return;

    let rx = 0,
      ry = 0,
      cx = 0,
      cy = 0;
    const MAX = 4;
    let rafId = null;

    const onMove = (e) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      ry = nx * MAX;
      rx = -ny * MAX;
    };
    const onLeave = () => {
      rx = 0;
      ry = 0;
    };
    const loop = () => {
      cx += (ry - cx) * 0.08;
      cy += (rx - cy) * 0.08;
      card.style.transform = `perspective(1200px) rotateY(${cx.toFixed(
        2
      )}deg) rotateX(${cy.toFixed(2)}deg)`;
      rafId = requestAnimationFrame(loop);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    loop();

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // Password strength
  const strengthPct = (() => {
    const v = signupPassword;
    if (!v) return 0;
    let score = 0;
    if (v.length >= 8) score++;
    if (/[A-Z]/.test(v)) score++;
    if (/[0-9]/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    return (score / 4) * 100;
  })();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!loginEmail.trim()) errors.loginEmail = "Email is required";
    else if (!EMAIL_RE.test(loginEmail.trim()))
      errors.loginEmail = "Enter a valid email";
    if (!loginPassword) errors.loginPassword = "Password is required";
    else if (loginPassword.length < 6)
      errors.loginPassword = "Password must be at least 6 characters";

    setLoginErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoginLoading(true);
    try {
      await login(loginEmail.trim(), loginPassword);
      setSuccess({
        show: true,
        title: "Welcome back!",
        msg: "Redirecting to your trips…",
      });
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch (err) {
      const msg =
        err.response?.data?.message || "Login failed. Please try again.";
      setLoginErrors({ loginPassword: msg });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!signupName.trim()) errors.signupName = "Please enter your name";
    else if (signupName.trim().length < 2)
      errors.signupName = "Name is too short";
    if (!signupEmail.trim()) errors.signupEmail = "Email is required";
    else if (!EMAIL_RE.test(signupEmail.trim()))
      errors.signupEmail = "Enter a valid email";
    if (!signupPassword) errors.signupPassword = "Password is required";
    else if (signupPassword.length < 8)
      errors.signupPassword = "Password must be at least 8 characters";
    else if (!/[A-Z]/.test(signupPassword))
      errors.signupPassword = "Add at least one uppercase letter";
    else if (!/[0-9]/.test(signupPassword))
      errors.signupPassword = "Add at least one number";
    if (!signupTerms)
      errors.signupTerms = "Please accept the Terms to continue";

    setSignupErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSignupLoading(true);
    try {
      await register(signupName.trim(), signupEmail.trim(), signupPassword);
      setSuccess({
        show: true,
        title: "Account created!",
        msg: "Welcome aboard. Start exploring the world.",
      });
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch (err) {
      const msg =
        err.response?.data?.message || "Sign up failed. Please try again.";
      setSignupErrors({ signupEmail: msg });
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <div className="auth-root">
      {/* Cosmic background */}
      <div className="auth-cosmos" aria-hidden="true">
        <canvas ref={canvasRef} id="auth-stars" />
        <div className="auth-orb-1" />
        <div className="auth-orb-2" />
        <div className="auth-aurora">
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 1400 900"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <linearGradient id="authAuroraA" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#a3e635" stopOpacity="0" />
                <stop offset="40%" stopColor="#a3e635" stopOpacity=".85" />
                <stop offset="70%" stopColor="#bef264" stopOpacity=".8" />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="authAuroraB" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity="0" />
                <stop offset="50%" stopColor="#a3e635" stopOpacity=".8" />
                <stop offset="100%" stopColor="#bef264" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="authAuroraC" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="#84cc16" stopOpacity="0" />
                <stop offset="50%" stopColor="#a3e635" stopOpacity=".8" />
                <stop offset="100%" stopColor="#bef264" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              className="auth-trail auth-t1"
              d="M -100 380 C 200 300, 500 480, 900 380 C 1150 320, 1350 420, 1500 360"
            />
            <path
              className="auth-trail auth-t2"
              d="M -100 640 C 250 560, 550 760, 950 660 C 1200 600, 1350 700, 1500 640"
            />
            <path
              className="auth-trail auth-t3"
              d="M -100 180 C 300 140, 600 260, 1000 200 C 1250 160, 1400 220, 1500 200"
            />
          </svg>
        </div>
      </div>

      <div className="auth-grid-overlay" aria-hidden="true" />

      {/* Corner HUD */}
      <span className="auth-tag-hud auth-tl">
        <span className="auth-hud-dot" />System online</span>
      <span className="auth-tag-hud auth-br">© AI Travel Planner 2025</span>
      {/* Card */}
      <main className="auth-card" ref={cardRef}>
        <div className="auth-card-brand">
          <svg
            className="auth-mark"
            viewBox="0 0 48 48"
            fill="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="authLogG" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#a3e635" />
                <stop offset="100%" stopColor="#bef264" />
              </linearGradient>
            </defs>
            <circle
              cx="24"
              cy="24"
              r="19"
              stroke="url(#authLogG)"
              strokeWidth="2.4"
              fill="rgba(163,230,53,.12)"
            />
            <path
              d="M14 28 L 22 18 L 26 24 L 34 14"
              stroke="url(#authLogG)"
              strokeWidth="2.6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M31 12 L 40 15 L 33 20 L 35 15.5 Z"
              fill="url(#authLogG)"
            />
          </svg>
          <div className="auth-brand-name">
            <span className="auth-a">AI TRAVEL</span>
            <span className="auth-b">PLANNER</span>
            <span className="auth-brand-tag">Secure access</span>
          </div>
        </div>

        {/* Tabs */}
        <div
          className={`auth-tabs ${mode === "signup" ? "signup" : ""}`}
          role="tablist"
        >
          <span className="auth-glider" aria-hidden="true" />
          <button
            className={`auth-tab ${mode === "login" ? "active" : ""}`}
            role="tab"
            aria-selected={mode === "login"}
            onClick={() => {
              setMode("login");
              setGoogleError("");
            }}
            type="button"
          >
            Log In
          </button>
          <button
            className={`auth-tab ${mode === "signup" ? "active" : ""}`}
            role="tab"
            aria-selected={mode === "signup"}
            onClick={() => {
              setMode("signup");
              setGoogleError("");
            }}
            type="button"
          >
            Sign Up
          </button>
        </div>

        {/* Heading */}
        <div className="auth-head">
          <h2>{mode === "login" ? "Welcome Back" : "Create Account"}</h2>
          <p className="auth-head-sub">
            {mode === "login"
              ? "Log in to continue your journey"
              : "Start planning your next adventure"}
          </p>
        </div>

        {googleError && <p className="auth-google-error">{googleError}</p>}

        {/* LOGIN PANEL */}
        {mode === "login" && (
          <div className="auth-form-panel" role="tabpanel">
            <form onSubmit={handleLoginSubmit} noValidate>
              <div className="auth-ctrl">
                <input
                  type="email"
                  placeholder="Email address"
                  autoComplete="email"
                  value={loginEmail}
                  onChange={(e) => {
                    setLoginEmail(e.target.value);
                    setLoginErrors((p) => ({ ...p, loginEmail: "" }));
                  }}
                  className={loginErrors.loginEmail ? "invalid" : ""}
                />
                <svg
                  className="auth-in-ic"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M2 7l10 6 10-6" />
                </svg>
                <span
                  className={`auth-err ${
                    loginErrors.loginEmail ? "show" : ""
                  }`}
                >
                  {loginErrors.loginEmail}
                </span>
              </div>

              <div className="auth-ctrl">
                <input
                  type={showLoginPwd ? "text" : "password"}
                  placeholder="Password"
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    setLoginErrors((p) => ({ ...p, loginPassword: "" }));
                  }}
                  className={loginErrors.loginPassword ? "invalid" : ""}
                  style={{ paddingRight: 48 }}
                />
                <svg
                  className="auth-in-ic"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="4" y="11" width="16" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
                <button
                  className="auth-eye"
                  type="button"
                  onClick={() => setShowLoginPwd((v) => !v)}
                  aria-label={showLoginPwd ? "Hide password" : "Show password"}
                >
                  {showLoginPwd ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                      <path d="M1 1l22 22" />
                    </svg>
                  )}
                </button>
                <span
                  className={`auth-err ${
                    loginErrors.loginPassword ? "show" : ""
                  }`}
                >
                  {loginErrors.loginPassword}
                </span>
              </div>

              <div className="auth-row">
                <label className="auth-remember">
                  <input type="checkbox" defaultChecked />
                  <span>Remember me</span>
                </label>
                <a href="#">Forgot password?</a>
              </div>

              <button
                type="submit"
                className="auth-btn-primary"
                disabled={loginLoading}
              >
                {loginLoading ? "Signing in…" : "Log In"}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="M13 5l7 7-7 7" />
                </svg>
              </button>

              <div className="auth-divider">or</div>

              <div className="auth-google-wrap">
                <div
                  ref={googleBtnRef}
                  className="auth-google-overlay"
                  aria-hidden="true"
                />
                <button type="button" className="auth-btn-google" tabIndex={-1}>
                  <svg viewBox="0 0 48 48" aria-hidden="true">
                    <path
                      fill="#FFC107"
                      d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"
                    />
                    <path
                      fill="#FF3D00"
                      d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
                    />
                    <path
                      fill="#4CAF50"
                      d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z"
                    />
                    <path
                      fill="#1976D2"
                      d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2c-.4.4 6.6-4.8 6.6-14.7 0-1.2-.1-2.4-.4-3.5z"
                    />
                  </svg>
                  Continue with Google
                </button>
              </div>
            </form>

            <p className="auth-foot">
              Don't have an account?{" "}
              <a onClick={() => setMode("signup")} role="button">
                Sign up free
              </a>
            </p>
          </div>
        )}

        {/* SIGNUP PANEL */}
        {mode === "signup" && (
          <div className="auth-form-panel" role="tabpanel">
            <form onSubmit={handleSignupSubmit} noValidate>
              <div className="auth-ctrl">
                <input
                  type="text"
                  placeholder="Full name"
                  autoComplete="name"
                  value={signupName}
                  onChange={(e) => {
                    setSignupName(e.target.value);
                    setSignupErrors((p) => ({ ...p, signupName: "" }));
                  }}
                  className={signupErrors.signupName ? "invalid" : ""}
                />
                <svg
                  className="auth-in-ic"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span
                  className={`auth-err ${
                    signupErrors.signupName ? "show" : ""
                  }`}
                >
                  {signupErrors.signupName}
                </span>
              </div>

              <div className="auth-ctrl">
                <input
                  type="email"
                  placeholder="Email address"
                  autoComplete="email"
                  value={signupEmail}
                  onChange={(e) => {
                    setSignupEmail(e.target.value);
                    setSignupErrors((p) => ({ ...p, signupEmail: "" }));
                  }}
                  className={signupErrors.signupEmail ? "invalid" : ""}
                />
                <svg
                  className="auth-in-ic"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M2 7l10 6 10-6" />
                </svg>
                <span
                  className={`auth-err ${
                    signupErrors.signupEmail ? "show" : ""
                  }`}
                >
                  {signupErrors.signupEmail}
                </span>
              </div>

              <div className="auth-ctrl">
                <input
                  type={showSignupPwd ? "text" : "password"}
                  placeholder="Password"
                  autoComplete="new-password"
                  value={signupPassword}
                  onChange={(e) => {
                    setSignupPassword(e.target.value);
                    setSignupErrors((p) => ({ ...p, signupPassword: "" }));
                  }}
                  className={signupErrors.signupPassword ? "invalid" : ""}
                  style={{ paddingRight: 48 }}
                />
                <svg
                  className="auth-in-ic"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="4" y="11" width="16" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
                <button
                  className="auth-eye"
                  type="button"
                  onClick={() => setShowSignupPwd((v) => !v)}
                  aria-label={showSignupPwd ? "Hide password" : "Show password"}
                >
                  {showSignupPwd ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                      <path d="M1 1l22 22" />
                    </svg>
                  )}
                </button>
                {signupPassword && (
                  <div className="auth-strength show">
                    <div
                      className="auth-bar"
                      style={{ width: `${strengthPct}%` }}
                    />
                  </div>
                )}
                <span
                  className={`auth-err ${
                    signupErrors.signupPassword ? "show" : ""
                  }`}
                >
                  {signupErrors.signupPassword}
                </span>
              </div>

              <div className="auth-row">
                <label className="auth-remember">
                  <input
                    type="checkbox"
                    checked={signupTerms}
                    onChange={(e) => {
                      setSignupTerms(e.target.checked);
                      setSignupErrors((p) => ({ ...p, signupTerms: "" }));
                    }}
                  />
                  <span>
                    I agree to the <a href="#">Terms</a>
                  </span>
                </label>
              </div>
              <span
                className={`auth-err ${
                  signupErrors.signupTerms ? "show" : ""
                }`}
                style={{ marginTop: -8 }}
              >
                {signupErrors.signupTerms}
              </span>

              <button
                type="submit"
                className="auth-btn-primary"
                disabled={signupLoading}
              >
                {signupLoading ? "Creating account…" : "Create Account"}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="M13 5l7 7-7 7" />
                </svg>
              </button>

              <div className="auth-divider">or</div>

              <div className="auth-google-wrap">
                <div
                  ref={googleBtnRefSignup}
                  className="auth-google-overlay"
                  aria-hidden="true"
                />
                <button type="button" className="auth-btn-google" tabIndex={-1}>
                  <svg viewBox="0 0 48 48" aria-hidden="true">
                    <path
                      fill="#FFC107"
                      d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"
                    />
                    <path
                      fill="#FF3D00"
                      d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
                    />
                    <path
                      fill="#4CAF50"
                      d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z"
                    />
                    <path
                      fill="#1976D2"
                      d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2c-.4.4 6.6-4.8 6.6-14.7 0-1.2-.1-2.4-.4-3.5z"
                    />
                  </svg>
                  Sign up with Google
                </button>
              </div>
            </form>

            <p className="auth-foot">
              Already have an account?{" "}
              <a onClick={() => setMode("login")} role="button">
                Log in
              </a>
            </p>
          </div>
        )}

        {/* Success overlay */}
        {success.show && (
          <div className="auth-success show">
            <div className="auth-circle">
              <svg viewBox="0 0 24 24">
                <path d="M4 12.5l5 5L20 6.5" />
              </svg>
            </div>
            <h3>{success.title}</h3>
            <p>{success.msg}</p>
            <button
              type="button"
              className="auth-btn-primary"
              onClick={() => {
                setSuccess({ show: false });
                navigate("/dashboard");
              }}
            >
              Continue
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Auth;