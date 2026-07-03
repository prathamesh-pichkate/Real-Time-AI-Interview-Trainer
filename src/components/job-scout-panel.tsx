import React, { useState, useEffect } from "react";
import { JobOpportunity, AtsMatchResult } from "@/types/job";
import {
  INITIAL_JOB_OPPORTUNITIES,
  getLinkedInReferralUrl,
  calculateJobAtsMatch,
  generateReferralOutreach,
  fetchLiveScoutJobs,
} from "@/services/jobScoutService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Briefcase,
  ExternalLink,
  Flame,
  UserCheck,
  Zap,
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  Users,
  Building2,
  MapPin,
  MessageSquarePlus,
  Copy,
  Loader,
  X,
  IndianRupee,
  ShieldCheck,
  FileText,
  Upload,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

interface JobScoutPanelProps {
  userResumeText?: string;
  userName?: string;
}

export const JobScoutPanel: React.FC<JobScoutPanelProps> = ({
  userResumeText: initialResumeText = "",
  userName = "Candidate",
}) => {
  const [jobs, setJobs] = useState<JobOpportunity[]>(INITIAL_JOB_OPPORTUNITIES);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [selectedStack, setSelectedStack] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isScouting, setIsScouting] = useState<boolean>(false);
  const [scoutStep, setScoutStep] = useState<string>("");

  // Resume State for ATS Calculation
  const [resumeText, setResumeText] = useState<string>(() => {
    return localStorage.getItem("jobScout_resumeText") || initialResumeText || "";
  });
  const [showResumeInput, setShowResumeInput] = useState<boolean>(false);

  // ATS Score Calculation Modal State
  const [activeAtsJob, setActiveAtsJob] = useState<JobOpportunity | null>(null);
  const [atsResult, setAtsResult] = useState<AtsMatchResult | null>(null);
  const [calculatingAts, setCalculatingAts] = useState<boolean>(false);

  // Referral / Cold Outreach Modal State
  const [activeOutreachJob, setActiveOutreachJob] = useState<JobOpportunity | null>(null);
  const [outreachTarget, setOutreachTarget] = useState<"recruiter" | "engineer" | "client">("recruiter");
  const [outreachMessage, setOutreachMessage] = useState<string>("");
  const [generatingOutreach, setGeneratingOutreach] = useState<boolean>(false);

  // Save resume text changes to localStorage
  useEffect(() => {
    if (resumeText) {
      localStorage.setItem("jobScout_resumeText", resumeText);
    }
  }, [resumeText]);

  // Handle Resume File Upload (TXT or PDF raw text)
  const handleResumeFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setResumeText(text);
        toast.success(`Attached resume: ${file.name}`);
        setShowResumeInput(false);
      }
    };
    reader.readAsText(file);
  };

  // Live Scout Fetch Handler with Live Multi-step scanning progress
  const handleLiveScout = async () => {
    setIsScouting(true);
    setScoutStep("Connecting to live job APIs & verified portals...");
    
    try {
      setTimeout(() => setScoutStep("Scanning Naukri & LinkedIn for fresh SDE 1 & Backend roles..."), 1000);
      setTimeout(() => setScoutStep("Scouting YC Startups & Wellfound for remote developer jobs..."), 2200);
      setTimeout(() => setScoutStep("Scanning Upwork & client boards for freelance developer gigs..."), 3400);
      setTimeout(() => setScoutStep("Automatically filtering & removing outdated jobs (> 24 hours)..."), 4500);

      const liveJobs = await fetchLiveScoutJobs("Backend Developer SDE 1 MERN React Freelance", selectedFilter);
      
      // Strict client-side filter: remove any job older than 24 hours
      const freshOnly = liveJobs.filter((j) => j.hoursOld <= 24);
      setJobs(freshOnly);
      toast.success(`Found ${freshOnly.length} verified fresh openings (< 24h old)! Outdated postings pruned.`);
    } catch (err) {
      toast.error("Failed to fetch live jobs. Displaying verified list.");
    } finally {
      setIsScouting(false);
      setScoutStep("");
    }
  };

  // Trigger ATS Rating Calculation with candidate's actual resume
  const handleCalculateAts = async (job: JobOpportunity) => {
    setActiveAtsJob(job);
    setCalculatingAts(true);
    setAtsResult(null);
    try {
      const result = await calculateJobAtsMatch(resumeText, job.title, job.description, job.tags);
      setAtsResult(result);
      toast.success(`ATS Score for ${job.title}: ${result.score}% Match!`);
    } catch (err) {
      toast.error("Failed to calculate ATS score.");
    } finally {
      setCalculatingAts(false);
    }
  };

  // Trigger Referral Outreach Generation
  const handleOpenOutreach = async (
    job: JobOpportunity,
    target: "recruiter" | "engineer" | "client" = "recruiter"
  ) => {
    setActiveOutreachJob(job);
    setOutreachTarget(target);
    setGeneratingOutreach(true);
    try {
      const msg = await generateReferralOutreach(
        userName,
        job.title,
        job.company,
        target,
        job.tags.join(", ")
      );
      setOutreachMessage(msg);
    } catch (err) {
      toast.error("Failed to generate outreach message.");
    } finally {
      setGeneratingOutreach(false);
    }
  };

  const handleCopyOutreach = () => {
    navigator.clipboard.writeText(outreachMessage);
    toast.success("Outreach message copied to clipboard!");
  };

  // Filter Logic - Automatically removes outdated >24h jobs
  const filteredJobs = jobs.filter((job) => {
    // Exclude outdated jobs (> 24 hours old)
    if (job.hoursOld > 24) return false;

    // Type filter
    if (selectedFilter === "remote" && !job.type.includes("Remote")) return false;
    if (selectedFilter === "freelance" && job.type !== "Freelance / Gig") return false;
    if (selectedFilter === "fulltime" && job.type !== "Full-Time") return false;

    // Stack filter
    if (selectedStack !== "all") {
      const hasStack = job.tags.some(
        (t) => t.toLowerCase() === selectedStack.toLowerCase()
      );
      if (!hasStack) return false;
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = job.title.toLowerCase().includes(q);
      const matchesCompany = job.company.toLowerCase().includes(q);
      const matchesTags = job.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchesTitle && !matchesCompany && !matchesTags) return false;
    }

    return true;
  });

  const getPlatformBadgeColor = (platform: string) => {
    switch (platform) {
      case "Naukri":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "LinkedIn":
        return "bg-sky-100 text-sky-700 border-sky-200";
      case "Wellfound":
        return "bg-rose-100 text-rose-700 border-rose-200";
      case "YC Startups":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "Upwork / Freelance":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      default:
        return "bg-purple-100 text-purple-700 border-purple-200";
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Banner / Stats Overview */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Flame className="w-3.5 h-3.5 text-emerald-400" /> &lt; 24h Fresh Postings ({filteredJobs.length} Active)
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <UserCheck className="w-3.5 h-3.5 text-indigo-400" /> &lt; 10 Applicants Only
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Outdated Jobs Auto-Removed
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Smart Fresh Jobs & Freelance Scout
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Automated aggregator of legit tech jobs and freelance client gigs posted in the last 24 hours. Get direct ATS scores and 1-click referral outreach.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 self-start lg:self-center">
            <Button
              onClick={() => setShowResumeInput(!showResumeInput)}
              variant="outline"
              className="border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-semibold px-4 py-6 rounded-2xl flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              {resumeText ? "Resume Attached" : "Attach Resume for ATS"}
            </Button>

            <Button
              onClick={handleLiveScout}
              disabled={isScouting}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-6 py-6 rounded-2xl shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center gap-2 whitespace-nowrap"
            >
              {isScouting ? (
                <>
                  <Loader className="w-5 h-5 animate-spin text-slate-950" /> Scouting Live...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" /> Scout Fresh Live Openings
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Live Scout Scanner Indicator */}
        {isScouting && (
          <div className="mt-6 p-4 rounded-2xl bg-indigo-900/60 border border-indigo-700/80 flex items-center gap-3 animate-pulse">
            <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin" />
            <div>
              <p className="text-xs font-bold text-emerald-300">Live AI Scout Engine In Progress</p>
              <p className="text-xs text-slate-300">{scoutStep || "Aggregating listings across verified developer portals..."}</p>
            </div>
          </div>
        )}

        {/* Resume Input Drawer */}
        {showResumeInput && (
          <div className="mt-6 p-5 rounded-2xl bg-slate-800/90 border border-slate-700 space-y-4 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4" /> Candidate Resume Configuration
              </h4>
              <button
                onClick={() => setShowResumeInput(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300">
              Attach or paste your resume text here to calculate custom, section-wise ATS compatibility scores for each job card.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <textarea
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste your key skills, experience, and project descriptions here..."
                  rows={4}
                  className="w-full text-xs p-3 rounded-xl bg-slate-900 text-slate-100 border border-slate-700 focus:ring-2 focus:ring-amber-500 font-sans"
                />
              </div>

              <div className="flex flex-col justify-between space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-700">
                <div>
                  <span className="text-xs font-bold text-slate-200 block mb-1">
                    Upload Resume File (.txt / text)
                  </span>
                  <label className="cursor-pointer inline-flex items-center justify-center w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-600 gap-1.5 transition-all">
                    <Upload className="w-3.5 h-3.5 text-indigo-400" /> Browse File
                    <input
                      type="file"
                      accept=".txt,.md"
                      onChange={handleResumeFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {resumeText && (
                  <Button
                    onClick={() => {
                      setResumeText("");
                      localStorage.removeItem("jobScout_resumeText");
                      toast.info("Cleared attached resume text.");
                    }}
                    variant="ghost"
                    size="sm"
                    className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 text-xs flex items-center justify-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Clear Resume
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Highlights Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 font-medium">Verified Sources</span>
            <span className="text-sm font-semibold text-slate-100 mt-0.5">
              Naukri, LinkedIn, YC, Wellfound, Upwork
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 font-medium">Target Roles</span>
            <span className="text-sm font-semibold text-slate-100 mt-0.5">
              SDE 1, MERN, Backend, React, Intern
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 font-medium">Remote Eligibility</span>
            <span className="text-sm font-semibold text-emerald-400 mt-0.5">
              India Candidates Allowed
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 font-medium">Referral Outreach</span>
            <span className="text-sm font-semibold text-indigo-300 mt-0.5">
              1-Click AI Cold Pitch Generator
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Search Box */}
        <div className="relative flex-grow max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by title, company, or technology (e.g. Express, Node)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setSelectedFilter("all")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                selectedFilter === "all"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Types ({jobs.filter(j => j.hoursOld <= 24).length})
            </button>
            <button
              onClick={() => setSelectedFilter("remote")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                selectedFilter === "remote"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Remote (India)
            </button>
            <button
              onClick={() => setSelectedFilter("freelance")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                selectedFilter === "freelance"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Freelance Gigs
            </button>
            <button
              onClick={() => setSelectedFilter("fulltime")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                selectedFilter === "fulltime"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Full-Time
            </button>
          </div>

          {/* Tech Stack Dropdown */}
          <select
            value={selectedStack}
            onChange={(e) => setSelectedStack(e.target.value)}
            className="text-xs font-semibold bg-slate-100 text-slate-700 rounded-xl px-3 py-2 border border-transparent focus:bg-white focus:border-slate-300"
          >
            <option value="all">All Tech Stacks</option>
            <option value="Node.js">Node.js</option>
            <option value="React">React</option>
            <option value="MERN">MERN</option>
            <option value="Express">Express</option>
            <option value="Backend">Backend</option>
            <option value="Full Stack">Full Stack</option>
          </select>
        </div>
      </div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredJobs.length > 0 ? (
          filteredJobs.map((job) => (
            <Card
              key={job.id}
              className="group border border-slate-200/80 hover:border-indigo-400 hover:shadow-xl transition-all duration-300 rounded-2xl flex flex-col justify-between overflow-hidden bg-white"
            >
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${getPlatformBadgeColor(
                      job.platform
                    )}`}
                  >
                    {job.platform}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-600" />
                      {job.postedAgo}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                      <Users className="w-3 h-3 text-indigo-600" />
                      &lt; {job.applicantsCount} apps
                    </span>
                  </div>
                </div>

                <CardTitle className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                  {job.title}
                </CardTitle>

                <div className="flex items-center gap-3 text-xs text-slate-500 mt-2 font-medium">
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" /> {job.company}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> {job.location}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="px-5 py-3 space-y-4 flex-grow">
                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                  {job.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {job.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Salary / Experience */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-1 text-slate-900 font-bold">
                    <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                    {job.salaryOrBudget}
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    {job.experienceLevel}
                  </span>
                </div>
              </CardContent>

              {/* Action Buttons Footer */}
              <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  {/* ATS Check Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCalculateAts(job)}
                    className="text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 flex items-center justify-center gap-1"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-500" /> ATS Rating
                  </Button>

                  {/* Referral Outreach Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleOpenOutreach(
                        job,
                        job.type === "Freelance / Gig" ? "client" : "recruiter"
                      )
                    }
                    className="text-xs font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50 flex items-center justify-center gap-1"
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5 text-indigo-600" /> Referral / Pitch
                  </Button>
                </div>

                {/* Direct Apply Button */}
                <a
                  href={job.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full"
                >
                  <Button
                    size="sm"
                    className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    Direct Apply Link <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </a>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-dashed border-slate-300">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">No matching jobs found</h3>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your filter settings or click "Scout Fresh Live Openings" to query live listings.
            </p>
          </div>
        )}
      </div>

      {/* MODAL 1: ATS SCORE CALCULATOR BREAKDOWN */}
      {activeAtsJob && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase text-amber-400 font-bold">
                  ATS Suitability Analysis
                </span>
                <h3 className="text-lg font-bold line-clamp-1">{activeAtsJob.title}</h3>
                <p className="text-xs text-slate-400">{activeAtsJob.company}</p>
              </div>
              <button
                onClick={() => setActiveAtsJob(null)}
                className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {calculatingAts ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <Loader className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
                  <p className="text-sm font-bold text-slate-700">Calculating Dynamic ATS Match for {activeAtsJob.company}...</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Parsing resume keywords against {activeAtsJob.tags.join(", ")}
                  </p>
                </div>
              ) : atsResult ? (
                <>
                  {/* Score Gauge */}
                  <div className="bg-gradient-to-br from-slate-50 to-indigo-50/50 p-5 rounded-2xl border border-indigo-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 font-semibold">ATS Compatibility</span>
                      <div className="text-3xl font-extrabold text-slate-900 mt-0.5">
                        {atsResult.score}%
                      </div>
                      <span
                        className={`inline-block mt-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          atsResult.score >= 80
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {atsResult.rating}
                      </span>
                    </div>

                    <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center font-bold text-lg ${
                      atsResult.score >= 80 ? "border-emerald-600 text-emerald-600" : "border-amber-500 text-amber-600"
                    }`}>
                      {atsResult.score}%
                    </div>
                  </div>

                  {/* Matching Skills */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Matching Skills Found
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {atsResult.matchingSkills.map((skill, i) => (
                        <span
                          key={i}
                          className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" /> {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Missing Skills */}
                  {atsResult.missingSkills.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Keywords to Consider Adding
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {atsResult.missingSkills.map((skill, i) => (
                          <span
                            key={i}
                            className="text-xs font-semibold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg border border-amber-200"
                          >
                            + {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggestions */}
                  {atsResult.improvementSuggestions.length > 0 && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <h4 className="text-xs font-bold text-slate-800 mb-2">
                        Optimization Tips for this Role
                      </h4>
                      <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                        {atsResult.improvementSuggestions.map((tip, i) => (
                          <li key={i}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">
                {resumeText ? "Evaluated against candidate resume" : "Attach resume above for deeper section analysis"}
              </span>
              <Button
                onClick={() => setActiveAtsJob(null)}
                className="bg-slate-900 text-white font-bold text-xs px-5"
              >
                Close Analysis
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: REFERRAL FINDER & COLD OUTREACH DRAFT */}
      {activeOutreachJob && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-indigo-950 text-white p-6 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase text-indigo-300 font-bold">
                  Referral Prospect & Cold Pitch Assistant
                </span>
                <h3 className="text-lg font-bold line-clamp-1">{activeOutreachJob.title}</h3>
                <p className="text-xs text-slate-300">{activeOutreachJob.company}</p>
              </div>
              <button
                onClick={() => setActiveOutreachJob(null)}
                className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Step 1: LinkedIn Prospect Finder */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Step 1: Find Company Contacts on LinkedIn
                  </h4>
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded">
                    Direct Search Links
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Search decision-makers at <strong>{activeOutreachJob.company}</strong> to reach out to:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <a
                    href={getLinkedInReferralUrl(activeOutreachJob.company, "recruiter")}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs font-bold text-slate-700 border-slate-300 hover:bg-sky-50 hover:text-sky-700 flex items-center justify-center gap-1.5"
                    >
                      Search Recruiters / HR <ExternalLink className="w-3 h-3" />
                    </Button>
                  </a>

                  <a
                    href={getLinkedInReferralUrl(activeOutreachJob.company, "engineer")}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs font-bold text-slate-700 border-slate-300 hover:bg-indigo-50 hover:text-indigo-700 flex items-center justify-center gap-1.5"
                    >
                      Search Engineers / Mgrs <ExternalLink className="w-3 h-3" />
                    </Button>
                  </a>
                </div>
              </div>

              {/* Step 2: AI Outreach Message Generator */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Step 2: AI-Generated Cold Outreach Pitch
                  </h4>

                  {/* Target Selector */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
                    <button
                      onClick={() =>
                        handleOpenOutreach(activeOutreachJob, "recruiter")
                      }
                      className={`px-2 py-1 text-[11px] font-bold rounded ${
                        outreachTarget === "recruiter"
                          ? "bg-white text-indigo-700 shadow-sm"
                          : "text-slate-600"
                      }`}
                    >
                      Recruiter
                    </button>
                    <button
                      onClick={() =>
                        handleOpenOutreach(activeOutreachJob, "engineer")
                      }
                      className={`px-2 py-1 text-[11px] font-bold rounded ${
                        outreachTarget === "engineer"
                          ? "bg-white text-indigo-700 shadow-sm"
                          : "text-slate-600"
                      }`}
                    >
                      Engineer
                    </button>
                    <button
                      onClick={() =>
                        handleOpenOutreach(activeOutreachJob, "client")
                      }
                      className={`px-2 py-1 text-[11px] font-bold rounded ${
                        outreachTarget === "client"
                          ? "bg-white text-indigo-700 shadow-sm"
                          : "text-slate-600"
                      }`}
                    >
                      Freelance Pitch
                    </button>
                  </div>
                </div>

                {generatingOutreach ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border">
                    <Loader className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">Drafting personalized message...</p>
                  </div>
                ) : (
                  <div className="relative">
                    <textarea
                      value={outreachMessage}
                      onChange={(e) => setOutreachMessage(e.target.value)}
                      rows={6}
                      className="w-full text-xs font-sans p-4 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                    />
                    <Button
                      onClick={handleCopyOutreach}
                      size="sm"
                      className="absolute right-3 bottom-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy Pitch
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <Button
                onClick={() => setActiveOutreachJob(null)}
                className="bg-slate-900 text-white font-bold text-xs px-5"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
