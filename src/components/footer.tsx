import React from "react";

import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react"; // Import Lucide icons
import { Link } from "react-router-dom";
import { Container } from "@/components/container";
import { MainRoutes } from "@/lib/helpers";

interface SocialLinkProps {
  href: string;
  icon: React.ReactNode;
  hoverColor: string;
}

const SocialLink: React.FC<SocialLinkProps> = ({ href, icon, hoverColor }) => {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`hover:${hoverColor}`}
    >
      {icon}
    </a>
  );
};

interface FooterLinkProps {
  to: string;
  children: React.ReactNode;
}

const FooterLink: React.FC<FooterLinkProps> = ({ to, children }) => {
  return (
    <li>
      <Link
        to={to}
        className="hover:underline text-gray-300 hover:text-gray-100"
      >
        {children}
      </Link>
    </li>
  );
};

export const Footer = () => {
  return (
    <div className="w-full bg-black text-gray-300 py-12">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* First Column: Links */}
          <div>
            <h3 className="font-bold text-xl mb-6 text-white">Quick Links</h3>
            <ul className="space-y-3">
              {MainRoutes.map((route) => (
                <FooterLink key={route.href} to={route.href}>
                  {route.label}
                </FooterLink>
              ))}
            </ul>
          </div>

          {/* Second Column: About Us */}
          <div className="col-span-1 md:col-span-1">
            <h3 className="font-bold text-xl mb-6 text-white">About Us</h3>
            <p className="leading-relaxed text-sm text-gray-400">
              We are committed to helping you unlock your full potential with
              AI-powered tools. Our platform offers a wide range of resources to
              improve your interview skills and chances of success. Founded by industry experts, our mission is to make premium, high-quality interview preparation accessible to everyone, anywhere in the world.
            </p>
          </div>

          {/* Third Column: Services */}
          <div>
            <h3 className="font-bold text-xl mb-6 text-white">Our Services</h3>
            <ul className="space-y-3 text-sm">
              <FooterLink to="/services/mock-interviews">
                AI Mock Interviews
              </FooterLink>
              <FooterLink to="/services/technical-assessment">
                Technical Assessments
              </FooterLink>
              <FooterLink to="/services/career-coaching">
                Career Coaching
              </FooterLink>
              <FooterLink to="/services/resume-building">
                Resume Building
              </FooterLink>
              <FooterLink to="/services/salary-negotiation">
                Salary Negotiation Tips
              </FooterLink>
            </ul>
          </div>
        </div>

        {/* Bottom Social Media Bar */}
        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} AI Superpower. All rights reserved.
          </p>
          <div className="flex gap-6">
            <SocialLink
              href="https://facebook.com"
              icon={<Facebook size={20} />}
              hoverColor="text-blue-500"
            />
            <SocialLink
              href="https://twitter.com"
              icon={<Twitter size={20} />}
              hoverColor="text-blue-400"
            />
            <SocialLink
              href="https://instagram.com"
              icon={<Instagram size={20} />}
              hoverColor="text-pink-500"
            />
            <SocialLink
              href="https://linkedin.com"
              icon={<Linkedin size={20} />}
              hoverColor="text-blue-700"
            />
          </div>
        </div>
      </Container>
    </div>
  );
};
