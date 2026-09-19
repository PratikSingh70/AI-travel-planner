import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lg-root">
      <div className="lg-orb-1" />
      <div className="lg-orb-2" />
      <div className="lg-orb-3" />
      <div className="lg-grid-bg" />

      <div className="lg-card">
        {/* Brand */}
        <div className="lg-brand">
          <div className="lg-brand-text">
            AI Travel <span className="lg-brand-accent">Planner</span>
          </div>
        </div>

        <h1 className="lg-title">
          Sign <span>in</span>
        </h1>
        <p className="lg-subtitle">Continue planning your next adventure</p>

        {error && <p className="lg-error">{error}</p>}

        <form onSubmit={handleSubmit} className="lg-form">
          {/* Email */}
          <div className="lg-field">
            <label className="lg-label" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              className="lg-input"
              required
            />
          </div>

          {/* Password */}
          <div className="lg-field">
            <label className="lg-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              className="lg-input"
              required
            />
            <button
              type="button"
              className="lg-pw-toggle"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <button type="submit" disabled={loading} className="lg-submit">
            {loading ? (
              <>
                <span className="lg-spinner" />
                Signing in…
              </>
            ) : (
              <>Sign In →</>
            )}
          </button>
        </form>

        <div className="lg-divider">or</div>

        <p className="lg-footer">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;