export type JobPlatform =
  | "LinkedIn"
  | "Naukri"
  | "Wellfound"
  | "YC Startups"
  | "RemoteOK"
  | "WeWorkRemotely"
  | "Greenhouse"
  | "Lever"
  | "Upwork / Freelance";

export type JobType =
  | "Full-Time"
  | "Remote (India Allowed)"
  | "Freelance / Gig"
  | "Internship";

export interface JobOpportunity {
  id: string;
  title: string;
  company: string;
  platform: JobPlatform;
  type: JobType;
  location: string;
  postedAgo: string;
  hoursOld: number;
  applicantsCount: number;
  tags: string[];
  applyUrl: string;
  description: string;
  isFresh: boolean;
  verifiedPlatform: boolean;
  experienceLevel: string;
  salaryOrBudget: string;
  companyLinkedIn?: string;
  atsScore?: number;
}

export interface AtsMatchResult {
  score: number;
  rating: "High Match" | "Moderate Match" | "Low Match";
  matchingSkills: string[];
  missingSkills: string[];
  improvementSuggestions: string[];
}
