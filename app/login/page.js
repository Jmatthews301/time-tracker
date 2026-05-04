"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setEmail("");
    setPassword("");
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (loading) return;

    setErrorMsg("");

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      setErrorMsg("Enter your email and password.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      setLoading(false);
      setPassword("");
      setErrorMsg("Invalid email or password.");
      return;
    }

    window.location.href = "/dashboard";
  };

  return (
    <div className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-black">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/bg.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-black/55"></div>

      <form
        onSubmit={handleLogin}
        autoComplete="off"
        className="relative z-10 bg-white rounded-2xl shadow-2xl w-[380px] p-8 text-center"
      >
        <img src="/logo.png" alt="logo" className="w-28 mx-auto mb-4" />

        <h1 className="text-2xl font-bold mb-1 text-black">Welcome Back</h1>

        <p className="text-gray-700 mb-6">Please sign in to your account</p>

        <div className="text-left mb-2 text-sm font-semibold text-gray-800">
          Email
        </div>

        <input
          type="text"
          name="cos-login-email"
          value={email}
          autoComplete="new-password"
          spellCheck="false"
          className="w-full border border-gray-400 rounded-lg p-3 mb-4 bg-white text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#b8742b]"
          placeholder="Enter your email"
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />

        <div className="text-left mb-2 text-sm font-semibold text-gray-800">
          Password
        </div>

        <input
          type="password"
          name="cos-login-password"
          value={password}
          autoComplete="new-password"
          className="w-full border border-gray-400 rounded-lg p-3 mb-4 bg-white text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#b8742b]"
          placeholder="Enter your password"
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />

        {errorMsg && (
          <div className="mb-4 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm p-3">
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`w-full p-3 rounded-lg font-semibold transition ${
            loading
              ? "bg-gray-400 text-white cursor-not-allowed"
              : "bg-[#b8742b] text-white hover:bg-[#9a5f22]"
          }`}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}