import { Interview } from "@/types";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "./ui/badge";
import { Eye, Newspaper, Sparkles, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/config/firebase.config";
import { toast } from "sonner";

interface InterviewPinProps {
  interview: Interview;
  onMockPage?: boolean;
}

export const InterviewPin = ({
  interview,
  onMockPage = false,
}: InterviewPinProps) => {
  const navigate = useNavigate();

  const onDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this mock interview?")) {
      try {
        await deleteDoc(doc(db, "interviews", interview.id));
        toast.success("Interview deleted successfully!");
      } catch (error) {
        console.error(error);
        toast.error("Failed to delete the interview. Please try again.");
      }
    }
  };

  return (
    <Card className="p-5 rounded-md shadow-none border border-gray-100 hover:border-gray-200 hover:shadow-sm cursor-pointer transition-all flex flex-col gap-4 w-full bg-white">
      {/* Top Section: Title & Date */}
      <div className="flex items-center justify-between w-full">
        <CardTitle className="text-xl line-clamp-1">{interview?.position}</CardTitle>
        <p className="text-sm text-muted-foreground whitespace-nowrap bg-gray-50 px-2 py-1 rounded-md border border-gray-100 hidden md:block">
          {new Date(interview?.createdAt.toDate()).toLocaleDateString("en-US", { dateStyle: "medium" })}
        </p>
      </div>
      
      {/* Middle Section: Description */}
      <CardDescription className="line-clamp-2 text-sm text-gray-500">
        {interview?.description}
      </CardDescription>
      
      {/* Separator */}
      <div className="h-[1px] w-full bg-gray-100 my-1" />
      
      {/* Bottom Section: Tech Stack & Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full">
        {/* Tech Stack */}
        <div className="flex items-center gap-2 flex-wrap flex-grow overflow-hidden">
          {interview?.techStack.split(",").slice(0, 4).map((word, index) => (
            <Badge
              key={index}
              variant={"secondary"}
              className="text-xs font-normal text-muted-foreground bg-gray-100/50"
            >
              {word}
            </Badge>
          ))}
          {interview?.techStack.split(",").length > 4 && (
            <Badge variant={"outline"} className="text-xs text-muted-foreground font-normal">
              +{interview?.techStack.split(",").length - 4} more
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        {!onMockPage && (
          <div className="flex items-center gap-2 flex-wrap shrink-0 w-full md:w-auto justify-start sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="flex items-center gap-1.5 hover:text-red-600 hover:bg-red-50 hover:border-red-200 text-red-500"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/generate/${interview?.id}`, { replace: true });
              }}
              className="flex items-center gap-1.5 hover:text-sky-600 hover:bg-sky-50"
            >
              <Eye className="w-4 h-4" /> View
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/generate/feedback/${interview?.id}`, { replace: true });
              }}
              className="flex items-center gap-1.5 hover:text-yellow-600 hover:bg-yellow-50"
            >
              <Newspaper className="w-4 h-4" /> Feedback
            </Button>
            
            <Button
              variant="default"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/generate/interview/${interview?.id}`, { replace: true });
              }}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Sparkles className="w-4 h-4" /> Start
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
