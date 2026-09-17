import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
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

  const inputClass =
    "w-full border border-gray-200 rounded-lg px-4 py-3 text-ink placeholder-gray-400 focus:outline-none focus:border-ink transition";

  return (
    <div className="min-h-screen bg-white py-12 px-6 flex items-center justify-center">
      <div className="max-w-md w-full animate-fade-in-up">
        <h1 className="text-3xl font-extrabold text-ink text-center">
          Create account
        </h1>
        <p className="text-gray-500 text-center mt-2 mb-8">
          Start planning your trips with AI
        </p>

        {error && (
          <p className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl mb-5 text-sm">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="name"
            type="text"
            placeholder="Full name"
            value={form.name}
            onChange={handleChange}
            className={inputClass}
            required
          />
          <input
            name="email"
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={handleChange}
            className={inputClass}
            required
          />
          <input
            name="password"
            type="password"
            placeholder="Password (min 6 characters)"
            value={form.password}
            onChange={handleChange}
            className={inputClass}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-lg bg-lime text-forest font-bold hover:bg-lime-dark disabled:opacity-60 btn-press transition"
          >
            {loading ? "Please wait..." : "Create Account"}
          </button>
        </form>

        <p className="text-sm text-center mt-6 text-gray-500">
          Already have an account?{" "}
          <Link to="/login" className="text-lime-dark font-bold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;