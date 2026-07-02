import { Headings } from "@/components/headings";
import { InterviewPin } from "@/components/pin";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/config/firebase.config";
import { Interview } from "@/types";
import { useAuth } from "@clerk/clerk-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { chatSession } from "@/scripts";
import {
  Plus,
  BrainCircuit,
  FileCode2,
  Compass,
  Briefcase,
  Handshake,
  Loader,
  Sparkles,
  Send,
  FileText
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

// Dynamically load PDF.js from cdn
const loadPdfJs = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
      resolve(pdfjsLib);
    };
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });
};

// Parse PDF files client-side
const parsePdfFile = async (file: File): Promise<string> => {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(" ");
    fullText += pageText + "\n";
  }
  return fullText;
};

export const Dashboard = () => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(false);
  const { userId } = useAuth();

  // Tab State
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<string>("interviews");

  // Sync tab with search params
  useEffect(() => {
    if (
      tabParam &&
      ["interviews", "assessments", "resume", "negotiation", "roadmap"].includes(tabParam)
    ) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tabName: string) => {
    setActiveTab(tabName);
    setSearchParams({ tab: tabName });
  };

  // 1. Mock Interviews loading logic
  useEffect(() => {
    if (activeTab !== "interviews") return;
    setLoading(true);
    const interviewQuery = query(
      collection(db, "interviews"),
      where("userId", "==", userId)
    );

    const unsubscribe = onSnapshot(
      interviewQuery,
      (snapshot) => {
        const interviewList: Interview[] = snapshot.docs.map((doc) => {
          const id = doc.id;
          return {
            id,
            ...doc.data(),
          };
        }) as Interview[];
        setInterviews(interviewList);
        setLoading(false);
      },
      (error) => {
        console.log("Error on fetching : ", error);
        toast.error("Error..", {
          description: "Something went wrong.. Try again later..",
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, activeTab]);

  // Utility to clean and parse JSON responses from Gemini
  const parseGeminiJson = (text: string) => {
    try {
      let clean = text.trim();
      // Remove backticks and json identifier if present
      clean = clean.replace(/```json/gi, "").replace(/```/g, "");
      
      const firstChar = clean.charAt(0);
      let match = null;
      if (firstChar === "[") {
        match = clean.match(/\[.*\]/s);
      } else if (firstChar === "{") {
        match = clean.match(/\{.*\}/s);
      } else {
        match = clean.match(/\[.*\]/s) || clean.match(/\{.*\}/s);
      }

      if (match) {
        clean = match[0];
      }
      return JSON.parse(clean);
    } catch (e) {
      console.error("JSON parsing failed on response:", text, e);
      throw new Error("Failed to parse response format. Please try again.");
    }
  };

  // 2. Technical Assessments (DSA Playground) State & Handlers
  const [dsaTopic, setDsaTopic] = useState("Arrays & Hashing");
  const [dsaCompanyTier, setDsaCompanyTier] = useState("FAANG / MAANG (Google, Meta, etc.)");
  const [dsaDifficulty, setDsaDifficulty] = useState("Moderate");
  const [dsaQCount, setDsaQCount] = useState(1);
  const [dsaLanguage, setDsaLanguage] = useState("JavaScript");

  // Active DSA Challenge States
  const [dsaState, setDsaState] = useState<"configure" | "solving" | "graded">("configure");
  const [dsaQuestions, setDsaQuestions] = useState<any[]>([]);
  const [dsaSolutions, setDsaSolutions] = useState<string[]>([]);
  const [currentDsaIdx, setCurrentDsaIdx] = useState(0);
  const [dsaTimer, setDsaTimer] = useState(0); // in seconds
  const [dsaFeedback, setDsaFeedback] = useState<any>(null);
  const [assessLoading, setAssessLoading] = useState(false);

  // Timer tick down logic
  useEffect(() => {
    if (dsaState !== "solving" || dsaTimer <= 0) return;
    const interval = setInterval(() => {
      setDsaTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          submitDsaChallenge();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [dsaState, dsaTimer]);

  const startDsaChallenge = async () => {
    setAssessLoading(true);
    setDsaFeedback(null);
    setDsaQuestions([]);
    setDsaSolutions([]);
    setCurrentDsaIdx(0);

    // Calculate time based on difficulty and number of questions
    // Easy: 15 min, Moderate: 35 min, Hard: 60 min per question
    let timePerQuestion = 35 * 60; // Moderate default
    if (dsaDifficulty === "Easy") timePerQuestion = 15 * 60;
    else if (dsaDifficulty === "Hard") timePerQuestion = 60 * 60;

    const totalSeconds = timePerQuestion * dsaQCount;

    const prompt = `
      You are an expert DSA interviewer calibrating questions for top-tier companies.
      Generate exactly ${dsaQCount} DSA interview question(s) on the topic: "${dsaTopic}" at a "${dsaDifficulty}" difficulty, target company tier: "${dsaCompanyTier}".
      The questions must be real-world problems frequently asked in ${dsaCompanyTier} interviews.
      
      Provide the output in a clean JSON array format, where each question is an object with these exact keys:
      {
        "title": "Question Title",
        "description": "Clear problem statement, requirements, constraints, and sample inputs/outputs.",
        "company": "Specific target company (e.g. Google, Meta, Amazon, Netflix)",
        "starterCode": "Write a starter function declaration in ${dsaLanguage} that the candidate should implement. Keep it as simple syntax."
      }
      
      Return ONLY the JSON array. Do not include markdown backticks or the word 'json'.
    `;

    try {
      const response = await chatSession.sendMessage(prompt);
      const questionsData = parseGeminiJson(response);
      
      if (!Array.isArray(questionsData)) {
        throw new Error("Response is not a valid questions array");
      }

      setDsaQuestions(questionsData);
      setDsaSolutions(questionsData.map(q => q.starterCode || ""));
      setDsaTimer(totalSeconds);
      setDsaState("solving");
      toast.success("DSA Challenge loaded! Good luck!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to load DSA Challenge. Please check settings or API connectivity.");
    } finally {
      setAssessLoading(false);
    }
  };

  const submitDsaChallenge = async () => {
    setAssessLoading(true);
    setDsaState("graded");

    const prompt = `
      You are a principal engineer conducting a coding interview.
      Please evaluate the candidate's solutions to the following DSA challenge.
      
      Questions and candidate's code:
      ${dsaQuestions.map((q, idx) => `
        --- Question ${idx + 1}: ${q.title} ---
        Description: ${q.description}
        Candidate's Code Solution:
        """
        ${dsaSolutions[idx] || "// No solution provided"}
        """
      `).join("\n")}
      
      Provide a detailed evaluation in a clean JSON format with these exact keys:
      {
        "overallScore": 85,
        "verdict": "e.g. Strong Pass, Pass, Lean Pass, Fail",
        "review": "A detailed synthesis of their code quality, performance, and structure.",
        "individualFeedbacks": [
          {
            "title": "Question Title",
            "correctness": "Feedback on correctness",
            "timeComplexity": "e.g. O(N)",
            "spaceComplexity": "e.g. O(1)",
            "improvements": "How to optimize or write cleaner code"
          }
        ]
      }
      
      Return ONLY the JSON object. No surrounding markdown backticks or 'json'.
    `;

    try {
      const response = await chatSession.sendMessage(prompt);
      const reviewData = parseGeminiJson(response);
      setDsaFeedback(reviewData);
      toast.success("DSA Challenge evaluated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to evaluate code. Please review console.");
    } finally {
      setAssessLoading(false);
    }
  };

  const formatDsaTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours > 0 ? `${hours}:` : ""}${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // 3. Resume ATS Matcher State & Handlers
  const [atsResume, setAtsResume] = useState("");
  const [atsJobDesc, setAtsJobDesc] = useState("");
  const [atsReport, setAtsReport] = useState<any>(null);
  const [atsLoading, setAtsLoading] = useState(false);
  const [atsFileName, setAtsFileName] = useState("");
  const [atsParsing, setAtsParsing] = useState(false);

  const handleAtsFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAtsFileName(file.name);
    setAtsParsing(true);

    try {
      let parsedText = "";
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        parsedText = await parsePdfFile(file);
      } else {
        parsedText = await file.text();
      }
      setAtsResume(parsedText);
      toast.success("Resume uploaded and parsed successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to parse resume file. You can still paste text manually.");
    } finally {
      setAtsParsing(false);
    }
  };

  const removeAtsFile = () => {
    setAtsFileName("");
    setAtsResume("");
  };

  const optimizeResume = async () => {
    if (!atsResume.trim()) {
      toast.error("Please upload your resume file or paste your resume details first.");
      return;
    }
    if (!atsJobDesc.trim()) {
      toast.error("Please provide the target job description.");
      return;
    }
    setAtsLoading(true);

    const prompt = `
      Compare the candidate's resume text against the target job description and provide a professional Applicant Tracking System (ATS) suitability report.
      Candidate Resume:
      """
      ${atsResume}
      """
      Target Job Description:
      """
      ${atsJobDesc}
      """

      Provide your feedback in a clean JSON format with these exact keys:
      {
        "score": 78,
        "sections": [
          { "name": "Work Experience", "rating": "Needs Improvement", "feedback": "Detailed feedback on what keywords, details, or phrases are missing or need editing in the experience section." },
          { "name": "Skills & Technologies", "rating": "Strong Match", "feedback": "Feedback on keyword matching, missing frameworks or libraries based on target JD." },
          { "name": "Projects", "rating": "Weak Match", "feedback": "Suggestions to align project bullet points to make them sound more outcome-oriented." },
          { "name": "Formatting & Professional Summary", "rating": "Strong Match", "feedback": "Feedback on visual formatting, structure, and professional summary statement." }
        ],
        "missingKeywords": ["Skill A", "Skill B"],
        "bulletRewrites": [
          { "before": "Summary of current resume bullet point", "after": "Optimized bullet point with action verbs and target keywords" }
        ],
        "advice": "Formatting suggestions, phrasing advice, and alignment strategy."
      }
      Return ONLY this JSON object. No surrounding markdown backticks.
    `;

    try {
      const response = await chatSession.sendMessage(prompt);
      const data = parseGeminiJson(response);
      setAtsReport(data);
      toast.success("ATS Suitability Report compiled!");
    } catch (err) {
      toast.error("Failed to generate ATS report. Please try again.");
    } finally {
      setAtsLoading(false);
    }
  };

  // 4. Salary Negotiation Coach State & Handlers
  const [negTitle, setNegTitle] = useState("");
  const [negCompany, setNegCompany] = useState("");
  const [negOffer, setNegOffer] = useState("");
  const [negMessages, setNegMessages] = useState<{ role: "recruiter" | "user"; text: string }[]>([]);
  const [negInput, setNegInput] = useState("");
  const [negLoading, setNegLoading] = useState(false);

  const startNegotiation = () => {
    if (!negTitle.trim() || !negCompany.trim() || !negOffer.trim()) {
      toast.error("Please fill in the Job Title, Company, and Offer Details.");
      return;
    }
    setNegMessages([
      {
        role: "recruiter",
        text: `Hi there, we are absolutely thrilled to extend an offer to join ${negCompany} as a ${negTitle}! Our base salary package is ${negOffer}/year. We think this is a highly competitive offer. What are your thoughts on this package?`
      }
    ]);
  };

  const sendNegotiationMessage = async () => {
    if (!negInput.trim()) return;
    const userMsg = negInput;
    setNegInput("");
    setNegLoading(true);

    const updatedMsgs = [...negMessages, { role: "user" as const, text: userMsg }];
    setNegMessages(updatedMsgs);

    const prompt = `
      You are roleplaying as a firm, but professional HR Recruiter. The candidate is negotiating their offer details:
      - Role Title: ${negTitle}
      - Company Name: ${negCompany}
      - Base Offer Amount: ${negOffer}

      Here is the negotiation conversation history:
      ${updatedMsgs.map(m => `${m.role === "recruiter" ? "Recruiter" : "Candidate"}: ${m.text}`).join("\n")}
      
      Respond to the candidate's negotiation points. Keep your reply firm but respectful. Explain standard boundaries (e.g. internal salary bands, equity tradeoffs, or sign-on limits) but offer slight concessions if the candidate justifies their skills well. Keep your response brief (2-3 sentences max). Do not include any tags like "Recruiter:".
    `;

    try {
      const response = await chatSession.sendMessage(prompt);
      setNegMessages(prev => [...prev, { role: "recruiter", text: response.trim() }]);
    } catch (err) {
      toast.error("Failed to connect to AI Coach. Try again.");
    } finally {
      setNegLoading(false);
    }
  };

  // 5. Career Roadmap Coach State & Handlers
  const [roadmapSkills, setRoadmapSkills] = useState("");
  const [roadmapRole, setRoadmapRole] = useState("");
  const [roadmapCompany, setRoadmapCompany] = useState("");
  const [roadmapData, setRoadmapData] = useState<any>(null);
  const [roadmapLoading, setRoadmapLoading] = useState(false);

  const generateRoadmap = async () => {
    if (!roadmapRole.trim()) {
      toast.error("Please enter your target role.");
      return;
    }
    setRoadmapLoading(true);

    const prompt = `
      Generate a detailed career acceleration learning roadmap for the candidate with these details:
      - Current Skill Level / Background: ${roadmapSkills}
      - Target Role: ${roadmapRole}
      - Target Company/Profile: ${roadmapCompany}

      Provide your roadmap details in a clean JSON format with these exact keys:
      {
        "phases": [
          { "title": "Phase 1 Title", "description": "What to study", "milestones": ["Milestone 1", "Milestone 2"] }
        ],
        "projects": [
          { "title": "Project Title", "details": "Detailed description of a project they should build to demonstrate competence" }
        ],
        "advice": "Core general career prep and interview advice."
      }
      Return ONLY this JSON object. No surrounding markdown backticks.
    `;

    try {
      const response = await chatSession.sendMessage(prompt);
      const data = parseGeminiJson(response);
      setRoadmapData(data);
      toast.success("Career roadmap compiled!");
    } catch (err) {
      toast.error("Failed to generate career roadmap.");
    } finally {
      setRoadmapLoading(false);
    }
  };

  return (
    <>
      {/* Page Heading */}
      <div className="flex flex-col gap-4 sm:flex-row w-full items-start sm:items-center justify-between pb-4">
        <Headings
          title="Career Acceleration Hub"
          description="Access all AI-powered services to ace your interviews and land your dream job."
        />
        {activeTab === "interviews" && (
          <Link to={"/generate/create"}>
            <Button size={"sm"} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4" /> Add New Interview
            </Button>
          </Link>
        )}
      </div>

      {/* Tabs navigation bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 pt-2 w-full no-scrollbar border-b border-gray-100 mb-6">
        <button
          onClick={() => handleTabChange("interviews")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
            activeTab === "interviews"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-gray-100/70 text-gray-600 hover:bg-gray-200/80"
          }`}
        >
          <BrainCircuit className="w-4 h-4" />
          AI Mock Interviews
        </button>

        <button
          onClick={() => handleTabChange("assessments")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
            activeTab === "assessments"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-gray-100/70 text-gray-600 hover:bg-gray-200/80"
          }`}
        >
          <FileCode2 className="w-4 h-4" />
          Technical Assessments
        </button>

        <button
          onClick={() => handleTabChange("resume")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
            activeTab === "resume"
              ? "bg-orange-600 text-white shadow-sm"
              : "bg-gray-100/70 text-gray-600 hover:bg-gray-200/80"
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Resume ATS Optimizer
        </button>

        <button
          onClick={() => handleTabChange("negotiation")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
            activeTab === "negotiation"
              ? "bg-rose-600 text-white shadow-sm"
              : "bg-gray-100/70 text-gray-600 hover:bg-gray-200/80"
          }`}
        >
          <Handshake className="w-4 h-4" />
          Salary Negotiator
        </button>

        <button
          onClick={() => handleTabChange("roadmap")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
            activeTab === "roadmap"
              ? "bg-purple-600 text-white shadow-sm"
              : "bg-gray-100/70 text-gray-600 hover:bg-gray-200/80"
          }`}
        >
          <Compass className="w-4 h-4" />
          Career Roadmaps
        </button>
      </div>

      {/* active tab panels */}
      <div className="flex flex-col gap-4 py-2 w-full">
        
        {/* TAB 1: MOCK INTERVIEWS */}
        {activeTab === "interviews" && (
          <div className="flex flex-col gap-4 w-full">
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-32 w-full rounded-md" />
              ))
            ) : interviews.length > 0 ? (
              interviews.map((interview) => (
                <InterviewPin key={interview.id} interview={interview} />
              ))
            ) : (
              <div className="w-full flex flex-grow items-center justify-center h-96 flex-col">
                <img
                  src="/assets/svg/not-found.svg"
                  className="w-44 h-44 object-contain"
                  alt=""
                />
                <h2 className="text-lg font-semibold text-muted-foreground mt-4">
                  No Interviews Created
                </h2>
                <p className="w-full md:w-96 text-center text-sm text-neutral-400 mt-2">
                  Create your first interactive voice-guided AI mock interview to start practicing.
                </p>
                <Link to={"/generate/create"} className="mt-4">
                  <Button size={"sm"}>
                    <Plus className="min-w-5 min-h-5 mr-1" />
                    Create First Interview
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TECHNICAL ASSESSMENTS (DSA PLAYGROUND) */}
        {activeTab === "assessments" && (
          <div className="w-full flex flex-col gap-6">
            
            {/* 2A: CONFIGURE SCREEN */}
            {dsaState === "configure" && (
              <div className="max-w-4xl mx-auto w-full">
                <Card className="border border-gray-100 shadow-md bg-gradient-to-br from-slate-50 to-white overflow-hidden rounded-3xl">
                  <CardHeader className="bg-slate-100/50 p-8 border-b text-center">
                    <div className="mx-auto bg-emerald-100 p-4 rounded-2xl w-fit mb-4">
                      <FileCode2 className="w-10 h-10 text-emerald-600 animate-pulse" />
                    </div>
                    <CardTitle className="text-3xl font-extrabold text-slate-800">
                      Real-Time DSA Coding Playground
                    </CardTitle>
                    <CardDescription className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
                      Test your problem-solving skills with actual interview questions frequently asked by FAANG/MAANG, Tier-1 tech giants, and MNCs.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Topic */}
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">DSA Topic / Category</label>
                        <select
                          className="w-full border rounded-xl p-3 bg-white text-sm focus:ring-2 focus:ring-emerald-500"
                          value={dsaTopic}
                          onChange={(e) => setDsaTopic(e.target.value)}
                        >
                          <option value="Arrays & Hashing">Arrays & Hashing</option>
                          <option value="Two Pointers / Sliding Window">Two Pointers / Sliding Window</option>
                          <option value="Linked Lists / Recursion">Linked Lists / Recursion</option>
                          <option value="Stacks & Queues">Stacks & Queues</option>
                          <option value="Trees & Graphs">Trees & Graphs</option>
                          <option value="Dynamic Programming">Dynamic Programming</option>
                          <option value="Greedy Algorithms">Greedy Algorithms</option>
                          <option value="Backtracking & Searches">Backtracking & Searches</option>
                        </select>
                      </div>

                      {/* Target Companies */}
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Target Interview Tier</label>
                        <select
                          className="w-full border rounded-xl p-3 bg-white text-sm focus:ring-2 focus:ring-emerald-500"
                          value={dsaCompanyTier}
                          onChange={(e) => setDsaCompanyTier(e.target.value)}
                        >
                          <option value="FAANG / MAANG (Google, Meta, Apple, Netflix, Amazon)">FAANG / MAANG (Google, Meta, Apple, Netflix, Amazon)</option>
                          <option value="Tier-1 Tech Giants (Stripe, Uber, Airbnb, Coinbase)">Tier-1 Tech Giants (Stripe, Uber, Airbnb, Coinbase)</option>
                          <option value="High-Growth Startups & MNCs">High-Growth Startups & MNCs</option>
                        </select>
                      </div>

                      {/* Difficulty */}
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Difficulty Level & Timer</label>
                        <select
                          className="w-full border rounded-xl p-3 bg-white text-sm focus:ring-2 focus:ring-emerald-500"
                          value={dsaDifficulty}
                          onChange={(e) => setDsaDifficulty(e.target.value)}
                        >
                          <option value="Easy">Easy (15 mins per question)</option>
                          <option value="Moderate">Moderate (35 mins per question)</option>
                          <option value="Hard">Hard (60 mins per question)</option>
                        </select>
                      </div>

                      {/* Question Count */}
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Number of Questions</label>
                        <select
                          className="w-full border rounded-xl p-3 bg-white text-sm focus:ring-2 focus:ring-emerald-500"
                          value={dsaQCount}
                          onChange={(e) => setDsaQCount(Number(e.target.value))}
                        >
                          <option value={1}>1 Question</option>
                          <option value={2}>2 Questions</option>
                          <option value={3}>3 Questions</option>
                        </select>
                      </div>

                      {/* Language */}
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-bold text-slate-700">Target Programming Language</label>
                        <select
                          className="w-full border rounded-xl p-3 bg-white text-sm focus:ring-2 focus:ring-emerald-500"
                          value={dsaLanguage}
                          onChange={(e) => setDsaLanguage(e.target.value)}
                        >
                          <option value="JavaScript">JavaScript</option>
                          <option value="TypeScript">TypeScript</option>
                          <option value="Python">Python</option>
                          <option value="Java">Java</option>
                          <option value="C++">C++</option>
                        </select>
                      </div>

                    </div>

                    <Button
                      onClick={startDsaChallenge}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-7 rounded-2xl text-lg shadow-lg hover:shadow-emerald-500/10 transition-all mt-6"
                      disabled={assessLoading}
                    >
                      {assessLoading ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin mr-2" /> Generating Interview Set...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 mr-2" /> Start DSA Challenge Session
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* 2B: SOLVING SCREEN */}
            {dsaState === "solving" && dsaQuestions.length > 0 && (
              <div className="w-full flex flex-col gap-6">
                
                {/* Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-slate-900 text-white p-5 rounded-2xl shadow border border-slate-800 gap-4">
                  <div className="flex items-center gap-3">
                    <span className="bg-emerald-500 text-slate-950 font-bold px-3 py-1.5 rounded-full text-xs font-mono uppercase">
                      DSA Session
                    </span>
                    <h3 className="font-bold text-base sm:text-lg">
                      {dsaTopic} ({dsaDifficulty})
                    </h3>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Timer Box */}
                    <div className={`px-4 py-2 rounded-xl text-sm font-mono font-bold flex items-center gap-2 border ${
                      dsaTimer < 300 ? "bg-red-950/80 text-red-400 border-red-800 animate-pulse" : "bg-slate-950 border-slate-800 text-emerald-400"
                    }`}>
                      <Loader className={`w-4 h-4 ${dsaTimer >= 300 ? "animate-spin" : ""}`} />
                      <span>Time Remaining: {formatDsaTime(dsaTimer)}</span>
                    </div>

                    <Button
                      onClick={submitDsaChallenge}
                      className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-5"
                      disabled={assessLoading}
                    >
                      {assessLoading ? <Loader className="w-4 h-4 animate-spin mr-1" /> : "Finish & Grade"}
                    </Button>
                  </div>
                </div>

                {/* Main Split Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch w-full">
                  
                  {/* Left Column: Problem Description */}
                  <div className="lg:col-span-5 flex flex-col">
                    <Card className="border border-gray-200 shadow-sm flex-grow flex flex-col rounded-2xl min-h-[420px]">
                      <CardHeader className="bg-gray-50 border-b p-4 flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-base font-bold text-gray-800">
                            Problem {currentDsaIdx + 1} of {dsaQuestions.length}
                          </CardTitle>
                          <CardDescription className="text-xs font-semibold text-emerald-600 mt-0.5 font-mono uppercase">
                            Target Company: {dsaQuestions[currentDsaIdx]?.company || "MNC"}
                          </CardDescription>
                        </div>
                        
                        {/* Selector Tabs for multiple questions */}
                        {dsaQuestions.length > 1 && (
                          <div className="flex items-center gap-1.5">
                            {dsaQuestions.map((_, idx) => (
                              <button
                                key={idx}
                                onClick={() => setCurrentDsaIdx(idx)}
                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                  currentDsaIdx === idx
                                    ? "bg-slate-900 text-white shadow-sm"
                                    : "bg-gray-150 text-gray-600 hover:bg-gray-200"
                                }`}
                              >
                                Q{idx + 1}
                              </button>
                            ))}
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="p-6 flex-grow overflow-y-auto max-h-[450px]">
                        <h4 className="text-lg font-bold text-slate-900 mb-2">
                          {dsaQuestions[currentDsaIdx]?.title}
                        </h4>
                        <pre className="text-sm font-sans text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {dsaQuestions[currentDsaIdx]?.description}
                        </pre>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Column: Code Editor */}
                  <div className="lg:col-span-7 flex flex-col">
                    <Card className="border border-gray-100 shadow-sm bg-slate-900 text-white overflow-hidden rounded-2xl flex-grow flex flex-col min-h-[420px]">
                      <CardHeader className="bg-slate-950 border-b border-slate-800 p-4 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500" />
                          <div className="w-3 h-3 rounded-full bg-yellow-500" />
                          <div className="w-3 h-3 rounded-full bg-green-500" />
                          <span className="text-xs font-semibold text-slate-400 ml-2 font-mono">{dsaLanguage} Playground</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-semibold"
                          onClick={() => {
                            setDsaSolutions((prev) => {
                              const next = [...prev];
                              next[currentDsaIdx] = dsaQuestions[currentDsaIdx]?.starterCode || "";
                              return next;
                            });
                          }}
                        >
                          Reset Code
                        </Button>
                      </CardHeader>
                      
                      <CardContent className="p-0 flex-grow relative flex flex-col">
                        <div className="absolute left-0 top-0 bottom-0 w-11 bg-slate-950/40 border-r border-slate-800/80 flex flex-col items-center pt-4 text-[10px] font-mono text-slate-600 select-none">
                          {Array.from({ length: 20 }).map((_, idx) => (
                            <span key={idx} className="h-6 flex items-center">{idx + 1}</span>
                          ))}
                        </div>
                        <Textarea
                          className="font-mono text-sm leading-6 pl-14 pr-4 py-4 w-full bg-slate-900 border-0 focus-visible:ring-0 text-emerald-300 resize-none flex-grow min-h-[380px] focus:outline-none"
                          placeholder="// Write your algorithm solution here..."
                          value={dsaSolutions[currentDsaIdx] || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDsaSolutions((prev) => {
                              const next = [...prev];
                              next[currentDsaIdx] = val;
                              return next;
                            });
                          }}
                        />
                      </CardContent>
                    </Card>
                  </div>

                </div>

                {/* Bottom Navigation Row */}
                <div className="flex justify-between items-center bg-gray-50 border p-4 rounded-xl">
                  <Button
                    variant="outline"
                    disabled={currentDsaIdx === 0}
                    onClick={() => setCurrentDsaIdx(prev => prev - 1)}
                  >
                    Previous Problem
                  </Button>
                  <div className="text-xs text-gray-500 font-semibold font-mono">
                    Languages Mode: {dsaLanguage}
                  </div>
                  <Button
                    variant={currentDsaIdx === dsaQuestions.length - 1 ? "default" : "outline"}
                    className={currentDsaIdx === dsaQuestions.length - 1 ? "bg-slate-900 text-white" : ""}
                    onClick={() => {
                      if (currentDsaIdx === dsaQuestions.length - 1) {
                        submitDsaChallenge();
                      } else {
                        setCurrentDsaIdx(prev => prev + 1);
                      }
                    }}
                  >
                    {currentDsaIdx === dsaQuestions.length - 1 ? "Submit Challenge" : "Next Problem"}
                  </Button>
                </div>

              </div>
            )}

            {/* 2C: GRADED/FEEDBACK SCREEN */}
            {dsaState === "graded" && (
              <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">
                
                {/* Score Summary Card */}
                {dsaFeedback ? (
                  <>
                    <Card className="border border-gray-150 shadow-md overflow-hidden rounded-2xl">
                      <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div>
                            <CardTitle className="text-2xl font-extrabold text-white">DSA Challenge Summary</CardTitle>
                            <CardDescription className="text-emerald-100 font-medium mt-1">
                              Verdict: <span className="font-bold text-white uppercase tracking-wider">{dsaFeedback.verdict}</span>
                            </CardDescription>
                          </div>
                          <div className="bg-white/20 px-6 py-4 rounded-2xl border border-white/30 text-center shrink-0">
                            <span className="text-xxs font-bold text-white uppercase block tracking-widest">Overall Score</span>
                            <span className="text-4xl font-extrabold text-white font-mono">{dsaFeedback.overallScore}/100</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div>
                          <h4 className="text-sm font-bold text-gray-800 mb-1">General Synthesis Review:</h4>
                          <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                            {dsaFeedback.review}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Individual Questions Feedback */}
                    <div className="space-y-4">
                      <h4 className="font-bold text-gray-800 text-lg">Detailed Problem Reviews:</h4>
                      {dsaFeedback.individualFeedbacks?.map((fb: any, idx: number) => (
                        <Card key={idx} className="border border-gray-100 shadow-sm rounded-xl">
                          <CardHeader className="bg-gray-50/50 p-4 border-b">
                            <CardTitle className="text-sm font-bold text-slate-800">
                              Problem {idx + 1}: {fb.title}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-5 space-y-4">
                            
                            <div>
                              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1">Correctness Feedback:</span>
                              <p className="text-sm text-gray-600 leading-relaxed">{fb.correctness}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-slate-50 border p-3 rounded-lg">
                                <span className="text-xxs font-semibold text-gray-400 uppercase tracking-wider block">Time Complexity:</span>
                                <code className="text-xs font-bold text-emerald-600 font-mono">{fb.timeComplexity}</code>
                              </div>
                              <div className="bg-slate-50 border p-3 rounded-lg">
                                <span className="text-xxs font-semibold text-gray-400 uppercase tracking-wider block">Space Complexity:</span>
                                <code className="text-xs font-bold text-emerald-600 font-mono">{fb.spaceComplexity}</code>
                              </div>
                            </div>

                            {fb.improvements && (
                              <div>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1">Suggested Optimization:</span>
                                <p className="text-sm text-amber-700 bg-amber-50/50 p-3 rounded-lg border border-amber-100">{fb.improvements}</p>
                              </div>
                            )}

                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                ) : (
                  <Card className="p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
                    <Loader className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
                    <p className="text-sm text-gray-500 font-medium">Grading challenge answers... Please wait.</p>
                  </Card>
                )}

                <Button
                  onClick={() => setDsaState("configure")}
                  className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl mt-4"
                >
                  Return to Challenge Setup
                </Button>
              </div>
            )}

          </div>
        )}

        {/* TAB 3: RESUME ATS OPTIMIZER */}
        {activeTab === "resume" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
            {/* Input fields */}
            <div className="lg:col-span-6 flex flex-col gap-5">
              <Card className="border border-gray-100 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-orange-700 flex items-center gap-2">
                    <Briefcase className="w-5 h-5" /> ATS Matcher Input
                  </CardTitle>
                  <CardDescription>Upload your resume file and paste target requirements to check your ATS compatibility.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  
                  {/* File Upload Zone */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 block">Upload Your Resume (PDF or TXT)</label>
                    {atsFileName ? (
                      <div className="flex items-center justify-between p-4 border rounded-xl bg-orange-50/30 border-orange-200">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <FileText className="w-5 h-5 text-orange-600 shrink-0" />
                          <span className="text-sm font-semibold text-gray-800 truncate">{atsFileName}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={removeAtsFile}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs font-semibold px-2"
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer hover:bg-gray-50/50 transition-colors border-gray-200">
                        <div className="flex flex-col items-center justify-center text-center">
                          {atsParsing ? (
                            <>
                              <Loader className="w-8 h-8 animate-spin text-orange-600 mb-2" />
                              <p className="text-sm font-semibold text-gray-700">Reading resume contents...</p>
                            </>
                          ) : (
                            <>
                              <Briefcase className="w-8 h-8 text-gray-400 mb-2" />
                              <p className="text-sm font-semibold text-gray-700">Click to upload or drag resume file</p>
                              <p className="text-xs text-gray-400 mt-1">Supports standard PDF and Text files</p>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          accept=".pdf,.txt"
                          onChange={handleAtsFileChange}
                          className="hidden"
                          disabled={atsParsing}
                        />
                      </label>
                    )}
                  </div>

                  {/* Manual Text Fallback */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-gray-700">Resume Details Preview / Backup Paste:</label>
                      {atsResume && (
                        <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                          {atsResume.length} chars
                        </span>
                      )}
                    </div>
                    <Textarea
                      rows={5}
                      placeholder="Upload your file above, or manually paste your experience / projects details here..."
                      value={atsResume}
                      onChange={(e) => setAtsResume(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Paste Target Job Description:</label>
                    <Textarea
                      rows={6}
                      placeholder="Paste the target job requirements, skills, and scope here..."
                      value={atsJobDesc}
                      onChange={(e) => setAtsJobDesc(e.target.value)}
                    />
                  </div>

                  <Button
                    onClick={optimizeResume}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-6 rounded-xl"
                    disabled={atsLoading}
                  >
                    {atsLoading ? <Loader className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
                    Analyze & Optimize Suitability
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Results Report */}
            <div className="lg:col-span-6">
              {atsReport ? (
                <Card className="border border-gray-150 shadow-md rounded-2xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-orange-500 to-amber-600 text-white p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl font-extrabold text-white">ATS Suitability Analysis</CardTitle>
                        <CardDescription className="text-orange-100 font-medium mt-1">Matched against job description</CardDescription>
                      </div>
                      <div className="bg-white/20 px-5 py-3.5 rounded-2xl border border-white/20 text-center shrink-0">
                        <span className="text-xxs font-bold text-orange-50 uppercase block tracking-wider">Match Score</span>
                        <span className="text-3xl font-black text-white font-mono">{atsReport.score}%</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    
                    {/* Section-Wise Improvement Suggestions */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">📋 Section-Wise Review & Improvements:</h4>
                      <div className="grid grid-cols-1 gap-3.5">
                        {atsReport.sections?.map((sec: any, idx: number) => (
                          <div key={idx} className="p-4 border rounded-xl bg-slate-50/50 space-y-2">
                            <div className="flex items-center justify-between">
                              <h5 className="font-bold text-sm text-slate-800">{sec.name}</h5>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                sec.rating === "Strong Match"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : sec.rating === "Needs Improvement"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}>
                                {sec.rating}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">{sec.feedback}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-2.5">Missing Keywords & Skills:</h4>
                      <div className="flex flex-wrap gap-2">
                        {atsReport.missingKeywords?.map((skill: string, idx: number) => (
                          <span key={idx} className="bg-orange-100 text-orange-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3">Suggested Bullet Point Improvements:</h4>
                      <div className="space-y-3">
                        {atsReport.bulletRewrites?.map((rewrite: any, idx: number) => (
                          <div key={idx} className="p-3.5 border rounded-xl bg-gray-50/50 space-y-1.5">
                            <p className="text-xxs text-gray-500 font-bold uppercase tracking-wider">Before:</p>
                            <p className="text-xs text-red-600 italic line-through">{rewrite.before}</p>
                            <p className="text-xxs text-gray-500 font-bold uppercase tracking-wider mt-2.5">After (ATS Optimized):</p>
                            <p className="text-xs text-emerald-600 font-semibold leading-relaxed">{rewrite.after}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-1">General Phrasing & Alignment Advice:</h4>
                      <p className="text-sm text-gray-650 leading-relaxed bg-gray-50 p-4 rounded-xl border">{atsReport.advice || atsReport.generalAdvice}</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-2xl bg-gray-50/50 min-h-[400px]">
                  <FileText className="w-12 h-12 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500 font-medium text-center max-w-xs">Upload your resume and submit a target job description to build your section-by-section ATS score report.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: SALARY NEGOTIATOR */}
        {activeTab === "negotiation" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
            {/* Negotiation inputs */}
            <Card className="lg:col-span-4 border border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-rose-700 flex items-center gap-2">
                  <Handshake className="w-5 h-5" /> Negotiator Settings
                </CardTitle>
                <CardDescription>Setup offer details to start a mock roleplay session.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Company Name</label>
                  <Input
                    placeholder="e.g., Stripe, Amazon"
                    value={negCompany}
                    onChange={(e) => setNegCompany(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Job Title</label>
                  <Input
                    placeholder="e.g., Senior React Engineer"
                    value={negTitle}
                    onChange={(e) => setNegTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Current Base Offer Details</label>
                  <Input
                    placeholder="e.g., $120,000 / year"
                    value={negOffer}
                    onChange={(e) => setNegOffer(e.target.value)}
                  />
                </div>
                <Button
                  onClick={startNegotiation}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white"
                >
                  Start Roleplay Chat
                </Button>
              </CardContent>
            </Card>

            {/* Chat Workspace */}
            <div className="lg:col-span-8">
              {negMessages.length > 0 ? (
                <Card className="border border-gray-100 shadow-md flex flex-col h-[500px]">
                  <CardHeader className="bg-rose-50 border-b py-3">
                    <CardTitle className="text-sm font-bold text-rose-800">Recruiter Negotiation Simulator</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 flex-grow overflow-y-auto space-y-4 flex flex-col">
                    {negMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                          msg.role === "recruiter"
                            ? "bg-gray-100 text-gray-800 self-start"
                            : "bg-rose-600 text-white self-end"
                        }`}
                      >
                        <span className="text-xxs font-bold uppercase tracking-wider block mb-1">
                          {msg.role === "recruiter" ? "Recruiter Agent" : "You (Candidate)"}
                        </span>
                        {msg.text}
                      </div>
                    ))}
                    {negLoading && (
                      <div className="bg-gray-100 text-gray-600 max-w-[80%] rounded-2xl p-4 text-sm self-start flex items-center gap-2">
                        <Loader className="w-4 h-4 animate-spin text-rose-600" />
                        Recruiter is drafting response...
                      </div>
                    )}
                  </CardContent>
                  <div className="border-t p-3 flex gap-2 bg-gray-50/50">
                    <Input
                      placeholder="Type your justification/counter-offer arguments here..."
                      value={negInput}
                      onChange={(e) => setNegInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendNegotiationMessage()}
                      disabled={negLoading}
                    />
                    <Button onClick={sendNegotiationMessage} disabled={negLoading} className="bg-rose-600 hover:bg-rose-700 text-white">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-2xl bg-gray-50/50 min-h-[400px]">
                  <Handshake className="w-12 h-12 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500 font-medium">Setup your offer details on the left and click start to begin HR negotiation simulation.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: CAREER ROADMAP COACH */}
        {activeTab === "roadmap" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
            {/* Input Config Card */}
            <Card className="lg:col-span-4 border border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-purple-700 flex items-center gap-2">
                  <Compass className="w-5 h-5" /> Roadmap Compiler
                </CardTitle>
                <CardDescription>Map out your prep curriculum.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Target Role</label>
                  <Input
                    placeholder="e.g., DevOps Engineer, Frontend Lead"
                    value={roadmapRole}
                    onChange={(e) => setRoadmapRole(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Current Experience / Skills</label>
                  <Input
                    placeholder="e.g., 2 yrs React, knows basic Linux commands"
                    value={roadmapSkills}
                    onChange={(e) => setRoadmapSkills(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Target Company Profile (Optional)</label>
                  <Input
                    placeholder="e.g., FAANG, high-growth startup, remote SaaS"
                    value={roadmapCompany}
                    onChange={(e) => setRoadmapCompany(e.target.value)}
                  />
                </div>
                <Button
                  onClick={generateRoadmap}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  disabled={roadmapLoading}
                >
                  {roadmapLoading ? <Loader className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
                  Compile Learning Plan
                </Button>
              </CardContent>
            </Card>

            {/* Roadmap Output */}
            <div className="lg:col-span-8">
              {roadmapData ? (
                <Card className="border border-gray-100 shadow-md">
                  <CardHeader className="bg-purple-50 border-b">
                    <CardTitle className="text-lg font-bold text-purple-800">Your Structured Prep Plan</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div>
                      <h4 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wide">📅 Preparation Timeline Phases:</h4>
                      <div className="relative pl-6 border-l-2 border-purple-200 space-y-6">
                        {roadmapData.phases.map((phase: any, idx: number) => (
                          <div key={idx} className="relative">
                            {/* bullet marker */}
                            <span className="absolute -left-8 top-1.5 w-4.5 h-4.5 bg-purple-600 text-white rounded-full flex items-center justify-center text-xxs font-bold">
                              {idx + 1}
                            </span>
                            <h5 className="font-bold text-gray-800 text-base">{phase.title}</h5>
                            <p className="text-sm text-gray-600 mt-1">{phase.description}</p>
                            <ul className="list-disc pl-5 mt-2 text-xs text-gray-500 space-y-1">
                              {phase.milestones.map((ms: string, mIdx: number) => (
                                <li key={mIdx}>{ms}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wide">💡 Recommended Portfolio Projects:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {roadmapData.projects.map((proj: any, idx: number) => (
                          <div key={idx} className="p-4 border rounded-xl bg-gray-50/50">
                            <h5 className="font-bold text-sm text-purple-800 mb-1">{proj.title}</h5>
                            <p className="text-xs text-gray-600 leading-relaxed">{proj.details}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="text-sm font-bold text-gray-800 mb-1 uppercase tracking-wide">📣 Coaching & Negotiation Advice:</h4>
                      <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded border border-gray-100">{roadmapData.advice}</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-2xl bg-gray-50/50 min-h-[400px]">
                  <Compass className="w-12 h-12 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500 font-medium">Fill in target role specifications on the left to build a custom career plan.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
