import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Register.css";

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rg-root">
      <div className="rg-orb-1" />
      <div className="rg-orb-2" />
      <div className="rg-orb-3" />
      <div className="rg-grid-bg" />

      <div className="rg-card">
        {/* Brand */}
        <div className="rg-brand">
          <div className="rg-brand-text">
            AI Travel <span className="rg-brand-accent">Planner</span>
          </div>
        </div>

        <h1 className="rg-title">
          Create <span>account</span>
        </h1>
        <p className="rg-subtitle">Start planning your trips with AI</p>

        {error && <p className="rg-error">{error}</p>}

        <form onSubmit={handleSubmit} className="rg-form">
          {/* Name */}
          <div className="rg-field">
            <label className="rg-label" htmlFor="name">
              Full name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Jane Doe"
              value={form.name}
              onChange={handleChange}
              className="rg-input"
              required
            />
          </div>

          {/* Email */}
          <div className="rg-field">
            <label className="rg-label" htmlFor="email">
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
              className="rg-input"
              required
            />
          </div>

          {/* Password */}
          <div className="rg-field">
            <label className="rg-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={form.password}
              onChange={handleChange}
              className="rg-input"
              minLength={6}
              required
            />
            <button
              type="button"
              className="rg-pw-toggle"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <button type="submit" disabled={loading} className="rg-submit">
            {loading ? (
              <>
                <span className="rg-spinner" />
                Creating account…
              </>
            ) : (
              <>Create Account →</>
            )}
          </button>
        </form>

        <div className="rg-divider">or</div>

        <p className="rg-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;