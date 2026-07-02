import { Sparkles, Brain, Code, Target, LineChart, MessageSquare, Briefcase } from "lucide-react";
import Marquee from "react-fast-marquee";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { MarqueImg } from "@/components/marquee-img";
import { Link } from "react-router-dom";

const HomePage = () => {
  return (
    <div className="flex-col w-full pb-24">
      <Container>
        <div className="my-8">
          <h2 className="text-3xl text-center md:text-left md:text-6xl">
            <span className=" text-outline font-extrabold md:text-8xl">
              AI Superpower
            </span>
            <span className="text-gray-500 font-extrabold">
              - A better way to
            </span>
            <br />
            improve your interview chances and skills
          </h2>

          <p className="mt-4 text-muted-foreground text-sm max-w-2xl text-center mx-auto md:mx-0 md:text-left">
            Boost your interview skills and increase your success rate with
            AI-driven insights. Discover a smarter way to prepare, practice, and
            stand out.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4">
            <Link to="/generate">
              <Button className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-6 text-lg font-bold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                Start Your Interview <Sparkles className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex w-full items-center justify-evenly md:px-12 md:py-16 md:items-center md:justify-end gap-12">
          <p className="text-3xl font-semibold text-gray-900 text-center">
            250k+
            <span className="block text-xl text-muted-foreground font-normal">
              Offers Received
            </span>
          </p>
          <p className="text-3xl font-semibold text-gray-900 text-center">
            1.2M+
            <span className="block text-xl text-muted-foreground font-normal">
              Interview Aced
            </span>
          </p>
        </div>

        {/* image section */}
        <div className="w-full mt-4 rounded-xl bg-gray-100 h-[420px] drop-shadow-md overflow-hidden relative">
          <img
            src="/assets/img/hero.jpg"
            alt=""
            className="w-full h-full object-cover"
          />

          <div className="absolute top-4 left-4 px-4 py-2 rounded-md bg-white/40 backdrop-blur-md">
            Inteviews Copilot&copy;
          </div>

          <div className="hidden md:block absolute w-80 bottom-4 right-4 px-5 py-4 rounded-xl bg-white/85 backdrop-blur-md border border-white/50 shadow-2xl">
            <h2 className="text-neutral-900 font-bold mb-2 text-lg">Software Engineer</h2>
            <p className="text-sm text-neutral-600 mb-4 leading-relaxed">
              Practice coding interviews with real-time AI feedback. Master algorithms, system design, and behavioral questions.
            </p>

            <Link to="/generate">
              <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white transition-all duration-300 shadow-lg hover:shadow-xl py-5 text-md font-semibold">
                Generate Mock Interview <Sparkles className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </Container>

      {/* marquee section */}
      <div className=" w-full my-12">
        <Marquee pauseOnHover>
          <MarqueImg img="/assets/img/logo/firebase.png" />
          <MarqueImg img="/assets/img/logo/meet.png" />
          <MarqueImg img="/assets/img/logo/zoom.png" />
          <MarqueImg img="/assets/img/logo/firebase.png" />
          <MarqueImg img="/assets/img/logo/microsoft.png" />
          <MarqueImg img="/assets/img/logo/meet.png" />
          <MarqueImg img="/assets/img/logo/tailwindcss.png" />
          <MarqueImg img="/assets/img/logo/microsoft.png" />
        </Marquee>
      </div>

      {/* How it Works Section */}
      <Container className="py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Master your interviews in three simple, intuitive steps designed to accelerate your career.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: <Target className="w-8 h-8 text-blue-600" />,
              title: "1. Select Role & Skills",
              desc: "Choose the job role, experience level, and specific skills you want to be tested on.",
            },
            {
              icon: <Brain className="w-8 h-8 text-purple-600" />,
              title: "2. AI Mock Interview",
              desc: "Engage in a realistic interview scenario with our advanced AI tailored to your profile.",
            },
            {
              icon: <LineChart className="w-8 h-8 text-emerald-600" />,
              title: "3. Get Detailed Feedback",
              desc: "Receive comprehensive analytics, actionable insights, and suggested answers to improve.",
            },
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col items-center text-center p-8 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300">
              <div className="p-4 bg-gray-50 rounded-full mb-6">
                {item.icon}
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-800">{item.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </Container>

      {/* Features Section */}
      <Container className="py-20 bg-gray-50 rounded-[2.5rem] my-8 px-8 md:px-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900">Why Choose AI Superpower?</h2>
          <p className="text-muted-foreground mt-3">Everything you need to land your dream job</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { icon: <MessageSquare className="w-6 h-6" />, title: "Realistic Conversations", desc: "Natural voice and text interactions that simulate real human interviews." },
            { icon: <Code className="w-6 h-6" />, title: "Coding Environment", desc: "Built-in code editor for technical and algorithmic problem-solving." },
            { icon: <Briefcase className="w-6 h-6" />, title: "Industry Standard", desc: "Questions sourced from top tech companies and real interview processes." },
            { icon: <LineChart className="w-6 h-6" />, title: "Performance Metrics", desc: "Track your progress over time and identify areas that need more practice." },
          ].map((feature, idx) => (
            <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:-translate-y-2 transition-transform duration-300">
              <div className="w-14 h-14 bg-slate-900 text-white rounded-xl flex items-center justify-center mb-6 shadow-md">
                {feature.icon}
              </div>
              <h3 className="font-bold text-lg mb-3 text-gray-800">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </Container>

      {/* Call to action banner */}
      <Container className="py-16 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mt-8 bg-slate-900 rounded-[2.5rem] overflow-hidden p-3 shadow-2xl">
          <div className="col-span-1 md:col-span-3 h-full">
            <img
              src="/assets/img/office.jpg"
              alt="Office environment"
              className="w-full h-full min-h-[350px] md:min-h-[450px] rounded-[2rem] object-cover"
            />
          </div>

          <div className="col-span-1 md:col-span-2 flex flex-col items-center justify-center text-center p-8 md:p-12">
            <h2 className="tracking-wide text-2xl md:text-3xl text-white font-bold mb-6">
              Unleash your potential today
            </h2>
            <p className="text-center text-gray-300 mb-10 text-lg leading-relaxed">
              Transform the way you prepare, gain confidence, and boost your
              chances of landing your dream job. Let AI be your edge in
              today&apos;s competitive job market.
            </p>

            <Link to="/generate" className="w-full max-w-sm">
              <Button className="w-full bg-white text-slate-900 hover:bg-gray-100 text-lg py-7 font-bold shadow-xl transition-all duration-300 hover:scale-[1.02]">
                Start Practicing <Sparkles className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default HomePage;
