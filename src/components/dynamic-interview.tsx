import React, { useState, useEffect, useRef, useCallback } from "react";
import WebCam from "react-webcam";
import useSpeechToText, { ResultType } from "react-hook-speech-to-text";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import { db } from "@/config/firebase.config";
import { chatSession } from "@/scripts";
import { useFaceApi } from "@/hooks/useFaceApi";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { Button } from "./ui/button";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import {
  Mic,
  CircleStop,
  Loader,
  Video,
  VideoOff,
  AlertTriangle,
  Volume2,
  VolumeX,
  Play,
  Sparkles,
  Camera,
  Heart,
  Smile,
  Shield,
  Clock,
  Compass,
} from "lucide-react";

interface Question {
  question: string;
  answer: string;
}

interface DynamicInterviewProps {
  questions: Question[];
  interviewPosition: string;
}

interface AIResponse {
  ratings: number;
  feedback: string;
}

// Sub-component for Speech to Text that re-mounts on key change to clear transcripts
interface SpeechRecorderProps {
  isRecordingActive: boolean;
  onTranscriptChange: (text: string) => void;
  onRecordingStateChange: (recording: boolean) => void;
  onAutoSubmit: () => void;
  timerLimitSeconds: number;
}

const SpeechRecorder: React.FC<SpeechRecorderProps> = ({
  isRecordingActive,
  onTranscriptChange,
  onRecordingStateChange,
  onAutoSubmit,
  timerLimitSeconds,
}) => {
  const {
    interimResult,
    isRecording,
    results,
    startSpeechToText,
    stopSpeechToText,
  } = useSpeechToText({
    continuous: true,
    useLegacyResults: false,
    speechRecognitionProperties: {
      lang: "en-US",
      interimResults: true,
    },
  });

  const [timeLeft, setTimeLeft] = useState(timerLimitSeconds);

  // Sync recording state with parent
  useEffect(() => {
    onRecordingStateChange(isRecording);
  }, [isRecording, onRecordingStateChange]);

  // Sync transcription results with parent
  useEffect(() => {
    const combineTranscripts = results
      .filter((result): result is ResultType => typeof result !== "string")
      .map((result) => result.transcript)
      .join(" ");

    onTranscriptChange(combineTranscripts);
  }, [results, onTranscriptChange]);

  // Handle start/stop from parent control
  useEffect(() => {
    if (isRecordingActive && !isRecording) {
      startSpeechToText();
    } else if (!isRecordingActive && isRecording) {
      stopSpeechToText();
    }
  }, [isRecordingActive, isRecording, startSpeechToText, stopSpeechToText]);

  // Countdown timer logic
  useEffect(() => {
    if (!isRecording) return;

    if (timeLeft <= 0) {
      stopSpeechToText();
      onAutoSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isRecording, stopSpeechToText, onAutoSubmit]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const timerPercentage = (timeLeft / timerLimitSeconds) * 100;

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Timer Bar */}
      <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gray-100 p-3.5 rounded-lg border gap-2 sm:gap-0">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Clock className={isRecording ? "w-4 h-4 text-emerald-500 animate-pulse" : "w-4 h-4 text-gray-400"} />
          <span>{isRecording ? "Time Remaining" : "Timer Paused"}</span>
        </div>
        <div className={`text-base font-bold font-mono px-3 py-1 rounded-md w-full sm:w-auto text-center ${timeLeft <= 15 && isRecording ? "bg-red-100 text-red-600 animate-pulse" : "bg-gray-200 text-gray-800"}`}>
          {formatTime(timeLeft)}
        </div>
      </div>
      {isRecording && (
        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 rounded-full ${timeLeft <= 15 ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`}
            style={{ width: `${timerPercentage}%` }}
          />
        </div>
      )}

      {/* Speech input status & interim results */}
      {interimResult && (
        <div className="p-3 bg-sky-50 border border-sky-100 rounded-md">
          <p className="text-xs text-sky-500 font-semibold uppercase tracking-wider mb-1">Listening...</p>
          <p className="text-sm text-sky-700 italic">{interimResult}</p>
        </div>
      )}
    </div>
  );
};

export const DynamicInterview: React.FC<DynamicInterviewProps> = ({
  questions,
  interviewPosition,
}) => {
  const { interviewId } = useParams<{ interviewId: string }>();
  const { userId } = useAuth();
  const navigate = useNavigate();

  // Face API custom hook
  const { isLoaded: isFaceApiLoaded, error: faceApiError } = useFaceApi();

  // Webcam & face-tracking states
  const webcamRef = useRef<WebCam>(null);
  const [isWebCamOn, setIsWebCamOn] = useState(false);
  const [noFaceWarning, setNoFaceWarning] = useState(false);
  const [boundaryWarning, setBoundaryWarning] = useState(false);
  const [warningsCount, setWarningsCount] = useState(0);
  const [currentEmotion, setCurrentEmotion] = useState("neutral");

  // Emotion tallies
  const [emotionCounts, setEmotionCounts] = useState<Record<string, number>>({
    neutral: 0,
    happy: 0,
    sad: 0,
    angry: 0,
    fearful: 0,
    surprised: 0,
  });

  // State Machine
  // welcome -> intro_speak -> intro_answering -> question_speak -> question_answering -> evaluating -> complete
  const [interviewState, setInterviewState] = useState<
    | "ready"
    | "intro_speak"
    | "intro_answering"
    | "question_speak"
    | "question_answering"
    | "evaluating"
    | "complete"
  >("ready");

  const [currentQstIndex, setCurrentQstIndex] = useState(0);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isSpeechRecording, setIsSpeechRecording] = useState(false);
  const [userTranscript, setUserTranscript] = useState("");
  const [aiGeneratingStatus, setAiGeneratingStatus] = useState("");

  // Speech helper
  const speakText = useCallback((text: string, onEnd?: () => void) => {
    if (!("speechSynthesis" in window)) {
      toast.error("Web Speech API not supported in this browser");
      if (onEnd) onEnd();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    const voices = window.speechSynthesis.getVoices();
    // Prefer Google English or standard English voices
    const selectedVoice =
      voices.find((v) => v.lang.startsWith("en") && v.name.includes("Google")) ||
      voices.find((v) => v.lang.startsWith("en"));
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onend = () => {
      setIsAiSpeaking(false);
      if (onEnd) onEnd();
    };

    setIsAiSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, []);

  // Stop synthesis when component unmounts
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Face Detection / Expression loop
  useEffect(() => {
    if (!isFaceApiLoaded || !isWebCamOn || interviewState === "ready" || interviewState === "complete") {
      return;
    }

    let animationFrameId: number;
    let consecutiveNoFaceCount = 0;

    const runDetection = async () => {
      if (
        webcamRef.current &&
        webcamRef.current.video &&
        webcamRef.current.video.readyState === 4 &&
        window.faceapi
      ) {
        const video = webcamRef.current.video;
        try {
          const detection = await window.faceapi
            .detectSingleFace(video, new window.faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions();

          if (detection) {
            setNoFaceWarning(false);
            consecutiveNoFaceCount = 0;

            // Check if boundary violation (face is too close to camera edge)
            const box = detection.detection.box;
            const videoWidth = video.videoWidth;
            const videoHeight = video.videoHeight;
            const margin = 20; //px from boundary

            const outOfBounds =
              box.x < margin ||
              box.y < margin ||
              box.x + box.width > videoWidth - margin ||
              box.y + box.height > videoHeight - margin;

            if (outOfBounds) {
              setBoundaryWarning(true);
              setWarningsCount((prev) => prev + 1);
            } else {
              setBoundaryWarning(false);
            }

            // Tally dominant emotion
            const expressions = detection.expressions;
            let maxEmotion = "neutral";
            let maxVal = 0;
            for (const [emotion, val] of Object.entries(expressions)) {
              if ((val as number) > maxVal) {
                maxVal = val as number;
                maxEmotion = emotion;
              }
            }

            setCurrentEmotion(maxEmotion);
            setEmotionCounts((prev) => ({
              ...prev,
              [maxEmotion]: (prev[maxEmotion] || 0) + 1,
            }));
          } else {
            // No face detected
            consecutiveNoFaceCount++;
            if (consecutiveNoFaceCount >= 10) {
              // ~2 seconds at 5fps
              setNoFaceWarning(true);
              setWarningsCount((prev) => prev + 1);
            }
          }
        } catch (err) {
          console.error("Face detection execution error:", err);
        }
      }

      // Throttle to roughly 5 frames per second
      setTimeout(() => {
        animationFrameId = requestAnimationFrame(runDetection);
      }, 200);
    };

    animationFrameId = requestAnimationFrame(runDetection);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isFaceApiLoaded, isWebCamOn, interviewState]);

  // Clean JSON response helper
  const cleanJsonResponse = (responseText: string) => {
    let cleanText = responseText.trim();
    cleanText = cleanText.replace(/(json|```|`)/g, "");
    try {
      return JSON.parse(cleanText);
    } catch (error) {
      throw new Error("Invalid JSON format from AI: " + (error as Error)?.message);
    }
  };

  // Autocorrect transcript typos and grammar with Gemini
  const cleanTranscriptWithAi = async (text: string): Promise<string> => {
    if (!text || text.trim().length < 10) return text;
    const prompt = `
      You are an AI speech transcription assistant. Clean up the following speech-to-text transcript. Fix any spelling/typing mistakes, adjust punctuation, and correct minor phonetic misunderstandings, but preserve the candidate's exact wording, meaning, and technical terminology. Do not summarize or add new information.
      
      Transcript: "${text}"
      
      Respond ONLY with the cleaned-up transcript text.
    `;
    try {
      const response = await chatSession.sendMessage(prompt);
      return response.trim() || text;
    } catch (err) {
      console.error("Failed to clean transcript:", err);
      return text;
    }
  };

  // Evaluate single answer with Gemini
  const evaluateAnswer = async (
    qst: string,
    idealAns: string,
    userAns: string
  ): Promise<AIResponse> => {
    const prompt = `
      Question: "${qst}"
      User Answer: "${userAns}"
      Correct Answer: "${idealAns}"
      Please compare the user's answer to the correct answer, and provide a rating (from 1 to 10) based on answer quality, and offer feedback for improvement.
      Return the result in JSON format with the fields "ratings" (number) and "feedback" (string).
    `;

    try {
      const responseText = await chatSession.sendMessage(prompt);
      if (!responseText || responseText.trim() === "") {
        throw new Error("Empty response from AI service");
      }
      return cleanJsonResponse(responseText);
    } catch (error) {
      console.error(error);
      return { ratings: 1, feedback: "Unable to evaluate answer due to service interruption." };
    }
  };

  // State Transitions
  const startInterview = () => {
    if (!isWebCamOn) {
      toast.error("Webcam is compulsory", {
        description: "Please turn on your webcam before starting the interview.",
      });
      return;
    }
    setInterviewState("intro_speak");
    speakText(
      `Hello and welcome to your mock interview for the ${interviewPosition} position. I will be your AI interviewer today. Before we begin the technical questions, let's start with a quick warm-up. Please introduce yourself, summarize your professional background, and share why you are interested in this role.`,
      () => {
        setInterviewState("intro_answering");
      }
    );
  };

  const submitIntroduction = () => {
    setIsSpeechRecording(false);
    
    // Save introduction answer to Firebase (not graded or graded with rating 10 as introduction)
    setInterviewState("evaluating");
    setAiGeneratingStatus("Refining transcript with AI...");

    const saveIntro = async () => {
      try {
        const cleanedIntro = await cleanTranscriptWithAi(userTranscript);
        await addDoc(collection(db, "userAnswers"), {
          mockIdRef: interviewId,
          question: "Introduction",
          correct_ans: "A brief self-introduction including background, skills, and motivation.",
          user_ans: cleanedIntro || "Skipped or no speech detected.",
          feedback: "Introduction completed successfully. This served as a warm-up for the interview.",
          rating: 10,
          userId,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.error("Failed to save introduction:", err);
      } finally {
        // Proceed to first technical question
        setUserTranscript("");
        setCurrentQstIndex(0);
        setInterviewState("question_speak");
        
        const qstText = questions[0]?.question || "";
        speakText(
          `Thank you for introducing yourself. Now let's proceed to the first technical question. ${qstText}`,
          () => {
            setInterviewState("question_answering");
          }
        );
      }
    };
    saveIntro();
  };

  const submitQuestionAnswer = async () => {
    setIsSpeechRecording(false);
    setInterviewState("evaluating");
    setAiGeneratingStatus("Refining transcript with AI...");

    const qst = questions[currentQstIndex];
    const userAns = userTranscript || "No answer provided.";

    try {
      const cleanedUserAns = await cleanTranscriptWithAi(userAns);
      setAiGeneratingStatus(`Evaluating Question ${currentQstIndex + 1}...`);
      const evaluation = await evaluateAnswer(qst.question, qst.answer, cleanedUserAns);

      // Save answer
      await addDoc(collection(db, "userAnswers"), {
        mockIdRef: interviewId,
        question: qst.question,
        correct_ans: qst.answer,
        user_ans: cleanedUserAns,
        feedback: evaluation.feedback,
        rating: evaluation.ratings,
        userId,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error saving evaluation:", err);
      toast.error("Failed to save answer evaluation.");
    }

    // Determine next step
    const nextIndex = currentQstIndex + 1;
    if (nextIndex < questions.length) {
      setUserTranscript("");
      setCurrentQstIndex(nextIndex);
      setInterviewState("question_speak");
      const nextQstText = questions[nextIndex]?.question || "";
      speakText(
        `Got it. Let's move on to the next question. Question ${nextIndex + 1}: ${nextQstText}`,
        () => {
          setInterviewState("question_answering");
        }
      );
    } else {
      // Completed!
      setInterviewState("complete");
      speakText(
        "That was the last question. Excellent job! I am now analyzing your communication style, facial emotions, and camera presence to compile your final feedback report. One moment, please.",
        async () => {
          await generateBehavioralFeedback();
        }
      );
    }
  };

  const generateBehavioralFeedback = async () => {
    setAiGeneratingStatus("Generating behavioral report...");
    
    // Calculate total frames sampled
    const totalFrames = Object.values(emotionCounts).reduce((a, b) => a + b, 0) || 1;
    
    // Normalize percentage
    const emotionPercentages = Object.entries(emotionCounts).reduce(
      (acc, [emotion, val]) => {
        acc[emotion] = Math.round((val / totalFrames) * 100);
        return acc;
      },
      {} as Record<string, number>
    );

    const prompt = `
      You are an expert AI interview coach. Please review the following data on the candidate's body language and emotional expressions during an interview:
      - Dominant Emotions (represented as percentage of total duration):
        - Neutral/Focused: ${emotionPercentages.neutral}%
        - Happy/Smiling: ${emotionPercentages.happy}%
        - Surprised: ${emotionPercentages.surprised}%
        - Sad/Concerned: ${emotionPercentages.sad}%
        - Fearful/Anxious: ${emotionPercentages.fearful}%
        - Angry/Stressed: ${emotionPercentages.angry}%
      - Camera warnings received (looking away, moving out of center, or blocking camera): ${warningsCount} times.

      Write a constructive, professional behavioral summary (3-4 sentences). Provide feedback on:
      1. Their emotional composure (focused vs anxious, warm/smiling vs stressed).
      2. Their physical presence (camera compliance, head movement, maintaining eye contact).
      3. Actionable advice on how they can improve their next video interview.

      Respond ONLY with the text of the behavioral summary. Do not include any HTML, markdown headers, or JSON tags.
    `;

    try {
      const responseText = await chatSession.sendMessage(prompt);
      const feedbackText = responseText || "Composure was overall stable. Keep looking directly at the camera.";

      // Update Firebase Interview document
      if (interviewId) {
        await updateDoc(doc(db, "interviews", interviewId), {
          behaviorMetrics: {
            emotions: emotionPercentages,
            warningsCount,
            behavioralFeedback: feedbackText,
          },
        });
      }
      
      toast.success("Success", { description: "Interview completed and feedback compiled!" });
      navigate(`/generate/feedback/${interviewId}`);
    } catch (err) {
      console.error("Failed to generate behavioral report:", err);
      toast.error("Failed to save behavioral feedback.");
      navigate(`/generate/feedback/${interviewId}`);
    }
  };

  // Helper render for camera screen
  const handleWebcamSwitch = () => {
    setIsWebCamOn((prev) => !prev);
  };

  const getEmotionLabel = (emotion: string) => {
    switch (emotion) {
      case "happy": return "Smiling / Warm";
      case "neutral": return "Focused / Neutral";
      case "surprised": return "Expressive / Surprised";
      case "sad": return "Concerned";
      case "fearful": return "Anxious";
      case "angry": return "Stressed";
      default: return "Analyzing...";
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Warning Overlays */}
      {noFaceWarning && interviewState !== "ready" && interviewState !== "complete" && (
        <div className="fixed inset-0 z-50 bg-red-600/80 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6">
          <AlertTriangle className="w-20 h-20 text-yellow-300 animate-bounce mb-4" />
          <h2 className="text-3xl font-bold mb-2">WARNING: Face Not Detected</h2>
          <p className="text-lg text-red-100 max-w-md text-center">
            The webcam must remain active, and your face must be fully visible. Please align yourself with the camera.
          </p>
        </div>
      )}

      {boundaryWarning && !noFaceWarning && interviewState !== "ready" && interviewState !== "complete" && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-40 bg-yellow-500 text-slate-900 px-4 py-2.5 rounded-full shadow-lg font-semibold flex items-center gap-2 animate-pulse w-[90%] max-w-sm justify-center text-xs sm:text-sm text-center">
          <AlertTriangle className="w-4 h-4 text-slate-900 shrink-0" />
          <span>Move back! Keep face centered.</span>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
        {/* Left Column: Webcam, Face Integrity Checks & Emotion Stats */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Webcam Card */}
          <Card className="overflow-hidden shadow-md border-gray-200">
            <CardHeader className="bg-gray-50 border-b p-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-600" />
                  <span>Webcam Monitoring</span>
                </CardTitle>
                <div className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${isWebCamOn ? "bg-emerald-500 animate-ping" : "bg-gray-400"}`} />
                  <span className="text-xs text-gray-500 font-medium">{isWebCamOn ? "Active" : "Disabled"}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 flex flex-col items-center justify-center gap-4">
              <div className="w-full aspect-video flex flex-col items-center justify-center border bg-slate-950 rounded-lg overflow-hidden relative shadow-inner">
                {isWebCamOn ? (
                  <>
                    <WebCam
                      ref={webcamRef}
                      onUserMedia={() => setIsWebCamOn(true)}
                      onUserMediaError={() => {
                        setIsWebCamOn(false);
                        toast.error("Webcam Error", {
                          description: "Could not activate webcam. Please check permissions.",
                        });
                      }}
                      className="w-full h-full object-cover"
                      mirrored
                    />
                    {/* Live overlay markers */}
                    <div className="absolute inset-4 border border-white/20 rounded-md pointer-events-none" />
                    {isFaceApiLoaded && interviewState !== "ready" && (
                      <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded text-xs text-white font-medium flex items-center gap-2 border border-white/10">
                        <Smile className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Composure: {getEmotionLabel(currentEmotion)}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <VideoOff className="w-16 h-16 text-slate-600" />
                    <span className="text-sm text-slate-500">Camera is compulsory for this interview.</span>
                  </div>
                )}
              </div>

              {interviewState === "ready" && (
                <Button
                  variant={isWebCamOn ? "destructive" : "default"}
                  className="w-full flex items-center justify-center gap-2"
                  onClick={handleWebcamSwitch}
                >
                  {isWebCamOn ? (
                    <>
                      <VideoOff className="w-4 h-4" />
                      <span>Disable Camera</span>
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4" />
                      <span>Enable Camera</span>
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Camera Compliance Status */}
          {isWebCamOn && (
            <Card className="shadow-md border-gray-200">
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center text-sm border-b pb-2.5">
                  <span className="text-gray-500 font-medium">Face Detector Module:</span>
                  <span className={`font-semibold flex items-center gap-1.5 ${isFaceApiLoaded ? "text-emerald-600" : "text-amber-500 animate-pulse"}`}>
                    {isFaceApiLoaded ? (
                      <>
                        <Shield className="w-4 h-4" /> Loaded
                      </>
                    ) : (
                      "Initializing..."
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-b pb-2.5">
                  <span className="text-gray-500 font-medium">Position Accuracy:</span>
                  <span className={`font-semibold ${boundaryWarning ? "text-red-500" : "text-emerald-600"}`}>
                    {boundaryWarning ? "Warning: Recenter" : "Excellent"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium">Integrity Warnings Tally:</span>
                  <span className={`font-semibold px-2 py-0.5 rounded text-xs ${warningsCount > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {warningsCount} warnings
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: AI Interviewer Assistant & Audio Controls */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <Card className="shadow-md border-gray-200 min-h-[420px] flex flex-col">
            <CardHeader className="bg-gray-50 border-b p-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-gray-800">
                    {interviewState === "ready"
                      ? "Ready to begin?"
                      : interviewState === "intro_speak" || interviewState === "intro_answering"
                      ? "Warm-Up Session"
                      : `Question ${currentQstIndex + 1} of ${questions.length}`}
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-500 mt-0.5">
                    {interviewState === "ready"
                      ? "AI Interview Simulator"
                      : interviewState === "intro_speak"
                      ? "Interviewer welcome intro"
                      : interviewState === "intro_answering"
                      ? "Candidate self introduction"
                      : `Evaluating Technical Competency`}
                  </CardDescription>
                </div>

                {/* Badges */}
                <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-full uppercase">
                  {interviewState.replace("_", " ")}
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-6 flex-grow flex flex-col gap-6 justify-between">
              {/* Ready State Screen */}
              {interviewState === "ready" && (
                <div className="flex-grow flex flex-col items-center justify-center text-center gap-6 p-4">
                  <div className="bg-emerald-50 p-4 rounded-full border border-emerald-100">
                    <Sparkles className="w-10 h-10 text-emerald-600 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-gray-800">Dynamic AI Mock Interview</h3>
                    <p className="text-sm text-gray-600 max-w-md">
                      This is an interactive voice-guided mock interview. The AI will speak questions aloud, listen to your answers, and check your camera composure in real-time.
                    </p>
                  </div>
                  <Button
                    size="lg"
                    className="px-8 bg-emerald-600 hover:bg-emerald-700 font-semibold"
                    onClick={startInterview}
                    disabled={!isWebCamOn}
                  >
                    Start Interview
                  </Button>
                </div>
              )}

              {/* AI Speaking / Listening visualization screen */}
              {interviewState !== "ready" && interviewState !== "complete" && (
                <div className="flex-grow flex flex-col gap-5 justify-between">
                  {/* Waveform / Voice assistant visualization */}
                  <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border relative overflow-hidden">
                    <div className="flex items-center justify-center bg-emerald-600 text-white rounded-full w-12 h-12 shrink-0 shadow-md">
                      {isAiSpeaking ? (
                        <Volume2 className="w-6 h-6 animate-bounce" />
                      ) : isSpeechRecording ? (
                        <Mic className="w-6 h-6 animate-pulse text-red-200" />
                      ) : (
                        <Compass className="w-6 h-6" />
                      )}
                    </div>
                    <div className="flex-grow">
                      <p className="text-sm font-bold text-gray-800">
                        {isAiSpeaking
                          ? "AI Interviewer is speaking..."
                          : isSpeechRecording
                          ? "AI is listening to your answer..."
                          : "AI is processing..."}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {isAiSpeaking
                          ? "Listen closely to the question."
                          : isSpeechRecording
                          ? "Speak clearly. Click Submit when done."
                          : "Evaluating response..."}
                      </p>
                    </div>

                    {/* Animated Waveform */}
                    {(isAiSpeaking || isSpeechRecording) && (
                      <div className="flex items-center gap-1 absolute right-6 h-8">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <span
                            key={i}
                            className={`w-1 rounded-full bg-emerald-500/80 transition-all duration-300 ${
                              isAiSpeaking
                                ? "animate-[bounce_0.8s_infinite_alternate]"
                                : "animate-[bounce_0.4s_infinite_alternate]"
                            }`}
                            style={{
                              height: `${Math.random() * 24 + 8}px`,
                              animationDelay: `${i * 0.15}s`,
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Question Display Card */}
                  <div className="p-5 border bg-white rounded-xl shadow-sm relative">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Question:</h4>
                    <p className="text-base md:text-lg font-semibold leading-relaxed text-gray-800">
                      {interviewState === "intro_speak" || interviewState === "intro_answering"
                        ? "Please introduce yourself, tell me a bit about your background, and why you are interested in this position."
                        : questions[currentQstIndex]?.question}
                    </p>
                  </div>

                  {/* Speech Recorder Sub-component with Key force re-mounting */}
                  <div className="w-full">
                    {interviewState === "intro_answering" && (
                      <SpeechRecorder
                        key="intro-recorder"
                        isRecordingActive={true}
                        timerLimitSeconds={90}
                        onTranscriptChange={setUserTranscript}
                        onRecordingStateChange={setIsSpeechRecording}
                        onAutoSubmit={submitIntroduction}
                      />
                    )}
                    {interviewState === "question_answering" && (
                      <SpeechRecorder
                        key={`qst-recorder-${currentQstIndex}`}
                        isRecordingActive={true}
                        timerLimitSeconds={120}
                        onTranscriptChange={setUserTranscript}
                        onRecordingStateChange={setIsSpeechRecording}
                        onAutoSubmit={submitQuestionAnswer}
                      />
                    )}
                  </div>

                  {/* Transcript box */}
                  <div className="flex-grow border rounded-lg bg-gray-50/50 p-4 min-h-[120px] max-h-[160px] overflow-y-auto">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">Your Answer Transcript:</span>
                    <p className="text-sm text-gray-700 leading-relaxed italic">
                      {userTranscript || "Transcript will appear here in real-time as you speak..."}
                    </p>
                  </div>

                  {/* Submitting / Evaluation Loader */}
                  {interviewState === "evaluating" && (
                    <div className="w-full flex items-center justify-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-lg animate-pulse">
                      <Loader className="w-5 h-5 text-emerald-600 animate-spin" />
                      <span className="text-sm font-semibold text-emerald-800">{aiGeneratingStatus}</span>
                    </div>
                  )}

                  {/* Footer Action Buttons */}
                  <div className="flex flex-col sm:flex-row justify-end gap-3 border-t pt-4 w-full">
                    {interviewState === "intro_answering" && (
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700 px-6 font-semibold w-full sm:w-auto"
                        onClick={submitIntroduction}
                        disabled={userTranscript.length < 15}
                      >
                        Submit Introduction
                      </Button>
                    )}
                    {interviewState === "question_answering" && (
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700 px-6 font-semibold w-full sm:w-auto"
                        onClick={submitQuestionAnswer}
                        disabled={userTranscript.length < 15}
                      >
                        Submit Answer & Next
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Complete State Loader */}
              {interviewState === "complete" && (
                <div className="flex-grow flex flex-col items-center justify-center gap-5 text-center py-10">
                  <Loader className="w-12 h-12 text-emerald-600 animate-spin" />
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-gray-800">Compiling Report</h3>
                    <p className="text-sm text-gray-500 max-w-sm">
                      {aiGeneratingStatus || "AI is finalizing feedback, rating, and facial emotion metrics..."}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
