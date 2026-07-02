import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";

import { Interview } from "@/types";

import { CustomBreadCrumb } from "./custom-bread-crumb";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import { Headings } from "./headings";
import { Button } from "./ui/button";
import { Loader, Trash2 } from "lucide-react";
import { Separator } from "./ui/separator";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { chatSession } from "@/scripts";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/config/firebase.config";

interface FormMockInterviewProps {
  initialData: Interview | null;
}

const formSchema = z.object({
  position: z
    .string()
    .min(1, "Position is required")
    .max(100, "Position must be 100 characters or less"),
  description: z.string().min(10, "Description is required"),
  experience: z.coerce
    .number()
    .min(0, "Experience cannot be empty or negative"),
  techStack: z.string().min(1, "Tech stack must be at least a character"),
  difficulty: z.enum(["Easy", "Moderate", "Hard"]).default("Moderate"),
  numQuestions: z.coerce
    .number()
    .min(1, "Minimum 1 question")
    .max(10, "Maximum 10 questions")
    .default(5),
  resumeText: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

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

export const FormMockInterview = ({ initialData }: FormMockInterviewProps) => {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
      ? {
          position: initialData.position,
          description: initialData.description,
          experience: initialData.experience,
          techStack: initialData.techStack,
          difficulty: (initialData.difficulty as "Easy" | "Moderate" | "Hard") || "Moderate",
          numQuestions: initialData.numQuestions || 5,
          resumeText: initialData.resumeText || "",
        }
      : {
          position: "",
          description: "",
          experience: 0,
          techStack: "",
          difficulty: "Moderate",
          numQuestions: 5,
          resumeText: "",
        },
  });

  const { isValid, isSubmitting } = form.formState;
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { userId } = useAuth();
  const control = form.control as any;

  const title = initialData
    ? initialData.position
    : "Create a new mock interview";

  const breadCrumpPage = initialData ? initialData?.position : "Create";
  const actions = initialData ? "Save Changes" : "Create";
  const toastMessage = initialData
    ? { title: "Updated..!", description: "Changes saved successfully..." }
    : { title: "Created..!", description: "New Mock Interview created..." };

  const cleanAiResponse = (responseText: string) => {
    // Step 1: Trim any surrounding whitespace
    let cleanText = responseText.trim();

    // Step 2: Remove any occurrences of "json" or code block symbols (``` or `)
    cleanText = cleanText.replace(/(json|```|`)/g, "");

    // Step 3: Extract a JSON array by capturing text between square brackets
    const jsonArrayMatch = cleanText.match(/\[.*\]/s);
    if (jsonArrayMatch) {
      cleanText = jsonArrayMatch[0];
    } else {
      throw new Error("No JSON array found in response");
    }

    // Step 4: Parse the clean JSON text into an array of objects
    try {
      return JSON.parse(cleanText);
    } catch (error) {
      throw new Error("Invalid JSON format: " + (error as Error)?.message);
    }
  };

  const generateAiResponse = async (data: FormData) => {
    let resumeContext = "";
    if (data.resumeText && data.resumeText.trim().length > 0) {
      resumeContext = `
        - Candidate Resume Details: 
        """
        ${data.resumeText}
        """
        The questions MUST be heavily tailored to the candidate's actual projects, specific tech stacks, and experiences found in their resume.
      `;
    }

    const prompt = `
        As an experienced technical interviewer and prompt engineer, generate a JSON array containing exactly ${data?.numQuestions} technical interview questions along with detailed answers.
        
        Job / Target Position Information:
        - Job Position: ${data?.position}
        - Job Description: ${data?.description}
        - Years of Experience Required: ${data?.experience} years
        - Tech Stacks: ${data?.techStack}
        - Difficulty Level Selected: ${data?.difficulty}
        ${resumeContext}

        CRITICAL DIFFICULTY CALIBRATION RULES:
        - If Difficulty Level is "Easy": The questions MUST be fundamental, basic, and introductory. Focus on core syntax, primary features, and basic rules of the technologies. DO NOT ask complex system design, deep optimization, or advanced architectural questions, even if the experience is high. Keep them accessible and basic.
        - If Difficulty Level is "Moderate": The questions should be of intermediate difficulty. Focus on practical implementation, standard error handling, medium-complexity scenarios, and typical design choices.
        - If Difficulty Level is "Hard": The questions must be advanced, challenging, and deep. Focus on system design, performance tuning, memory management, scale, security, and edge-case debugging.

        Output Format:
        Return the result strictly as a clean JSON array of objects without any surrounding markdown code blocks, labels, or extra text. Each object must have "question" and "answer" fields:
        [
          { "question": "<Question text>", "answer": "<Answer text>" },
          ...
        ]
    `;

    try {
      // chatSession.sendMessage now returns string directly (already text response)
      const responseText = await chatSession.sendMessage(prompt);
      
      // Validate response is not empty
      if (!responseText || responseText.trim() === "") {
        throw new Error("Empty response from AI service");
      }
      
      // Check for error messages
      if (responseText.includes("Something went wrong")) {
        throw new Error("Gemini API service temporarily unavailable");
      }
      
      // Parse and clean the JSON response
      const cleanedResponse = cleanAiResponse(responseText);
      return cleanedResponse;
    } catch (error) {
      console.error("AI Response Error:", error);
      throw new Error(
        error instanceof Error 
          ? error.message 
          : "Failed to generate interview questions. Please try again."
      );
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      if (initialData) {
        // update
        if (isValid) {
          const aiResult = await generateAiResponse(data);

          await updateDoc(doc(db, "interviews", initialData?.id), {
            questions: aiResult,
            resumeText: data.resumeText || "",
            ...data,
            updatedAt: serverTimestamp(),
          }).catch((error) => console.log(error));
          toast(toastMessage.title, { description: toastMessage.description });
        }
      } else {
        // create a new mock interview
        if (isValid) {
          const aiResult = await generateAiResponse(data);

          await addDoc(collection(db, "interviews"), {
            ...data,
            resumeText: data.resumeText || "",
            userId,
            questions: aiResult,
            createdAt: serverTimestamp(),
          });

          toast(toastMessage.title, { description: toastMessage.description });
        }
      }

      navigate("/generate", { replace: true });
    } catch (error) {
      console.log(error);
      toast.error("Error..", {
        description: `Something went wrong. Please try again later`,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialData) {
      form.reset({
        position: initialData.position,
        description: initialData.description,
        experience: initialData.experience,
        techStack: initialData.techStack,
        difficulty: (initialData.difficulty as "Easy" | "Moderate" | "Hard") || "Moderate",
        numQuestions: initialData.numQuestions || 5,
        resumeText: initialData.resumeText || "",
      });
    }
  }, [initialData, form]);

  return (
    <div className="w-full flex-col space-y-4">
      <CustomBreadCrumb
        breadCrumbPage={breadCrumpPage}
        breadCrumpItems={[{ label: "Mock Interviews", link: "/generate" }]}
      />

      <div className="mt-4 flex items-center justify-between w-full">
        <Headings title={title} isSubHeading />

        {initialData && (
          <Button size={"icon"} variant={"ghost"}>
            <Trash2 className="min-w-4 min-h-4 text-red-500" />
          </Button>
        )}
      </div>

      <Separator className="my-4" />

      <div className="my-6"></div>

      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full p-8 rounded-lg flex-col flex items-start justify-start gap-6 shadow-md "
        >
          <FormField
            control={control}
            name="position"
            render={({ field }) => (
              <FormItem className="w-full space-y-4">
                <div className="w-full flex items-center justify-between">
                  <FormLabel>Job Role / Job Position</FormLabel>
                  <FormMessage className="text-sm" />
                </div>
                <FormControl>
                  <Input
                    className="h-12"
                    disabled={loading}
                    placeholder="eg:- Full Stack Developer"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="description"
            render={({ field }) => (
              <FormItem className="w-full space-y-4">
                <div className="w-full flex items-center justify-between">
                  <FormLabel>Job Description</FormLabel>
                  <FormMessage className="text-sm" />
                </div>
                <FormControl>
                  <Textarea
                    className="h-12"
                    disabled={loading}
                    placeholder="eg:- describle your job role"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="experience"
            render={({ field }) => (
              <FormItem className="w-full space-y-4">
                <div className="w-full flex items-center justify-between">
                  <FormLabel>Years of Experience</FormLabel>
                  <FormMessage className="text-sm" />
                </div>
                <FormControl>
                  <Input
                    type="number"
                    className="h-12"
                    disabled={loading}
                    placeholder="eg:- 5 Years"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="techStack"
            render={({ field }) => (
              <FormItem className="w-full space-y-4">
                <div className="w-full flex items-center justify-between">
                  <FormLabel>Tech Stacks</FormLabel>
                  <FormMessage className="text-sm" />
                </div>
                <FormControl>
                  <Textarea
                    className="h-12"
                    disabled={loading}
                    placeholder="eg:- React, Typescript..."
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Resume Upload Section */}
          <div className="w-full space-y-4 border border-dashed border-gray-200 rounded-lg p-5 bg-gray-50/50">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-gray-800">📄 Upload Resume (Optional)</span>
              <p className="text-xs text-gray-500">Upload your PDF or TXT resume to customize mock interview questions strictly based on your work history and profile.</p>
            </div>
            <Input
              type="file"
              accept=".pdf,.txt"
              disabled={loading}
              className="h-12 cursor-pointer pt-2 bg-white"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                setLoading(true);
                const toastId = toast.loading("Uploading and parsing resume...");
                try {
                  let text = "";
                  if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
                    text = await parsePdfFile(file);
                  } else {
                    text = await new Promise<string>((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onload = (event) => resolve(event.target?.result as string || "");
                      reader.onerror = (err) => reject(err);
                      reader.readAsText(file);
                    });
                  }
                  
                  if (!text || text.trim().length === 0) {
                    throw new Error("Could not extract any text from the file.");
                  }

                  form.setValue("resumeText", text, { shouldValidate: true, shouldDirty: true });
                  toast.success("Resume parsed successfully! Questions will be tailored to your background.", { id: toastId });
                } catch (err) {
                  console.error(err);
                  toast.error("Failed to parse resume. You can still paste details below manually.", { id: toastId });
                } finally {
                  setLoading(false);
                }
              }}
            />
          </div>

          <FormField
            control={control}
            name="resumeText"
            render={({ field }) => (
              <FormItem className="w-full space-y-4">
                <div className="w-full flex items-center justify-between">
                  <FormLabel>Paste Resume Details / Extracted Text (Optional)</FormLabel>
                  <FormMessage className="text-sm" />
                </div>
                <FormControl>
                  <Textarea
                    className="min-h-[120px]"
                    disabled={loading}
                    placeholder="If you don't upload a PDF, copy-paste your resume summary or skills directly here..."
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="flex w-full gap-4 flex-col md:flex-row">
            <FormField
              control={control}
              name="difficulty"
              render={({ field }) => (
                <FormItem className="w-full space-y-4">
                  <div className="w-full flex items-center justify-between">
                    <FormLabel>Difficulty Level</FormLabel>
                    <FormMessage className="text-sm" />
                  </div>
                  <FormControl>
                    <select
                      disabled={loading}
                      {...field}
                      className="flex h-12 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Moderate">Moderate</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="numQuestions"
              render={({ field }) => (
                <FormItem className="w-full space-y-4">
                  <div className="w-full flex items-center justify-between">
                    <FormLabel>Number of Questions</FormLabel>
                    <FormMessage className="text-sm" />
                  </div>
                  <FormControl>
                    <Input
                      type="number"
                      className="h-12"
                      disabled={loading}
                      placeholder="e.g. 5"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="w-full flex items-center justify-end gap-6">
            <Button
              type="reset"
              size={"sm"}
              variant={"outline"}
              disabled={isSubmitting || loading}
            >
              Reset
            </Button>
            <Button
              type="submit"
              size={"sm"}
              disabled={isSubmitting || !isValid || loading}
            >
              {loading ? (
                <Loader className="text-gray-50 animate-spin" />
              ) : (
                actions
              )}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};
