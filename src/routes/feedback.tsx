import { db } from "@/config/firebase.config";
import { Interview, UserAnswer } from "@/types";
import { useAuth } from "@clerk/clerk-react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { LoaderPage } from "./loader-page";
import { CustomBreadCrumb } from "@/components/custom-bread-crumb";
import { Headings } from "@/components/headings";
import { InterviewPin } from "@/components/pin";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { CircleCheck, Star, Sparkles, Smile } from "lucide-react";
import { Card, CardDescription, CardTitle, CardHeader, CardContent } from "@/components/ui/card";

export const Feedback = () => {
  const { interviewId } = useParams<{ interviewId: string }>();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feedbacks, setFeedbacks] = useState<UserAnswer[]>([]);
  const [activeFeed, setActiveFeed] = useState("");
  const { userId } = useAuth();
  const navigate = useNavigate();

  if (!interviewId) {
    navigate("/generate", { replace: true });
  }
  useEffect(() => {
    if (interviewId) {
      const fetchInterview = async () => {
        if (interviewId) {
          try {
            const interviewDoc = await getDoc(
              doc(db, "interviews", interviewId)
            );
            if (interviewDoc.exists()) {
              setInterview({
                id: interviewDoc.id,
                ...interviewDoc.data(),
              } as Interview);
            }
          } catch (error) {
            console.log(error);
          }
        }
      };

      const fetchFeedbacks = async () => {
        setIsLoading(true);
        try {
          const querSanpRef = query(
            collection(db, "userAnswers"),
            where("userId", "==", userId),
            where("mockIdRef", "==", interviewId)
          );

          const querySnap = await getDocs(querSanpRef);

          const interviewData: UserAnswer[] = querySnap.docs.map((doc) => {
            return { id: doc.id, ...doc.data() } as UserAnswer;
          });

          setFeedbacks(interviewData);
        } catch (error) {
          console.log(error);
          toast("Error", {
            description: "Something went wrong. Please try again later..",
          });
        } finally {
          setIsLoading(false);
        }
      };
      fetchInterview();
      fetchFeedbacks();
    }
  }, [interviewId, navigate, userId]);

  //   calculate the ratings out of 10

  const overAllRating = useMemo(() => {
    if (feedbacks.length === 0) return "0.0";

    const totalRatings = feedbacks.reduce(
      (acc, feedback) => acc + feedback.rating,
      0
    );

    return (totalRatings / feedbacks.length).toFixed(1);
  }, [feedbacks]);

  if (isLoading) {
    return <LoaderPage className="w-full h-[70vh]" />;
  }

  return (
    <div className="flex flex-col w-full gap-8 py-5">
      <div className="flex items-center justify-between w-full gap-2">
        <CustomBreadCrumb
          breadCrumbPage={"Feedback"}
          breadCrumpItems={[
            { label: "Mock Interviews", link: "/generate" },
            {
              label: `${interview?.position}`,
              link: `/generate/interview/${interview?.id}`,
            },
          ]}
        />
      </div>

      <Headings
        title="Congratulations !"
        description="Your personalized feedback is now available. Dive in to see your strengths, areas for improvement, and tips to help you ace your next interview."
      />

      <p className="text-base text-muted-foreground">
        Your overall interview ratings :{" "}
        <span className="text-emerald-500 font-semibold text-xl">
          {overAllRating} / 10
        </span>
      </p>

      {interview && <InterviewPin interview={interview} onMockPage />}

      {/* Behavioral & Composure Analysis Section */}
      {interview?.behaviorMetrics && (
        <Card className="border border-purple-100 shadow-md bg-gradient-to-br from-white to-purple-50/20 overflow-hidden">
          <CardHeader className="bg-purple-50/50 border-b pb-4">
            <CardTitle className="text-lg font-bold text-purple-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600 animate-pulse" />
              <span>AI Behavioral & Gaze Composure Analysis</span>
            </CardTitle>
            <CardDescription className="text-xs text-purple-700 mt-0.5">
              Real-time facial expression and gaze tracking metrics captured during the interview.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Emotion Metrics */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Smile className="w-4 h-4 text-emerald-600" />
                  <span>Facial Expression Distribution</span>
                </h4>
                <div className="space-y-3">
                  {Object.entries(interview.behaviorMetrics.emotions).map(([emotion, val]) => {
                    const getEmotionLabel = (e: string) => {
                      switch (e) {
                        case "happy": return "Smiling / Warm";
                        case "neutral": return "Focused / Neutral";
                        case "surprised": return "Expressive / Surprised";
                        case "sad": return "Concerned";
                        case "fearful": return "Anxious";
                        case "angry": return "Stressed";
                        default: return e;
                      }
                    };

                    const getEmotionColor = (e: string) => {
                      switch (e) {
                        case "happy": return "bg-amber-400";
                        case "neutral": return "bg-emerald-500";
                        case "surprised": return "bg-sky-400";
                        case "sad": return "bg-purple-400";
                        case "fearful": return "bg-yellow-500";
                        case "angry": return "bg-rose-500";
                        default: return "bg-gray-400";
                      }
                    };

                    return (
                      <div key={emotion} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-gray-600 uppercase">
                          <span>{getEmotionLabel(emotion)}</span>
                          <span>{val}%</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", getEmotionColor(emotion))}
                            style={{ width: `${val}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Physical presence & gaze warnings */}
              <div className="flex flex-col justify-between gap-4">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <CircleCheck className="w-4 h-4 text-purple-600" />
                    <span>Communication & Integrity Indicators</span>
                  </h4>
                  <div className="p-4 rounded-lg border bg-white space-y-3.5 shadow-sm">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium">Gaze Out-of-Bounds warnings:</span>
                      <span className={cn(
                        "font-semibold px-2 py-0.5 rounded text-xs",
                        interview.behaviorMetrics.warningsCount > 3 ? "bg-red-100 text-red-700" : interview.behaviorMetrics.warningsCount > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                      )}>
                        {interview.behaviorMetrics.warningsCount} warnings
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium">Camera Alignment Score:</span>
                      <span className={cn(
                        "font-semibold",
                        interview.behaviorMetrics.warningsCount > 5 ? "text-red-500" : interview.behaviorMetrics.warningsCount > 2 ? "text-amber-500" : "text-emerald-500"
                      )}>
                        {interview.behaviorMetrics.warningsCount > 5 ? "Needs Improvement" : interview.behaviorMetrics.warningsCount > 2 ? "Moderate Compliance" : "Excellent Composure"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Behavioral Feedback Text */}
            {interview.behaviorMetrics.behavioralFeedback && (
              <Card className="border-none space-y-3 p-4 bg-purple-50/50 rounded-lg shadow-sm">
                <CardTitle className="flex items-center text-base font-bold text-purple-900">
                  <Sparkles className="mr-2 text-purple-600 w-4 h-4" />
                  AI Interview Coach Recommendations
                </CardTitle>
                <CardDescription className="font-medium text-purple-950 text-sm leading-relaxed whitespace-pre-wrap">
                  {interview.behaviorMetrics.behavioralFeedback}
                </CardDescription>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      <Headings title="Interview Feedback" isSubHeading />

      {feedbacks && (
        <Accordion type="single" collapsible className="space-y-6">
          {feedbacks.map((feed) => (
            <AccordionItem
              key={feed.id}
              value={feed.id}
              className="border rounded-lg shadow-md"
            >
              <AccordionTrigger
                onClick={() => setActiveFeed(feed.id)}
                className={cn(
                  "px-5 py-3 flex items-center justify-between text-base rounded-t-lg transition-colors hover:no-underline",
                  activeFeed === feed.id
                    ? "bg-gradient-to-r from-purple-50 to-blue-50"
                    : "hover:bg-gray-50"
                )}
              >
                <span>{feed.question}</span>
              </AccordionTrigger>

              <AccordionContent className="px-5 py-6 bg-white rounded-b-lg space-y-5 shadow-inner">
                <div className="text-lg font-semibold to-gray-700">
                  <Star className="inline mr-2 text-yellow-400" />
                  Rating : {feed.rating}
                </div>

                <Card className="border-none space-y-3 p-4 bg-green-50 rounded-lg shadow-md">
                  <CardTitle className="flex items-center text-lg">
                    <CircleCheck className="mr-2 text-green-600" />
                    Expected Answer
                  </CardTitle>

                  <CardDescription className="font-medium text-gray-700">
                    {feed.correct_ans}
                  </CardDescription>
                </Card>

                <Card className="border-none space-y-3 p-4 bg-yellow-50 rounded-lg shadow-md">
                  <CardTitle className="flex items-center text-lg">
                    <CircleCheck className="mr-2 text-yellow-600" />
                    Your Answer
                  </CardTitle>

                  <CardDescription className="font-medium text-gray-700">
                    {feed.user_ans}
                  </CardDescription>
                </Card>

                <Card className="border-none space-y-3 p-4 bg-red-50 rounded-lg shadow-md">
                  <CardTitle className="flex items-center text-lg">
                    <CircleCheck className="mr-2 text-red-600" />
                    Feedback
                  </CardTitle>

                  <CardDescription className="font-medium text-gray-700">
                    {feed.feedback}
                  </CardDescription>
                </Card>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
};
