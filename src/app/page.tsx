"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Nav from "@/components/Nav";
import Dashboard from "@/components/Dashboard";
import CommunityFeed from "@/components/CommunityFeed";
import PrizePoolCard from "@/components/PrizePoolCard";
import HomeSectionTabs from "@/components/HomeSectionTabs";
import { BracketUser } from "@/lib/types";
import { getEntryByEmail, submitEntry, updateEntry } from "@/lib/supabase";
import { createEmptyPicks } from "@/lib/emptyPicks";

type Step = "email" | "pin" | "register" | "forgot";

export default function Home() {
  const [step, setStep] = useState<Step>("email");
  const [checking, setChecking] = useState(true);
  const [loggedInUser, setLoggedInUser] = useState<BracketUser | null>(null);

  // Check if already logged in
  useEffect(() => {
    const stored = localStorage.getItem("bracket_user");
    if (stored) {
      setLoggedInUser(JSON.parse(stored));
    }
    setChecking(false);
  }, []);
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [newPin, setNewPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetPin, setResetPin] = useState("");
  const [nameVerified, setNameVerified] = useState(false);

  const formatPhone = (value: string): string => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const handleEmailCheck = async () => {
    if (!email.trim()) { setError("Enter your email."); return; }
    setLoading(true);
    setError("");
    try {
      const existing = await getEntryByEmail(email.trim());
      if (existing) {
        // Returning user — ask for PIN
        setStep("pin");
      } else {
        // New user — show registration
        setStep("register");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePinLogin = async () => {
    if (!pin.trim()) { setError("Enter your PIN."); return; }
    setLoading(true);
    setError("");
    try {
      const entry = await getEntryByEmail(email.trim());
      if (!entry) { setError("Account not found."); return; }
      if (entry.pin !== pin.trim()) {
        setError("Incorrect PIN. Try again.");
        setLoading(false);
        return;
      }
      // Store user info
      const userData = { id: entry.id || "", name: entry.name, email: entry.email, phone: entry.phone };
      localStorage.setItem("bracket_user", JSON.stringify(userData));
      setLoggedInUser(userData);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name.trim()) { setError("Enter your name."); return; }
    if (!phone.trim()) { setError("Enter your phone number."); return; }
    if (newPin.length !== 4) { setError("PIN must be exactly 4 digits."); return; }
    setLoading(true);
    setError("");
    try {
      const entry = await submitEntry({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        pin: newPin.trim(),
        picks: createEmptyPicks(),
        submittedAt: new Date().toISOString(),
      });
      if (entry) {
        const userData = { id: entry.id || "", name: entry.name, email: entry.email, phone: entry.phone };
        localStorage.setItem("bracket_user", JSON.stringify(userData));
        setLoggedInUser(userData);
      } else {
        setError("Registration failed. Try again.");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyName = async () => {
    if (!name.trim()) { setError("Enter the name you registered with."); return; }
    setLoading(true);
    setError("");
    try {
      const entry = await getEntryByEmail(email.trim());
      if (!entry) { setError("Account not found."); setLoading(false); return; }
      if (entry.name.toLowerCase().trim() !== name.toLowerCase().trim()) {
        setError("Name doesn't match our records.");
        setLoading(false);
        return;
      }
      setNameVerified(true);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPin = async () => {
    if (resetPin.length !== 4) { setError("PIN must be exactly 4 digits."); return; }
    setLoading(true);
    setError("");
    try {
      const entry = await getEntryByEmail(email.trim());
      if (!entry) { setError("Account not found."); setLoading(false); return; }
      const success = await updateEntry({ ...entry, pin: resetPin.trim() });
      if (success) {
        const userData = { id: entry.id || "", name: entry.name, email: entry.email, phone: entry.phone };
        localStorage.setItem("bracket_user", JSON.stringify(userData));
        setLoggedInUser(userData);
      } else {
        setError("Failed to reset PIN. Try again.");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) return null;

  if (loggedInUser) {
    return (
      <>
        <Nav />
        <div className="nav-spacer">
          <div className="home-logged-layout">
            <HomeSectionTabs
              tabs={[
                { id: "home", label: "Home", content: <Dashboard user={loggedInUser} /> },
                { id: "prizes", label: "Prize pool", content: <PrizePoolCard /> },
                {
                  id: "community",
                  label: "Community",
                  content: <CommunityFeed userName={loggedInUser.name} />,
                },
              ]}
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="landing-page">
      <div className="landing-hero">
        <div className="landing-content">
        {/* Logo */}
        <div className="landing-logo">
          <Image
            src="/logo.png"
            alt="Lew's 2026 NBA Playoff Bracket Challenge"
            width={500}
            height={300}
            priority
            style={{ width: "100%", maxWidth: "420px", height: "auto" }}
          />
        </div>

        {/* Auth Form */}
        <div className="landing-form">
          {step === "email" && (
            <>
              <p className="landing-form-label">Enter your email to get started</p>
              <div className="form-group">
                <input
                  type="email"
                  className="form-input"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEmailCheck()}
                />
              </div>
              {error && <div className="form-error">{error}</div>}
              <button
                onClick={handleEmailCheck}
                disabled={loading}
                className="btn btn-accent landing-btn"
              >
                {loading ? "Checking..." : "Continue"}
              </button>
              <a href="/scoreboard" className="landing-scoreboard-link">
                View Scoreboard &rarr;
              </a>
            </>
          )}

          {step === "pin" && (
            <>
              <p className="landing-form-label">Welcome back! Enter your PIN</p>
              <p className="landing-form-sub">{email}</p>
              <div className="form-group">
                <input
                  type="password"
                  inputMode="numeric"
                  className="form-input"
                  placeholder="4-digit PIN"
                  value={pin}
                  maxLength={4}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  onKeyDown={(e) => e.key === "Enter" && handlePinLogin()}
                />
              </div>
              {error && <div className="form-error">{error}</div>}
              <button
                onClick={handlePinLogin}
                disabled={loading}
                className="btn btn-accent landing-btn"
              >
                {loading ? "Logging in..." : "Log In"}
              </button>
              <button
                onClick={() => { setStep("email"); setPin(""); setError(""); }}
                className="landing-back-link"
              >
                &larr; Use a different email
              </button>
              <button
                onClick={() => { setStep("forgot"); setName(""); setResetPin(""); setNameVerified(false); setError(""); }}
                className="landing-back-link"
              >
                Forgot PIN?
              </button>
            </>
          )}

          {step === "forgot" && (
            <>
              <p className="landing-form-label">Reset your PIN</p>
              <p className="landing-form-sub">{email}</p>
              {!nameVerified ? (
                <>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
                    Enter the name you registered with to verify your identity.
                  </p>
                  <div className="form-group">
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleVerifyName()}
                    />
                  </div>
                  {error && <div className="form-error">{error}</div>}
                  <button
                    onClick={handleVerifyName}
                    disabled={loading}
                    className="btn btn-accent landing-btn"
                  >
                    {loading ? "Verifying..." : "Verify"}
                  </button>
                </>
              ) : (
                <>
                  <p style={{ fontSize: "0.85rem", color: "var(--accent-green)", marginBottom: "0.75rem" }}>
                    Identity verified. Set your new PIN.
                  </p>
                  <div className="form-group">
                    <input
                      type="password"
                      inputMode="numeric"
                      className="form-input"
                      placeholder="New 4-digit PIN"
                      value={resetPin}
                      maxLength={4}
                      onChange={(e) => setResetPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      onKeyDown={(e) => e.key === "Enter" && handleResetPin()}
                    />
                  </div>
                  {error && <div className="form-error">{error}</div>}
                  <button
                    onClick={handleResetPin}
                    disabled={loading}
                    className="btn btn-accent landing-btn"
                  >
                    {loading ? "Resetting..." : "Reset PIN & Log In"}
                  </button>
                </>
              )}
              <button
                onClick={() => { setStep("pin"); setError(""); setNameVerified(false); }}
                className="landing-back-link"
              >
                &larr; Back to PIN login
              </button>
            </>
          )}

          {step === "register" && (
            <>
              <p className="landing-form-label">New here? Create your account</p>
              <p className="landing-form-sub">{email}</p>
              <div className="form-group">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <input
                  type="tel"
                  inputMode="numeric"
                  className="form-input"
                  placeholder="Phone number"
                  value={phone}
                  maxLength={14}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                />
              </div>
              <div className="form-group">
                <input
                  type="password"
                  inputMode="numeric"
                  className="form-input"
                  placeholder="Create a 4-digit PIN"
                  value={newPin}
                  maxLength={4}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                />
              </div>
              {error && <div className="form-error">{error}</div>}
              <button
                onClick={handleRegister}
                disabled={loading}
                className="btn btn-accent landing-btn"
              >
                {loading ? "Creating..." : "Create Account & Start Picking"}
              </button>
              <button
                onClick={() => { setStep("email"); setError(""); }}
                className="landing-back-link"
              >
                &larr; Use a different email
              </button>
            </>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
