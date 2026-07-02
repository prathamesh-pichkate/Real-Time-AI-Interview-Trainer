# 🎙️ Dynamic AI Mock Interview Platform

Welcome to the **Dynamic AI Mock Interview Platform**—a real-time, voice-guided, browser-based simulation engine designed to train candidates for professional job roles. 

Unlike traditional static click-through mock boards, this platform leverages high-fidelity AI components to emulate a **live interview experience**. The system reads questions aloud, captures voice responses, corrects transcript errors dynamically, checks webcam compliance, tracks facial expressions, and delivers a robust behavioral feedback dashboard.

---

## 🌟 Key Features

### 1. 🗣️ Real-Time Voice-Guided Simulation
* **Text-to-Speech (TTS)**: The AI interviewer reads out welcome prompts, introductions, and technical questions using high-fidelity native browser voice synthesis (`SpeechSynthesis`).
* **Speech-to-Text (STT)**: Automated hands-free transcribing of candidate answers (`react-hook-speech-to-text`) immediately following the question narration.
* **Smart AI Transcript Correction**: Speech recognition is prone to phonetic misunderstandings. The system runs an automated cleanup pass using the **Google Gemini API** to fix typos, phonetic slips, grammar, and punctuation while preserving the candidate's exact meaning and technical vocabulary before evaluation.

### 2. 🛡️ Compulsory Webcam & Integrity Verification
* **Mandatory Camera Checks**: Candidates must turn on their webcams to start the interview.
* **Out-of-Frame Warning Overlay**: If a candidate looks away, blocks the camera, or leaves the frame for more than 2 seconds, a full-screen alert overlay freezes the timer/interview and prompts them to realign.
* **Gaze Center Tracking**: A centering detection warning alerts candidates when they drift too close to the video boundaries, helping them maintain a professional centered presence.

### 3. 📊 Facial Emotion & Behavioral Analytics
* **On-the-fly Face Tracking**: Throttled 5fps client-side face recognition powered by `face-api.js` loaded via CDN.
* **Composure Analysis**: Computes dominant emotional states during the session (smiling, focused, concerned, anxious, stressed) to produce a normalized breakdown.
* **AI Behavioral Coaching**: A Gemini-generated body language summary providing constructive suggestions regarding composure, eye contact, and video alignment.

### 4. ⏱️ Time-Bound Responses
* **Custom countdown timers** (90 seconds for self-introduction, 120 seconds per technical question) with visual progress gauges and urgent pulsing indicators when time runs low.
* **Auto-Submission**: Automatically submits and transitions to the next phase when the countdown timer runs out.

### 5. 🎯 Comprehensive Performance Feedback
* Detailed breakdown comparisons of candidate answers versus model answers.
* Interactive progress bars visualizing composure and expressions.
* Grade scores (1 to 10 scale) and actionable improvement guidelines for every response.

---

## 🛠️ Technology Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Core Framework** | React 18, TypeScript, Vite | Fast, type-safe hot-reloading frontend development |
| **Styling** | TailwindCSS, Lucide Icons, Custom CSS | Modern HSL-curated colors, premium glassmorphism, responsive animations |
| **UI Components** | Shadcn/UI (Radix Primitives) | Accessible, fully reusable layout, card, and accordion components |
| **Authentication** | Clerk Auth | Seamless authentication, sign-ups, and user session management |
| **Database** | Firebase Firestore | Cloud database for interview templates, user answers, and metrics |
| **AI Processing** | Google Gemini SDK (`@google/genai`) | Automated evaluation, grading, and behavioral analysis |
| **Face Tracking** | vladmandic/face-api (CDN Load) | Tiny Face Detector & Face Expression model weights |

---

## 📂 Project Structure

```text
├── src/
│   ├── components/
│   │   ├── ui/                       # Reusable shadcn component library
│   │   ├── custom-bread-crumb.tsx    # Responsive breadcrumb navigation
│   │   ├── dynamic-interview.tsx     # CORE: Interview state-machine, voice & face tracking
│   │   ├── form-mock-interview.tsx   # Configures and generates new interview templates
│   │   └── question-section.tsx      # Static question layout (Legacy fallback)
│   ├── hooks/
│   │   └── useFaceApi.ts             # Dynamically loads face-api.js and model weights from CDN
│   ├── config/
│   │   └── firebase.config.ts        # Initializes Firebase client instance
│   ├── routes/
│   │   ├── index.ts                  # Application routing definitions
│   │   ├── mock-interview-page.tsx   # Entry container wrapper for live interview
│   │   ├── feedback.tsx              # Renders detailed grading, emotion charts & coaching tips
│   │   ├── mock-load-page.tsx        # Camera precheck container screen
│   │   └── dashboard.tsx             # Candidate dashboard showing completed runs
│   ├── types/
│   │   └── index.ts                  # Shared TypeScript type definitions
│   ├── scripts/
│   │   └── index.ts                  # Connects and prompts Google Gemini API
│   ├── App.css
│   ├── index.css                     # Global design tokens and animations
│   └── main.tsx                      # Application mounting point
├── .env                              # Environment credentials config
├── package.json
└── vite.config.ts
```

---

## 🚀 Installation & Setup

Follow these steps to run the platform locally:

### 1. Prerequisite
Ensure you have **Node.js** (v18+) and **pnpm** (or `npm`) installed.

### 2. Clone the Repository
```bash
git clone https://github.com/your-username/ai-mock-interview.git
cd ai-mock-interview
```

### 3. Install Dependencies
```bash
pnpm install
# or
npm install
```

### 4. Setup Environment Variables
Create a `.env` (or `.env.local`) file in the root directory and configure the following keys:

```ini
# Clerk Auth Configuration
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

# Firebase SDK Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id

# Google Gemini AI Configuration
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### 5. Start Development Server
```bash
pnpm dev
# or
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser to start practicing!

### 6. Build for Production
```bash
pnpm build
# or
npm run build
```

---

## 🔒 Gaze & Webcam Privacy
All face-tracking, landmark mapping, and emotion checking calculations are run **entirely client-side** inside the candidate's browser sandbox using WebGL acceleration. **No video feed or raw images are uploaded, sent, or saved** to any cloud server. Only anonymized percentages (e.g. `neutral: 70%`) and count data are saved to Firestore to populate the feedback reports.
# Real-Time-AI-Interview-Trainer
