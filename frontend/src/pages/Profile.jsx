import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const Profile = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ trips: 0, totalBudget: 0, avgBudget: 0 });
  const [loading, setLoading] = useState(true);

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");
  const [nameSuccess, setNameSuccess] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [profileRes, tripsRes] = await Promise.all([
          api.get("/auth/profile"),
          api.get("/trips"),
        ]);
        setProfile(profileRes.data);
        setNewName(profileRes.data.name);

        const trips = tripsRes.data || [];
        const totalBudget = trips.reduce(
          (sum, t) => sum + (Number(t.budget) || 0),
          0
        );
        setStats({
          trips: trips.length,
          totalBudget,
          avgBudget: trips.length ? Math.round(totalBudget / trips.length) : 0,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSaveName = async (e) => {
    e.preventDefault();
    setNameError("");
    setNameSuccess("");
    if (!newName || newName.trim().length < 2) {
      return setNameError("Name must be at least 2 characters");
    }
    try {
      setSavingName(true);
      const res = await api.put("/auth/profile", { name: newName });
      const stored = JSON.parse(localStorage.getItem("user")) || {};
      localStorage.setItem("user", JSON.stringify({ ...stored, ...res.data }));
      setProfile({ ...profile, name: res.data.name });
      setNameSuccess("Name updated!");
      setEditingName(false);
      setTimeout(() => window.location.reload(), 700);
    } catch (err) {
      setNameError(err.response?.data?.message || "Could not update name");
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");
    if (!currentPassword || !newPassword || !confirmPassword) {
      return setPwdError("Please fill all fields");
    }
    if (newPassword.length < 6) {
      return setPwdError("New password must be at least 6 characters");
    }
    if (newPassword !== confirmPassword) {
      return setPwdError("New passwords do not match");
    }
    if (currentPassword === newPassword) {
      return setPwdError("New password must be different from current");
    }
    try {
      setSavingPassword(true);
      await api.put("/auth/password", { currentPassword, newPassword });
      setPwdSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwdError(err.response?.data?.message || "Could not change password");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0d0d]">
        <div className="w-8 h-8 border-4 border-lime border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const initials = (profile.name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const inputClass =
    "w-full rounded-xl px-4 py-3 transition " +
    "bg-[#1a1a1a] text-white placeholder-gray-500 " +
    "border border-white/10 " +
    "focus:outline-none focus:border-lime " +
    "focus:ring-2 focus:ring-lime/30";

  return (
    <div className="min-h-screen bg-[#0d0d0d] py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* HEADER CARD */}
        <div className="bg-[#141414] border border-white/10 rounded-3xl p-8 animate-fade-in-up">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* AVATAR */}
            <div className="w-24 h-24 rounded-full bg-lime flex items-center justify-center text-forest font-extrabold text-3xl flex-shrink-0 shadow-[0_0_30px_-5px_rgba(168,216,74,0.6)]">
              {initials}
            </div>

            {/* INFO */}
            <div className="flex-1 text-center md:text-left">
              {!editingName ? (
                <>
                  <div className="flex items-center gap-3 justify-center md:justify-start">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-white">
                      {profile.name}
                    </h1>
                    <button
                      onClick={() => {
                        setEditingName(true);
                        setNewName(profile.name);
                        setNameError("");
                        setNameSuccess("");
                      }}
                      className="text-xs text-gray-400 hover:text-lime border border-white/10 rounded-full px-3 py-1 transition"
                      title="Edit name"
                    >
                      ✏️ Edit
                    </button>
                  </div>
                  <p className="text-gray-400 mt-2">{profile.email}</p>
                  <p className="text-xs text-gray-500 mt-3">
                    Joined {formatDate(profile.createdAt)}
                  </p>
                </>
              ) : (
                <form onSubmit={handleSaveName} className="space-y-3">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className={inputClass}
                    placeholder="Your name"
                    autoFocus
                  />
                  {nameError && (
                    <p className="text-red-400 text-sm">{nameError}</p>
                  )}
                  {nameSuccess && (
                    <p className="text-lime text-sm">{nameSuccess}</p>
                  )}
                  <div className="flex gap-2 justify-center md:justify-start">
                    <button
                      type="submit"
                      disabled={savingName}
                      className="px-4 py-2 rounded-lg bg-lime text-forest text-sm font-bold hover:bg-lime-dark disabled:opacity-60 btn-press transition"
                    >
                      {savingName ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingName(false)}
                      className="px-4 py-2 rounded-lg border border-white/10 text-gray-300 text-sm font-semibold hover:bg-white/5 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-5 animate-fade-in-up delay-100">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">
              Trips Planned
            </p>
            <p className="text-3xl font-extrabold text-white mt-2">
              {stats.trips}
            </p>
          </div>
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-5 animate-fade-in-up delay-200">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">
              Total Budget
            </p>
            <p className="text-3xl font-extrabold text-lime mt-2">
              ₹{stats.totalBudget.toLocaleString()}
            </p>
          </div>
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-5 animate-fade-in-up delay-300">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">
              Avg Budget / Trip
            </p>
            <p className="text-3xl font-extrabold text-white mt-2">
              ₹{stats.avgBudget.toLocaleString()}
            </p>
          </div>
        </div>

        {/* CHANGE PASSWORD */}
        <div className="bg-[#141414] border border-white/10 rounded-3xl p-8 mt-6 animate-fade-in-up delay-300">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-extrabold text-white">
                🔒 Change Password
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Update your account password
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPasswords(!showPasswords)}
              className="text-xs text-gray-400 hover:text-lime transition"
            >
              {showPasswords ? "Hide" : "Show"} passwords
            </button>
          </div>

          {pwdError && (
            <p className="bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-xl mb-4 text-sm">
              {pwdError}
            </p>
          )}
          {pwdSuccess && (
            <p className="bg-lime/10 border border-lime/30 text-lime p-3 rounded-xl mb-4 text-sm">
              {pwdSuccess}
            </p>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Current password
              </label>
              <input
                type={showPasswords ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={inputClass}
                placeholder="Enter current password"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  New password
                </label>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClass}
                  placeholder="Min 6 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Confirm new password
                </label>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                  placeholder="Repeat new password"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingPassword}
                className="px-6 py-3 rounded-lg bg-lime text-forest font-bold hover:bg-lime-dark disabled:opacity-60 btn-press transition"
              >
                {savingPassword ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </div>

        {/* LOGOUT */}
        <div className="bg-[#141414] border border-white/10 rounded-3xl p-6 mt-6 flex flex-wrap justify-between items-center gap-4 animate-fade-in-up delay-300">
          <div>
            <h3 className="font-bold text-white">Sign out of this device</h3>
            <p className="text-sm text-gray-400 mt-1">
              You'll need to log in again to access your trips.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-5 py-2.5 rounded-full border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/10 transition"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;