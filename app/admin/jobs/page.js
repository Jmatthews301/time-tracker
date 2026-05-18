"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [jobName, setJobName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [radius, setRadius] = useState(700);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    setLoading(true);

    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching jobs:", error);
    } else {
      setJobs(data || []);
    }

    setLoading(false);
  }

  async function createJob(e) {
    e.preventDefault();

    if (!jobName || !address) {
      alert("Job name and address are required");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("jobs").insert([
      {
        job_name: jobName,
        customer_name: customerName,
        address,
        radius_yards: Number(radius),
        description,
        status,
        created_by: user?.id,
      },
    ]);

    if (error) {
      console.error("Error creating job:", error);
      alert("Failed to create job");
      return;
    }

    setJobName("");
    setCustomerName("");
    setAddress("");
    setRadius(700);
    setDescription("");
    setStatus("active");

    fetchJobs();
  }

  async function archiveJob(jobId) {
    const confirmArchive = confirm(
      "Are you sure you want to archive this job?"
    );

    if (!confirmArchive) return;

    const { error } = await supabase
      .from("jobs")
      .update({ status: "archived" })
      .eq("id", jobId);

    if (error) {
      console.error("Error archiving job:", error);
      alert("Failed to archive job");
      return;
    }

    fetchJobs();
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#e3a15b]">
              Admin Control
            </p>

            <h1 className="mt-1 text-4xl font-black">
              Job Control Center
            </h1>

            <p className="text-zinc-400 mt-2">
              Create, manage, and organize company jobs.
            </p>
          </div>

          <button
            onClick={() => (window.location.href = "/admin")}
            className="rounded-2xl bg-zinc-800 hover:bg-zinc-700 transition px-5 py-3 font-black"
          >
            Back To Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CREATE JOB */}
          <div className="lg:col-span-1">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sticky top-6">
              <h2 className="text-2xl font-black mb-6">
                Create New Job
              </h2>

              <form onSubmit={createJob} className="space-y-4">
                <div>
                  <label className="block text-sm font-black mb-2">
                    Job Name
                  </label>

                  <input
                    type="text"
                    value={jobName}
                    onChange={(e) => setJobName(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3"
                    placeholder="Smith Residence"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black mb-2">
                    Customer Name
                  </label>

                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3"
                    placeholder="John Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black mb-2">
                    Address
                  </label>

                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3"
                    placeholder="123 Main St"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black mb-2">
                    Geofence Radius (yards)
                  </label>

                  <input
                    type="number"
                    value={radius}
                    onChange={(e) => setRadius(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black mb-2">
                    Status
                  </label>

                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3"
                  >
                    <option value="active">Active</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-black mb-2">
                    Description
                  </label>

                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 min-h-[120px]"
                    placeholder="Notes about this project..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#b8742b] hover:bg-[#d08a38] transition rounded-2xl py-4 font-black"
                >
                  Create Job
                </button>
              </form>
            </div>
          </div>

          {/* JOB LIST */}
          <div className="lg:col-span-2">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black">
                  All Jobs
                </h2>

                <div className="text-zinc-400 font-semibold">
                  {jobs.length} total jobs
                </div>
              </div>

              {loading ? (
                <div className="text-zinc-400">
                  Loading jobs...
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-zinc-400">
                  No jobs created yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className="bg-zinc-800 border border-zinc-700 rounded-3xl p-5"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                        <div>
                          <h3 className="text-3xl font-black mb-2">
                            {job.job_name}
                          </h3>

                          <p className="text-zinc-400 mb-1">
                            Customer: {job.customer_name || "N/A"}
                          </p>

                          <p className="text-zinc-400 mb-1">
                            Address: {job.address}
                          </p>

                          <p className="text-zinc-400 mb-1">
                            Radius: {job.radius_yards} yards
                          </p>

                          <div className="mt-3 inline-block px-3 py-1 rounded-full bg-zinc-700 text-sm capitalize">
                            {job.status}
                          </div>

                          {job.description && (
                            <p className="text-zinc-300 mt-4 whitespace-pre-wrap">
                              {job.description}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 min-w-[160px]">
                          <button className="bg-blue-600 hover:bg-blue-700 rounded-2xl py-3 px-4 transition font-black">
                            Open Job
                          </button>

                          <button className="bg-zinc-700 hover:bg-zinc-600 rounded-2xl py-3 px-4 transition font-black">
                            Edit
                          </button>

                          <button
                            onClick={() => archiveJob(job.id)}
                            className="bg-red-600 hover:bg-red-700 rounded-2xl py-3 px-4 transition font-black"
                          >
                            Archive
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}