"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    if (email === "test@test.com" && password === "1234") {
      window.location.href = "/dashboard";
    } else {
      alert("Invalid login");
    }
  };

  return (
    <div className="relative h-screen w-full flex items-center justify-center overflow-hidden">

      {/* 🎥 Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/bg.mp4" type="video/mp4" />
      </video>

      {/* 🌑 Dark overlay */}
      <div className="absolute inset-0 bg-black/20"></div>

      {/* 🧱 Login Card */}
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-[380px] p-8 text-center">

        {/* Logo */}
        <img
          src="/logo.png"
          alt="logo"
          className="w-28 mx-auto mb-4"
        />

        {/* Title */}
        <h1 className="text-2xl font-bold mb-1">Welcome Back</h1>
        <p className="text-gray-500 mb-6">
          Please sign in to your account
        </p>

        {/* Email */}
        <div className="text-left mb-2 text-sm text-gray-600">Email</div>
        <input
          className="w-full border border-gray-300 rounded-lg p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-gray-400"
          placeholder="Enter your email"
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* Password */}
        <div className="text-left mb-2 text-sm text-gray-600">Password</div>
        <input
          type="password"
          className="w-full border border-gray-300 rounded-lg p-3 mb-6 focus:outline-none focus:ring-2 focus:ring-gray-400"
          placeholder="Enter your password"
          onChange={(e) => setPassword(e.target.value)}
        />

        {/* Button */}
        <button
          onClick={handleLogin}
          className="w-full bg-[#b8742b] text-white p-3 rounded-lg font-semibold hover:bg-[#9a5f22] transition"
        >
          Login
        </button>

      </div>
    </div>
  );
}