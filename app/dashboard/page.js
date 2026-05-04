"use client";

import { useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function DashboardRedirect() {
  useEffect(() => {
    const sendUserToCorrectPage = async () => {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .single();

      if (error || !profile) {
        alert("No profile found for this user.");
        window.location.href = "/login";
        return;
      }

      if (profile.role === "admin" || profile.role === "boss") {
        window.location.href = "/admin";
      } else {
        window.location.href = "/employee";
      }
    };

    sendUserToCorrectPage();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      Loading dashboard...
    </div>
  );
}