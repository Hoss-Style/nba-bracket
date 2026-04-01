"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getEntryByEmail, submitEntry } from "@/lib/supabase";
import { createEmptyPicks } from "@/lib/emptyPicks";

type Step = "email" | "pin" | "register";

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [newPin, setNewPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      // Store user info for bracket page
      localStorage.setItem("bracket_user", JSON.stringify({
        id: entry.id,
        name: entry.name,
        email: entry.email,
        phone: entry.phone,
      }));
      // Has picks? Go to scoreboard. No picks? Go to bracket.
      const hasPicks = entry.picks.westR1_1 !== null;
      router.push(hasPicks ? "/scoreboard" : "/bracket");
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
        localStorage.setItem("bracket_user", JSON.stringify({
          id: entry.id,
          name: entry.name,
          email: entry.email,
          phone: entry.phone,
        }));
        router.push("/bracket");
      } else {
        setError("Registration failed. Try again.");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-page">
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
  );
}
