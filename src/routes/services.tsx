import { Container } from "@/components/container";
import { BrainCircuit, FileText, Compass, Briefcase, Handshake } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const ServicesPage = () => {
  const services = [
    {
      icon: <BrainCircuit className="w-8 h-8 text-blue-600" />,
      title: "AI Mock Interviews",
      description: "Experience hyper-realistic interview scenarios tailored to your target role. Our AI acts as the interviewer, evaluating your spoken answers in real-time.",
      bg: "bg-blue-50"
    },
    {
      icon: <FileText className="w-8 h-8 text-emerald-600" />,
      title: "Technical Assessments",
      description: "Practice coding algorithms, system design, and architecture questions with a built-in feedback loop that highlights edge cases you missed.",
      bg: "bg-emerald-50"
    },
    {
      icon: <Compass className="w-8 h-8 text-purple-600" />,
      title: "Career Coaching",
      description: "Get personalized roadmaps based on your current skill level and target company, outlining exactly what you need to study.",
      bg: "bg-purple-50"
    },
    {
      icon: <Briefcase className="w-8 h-8 text-orange-600" />,
      title: "Resume Building",
      description: "Analyze your resume against job descriptions. Our AI suggests bullet point improvements to get you past ATS screeners.",
      bg: "bg-orange-50"
    },
    {
      icon: <Handshake className="w-8 h-8 text-rose-600" />,
      title: "Salary Negotiation",
      description: "Learn strategies to negotiate your compensation package confidently, complete with role-playing scenarios.",
      bg: "bg-rose-50"
    }
  ];

  return (
    <div className="flex-col w-full pb-24 bg-gray-50/50 min-h-screen">
      <Container className="py-20">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6">
            Our Services
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Everything you need to land your dream job, all in one place. We offer a comprehensive suite of AI-powered tools designed to accelerate your career growth.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div key={index} className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className={`p-4 ${service.bg} rounded-2xl w-fit mb-6`}>
                {service.icon}
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">{service.title}</h3>
              <p className="text-muted-foreground leading-relaxed mb-8">
                {service.description}
              </p>
              <Link to="/generate">
                <Button variant="outline" className="w-full rounded-xl hover:bg-slate-900 hover:text-white transition-colors py-6 font-semibold">
                  Get Started
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
};
