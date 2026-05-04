"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

export default function EmployeePage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [upcomingAssignments, setUpcomingAssignments] = useState([]);
  const [todayEntry, setTodayEntry] = useState(null);

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState([]);

  const [weekHours, setWeekHours] = useState("0.00");
  const [showLogForm, setShowLogForm] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const today = useMemo(() => new Date(), []);
  const todayISO = today.toISOString().split("T")[0];

  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const monthName = today.toLocaleDateString("en-US", { month: "long" });
  const dayNumber = today.getDate();
  const year = today.getFullYear();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, today.getMonth(), 1);
    const lastDay = new Date(year, today.getMonth() + 1, 0);
    const days = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(d);
    }

    return days;
  }, [today, year]);

  const calculatedHours = useMemo(() => {
    if (!startTime || !endTime) return "0.00";

    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);

    let diff = (end - start) / (1000 * 60 * 60);

    if (diff < 0) diff += 24;

    return diff.toFixed(2);
  }, [startTime, endTime]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(`${dateString}T12:00:00`);

    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const loadDashboard = async () => {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      window.location.href = "/login";
      return;
    }

    setUser(data.user);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .maybeSingle();

    setProfile(profileData);

    const { data: assignmentData } = await supabase
      .from("daily_assignments")
      .select("*")
      .eq("employee_id", data.user.id)
      .eq("assignment_date", todayISO)
      .maybeSingle();

    setAssignment(assignmentData);

    const { data: futureAssignments } = await supabase
      .from("daily_assignments")
      .select("*")
      .eq("employee_id", data.user.id)
      .gt("assignment_date", todayISO)
      .order("assignment_date", { ascending: true })
      .limit(10);

    setUpcomingAssignments(futureAssignments || []);

    const { data: existingTodayEntry } = await supabase
      .from("time_entries")
      .select("*")
      .eq("employee_id", data.user.id)
      .eq("work_date", todayISO)
      .maybeSingle();

    setTodayEntry(existingTodayEntry);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const startISO = startOfWeek.toISOString().split("T")[0];

    const { data: entries } = await supabase
      .from("time_entries")
      .select("hours")
      .eq("employee_id", data.user.id)
      .gte("work_date", startISO)
      .lte("work_date", todayISO)
      .in("status", ["pending", "approved"]);

    const total =
      entries?.reduce((sum, entry) => sum + Number(entry.hours || 0), 0) || 0;

    setWeekHours(total.toFixed(2));
  };

  const handleSubmitHours = async (e) => {
    e.preventDefault();

    if (loading) return;

    if (todayEntry) {
      alert("You already submitted hours for today.");
      setShowLogForm(false);
      return;
    }

    if (!startTime || !endTime) {
      alert("Enter your start and end time.");
      return;
    }

    if (Number(calculatedHours) <= 0) {
      alert("End time must be after start time.");
      return;
    }

    if (!notes.trim() || notes.trim().length < 30) {
      alert("Please write a clear summary of the work completed today.");
      return;
    }

    if (!photos.length) {
      alert("Upload at least 1 picture.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("time_entries").insert({
      employee_id: user.id,
      work_date: todayISO,
      hours: Number(calculatedHours),
      employee_notes: notes.trim(),
      employee_photo_urls: [],
      status: "pending",
    });

    if (error) {
      if (error.code === "23505") {
        alert("You already submitted hours for today.");
      } else {
        alert(error.message);
      }

      setLoading(false);
      setShowLogForm(false);
      loadDashboard();
      return;
    }

    alert("Hours submitted.");

    setStartTime("");
    setEndTime("");
    setNotes("");
    setPhotos([]);
    setShowLogForm(false);
    setLoading(false);

    loadDashboard();
  };

  const handlePasswordChange = async () => {
    if (passwordLoading) return;

    if (!newPassword || !confirmPassword) {
      alert("Enter your new password twice.");
      return;
    }

    if (newPassword.length < 8) {
      alert("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    setPasswordLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      alert(error.message);
      setPasswordLoading(false);
      return;
    }

    alert("Password updated successfully.");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordLoading(false);
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile || !user) {
      alert("Choose a profile picture first.");
      return;
    }

    setAvatarLoading(true);

    const fileExt = avatarFile.name.split(".").pop();
    const filePath = `${user.id}/profile.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, avatarFile, { upsert: true });

    if (uploadError) {
      alert(uploadError.message);
      setAvatarLoading(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: data.publicUrl })
      .eq("id", user.id);

    if (updateError) {
      alert(updateError.message);
      setAvatarLoading(false);
      return;
    }

    alert("Profile picture updated.");
    setAvatarFile(null);
    setAvatarLoading(false);
    loadDashboard();
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const AssignmentFiles = ({ urls = [] }) => {
    if (!urls || urls.length === 0) {
      return (
        <p className="mt-3 text-xs text-gray-500">
          No images or documents attached.
        </p>
      );
    }

    return (
      <div className="mt-4 flex flex-wrap gap-2">
        {urls.map((url, index) => (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noreferrer"
            download
            className="rounded-xl bg-[#b8742b]/20 px-3 py-2 text-xs font-black text-[#e3a15b] transition hover:scale-105 hover:bg-[#b8742b]/35 active:scale-95"
          >
            Open / Download File {index + 1}
          </a>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#080808] via-[#101010] to-[#17110b] text-white">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#b8742b]/25 text-2xl font-black shadow-lg">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                profile?.full_name?.[0] || "K"
              )}
            </div>

            <div>
              <h1 className="text-3xl font-black tracking-tight">
                Employee Dashboard
              </h1>
              <p className="text-sm text-gray-400">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-black shadow-lg transition-all duration-200 hover:scale-[1.04] hover:bg-red-500 active:scale-95"
          >
            Logout
          </button>
        </header>

        <section className="mb-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[#e3a15b]">
                Today’s Assignment
              </p>
              <h2 className="mt-1 text-2xl font-black">Boss Notes</h2>
            </div>

            <span className="rounded-full bg-[#b8742b]/20 px-4 py-2 text-xs font-black text-[#e3a15b]">
              TODAY
            </span>
          </div>

          <div className="p-6">
            {assignment ? (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-black/30 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                    Job
                  </p>
                  <p className="mt-2 text-lg font-black">
                    {assignment.job_name || "No job name"}
                  </p>
                </div>

                <div className="rounded-2xl bg-black/30 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                    Address
                  </p>
                  <p className="mt-2 font-semibold">
                    {assignment.job_address || "No address listed"}
                  </p>
                </div>

                <div className="rounded-2xl bg-black/30 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                    Notes
                  </p>
                  <p className="mt-2 leading-relaxed">
                    {assignment.boss_notes || "No notes added."}
                  </p>
                  <AssignmentFiles urls={assignment.boss_photo_urls} />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/25 p-5 text-gray-300">
                No boss notes or assignment added for today yet.
              </div>
            )}
          </div>
        </section>

        {upcomingAssignments.length > 0 && (
          <section className="mb-6 rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#e3a15b]">
              Upcoming Notes
            </p>
            <h2 className="mb-4 mt-1 text-2xl font-black">
              Future Assignments
            </h2>

            <div className="flex gap-4 overflow-x-auto pb-2">
              {upcomingAssignments.map((item) => (
                <div
                  key={item.id}
                  className="min-w-[280px] rounded-2xl bg-black/30 p-4 md:min-w-[360px]"
                >
                  <p className="text-sm font-black text-[#e3a15b]">
                    {formatDate(item.assignment_date)}
                  </p>

                  <p className="mt-2 text-lg font-black">
                    {item.job_name || "No job name"}
                  </p>

                  <p className="text-sm text-gray-400">
                    {item.job_address || "No address listed"}
                  </p>

                  <p className="mt-3 text-sm leading-relaxed">
                    {item.boss_notes || "No notes added."}
                  </p>

                  <AssignmentFiles urls={item.boss_photo_urls} />
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between gap-6">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.25em] text-[#e3a15b]">
                  {dayName}
                </p>

                <div className="mt-3 flex items-end gap-4">
                  <h2 className="text-8xl font-black leading-[0.8]">
                    {dayNumber}
                  </h2>

                  <div className="pb-2">
                    <p className="text-2xl font-black">{monthName}</p>
                    <p className="text-lg font-bold text-gray-400">{year}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowCalendar(true)}
                className="group flex min-w-[150px] flex-col items-center justify-center rounded-3xl border border-white/10 bg-black/30 p-5 text-center shadow-lg transition-all duration-200 hover:scale-[1.04] hover:border-[#b8742b]/60 hover:bg-[#b8742b]/15 active:scale-95"
              >
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#b8742b]/20 text-3xl transition-all group-hover:bg-[#b8742b]/35">
                  📅
                </div>
                <p className="text-xs font-black uppercase tracking-wider text-gray-300">
                  View Calendar
                </p>
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#b8742b]/20 text-2xl">
              ⏱️
            </div>

            <p className="text-sm font-black uppercase tracking-[0.25em] text-gray-400">
              Hours This Week
            </p>

            <h2 className="mt-3 text-7xl font-black leading-none">
              {weekHours}
            </h2>

            <p className="mt-3 text-sm text-gray-400">
              Submitted hours for the current week
            </p>
          </section>
        </div>

        {todayEntry ? (
          <div className="mb-6 rounded-3xl border border-green-500/20 bg-green-500/10 p-5 text-center shadow-2xl">
            <p className="text-xl font-black text-green-400">
              Hours Submitted for Today
            </p>
            <p className="mt-1 text-gray-300">
              {Number(todayEntry.hours).toFixed(2)} hours • Status:{" "}
              {todayEntry.status}
            </p>
          </div>
        ) : (
          <button
            onClick={() => setShowLogForm(true)}
            className="mb-6 w-full rounded-3xl bg-gradient-to-r from-[#b8742b] to-[#d08a38] p-5 text-xl font-black text-white shadow-2xl transition-all duration-200 hover:scale-[1.015] hover:from-[#c98231] hover:to-[#ee9b3f] active:scale-[0.98]"
          >
            Log Today’s Hours
          </button>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur">
            <h2 className="mb-4 text-2xl font-black">Recent Logs</h2>
            <div className="rounded-2xl bg-black/30 p-5 text-gray-400">
              Recent daily logs will show here next.
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] shadow-2xl backdrop-blur">
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className="flex w-full items-center justify-between p-6 text-left transition hover:bg-white/[0.04] active:bg-white/[0.08]"
            >
              <div>
                <h2 className="text-2xl font-black">Account Settings</h2>
                <p className="text-sm text-gray-400">
                  Password and profile picture
                </p>
              </div>

              <span className="text-3xl font-black text-[#e3a15b]">
                {settingsOpen ? "−" : "+"}
              </span>
            </button>

            {settingsOpen && (
              <div className="border-t border-white/10 p-6">
                <div className="mb-6">
                  <h3 className="mb-3 text-lg font-black">Profile Picture</h3>

                  <div className="mb-4 flex items-center gap-4">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-black text-2xl font-black">
                      {avatarFile ? (
                        <img
                          src={URL.createObjectURL(avatarFile)}
                          alt="Preview"
                          className="h-full w-full object-cover"
                        />
                      ) : profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt="Profile"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        profile?.full_name?.[0] || "?"
                      )}
                    </div>

                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setAvatarFile(e.target.files?.[0] || null)
                      }
                      className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-white"
                    />
                  </div>

                  <button
                    onClick={handleAvatarUpload}
                    disabled={avatarLoading}
                    className={`w-full rounded-2xl p-3 font-black transition-all duration-200 active:scale-95 ${
                      avatarLoading
                        ? "cursor-not-allowed bg-gray-500"
                        : "bg-[#b8742b] hover:scale-[1.02] hover:bg-[#d08a38]"
                    }`}
                  >
                    {avatarLoading ? "Uploading..." : "Update Profile Picture"}
                  </button>
                </div>

                <div>
                  <h3 className="mb-3 text-lg font-black">Change Password</h3>

                  <input
                    type={showPasswords ? "text" : "password"}
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mb-3 w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-white placeholder:text-gray-500"
                  />

                  <input
                    type={showPasswords ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mb-3 w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-white placeholder:text-gray-500"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="mb-3 w-full rounded-2xl bg-black/50 p-3 font-black text-gray-200 transition hover:bg-black/80 active:scale-95"
                  >
                    {showPasswords ? "Hide Passwords" : "Show Passwords"}
                  </button>

                  <button
                    onClick={handlePasswordChange}
                    disabled={passwordLoading}
                    className={`w-full rounded-2xl p-3 font-black transition-all duration-200 active:scale-95 ${
                      passwordLoading
                        ? "cursor-not-allowed bg-gray-500"
                        : "bg-[#b8742b] hover:scale-[1.02] hover:bg-[#d08a38]"
                    }`}
                  >
                    {passwordLoading ? "Updating..." : "Update Password"}
                  </button>

                  <p className="mt-3 text-xs text-gray-400">
                    Email changes must be handled by an admin.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {showCalendar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#151515] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#e3a15b]">
                  Calendar
                </p>
                <h2 className="text-3xl font-black">
                  {monthName} {year}
                </h2>
              </div>

              <button
                onClick={() => setShowCalendar(false)}
                className="rounded-2xl bg-white/10 px-4 py-2 font-black transition hover:bg-white/20 active:scale-95"
              >
                Close
              </button>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-black uppercase text-gray-500">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, index) => (
                <button
                  key={index}
                  disabled={!day}
                  onClick={() =>
                    day &&
                    alert(
                      `Logs for ${monthName} ${day}, ${year} will open here next.`
                    )
                  }
                  className={`aspect-square rounded-2xl text-sm font-black transition-all duration-200 ${
                    !day
                      ? "cursor-default bg-transparent"
                      : day === dayNumber
                      ? "bg-[#b8742b] text-white shadow-lg hover:scale-105 active:scale-95"
                      : "bg-white/8 text-gray-200 hover:scale-105 hover:bg-white/15 active:scale-95"
                  }`}
                >
                  {day || ""}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showLogForm && !todayEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSubmitHours}
            className="w-full max-w-lg rounded-3xl bg-white p-6 text-black shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">Log Today’s Hours</h2>
                <p className="text-sm text-gray-600">
                  {dayName}, {monthName} {dayNumber}, {year}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowLogForm(false)}
                className="rounded-2xl bg-gray-200 px-4 py-2 font-black transition hover:bg-gray-300 active:scale-95"
              >
                X
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-black">
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 bg-white p-3 text-black"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-black">
                  End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 bg-white p-3 text-black"
                />
              </div>
            </div>

            <div className="my-4 rounded-2xl bg-gray-100 p-4">
              <p className="text-sm font-black text-gray-600">
                Calculated Hours
              </p>
              <p className="text-4xl font-black">{calculatedHours}</p>
            </div>

            <label className="mb-2 block text-sm font-black">
              Work Summary
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mb-4 min-h-32 w-full rounded-2xl border border-gray-300 bg-white p-3 text-black placeholder:text-gray-500"
              placeholder="Give a clear summary of the main work completed today. Focus on the big tasks, not every small detail. Example: laid out deck, dug post holes, poured concrete, set posts, and cleaned up the job site."
            />

            <label className="mb-2 block text-sm font-black">
              Upload at least 1 picture
            </label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setPhotos(Array.from(e.target.files || []))}
              className="mb-4 w-full rounded-2xl border border-gray-300 p-3"
            />

            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-2xl p-4 text-lg font-black text-white transition-all duration-200 active:scale-95 ${
                loading
                  ? "cursor-not-allowed bg-gray-400"
                  : "bg-[#b8742b] hover:scale-[1.02] hover:bg-[#d08a38]"
              }`}
            >
              {loading ? "Submitting..." : "Submit Hours"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}