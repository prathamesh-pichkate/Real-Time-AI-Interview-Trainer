import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Volume2, VolumeX } from "lucide-react";
import { RecordAnswer } from "./record-answer";
import { Button } from "./ui/button";

interface QuestionSectionProps {
  questions: { question: string; answer: string }[];
}

export const QuestionSection = ({ questions }: QuestionSectionProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isWebCam, setIsWebCam] = useState(false);

  const [currentSpeech, setCurrentSpeech] =
    useState<SpeechSynthesisUtterance | null>(null);

  const handlePlayQuestion = (qst: string) => {
    if (isPlaying && currentSpeech) {
      // stop the speech if already playing
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setCurrentSpeech(null);
    } else {
      if ("speechSynthesis" in window) {
        const speech = new SpeechSynthesisUtterance(qst);
        window.speechSynthesis.speak(speech);
        setIsPlaying(true);
        setCurrentSpeech(speech);

        // handle the speech end
        speech.onend = () => {
          setIsPlaying(false);
          setCurrentSpeech(null);
        };
      }
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <Tabs
        defaultValue={questions[0]?.question}
        className="w-full flex flex-col gap-6"
      >
        <TabsList className="bg-transparent w-full flex flex-wrap items-center justify-start gap-3 h-auto p-0">
          {questions?.map((tab, i) => (
            <TabsTrigger
              className={cn(
                "data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md px-5 py-2.5 rounded-full border border-gray-200 text-sm font-medium transition-all text-gray-600 hover:bg-gray-50 data-[state=active]:hover:bg-emerald-700"
              )}
              key={tab.question}
              value={tab.question}
            >
              Question {i + 1}
            </TabsTrigger>
          ))}
        </TabsList>

        {questions?.map((tab, i) => (
          <TabsContent key={i} value={tab.question} className="mt-0 outline-none">
            <div className="w-full bg-white border rounded-xl p-6 shadow-sm flex flex-col gap-8">
              <div className="flex items-start justify-between gap-6 border-b pb-6">
                <h3 className="text-xl md:text-2xl font-semibold leading-relaxed text-gray-800">
                  {tab.question}
                </h3>

                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 rounded-full h-12 w-12 hover:bg-sky-50 hover:text-sky-600 border-gray-200"
                  onClick={() => handlePlayQuestion(tab.question)}
                  title={isPlaying ? "Stop Audio" : "Listen to Question"}
                >
                  {isPlaying ? (
                    <VolumeX className="w-6 h-6 text-red-500" />
                  ) : (
                    <Volume2 className="w-6 h-6 text-sky-500" />
                  )}
                </Button>
              </div>

              <RecordAnswer
                question={tab}
                isWebCam={isWebCam}
                setIsWebCam={setIsWebCam}
              />
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
