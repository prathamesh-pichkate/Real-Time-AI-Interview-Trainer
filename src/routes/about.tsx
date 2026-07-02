import { Container } from "@/components/container";
import { Users, Target, Shield } from "lucide-react";

export const AboutPage = () => {
  return (
    <div className="flex-col w-full pb-24 bg-gray-50/50 min-h-screen">
      <Container className="py-20">
        <div className="flex flex-col items-center text-center space-y-6 max-w-3xl mx-auto mb-20">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900">
            About <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-sky-600">AI Superpower</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            We believe that everyone deserves a fair shot at their dream job. Our mission is to democratize interview preparation by providing accessible, high-quality, AI-driven practice tools that empower candidates worldwide.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center mb-24">
          <img 
            src="/assets/img/office.jpg" 
            alt="Team collaborating" 
            className="w-full rounded-3xl shadow-2xl object-cover h-[450px]"
          />
          <div className="space-y-6 text-left">
            <h2 className="text-3xl font-bold text-slate-900">Our Story</h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Founded by a team of passionate software engineers and industry professionals, AI Superpower was born out of frustration with the traditional, opaque interview process. We saw countless talented individuals fail technical interviews not because they lacked skills, but because they lacked realistic practice and confidence.
            </p>
            <p className="text-muted-foreground text-lg leading-relaxed">
              By harnessing the power of advanced Large Language Models, we've created a platform that simulates real-world interview pressure, providing objective, actionable feedback to help you master your next interview.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:shadow-lg transition-shadow duration-300">
            <div className="p-5 bg-emerald-50 rounded-2xl mb-6">
              <Target className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-slate-900">Our Mission</h3>
            <p className="text-muted-foreground leading-relaxed">To equip every job seeker with the tools, practice, and confidence needed to ace any interview.</p>
          </div>

          <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:shadow-lg transition-shadow duration-300">
            <div className="p-5 bg-sky-50 rounded-2xl mb-6">
              <Users className="w-10 h-10 text-sky-600" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-slate-900">Community First</h3>
            <p className="text-muted-foreground leading-relaxed">We build with our users in mind, constantly updating our question banks based on real-world industry trends.</p>
          </div>

          <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:shadow-lg transition-shadow duration-300">
            <div className="p-5 bg-purple-50 rounded-2xl mb-6">
              <Shield className="w-10 h-10 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-slate-900">Unbiased Feedback</h3>
            <p className="text-muted-foreground leading-relaxed">Our AI evaluates answers purely on technical merit and accuracy, removing human bias from the equation.</p>
          </div>
        </div>
      </Container>
    </div>
  );
};
