"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [employees, setEmployees] = useState([]);
  const [pendingEntries, setPendingEntries] = useState([]);
  const [weeklySummary, setWeeklySummary] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeLogs, setEmployeeLogs] = useState([]);

  const [assignmentEmployee, setAssignmentEmployee] = useState("");
  const [assignmentDate, setAssignmentDate] = useState("");
  const [jobName, setJobName] = useState("");
  const [jobAddress, setJobAddress] = useState("");
  const [bossNotes, setBossNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingAssignment, setSavingAssignment] = useState(false);

  const today = useMemo(() => new Date(), []);
  const todayISO = today.toISOString().split("T")[0];

  const todayPretty = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  useEffect(() => {
    setAssignmentDate(todayISO);
    loadAdminDashboard();
  }, []);

  const loadAdminDashboard = async () => {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      window.location.href = "/login";
      return;
    }

    setUser(userData.user);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (!profileData || !["admin", "boss"].includes(profileData.role)) {
      alert("You do not have admin access.");
      window.location.href = "/dashboard";
      return;
    }

    setProfile(profileData);

    const { data: employeeData } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "employee")
      .order("full_name", { ascending: true });

    setEmployees(employeeData || []);

    const { data: pendingData } = await supabase
      .from("time_entries")
      .select("*")
      .eq("status", "pending")
      .order("submitted_at", { ascending: false });

    setPendingEntries(pendingData || []);

    await loadWeeklySummary(employeeData || []);

    setLoading(false);
  };

  const loadWeeklySummary = async (employeeList) => {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startISO = startOfWeek.toISOString().split("T")[0];

    const { data: entries } = await supabase
      .from("time_entries")
      .select("*")
      .gte("work_date", startISO)
      .lte("work_date", todayISO)
      .in("status", ["pending", "approved"]);

    const summary = employeeList.map((employee) => {
      const employeeEntries =
        entries?.filter((entry) => entry.employee_id === employee.id) || [];

      const total = employeeEntries.reduce(
        (sum, entry) => sum + Number(entry.hours || 0),
        0
      );

      return {
        ...employee,
        weekHours: total.toFixed(2),
        submissions: employeeEntries.length,
      };
    });

    setWeeklySummary(summary);
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees.find((employee) => employee.id === employeeId);
    return emp?.full_name || emp?.email || "Unknown Employee";
  };

  const getSelectedEmployeeWeeklyHours = () => {
    if (!selectedEmployee) return "0.00";

    return (
      weeklySummary.find((employee) => employee.id === selectedEmployee.id)
        ?.weekHours || "0.00"
    );
  };

  const getSelectedEmployeeWeeklySubmissions = () => {
    if (!selectedEmployee) return 0;

    return (
      weeklySummary.find((employee) => employee.id === selectedEmployee.id)
        ?.submissions || 0
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(`${dateString}T12:00:00`);

    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const approveEntry = async (entryId) => {
    const { error } = await supabase
      .from("time_entries")
      .update({
        status: "approved",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", entryId);

    if (error) {
      alert(error.message);
      return;
    }

    loadAdminDashboard();
  };

  const denyEntry = async (entryId) => {
    const { error } = await supabase
      .from("time_entries")
      .update({
        status: "denied",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", entryId);

    if (error) {
      alert(error.message);
      return;
    }

    loadAdminDashboard();
  };

  const loadEmployeeLogs = async (employee) => {
    setSelectedEmployee(employee);

    const { data } = await supabase
      .from("time_entries")
      .select("*")
      .eq("employee_id", employee.id)
      .order("work_date", { ascending: false })
      .limit(20);

    setEmployeeLogs(data || []);
  };

  const saveAssignment = async (e) => {
    e.preventDefault();

    if (!assignmentEmployee) {
      alert("Choose an employee.");
      return;
    }

    if (!assignmentDate) {
      alert("Choose a date.");
      return;
    }

    if (!jobName.trim() && !jobAddress.trim() && !bossNotes.trim()) {
      alert("Add a job name, address, or notes.");
      return;
    }

    setSavingAssignment(true);

    const { error } = await supabase.from("daily_assignments").insert({
      employee_id: assignmentEmployee,
      assigned_by: user.id,
      assignment_date: assignmentDate,
      job_name: jobName.trim(),
      job_address: jobAddress.trim(),
      boss_notes: bossNotes.trim(),
      boss_photo_urls: [],
    });

    if (error) {
      alert(error.message);
      setSavingAssignment(false);
      return;
    }

    alert("Assignment saved.");

    setJobName("");
    setJobAddress("");
    setBossNotes("");
    setSavingAssignment(false);

    loadAdminDashboard();
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f0f] text-white">
        <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-8 shadow-2xl">
          <p className="text-xl font-black">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#080808] via-[#101010] to-[#17110b] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#e3a15b]">
              {profile?.role === "boss" ? "Boss Dashboard" : "Admin Dashboard"}
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight md:text-4xl">
              Time Tracker Control Center
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              {todayPretty} • Logged in as {user?.email}
            </p>
          </div>

          <button
            onClick={logout}
            className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-black shadow-lg transition-all duration-200 hover:scale-[1.04] hover:bg-red-500 active:scale-95"
          >
            Logout
          </button>
        </header>

        {/* Top Stats */}
        <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">
              Pending Approvals
            </p>
            <h2 className="mt-3 text-6xl font-black text-[#e3a15b]">
              {pendingEntries.length}
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Time entries waiting for review
            </p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">
              Employees
            </p>
            <h2 className="mt-3 text-6xl font-black">{employees.length}</h2>
            <p className="mt-2 text-sm text-gray-400">
              Active employee accounts
            </p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">
              Missing Logs
            </p>
            <h2 className="mt-3 text-6xl font-black">—</h2>
            <p className="mt-2 text-sm text-gray-400">
              Coming soon: employees missing daily submissions
            </p>
          </section>
        </div>

        {/* Main Layout */}
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Pending Approvals */}
            <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] shadow-2xl backdrop-blur">
              <div className="border-b border-white/10 px-6 py-5">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#e3a15b]">
                  Needs Attention
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  Pending Hour Authorization
                </h2>
              </div>

              <div className="p-6">
                {pendingEntries.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/25 p-5 text-gray-300">
                    No pending hour submissions right now.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-3xl border border-white/10 bg-black/30 p-5"
                      >
                        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <h3 className="text-2xl font-black">
                              {getEmployeeName(entry.employee_id)}
                            </h3>
                            <p className="text-sm font-bold text-gray-400">
                              {formatDate(entry.work_date)}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-[#b8742b]/20 px-5 py-3 text-center">
                            <p className="text-xs font-black uppercase tracking-widest text-[#e3a15b]">
                              Hours
                            </p>
                            <p className="text-3xl font-black">
                              {Number(entry.hours).toFixed(2)}
                            </p>
                          </div>
                        </div>

                        <div className="mb-4 rounded-2xl bg-white/[0.06] p-4">
                          <p className="mb-1 text-xs font-black uppercase tracking-widest text-gray-500">
                            Employee Notes
                          </p>
                          <p className="leading-relaxed">
                            {entry.employee_notes || "No notes provided."}
                          </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                          <button
                            onClick={() => approveEntry(entry.id)}
                            className="flex-1 rounded-2xl bg-green-600 p-3 font-black transition-all duration-200 hover:scale-[1.02] hover:bg-green-500 active:scale-95"
                          >
                            Approve
                          </button>

                          <button
                            onClick={() => denyEntry(entry.id)}
                            className="flex-1 rounded-2xl bg-red-600 p-3 font-black transition-all duration-200 hover:scale-[1.02] hover:bg-red-500 active:scale-95"
                          >
                            Deny
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Employee Directory */}
            <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] shadow-2xl backdrop-blur">
              <div className="border-b border-white/10 px-6 py-5">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#e3a15b]">
                  Employees
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  Click Employee to View Past Hours
                </h2>
              </div>

              <div className="grid gap-4 p-6 md:grid-cols-2">
                {employees.map((employee) => (
                  <button
                    key={employee.id}
                    onClick={() => loadEmployeeLogs(employee)}
                    className="rounded-3xl border border-white/10 bg-black/30 p-5 text-left shadow-lg transition-all duration-200 hover:scale-[1.02] hover:border-[#b8742b]/60 hover:bg-[#b8742b]/10 active:scale-95"
                  >
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#b8742b]/25 text-xl font-black">
                      {employee.full_name?.[0] || employee.email?.[0] || "?"}
                    </div>

                    <h3 className="text-xl font-black">
                      {employee.full_name || "Unnamed Employee"}
                    </h3>
                    <p className="text-sm text-gray-400">{employee.email}</p>
                    <p className="mt-3 text-xs font-black uppercase tracking-widest text-[#e3a15b]">
                      View hours →
                    </p>
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Weekly Summary */}
            <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] shadow-2xl backdrop-blur">
              <div className="border-b border-white/10 px-6 py-5">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#e3a15b]">
                  Payroll Snapshot
                </p>
                <h2 className="mt-1 text-2xl font-black">Weekly Summary</h2>
              </div>

              <div className="space-y-3 p-6">
                {weeklySummary.length === 0 ? (
                  <p className="text-gray-400">No employee data yet.</p>
                ) : (
                  weeklySummary.map((employee) => (
                    <div
                      key={employee.id}
                      className="rounded-2xl bg-black/30 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-black">
                            {employee.full_name || employee.email}
                          </p>
                          <p className="text-xs text-gray-500">
                            {employee.submissions} submission(s)
                          </p>
                        </div>

                        <p className="text-2xl font-black text-[#e3a15b]">
                          {employee.weekHours}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Daily Assignment */}
            <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] shadow-2xl backdrop-blur">
              <div className="border-b border-white/10 px-6 py-5">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#e3a15b]">
                  Boss Notes
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  Create Daily Assignment
                </h2>
              </div>

              <form onSubmit={saveAssignment} className="space-y-4 p-6">
                <div>
                  <label className="mb-2 block text-sm font-black">
                    Employee
                  </label>
                  <select
                    value={assignmentEmployee}
                    onChange={(e) => setAssignmentEmployee(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-white"
                  >
                    <option value="">Select employee</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.full_name || employee.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black">Date</label>
                  <input
                    type="date"
                    value={assignmentDate}
                    onChange={(e) => setAssignmentDate(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black">
                    Job Name
                  </label>
                  <input
                    value={jobName}
                    onChange={(e) => setJobName(e.target.value)}
                    placeholder="Example: Smith deck build"
                    className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-white placeholder:text-gray-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black">
                    Job Address
                  </label>
                  <input
                    value={jobAddress}
                    onChange={(e) => setJobAddress(e.target.value)}
                    placeholder="Job site address"
                    className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-white placeholder:text-gray-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black">
                    Notes for Employee
                  </label>
                  <textarea
                    value={bossNotes}
                    onChange={(e) => setBossNotes(e.target.value)}
                    placeholder="What does this employee need to know today?"
                    className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-white placeholder:text-gray-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingAssignment}
                  className={`w-full rounded-2xl p-4 font-black transition-all duration-200 active:scale-95 ${
                    savingAssignment
                      ? "cursor-not-allowed bg-gray-500"
                      : "bg-[#b8742b] hover:scale-[1.02] hover:bg-[#d08a38]"
                  }`}
                >
                  {savingAssignment ? "Saving..." : "Save Assignment"}
                </button>

                <p className="text-xs text-gray-500">
                  Photo/document uploads for boss notes will be wired next.
                </p>
              </form>
            </section>
          </div>
        </div>

        {/* Employee Logs Modal */}
        {selectedEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-[#151515] p-6 shadow-2xl">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-[#e3a15b]">
                    Employee History
                  </p>

                  <h2 className="text-3xl font-black">
                    {selectedEmployee.full_name || selectedEmployee.email}
                  </h2>

                  <p className="text-sm text-gray-400">
                    {selectedEmployee.email}
                  </p>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-[#b8742b]/20 px-5 py-4">
                      <p className="text-xs font-black uppercase tracking-widest text-[#e3a15b]">
                        Weekly Hours
                      </p>
                      <p className="mt-1 text-4xl font-black">
                        {getSelectedEmployeeWeeklyHours()}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        Current week total
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/[0.06] px-5 py-4">
                      <p className="text-xs font-black uppercase tracking-widest text-gray-500">
                        Weekly Submissions
                      </p>
                      <p className="mt-1 text-4xl font-black">
                        {getSelectedEmployeeWeeklySubmissions()}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        This week
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedEmployee(null);
                    setEmployeeLogs([]);
                  }}
                  className="rounded-2xl bg-white/10 px-4 py-2 font-black transition hover:bg-white/20 active:scale-95"
                >
                  Close
                </button>
              </div>

              {employeeLogs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/25 p-5 text-gray-300">
                  No time logs found for this employee yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {employeeLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-3xl border border-white/10 bg-black/30 p-5"
                    >
                      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h3 className="text-xl font-black">
                            {formatDate(log.work_date)}
                          </h3>
                          <p
                            className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-black uppercase ${
                              log.status === "approved"
                                ? "bg-green-600/20 text-green-400"
                                : log.status === "denied"
                                ? "bg-red-600/20 text-red-400"
                                : "bg-yellow-600/20 text-yellow-400"
                            }`}
                          >
                            {log.status}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-[#b8742b]/20 px-5 py-3 text-center">
                          <p className="text-xs font-black uppercase tracking-widest text-[#e3a15b]">
                            Hours
                          </p>
                          <p className="text-3xl font-black">
                            {Number(log.hours).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl bg-white/[0.06] p-4">
                        <p className="mb-1 text-xs font-black uppercase tracking-widest text-gray-500">
                          Notes
                        </p>
                        <p className="leading-relaxed">
                          {log.employee_notes || "No notes."}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}