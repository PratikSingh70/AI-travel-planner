import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import "./Profile.css";

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
      <div className="pf-loading">
        <div className="pf-spinner" />
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

  return (
    <div className="pf-root">
      <div className="pf-orb-1" />
      <div className="pf-orb-2" />

      <main className="pf-page">
        {/* Header */}
        <header className="pf-header">
          <div className="pf-tag">
            <span className="pf-pulse" />
            Your account
          </div>
          <h1 className="pf-title">
            Your <span>Profile</span>
          </h1>
          <p className="pf-subtitle">
            Manage your account details, change your password, and see your
            travel stats.
          </p>
        </header>

        {/* Hero card */}
        <div className="pf-hero">
          <div className="pf-avatar">{initials}</div>
          <div className="pf-hero-info">
            {!editingName ? (
              <>
                <div className="pf-name-row">
                  <h2 className="pf-name">{profile.name}</h2>
                  <button
                    type="button"
                    className="pf-edit-btn"
                    onClick={() => {
                      setEditingName(true);
                      setNewName(profile.name);
                      setNameError("");
                      setNameSuccess("");
                    }}
                  >
                    ✏️ Edit
                  </button>
                </div>
                <p className="pf-email">{profile.email}</p>
                <p className="pf-joined">Joined {formatDate(profile.createdAt)}</p>
              </>
            ) : (
              <form onSubmit={handleSaveName} className="pf-edit-form">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="pf-input"
                  placeholder="Your name"
                  autoFocus
                />
                {nameError && <p className="pf-alert pf-alert-error">{nameError}</p>}
                {nameSuccess && (
                  <p className="pf-alert pf-alert-success">{nameSuccess}</p>
                )}
                <div className="pf-edit-actions">
                  <button
                    type="submit"
                    disabled={savingName}
                    className="pf-btn pf-btn-primary"
                  >
                    {savingName ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingName(false)}
                    className="pf-btn pf-btn-ghost"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="pf-stats">
          <div className="pf-stat">
            <div className="pf-stat-label">Trips Planned</div>
            <div className="pf-stat-value">{stats.trips}</div>
          </div>
          <div className="pf-stat">
            <div className="pf-stat-label">Total Budget</div>
            <div className="pf-stat-value accent">
              ₹{stats.totalBudget.toLocaleString()}
            </div>
          </div>
          <div className="pf-stat">
            <div className="pf-stat-label">Avg Budget / Trip</div>
            <div className="pf-stat-value">
              ₹{stats.avgBudget.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Change password */}
        <div className="pf-panel">
          <div className="pf-panel-head">
            <div>
              <h2 className="pf-panel-title">🔒 Change Password</h2>
              <p className="pf-panel-sub">Update your account password</p>
            </div>
            <button
              type="button"
              className="pf-toggle-pass"
              onClick={() => setShowPasswords((v) => !v)}
            >
              {showPasswords ? "Hide" : "Show"} passwords
            </button>
          </div>

          {pwdError && <p className="pf-alert pf-alert-error">{pwdError}</p>}
          {pwdSuccess && <p className="pf-alert pf-alert-success">{pwdSuccess}</p>}

          <form onSubmit={handleChangePassword} className="pf-form">
            <div>
              <label className="pf-label">Current password</label>
              <input
                type={showPasswords ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="pf-input"
                placeholder="Enter current password"
              />
            </div>

            <div className="pf-form-grid">
              <div>
                <label className="pf-label">New password</label>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pf-input"
                  placeholder="Min 6 characters"
                />
              </div>
              <div>
                <label className="pf-label">Confirm new password</label>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pf-input"
                  placeholder="Repeat new password"
                />
              </div>
            </div>

            <div className="pf-form-actions">
              <button
                type="submit"
                disabled={savingPassword}
                className="pf-btn pf-btn-primary"
              >
                {savingPassword ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </div>

        {/* Logout */}
        <div className="pf-panel">
          <div className="pf-danger-panel">
            <div>
              <h3 className="pf-danger-title">Sign out of this device</h3>
              <p className="pf-danger-sub">
                You'll need to log in again to access your trips.
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="pf-btn-danger"
            >
              Logout
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;