/* eslint-disable @typescript-eslint/no-unused-vars */
import { useAuth } from "@clerk/clerk-react";
import {
  CircleStop,
  Loader,
  Mic,
  RefreshCw,
  Save,
  Video,
  VideoOff,
  WebcamIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import useSpeechToText, { ResultType } from "react-hook-speech-to-text";
import { useParams } from "react-router-dom";
import WebCam from "react-webcam";
import { toast } from "sonner";
import { chatSession } from "@/scripts";
import { SaveModal } from "./save-modal";
import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/config/firebase.config";
import { Button } from "./ui/button";

interface RecordAnswerProps {
  question: { question: string; answer: string };
  isWebCam: boolean;
  setIsWebCam: (value: boolean) => void;
}

interface AIResponse {
  ratings: number;
  feedback: string;
}

export const RecordAnswer = ({
  question,
  isWebCam,
  setIsWebCam,
}: RecordAnswerProps) => {
  const {
    interimResult,
    isRecording,
    results,
    startSpeechToText,
    stopSpeechToText,
  } = useSpeechToText({
    continuous: true,
    useLegacyResults: false,
  });

  const [userAnswer, setUserAnswer] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<AIResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { userId } = useAuth();
  const { interviewId } = useParams();

  const recordUserAnswer = async () => {
    if (isRecording) {
      stopSpeechToText();

      if (userAnswer?.length < 30) {
        toast.error("Error", {
          description: "Your answer should be more than 30 characters",
        });

        return;
      }

      //   ai result
      const aiResult = await generateResult(
        question.question,
        question.answer,
        userAnswer
      );

      setAiResult(aiResult);
    } else {
      startSpeechToText();
    }
  };

  const cleanJsonResponse = (responseText: string) => {
    // Step 1: Trim any surrounding whitespace
    let cleanText = responseText.trim();

    // Step 2: Remove any occurrences of "json" or code block symbols (``` or `)
    cleanText = cleanText.replace(/(json|```|`)/g, "");

    // Step 3: Parse the clean JSON text into an array of objects
    try {
      return JSON.parse(cleanText);
    } catch (error) {
      throw new Error("Invalid JSON format: " + (error as Error)?.message);
    }
  };

  const generateResult = async (
    qst: string,
    qstAns: string,
    userAns: string
  ): Promise<AIResponse> => {
    setIsAiGenerating(true);
    const prompt = `
      Question: "${qst}"
      User Answer: "${userAns}"
      Correct Answer: "${qstAns}"
      Please compare the user's answer to the correct answer, and provide a rating (from 1 to 10) based on answer quality, and offer feedback for improvement.
      Return the result in JSON format with the fields "ratings" (number) and "feedback" (string).
    `;

    try {
      // chatSession.sendMessage now returns string directly
      const responseText = await chatSession.sendMessage(prompt);

      if (!responseText || responseText.trim() === "") {
        throw new Error("Empty response from AI service");
      }

      // Parse the string response directly (no .response.text() needed)
      const parsedResult: AIResponse = cleanJsonResponse(responseText);
      return parsedResult;
    } catch (error) {
      console.log(error);
      toast("Error", {
        description: "An error occurred while generating feedback.",
      });
      return { ratings: 0, feedback: "Unable to generate feedback" };
    } finally {
      setIsAiGenerating(false);
    }
  };

  const recordNewAnswer = () => {
    setUserAnswer("");
    stopSpeechToText();
    startSpeechToText();
  };

  const saveUserAnswer = async () => {
    setLoading(true);

    if (!aiResult) {
      return;
    }

    const currentQuestion = question.question;
    try {
      // query the firbase to check if the user answer already exists for this question

      const userAnswerQuery = query(
        collection(db, "userAnswers"),
        where("userId", "==", userId),
        where("question", "==", currentQuestion)
      );

      const querySnap = await getDocs(userAnswerQuery);

      // if the user already answerd the question dont save it again
      if (!querySnap.empty) {
        console.log("Query Snap Size", querySnap.size);
        toast.info("Already Answered", {
          description: "You have already answered this question",
        });
        return;
      } else {
        // save the user answer

        await addDoc(collection(db, "userAnswers"), {
          mockIdRef: interviewId,
          question: question.question,
          correct_ans: question.answer,
          user_ans: userAnswer,
          feedback: aiResult.feedback,
          rating: aiResult.ratings,
          userId,
          createdAt: serverTimestamp(),
        });

        toast("Saved", { description: "Your answer has been saved.." });
      }

      setUserAnswer("");
      stopSpeechToText();
    } catch (error) {
      toast("Error", {
        description: "An error occurred while generating feedback.",
      });
      console.log(error);
    } finally {
      setLoading(false);
      setOpen(!open);
    }
  };

  useEffect(() => {
    const combineTranscripts = results
      .filter((result): result is ResultType => typeof result !== "string")
      .map((result) => result.transcript)
      .join(" ");

    setUserAnswer(combineTranscripts);
  }, [results]);

  return (
    <div className="w-full flex flex-col md:flex-row gap-8 mt-4">
      {/* save modal */}
      <SaveModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={saveUserAnswer}
        loading={loading}
      />

      {/* Left Column: Webcam & Controls */}
      <div className="w-full md:w-1/2 flex flex-col gap-4">
        <div className="w-full aspect-video flex flex-col items-center justify-center border p-4 bg-gray-50/50 rounded-lg shadow-sm">
          {isWebCam ? (
            <WebCam
              onUserMedia={() => setIsWebCam(true)}
              onUserMediaError={() => setIsWebCam(false)}
              className="w-full h-full object-cover rounded-md"
            />
          ) : (
            <WebcamIcon className="w-24 h-24 text-muted-foreground" />
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => setIsWebCam(!isWebCam)}
          >
            {isWebCam ? (
              <>
                <VideoOff className="w-4 h-4 text-red-500" />
                <span>Turn Off</span>
              </>
            ) : (
              <>
                <Video className="w-4 h-4 text-emerald-500" />
                <span>Turn On</span>
              </>
            )}
          </Button>

          <Button
            variant={isRecording ? "destructive" : "default"}
            className="flex items-center gap-2"
            onClick={recordUserAnswer}
          >
            {isRecording ? (
              <>
                <CircleStop className="w-4 h-4" />
                <span>Stop Recording</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>Record Answer</span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={recordNewAnswer}
          >
            <RefreshCw className="w-4 h-4 text-sky-500" />
            <span>Record Again</span>
          </Button>

          <Button
            variant="outline"
            className="flex items-center gap-2 hover:bg-emerald-50"
            disabled={!aiResult || isAiGenerating}
            onClick={() => setOpen(!open)}
          >
            {isAiGenerating ? (
              <>
                <Loader className="w-4 h-4 animate-spin text-emerald-500" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-emerald-600" />
                <span>Save Result</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Right Column: Answer Transcript */}
      <div className="w-full md:w-1/2 mt-0 border rounded-lg bg-gray-50 p-6 shadow-sm flex flex-col h-auto min-h-[300px]">
        <h2 className="text-lg font-semibold border-b pb-2 mb-4">Your Answer Transcript</h2>

        <div className="flex-grow overflow-y-auto">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {userAnswer || "Start recording to see your answer transcribed here in real-time."}
          </p>

          {interimResult && (
            <p className="text-sm text-gray-500 mt-4 border-t pt-4">
              <strong>Listening: </strong>
              <span className="italic">{interimResult}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
