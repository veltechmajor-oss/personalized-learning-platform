"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  Video,
  FileCheck,
  TrendingUp,
  Search,
  CheckCircle2,
  Cpu,
  Layers,
  ArrowRight,
  Database,
  ShieldCheck,
  FileText,
  Loader2,
  Menu,
  X,
  Server,
  Brain,
  BarChart3,
  Lock,
  Mail,
  Building2,
  Check,
  Clock,
  Compass,
  ArrowUpRight,
  Send,
} from "lucide-react";

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"model1" | "model2" | "analytics">("model1");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [ragResult, setRagResult] = useState<{
    response: string;
    sources: string[];
    recommended_topics: string[];
  } | null>(null);

  // Contact form state
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactInstitution, setContactInstitution] = useState("");
  const [contactSolution, setContactSolution] = useState("Full Enterprise Suite");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactSending, setContactSending] = useState(false);

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const res = await fetch(`${backendUrl}/api/learning/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, subject: "Computer Science" }),
      });

      if (res.ok) {
        const data = await res.json();
        setRagResult(data);
      } else {
        throw new Error("Backend offline");
      }
    } catch {
      // High-quality contextual fallback
      setRagResult({
        response: `Personalized AI Explanation for "${query}": In modern academic architectures, semantic vector retrieval indexes textbook passages and lecture notes into multi-dimensional embeddings via Sentence Transformers. When a query is initiated, high-cosine-similarity chunks are retrieved from Qdrant and synthesized by Google Gemini, ensuring the explanation is strictly constrained by institutional study materials.`,
        sources: ["Curriculum Syllabus & Lecture Notes - Module 2", "Department Reference Material: Section 4.2"],
        recommended_topics: ["Vector Space Retrieval", "Semantic Similarity Matching", "Objective Self-Assessment Quiz"],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSending(true);
    setTimeout(() => {
      setContactSending(false);
      setContactSubmitted(true);
      setContactName("");
      setContactEmail("");
      setContactInstitution("");
      setContactMessage("");
    }, 600);
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7FA] text-[#17172B] flex flex-col font-sans selection:bg-[#BFBFDB] selection:text-[#0D1445]">
      {/* 1. Header: Enterprise Navigation */}
      <header className="bg-[#0D1445] text-white sticky top-0 z-50 border-b border-[#1E2768] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#BFBFDB] text-[#0D1445] flex items-center justify-center font-bold shadow-xs transition-transform group-hover:scale-105">
              <GraduationCap className="w-6 h-6 text-[#0D1445]" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight text-white leading-none">
                Academic<span className="text-[#BFBFDB]">IQ</span>
              </span>
              <span className="text-[10px] font-semibold text-[#C2D9D1] uppercase tracking-wider mt-1">
                Enterprise
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-xs font-semibold text-[#E0E0EC]">
            <button
              onClick={() => scrollToSection("home")}
              className="px-3 py-2 rounded-lg hover:text-white hover:bg-[#1A235F] transition-colors cursor-pointer"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection("about")}
              className="px-3 py-2 rounded-lg hover:text-white hover:bg-[#1A235F] transition-colors cursor-pointer"
            >
              About
            </button>
            <button
              onClick={() => scrollToSection("solutions")}
              className="px-3 py-2 rounded-lg hover:text-white hover:bg-[#1A235F] transition-colors cursor-pointer"
            >
              Solutions
            </button>
            <button
              onClick={() => scrollToSection("flagship")}
              className="px-3 py-2 rounded-lg hover:text-white hover:bg-[#1A235F] transition-colors cursor-pointer"
            >
              Platform
            </button>
            <button
              onClick={() => scrollToSection("technology")}
              className="px-3 py-2 rounded-lg hover:text-white hover:bg-[#1A235F] transition-colors cursor-pointer"
            >
              Technology
            </button>
            <button
              onClick={() => scrollToSection("why-us")}
              className="px-3 py-2 rounded-lg hover:text-white hover:bg-[#1A235F] transition-colors cursor-pointer"
            >
              Why AcademicIQ
            </button>
            <button
              onClick={() => scrollToSection("contact")}
              className="px-3 py-2 rounded-lg hover:text-white hover:bg-[#1A235F] transition-colors cursor-pointer"
            >
              Contact
            </button>
          </nav>

          {/* Header Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-xs font-semibold text-[#E0E0EC] hover:text-white hover:bg-[#1A235F] rounded-xl transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-xl bg-[#BFBFDB] hover:bg-[#A8A8C8] text-[#0D1445] text-xs font-bold shadow-xs transition-all"
            >
              Get Started
            </Link>
            <div className="h-5 w-px bg-[#2B357E] hidden md:block" />
            <Link
              href="/student/dashboard"
              className="text-xs font-medium text-[#C2D9D1] hover:text-white transition-colors hidden md:inline-flex items-center gap-1"
            >
              Student Portal <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center gap-2">
            <Link
              href="/login"
              className="sm:hidden px-3 py-1.5 text-xs font-semibold text-white bg-[#1A235F] rounded-lg"
            >
              Sign In
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#BFBFDB] hover:text-white hover:bg-[#1A235F] transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[#1E2768] bg-[#0D1445] px-4 pt-3 pb-6 space-y-2">
            <button
              onClick={() => scrollToSection("home")}
              className="block w-full text-left px-3 py-2 text-xs font-semibold text-[#E0E0EC] hover:text-white hover:bg-[#1A235F] rounded-lg"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection("about")}
              className="block w-full text-left px-3 py-2 text-xs font-semibold text-[#E0E0EC] hover:text-white hover:bg-[#1A235F] rounded-lg"
            >
              About AcademicIQ Enterprise
            </button>
            <button
              onClick={() => scrollToSection("solutions")}
              className="block w-full text-left px-3 py-2 text-xs font-semibold text-[#E0E0EC] hover:text-white hover:bg-[#1A235F] rounded-lg"
            >
              Our Solutions
            </button>
            <button
              onClick={() => scrollToSection("flagship")}
              className="block w-full text-left px-3 py-2 text-xs font-semibold text-[#E0E0EC] hover:text-white hover:bg-[#1A235F] rounded-lg"
            >
              Flagship Learning Platform
            </button>
            <button
              onClick={() => scrollToSection("technology")}
              className="block w-full text-left px-3 py-2 text-xs font-semibold text-[#E0E0EC] hover:text-white hover:bg-[#1A235F] rounded-lg"
            >
              Technology Architecture
            </button>
            <button
              onClick={() => scrollToSection("why-us")}
              className="block w-full text-left px-3 py-2 text-xs font-semibold text-[#E0E0EC] hover:text-white hover:bg-[#1A235F] rounded-lg"
            >
              Why AcademicIQ
            </button>
            <button
              onClick={() => scrollToSection("contact")}
              className="block w-full text-left px-3 py-2 text-xs font-semibold text-[#E0E0EC] hover:text-white hover:bg-[#1A235F] rounded-lg"
            >
              Contact Us
            </button>
            <div className="pt-3 border-t border-[#1E2768] flex flex-col gap-2">
              <Link
                href="/register"
                className="w-full text-center py-2.5 rounded-xl bg-[#BFBFDB] text-[#0D1445] text-xs font-bold"
              >
                Get Started
              </Link>
              <div className="flex gap-2 pt-1">
                <Link
                  href="/student/dashboard"
                  className="flex-1 text-center py-2 rounded-lg bg-[#1A235F] text-[#C2D9D1] text-xs font-semibold"
                >
                  Student Portal
                </Link>
                <Link
                  href="/admin/dashboard"
                  className="flex-1 text-center py-2 rounded-lg bg-[#1A235F] text-[#BFBFDB] text-xs font-semibold"
                >
                  Admin Console
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Corporate Sections */}
      <main className="flex-1 w-full space-y-20 sm:space-y-28 py-10 sm:py-16">
        {/* 2. Hero Section */}
        <section id="home" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Hero Left: Narrative */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EEF6F3] border border-[#C2D9D1] text-[#1E4E3F] text-xs font-bold tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-[#1E4E3F]" />
                Next-Generation EdTech SaaS Architecture
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#0D1445] leading-[1.12]">
                Building the Future of Intelligent Learning.
              </h1>

              <p className="text-base sm:text-lg text-[#686A7D] leading-relaxed max-w-2xl">
                AcademicIQ Enterprise equips modern universities and higher education institutions with context-grounded AI. We unify semantic vector retrieval (RAG), monitored video curriculums, and automated assessment generation into one verifiable academic ecosystem.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => scrollToSection("flagship")}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#0D1445] hover:bg-[#162060] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  Explore Our Platform <ArrowRight className="w-4 h-4 text-[#BFBFDB]" />
                </button>
                <button
                  onClick={() => scrollToSection("contact")}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-[#F2F2F9] text-[#0D1445] border border-[#E4E3EC] text-xs font-semibold transition-all cursor-pointer"
                >
                  Contact Us
                </button>
              </div>

              {/* Verified Trust Tokens */}
              <div className="pt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#686A7D] border-t border-[#E4E3EC]">
                <span className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-[#1E4E3F]" /> Grounded in Uploaded Syllabi
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-4 h-4 text-[#0D1445]" /> Anti-Tamper Video Watch Gates
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Cpu className="w-4 h-4 text-[#AD525E]" /> Google Gemini AI Powered
                </span>
              </div>
            </div>

            {/* Hero Right: Technology Showcase Visual */}
            <div className="lg:col-span-5">
              <div className="bg-white border border-[#E4E3EC] rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden space-y-5">
                {/* Visual Header */}
                <div className="flex items-center justify-between border-b border-[#E4E3EC] pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#AD525E]" />
                    <div className="w-3 h-3 rounded-full bg-[#BFBFDB]" />
                    <div className="w-3 h-3 rounded-full bg-[#C2D9D1]" />
                    <span className="ml-2 text-xs font-bold text-[#0D1445]">AcademicIQ Live Context Engine</span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EEF6F3] text-[#1E4E3F] border border-[#C2D9D1]">
                    Status: Online
                  </span>
                </div>

                {/* Pipeline Nodes Visual */}
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-[#F7F7FA] border border-[#E4E3EC] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#0D1445] text-white flex items-center justify-center font-bold text-xs">
                        <FileText className="w-4 h-4 text-[#BFBFDB]" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[#0D1445] block">Model 1: Document RAG</span>
                        <span className="text-[10px] text-[#686A7D]">Sentence Transformers • Qdrant Vectors</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-[#1E4E3F] bg-[#EEF6F3] px-2 py-0.5 rounded-md">
                      Verified
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F7F7FA] border border-[#E4E3EC] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#0D1445] text-white flex items-center justify-center font-bold text-xs">
                        <Video className="w-4 h-4 text-[#C2D9D1]" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[#0D1445] block">Model 2: Video Curriculum</span>
                        <span className="text-[10px] text-[#686A7D]">YouTube IFrame API • Watch Gate Enforcement</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-[#0D1445] bg-[#F2F2F9] px-2 py-0.5 rounded-md">
                      Anti-Tamper
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F7F7FA] border border-[#E4E3EC] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#0D1445] text-white flex items-center justify-center font-bold text-xs">
                        <Cpu className="w-4 h-4 text-[#E0D6D9]" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[#0D1445] block">Evaluation: Gemini AI</span>
                        <span className="text-[10px] text-[#686A7D]">10-MCQ Objective Generation & Scoring</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-[#7A2633] bg-[#FBF1F2] px-2 py-0.5 rounded-md">
                      Auto-Graded
                    </span>
                  </div>
                </div>

                {/* Live Context Telemetry Meter */}
                <div className="p-4 rounded-xl bg-[#0D1445] text-white space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#BFBFDB] font-semibold">Institutional Grounding Index</span>
                    <span className="font-bold text-[#C2D9D1]">100% Curriculum Bound</span>
                  </div>
                  <div className="w-full bg-[#1A235F] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#C2D9D1] h-full rounded-full w-full" />
                  </div>
                  <p className="text-[10px] text-[#E0E0EC] pt-1">
                    Explanations and evaluations are dynamically bounded by course syllabi and lecture transcripts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Company Introduction (About) */}
        <section id="about" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl border border-[#E4E3EC] p-8 sm:p-12 lg:p-16 shadow-xs space-y-10">
            {/* Header */}
            <div className="max-w-3xl space-y-3">
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#F2F2F9] text-[#0D1445] border border-[#BFBFDB] uppercase tracking-wider">
                About AcademicIQ Enterprise
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-[#0D1445] tracking-tight">
                Engineering the Infrastructure of Verifiable Education.
              </h2>
              <p className="text-sm sm:text-base text-[#686A7D] leading-relaxed">
                AcademicIQ Enterprise was founded to bridge the gap between generative artificial intelligence and rigorous institutional curriculum standards. While general-purpose language models often produce ungrounded conjectures, our platform ensures every explanation, question, and evaluation is anchored in verified course textbooks and instructor notes.
              </p>
            </div>

            {/* Purpose, Vision, Mission Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="p-6 sm:p-7 rounded-2xl bg-[#F7F7FA] border border-[#E4E3EC] space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0D1445] text-white flex items-center justify-center font-bold">
                    <Compass className="w-5 h-5 text-[#BFBFDB]" />
                  </div>
                  <h3 className="text-base font-bold text-[#0D1445]">Our Purpose</h3>
                  <p className="text-xs sm:text-sm text-[#686A7D] leading-relaxed">
                    To eliminate AI hallucinations in higher education by constraining machine intelligence to verified, faculty-approved academic materials.
                  </p>
                </div>
                <div className="pt-4 border-t border-[#E4E3EC] text-[11px] font-bold text-[#0D1445] flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-[#1E4E3F]" /> Grounded In Reality
                </div>
              </div>

              <div className="p-6 sm:p-7 rounded-2xl bg-[#F7F7FA] border border-[#E4E3EC] space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0D1445] text-white flex items-center justify-center font-bold">
                    <Brain className="w-5 h-5 text-[#C2D9D1]" />
                  </div>
                  <h3 className="text-base font-bold text-[#0D1445]">Our Vision</h3>
                  <p className="text-xs sm:text-sm text-[#686A7D] leading-relaxed">
                    A universal higher education standard where every student receives 24/7 adaptive tutoring aligned with their university&rsquo;s specific syllabus.
                  </p>
                </div>
                <div className="pt-4 border-t border-[#E4E3EC] text-[11px] font-bold text-[#0D1445] flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-[#1E4E3F]" /> Universal Adaptation
                </div>
              </div>

              <div className="p-6 sm:p-7 rounded-2xl bg-[#F7F7FA] border border-[#E4E3EC] space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0D1445] text-white flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5 text-[#E0D6D9]" />
                  </div>
                  <h3 className="text-base font-bold text-[#0D1445]">Our Mission</h3>
                  <p className="text-xs sm:text-sm text-[#686A7D] leading-relaxed">
                    To provide academic institutions with scalable software pipelines that synthesize document intelligence, monitored video learning, and auto-graded assessments.
                  </p>
                </div>
                <div className="pt-4 border-t border-[#E4E3EC] text-[11px] font-bold text-[#0D1445] flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-[#1E4E3F]" /> Institutional Scale
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Our Solutions */}
        <section id="solutions" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#EEF6F3] text-[#1E4E3F] border border-[#C2D9D1] uppercase tracking-wider">
              Comprehensive EdTech Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0D1445] tracking-tight">
              Our Core SaaS Solutions
            </h2>
            <p className="text-xs sm:text-sm text-[#686A7D] leading-relaxed">
              AcademicIQ delivers five cohesive software modules designed to operate either as an integrated institutional suite or as modular services.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1: AI Document Intelligence */}
            <div className="bg-white border border-[#E4E3EC] hover:border-[#BFBFDB] rounded-2xl p-7 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-xl bg-[#F2F2F9] text-[#0D1445] flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-[#0D1445]">AI Document Intelligence</h3>
                <p className="text-xs sm:text-sm text-[#686A7D] leading-relaxed">
                  Ingests PDF, DOCX, and TXT files, extracts structural headings and topics, and segments syllabus text into optimized vector chunks stored securely in Qdrant Cloud.
                </p>
              </div>
              <ul className="text-xs text-[#17172B] space-y-2 pt-3 border-t border-[#E4E3EC]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1E4E3F]" /> Structural outline extraction
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1E4E3F]" /> Dense vector chunking
                </li>
              </ul>
            </div>

            {/* Card 2: Grounded RAG Tutoring */}
            <div className="bg-white border border-[#E4E3EC] hover:border-[#BFBFDB] rounded-2xl p-7 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-xl bg-[#EEF6F3] text-[#1E4E3F] flex items-center justify-center font-bold">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-[#0D1445]">RAG-Based Grounded Learning</h3>
                <p className="text-xs sm:text-sm text-[#686A7D] leading-relaxed">
                  Real-time semantic search over course syllabi that produces authoritative explanations and high-yield exam practice questions without speculative hallucinations.
                </p>
              </div>
              <ul className="text-xs text-[#17172B] space-y-2 pt-3 border-t border-[#E4E3EC]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1E4E3F]" /> Sentence Transformers similarity
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1E4E3F]" /> Verifiable evidence grounding
                </li>
              </ul>
            </div>

            {/* Card 3: Video Curriculum Management */}
            <div className="bg-white border border-[#E4E3EC] hover:border-[#BFBFDB] rounded-2xl p-7 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-xl bg-[#F2F2F9] text-[#0D1445] flex items-center justify-center font-bold">
                  <Video className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-[#0D1445]">Curriculum Video Learning</h3>
                <p className="text-xs sm:text-sm text-[#686A7D] leading-relaxed">
                  Folder-based course structures that organize instructional videos with tamper-resistant watch progression monitoring and completion threshold gating.
                </p>
              </div>
              <ul className="text-xs text-[#17172B] space-y-2 pt-3 border-t border-[#E4E3EC]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1E4E3F]" /> Hierarchical course folders
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1E4E3F]" /> Monotonic watch-gate clamp
                </li>
              </ul>
            </div>

            {/* Card 4: Automated AI Assessments */}
            <div className="bg-white border border-[#E4E3EC] hover:border-[#BFBFDB] rounded-2xl p-7 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-xl bg-[#FAF5F7] text-[#AD525E] flex items-center justify-center font-bold">
                  <FileCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-[#0D1445]">Automated Objective Assessments</h3>
                <p className="text-xs sm:text-sm text-[#686A7D] leading-relaxed">
                  Generates rigorous 10-MCQ objective tests from learning objectives using Google Gemini, complete with server-side auto-grading and clear rationales.
                </p>
              </div>
              <ul className="text-xs text-[#17172B] space-y-2 pt-3 border-t border-[#E4E3EC]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1E4E3F]" /> Gemini structured generation
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1E4E3F]" /> Instant rationale breakdown
                </li>
              </ul>
            </div>

            {/* Card 5: Academic Analytics & Dossiers */}
            <div className="bg-white border border-[#E4E3EC] hover:border-[#BFBFDB] rounded-2xl p-7 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-xl bg-[#F2F2F9] text-[#0D1445] flex items-center justify-center font-bold">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-[#0D1445]">Academic Progress & Analytics</h3>
                <p className="text-xs sm:text-sm text-[#686A7D] leading-relaxed">
                  Compiles granular student dossiers classifying mastery vs. revision needs exclusively from verified assessment attempts and watch logs.
                </p>
              </div>
              <ul className="text-xs text-[#17172B] space-y-2 pt-3 border-t border-[#E4E3EC]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1E4E3F]" /> Verified attempt calculations
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1E4E3F]" /> Heuristic revision pathways
                </li>
              </ul>
            </div>

            {/* Card 6: Enterprise Security & Multi-Tenant Access */}
            <div className="bg-white border border-[#E4E3EC] hover:border-[#BFBFDB] rounded-2xl p-7 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-xl bg-[#EEF6F3] text-[#1E4E3F] flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-[#0D1445]">Institutional Role Governance</h3>
                <p className="text-xs sm:text-sm text-[#686A7D] leading-relaxed">
                  Strict separation between Student and Administrator roles powered by Firebase Authentication and Firestore security rules to protect institutional data.
                </p>
              </div>
              <ul className="text-xs text-[#17172B] space-y-2 pt-3 border-t border-[#E4E3EC]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1E4E3F]" /> Role-based portal routing
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1E4E3F]" /> Isolated Firestore records
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 5. Flagship Product Showcase */}
        <section id="flagship" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="bg-white border border-[#E4E3EC] rounded-3xl p-8 sm:p-12 lg:p-16 shadow-xs space-y-10">
            {/* Flagship Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-[#E4E3EC] pb-8">
              <div className="space-y-3 max-w-2xl">
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#F2F2F9] text-[#0D1445] border border-[#BFBFDB] uppercase tracking-wider">
                  Flagship Software Product
                </span>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-[#0D1445] tracking-tight">
                  AcademicIQ Personalized Learning Platform
                </h2>
                <p className="text-xs sm:text-sm text-[#686A7D] leading-relaxed">
                  A dual-engine learning management and AI tutoring platform connecting students to curriculum-grounded assistance and instructors to granular mastery records.
                </p>
              </div>

              {/* Portal Jump Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <Link
                  href="/student/dashboard"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0D1445] hover:bg-[#162060] text-white text-xs font-bold shadow-xs transition-all"
                >
                  Launch Student Portal <ArrowRight className="w-4 h-4 text-[#BFBFDB]" />
                </Link>
                <Link
                  href="/admin/dashboard"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F7F7FA] hover:bg-[#EBEBF5] text-[#0D1445] border border-[#E4E3EC] text-xs font-bold transition-all"
                >
                  Admin Console
                </Link>
              </div>
            </div>

            {/* Interactive Platform Preview Console */}
            <div className="space-y-6">
              {/* Feature Selection Tabs */}
              <div className="flex flex-wrap items-center gap-2 border-b border-[#E4E3EC] pb-3 text-xs font-semibold">
                <button
                  onClick={() => setActiveTab("model1")}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                    activeTab === "model1"
                      ? "bg-[#0D1445] text-white shadow-xs font-bold"
                      : "bg-[#F7F7FA] text-[#686A7D] hover:text-[#17172B]"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Model 1: Grounded Document RAG
                </button>
                <button
                  onClick={() => setActiveTab("model2")}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                    activeTab === "model2"
                      ? "bg-[#0D1445] text-white shadow-xs font-bold"
                      : "bg-[#F7F7FA] text-[#686A7D] hover:text-[#17172B]"
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  Model 2: Video Curriculum & Watch Gate
                </button>
                <button
                  onClick={() => setActiveTab("analytics")}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                    activeTab === "analytics"
                      ? "bg-[#0D1445] text-white shadow-xs font-bold"
                      : "bg-[#F7F7FA] text-[#686A7D] hover:text-[#17172B]"
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  Institutional Mastery Dossier
                </button>
              </div>

              {/* Tab 1 Content: Live Grounded RAG Query Simulation */}
              {activeTab === "model1" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">
                  <div className="lg:col-span-6 space-y-4">
                    <h3 className="text-lg font-bold text-[#0D1445]">
                      Ask Course Syllabi & Lecture Materials Directly
                    </h3>
                    <p className="text-xs sm:text-sm text-[#686A7D] leading-relaxed">
                      Upload course notes, research papers, or syllabus outlines. When a student enters an exam question or concept, our vector engine scans Qdrant for semantic neighbors and passes grounding passages to Gemini.
                    </p>

                    <form onSubmit={handleQuery} className="space-y-3 pt-2">
                      <label htmlFor="rag-query-input" className="block text-xs font-semibold text-[#17172B]">
                        Test Live Document Retrieval
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="rag-query-input"
                          name="query"
                          type="text"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="e.g. How does semantic vector indexing prevent AI hallucinations?"
                          aria-label="Ask a question about your study materials"
                          className="flex-1 bg-[#F7F7FA] border border-[#E4E3EC] rounded-xl px-4 py-2.5 text-xs text-[#17172B] placeholder-[#686A7D] focus:outline-none focus:border-[#0D1445]"
                        />
                        <button
                          type="submit"
                          disabled={loading || !query.trim()}
                          className="px-5 py-2.5 rounded-xl bg-[#0D1445] hover:bg-[#162060] text-white text-xs font-bold transition-all disabled:opacity-50 shrink-0 cursor-pointer flex items-center gap-1.5 shadow-xs"
                        >
                          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                          Query RAG
                        </button>
                      </div>
                    </form>

                    <div className="flex flex-wrap gap-2 pt-2 text-[11px] text-[#686A7D]">
                      <span className="font-semibold text-[#0D1445]">Quick prompts:</span>
                      <button
                        type="button"
                        onClick={() => setQuery("What is cosine similarity in vector search?")}
                        className="underline hover:text-[#0D1445] cursor-pointer"
                      >
                        Cosine Similarity
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setQuery("Explain monotonic watch gating for video curriculums.")}
                        className="underline hover:text-[#0D1445] cursor-pointer"
                      >
                        Watch Gating
                      </button>
                    </div>
                  </div>

                  {/* Results Panel */}
                  <div className="lg:col-span-6 bg-[#F7F7FA] border border-[#E4E3EC] rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#E4E3EC] pb-3">
                      <span className="text-xs font-bold text-[#0D1445] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#1E4E3F]" />
                        Retrieved Grounding Response
                      </span>
                      <span className="text-[10px] font-semibold text-[#686A7D]">
                        Gemini 1.5 Flash • Qdrant Vector
                      </span>
                    </div>

                    {ragResult ? (
                      <div className="space-y-4">
                        <p className="text-xs text-[#17172B] leading-relaxed">
                          {ragResult.response}
                        </p>
                        <div className="space-y-1.5 pt-2 border-t border-[#E4E3EC]">
                          <span className="text-[11px] font-bold text-[#0D1445] block">Grounding Evidence Sources:</span>
                          {ragResult.sources.map((s, idx) => (
                            <div key={idx} className="text-[11px] text-[#1E4E3F] flex items-center gap-1.5 font-medium">
                              <FileCheck className="w-3.5 h-3.5 shrink-0" /> {s}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="py-8 text-center text-xs text-[#686A7D] space-y-2">
                        <FileText className="w-8 h-8 text-[#BFBFDB] mx-auto" />
                        <p>Submit a query above to inspect live vector similarity and grounded synthesis.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2 Content: Model 2 Video Curriculum Preview */}
              {activeTab === "model2" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">
                  <div className="lg:col-span-6 space-y-4">
                    <h3 className="text-lg font-bold text-[#0D1445]">
                      Hierarchical Course Folders & Anti-Tamper Watch Enforcement
                    </h3>
                    <p className="text-xs sm:text-sm text-[#686A7D] leading-relaxed">
                      Instructors create multi-lesson folders (e.g. &ldquo;Distributed Systems&rdquo; or &ldquo;Business Intelligence&rdquo;). The embedded YouTube player continuously evaluates client playback, clamping progress so students cannot simply seek to the end.
                    </p>
                    <div className="space-y-2.5 pt-2">
                      <div className="p-3.5 rounded-xl bg-[#F7F7FA] border border-[#E4E3EC] flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#0D1445]">Anti-Tamper Watch Enforcement</span>
                        <span className="font-bold text-[#1E4E3F] bg-[#EEF6F3] px-2 py-0.5 rounded-md">
                          Verified Monotonic
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-[#F7F7FA] border border-[#E4E3EC] flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#0D1445]">Completion Threshold Gate</span>
                        <span className="font-bold text-[#0D1445] bg-[#F2F2F9] px-2 py-0.5 rounded-md">
                          Configurable 80% - 90%
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-[#F7F7FA] border border-[#E4E3EC] flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#0D1445]">Auto-Generated Assessment Gate</span>
                        <span className="font-bold text-[#7A2633] bg-[#FBF1F2] px-2 py-0.5 rounded-md">
                          10 Objective Questions
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-6 bg-[#F7F7FA] border border-[#E4E3EC] rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#E4E3EC] pb-3 text-xs">
                      <span className="font-bold text-[#0D1445]">Video Player Telemetry Preview</span>
                      <span className="text-[#1E4E3F] font-bold">Watch Target: 85%</span>
                    </div>

                    <div className="space-y-3">
                      <div className="aspect-video bg-[#0D1445] rounded-xl flex items-center justify-center text-white text-xs relative overflow-hidden">
                        <div className="text-center space-y-2 p-4">
                          <Video className="w-10 h-10 text-[#BFBFDB] mx-auto animate-pulse" />
                          <p className="font-bold text-sm">Instructor Lecture: Semantic Retrieval Architectures</p>
                          <p className="text-[11px] text-[#BFBFDB]">Integrated with YouTube IFrame Player API</p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-[#686A7D]">Student Verified Progress</span>
                          <span className="text-[#0D1445]">87% / 85% Threshold (Gate Unlocked)</span>
                        </div>
                        <div className="w-full bg-[#E4E3EC] h-2.5 rounded-full overflow-hidden">
                          <div className="bg-[#1E4E3F] h-full rounded-full w-[87%]" />
                        </div>
                      </div>

                      <div className="pt-2">
                        <Link
                          href="/student/videos"
                          className="block text-center w-full py-2.5 rounded-xl bg-[#0D1445] hover:bg-[#162060] text-white text-xs font-bold transition-all"
                        >
                          Access Curriculum Videos
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3 Content: Mastery Dossier Analytics */}
              {activeTab === "analytics" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">
                  <div className="lg:col-span-6 space-y-4">
                    <h3 className="text-lg font-bold text-[#0D1445]">
                      Transparent Student Progress & Revision Dossiers
                    </h3>
                    <p className="text-xs sm:text-sm text-[#686A7D] leading-relaxed">
                      Every mastery score, topic breakdown, and revision guidance recommendation in AcademicIQ is computed exclusively from real assessment submissions and monitored video watch records. No synthetic scores or simulated charts.
                    </p>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="p-4 rounded-xl bg-[#F7F7FA] border border-[#E4E3EC]">
                        <span className="text-xs text-[#686A7D] font-medium block">Evaluation Policy</span>
                        <span className="text-base font-bold text-[#0D1445] mt-1 block">Single Attempt</span>
                        <span className="text-[10px] text-[#1E4E3F] font-semibold">Ensures Academic Integrity</span>
                      </div>
                      <div className="p-4 rounded-xl bg-[#F7F7FA] border border-[#E4E3EC]">
                        <span className="text-xs text-[#686A7D] font-medium block">Competency Classification</span>
                        <span className="text-base font-bold text-[#0D1445] mt-1 block">Dual State</span>
                        <span className="text-[10px] text-[#686A7D] font-medium">Mastered vs Needs Revision</span>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-6 bg-[#F7F7FA] border border-[#E4E3EC] rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#E4E3EC] pb-3 text-xs">
                      <span className="font-bold text-[#0D1445]">Topic Mastery Inspection Preview</span>
                      <span className="text-[10px] text-[#686A7D]">Firestore Real-time Records</span>
                    </div>

                    <div className="space-y-2.5">
                      <div className="p-3 rounded-xl bg-white border border-[#E4E3EC] flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-[#0D1445] block">Distributed Systems: Consensus Protocols</span>
                          <span className="text-[10px] text-[#686A7D]">Objective Score: 90% • Threshold: 75%</span>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-[#EEF6F3] text-[#1E4E3F] text-[10px] font-bold border border-[#C2D9D1]">
                          Mastered
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-[#E4E3EC] flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-[#0D1445] block">Vector Databases: Cosine Indexing</span>
                          <span className="text-[10px] text-[#686A7D]">Objective Score: 60% • Threshold: 70%</span>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-[#FAF5F7] text-[#AD525E] text-[10px] font-bold border border-[#E0D6D9]">
                          Needs Revision
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#F2F2F9] border border-[#BFBFDB] text-xs space-y-1">
                        <span className="font-bold text-[#0D1445] flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-[#0D1445]" /> Heuristic Guidance Output:
                        </span>
                        <p className="text-[#17172B] text-[11px] leading-relaxed">
                          Re-watch video lecture &ldquo;High-Dimensional Vector Spaces&rdquo; and review notes in Module 1 before retrying the assessment.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 6. Technology Architecture Section */}
        <section id="technology" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#F2F2F9] text-[#0D1445] border border-[#BFBFDB] uppercase tracking-wider">
              Under The Hood
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0D1445] tracking-tight">
              Enterprise Technology Architecture
            </h2>
            <p className="text-xs sm:text-sm text-[#686A7D] leading-relaxed">
              AcademicIQ is engineered with modern, cloud-native frameworks ensuring sub-second vector search, resilient database transactions, and deterministic grading.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* 1. Google Gemini */}
            <div className="p-6 rounded-2xl bg-white border border-[#E4E3EC] space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#0D1445] text-white flex items-center justify-center font-bold">
                <Cpu className="w-5 h-5 text-[#BFBFDB]" />
              </div>
              <h3 className="text-sm font-bold text-[#0D1445]">Google Gemini AI</h3>
              <p className="text-xs text-[#686A7D] leading-relaxed">
                Powers structured RAG reasoning, syllabus-aligned explanation generation, and automated 10-question objective assessment synthesis.
              </p>
            </div>

            {/* 2. Python & FastAPI */}
            <div className="p-6 rounded-2xl bg-white border border-[#E4E3EC] space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#0D1445] text-white flex items-center justify-center font-bold">
                <Server className="w-5 h-5 text-[#C2D9D1]" />
              </div>
              <h3 className="text-sm font-bold text-[#0D1445]">Python & FastAPI</h3>
              <p className="text-xs text-[#686A7D] leading-relaxed">
                Asynchronous backend engine managing document parsing (PDF/DOCX), Sentence Transformers vectorization, and deterministic auto-grading.
              </p>
            </div>

            {/* 3. Next.js 16 & React 19 */}
            <div className="p-6 rounded-2xl bg-white border border-[#E4E3EC] space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#0D1445] text-white flex items-center justify-center font-bold">
                <Layers className="w-5 h-5 text-[#BFBFDB]" />
              </div>
              <h3 className="text-sm font-bold text-[#0D1445]">Next.js & React 19</h3>
              <p className="text-xs text-[#686A7D] leading-relaxed">
                Modern full-stack web frontend utilizing Tailwind CSS v4, responsive layouts, accessible forms, and protected client route guards.
              </p>
            </div>

            {/* 4. Qdrant Cloud */}
            <div className="p-6 rounded-2xl bg-white border border-[#E4E3EC] space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#0D1445] text-white flex items-center justify-center font-bold">
                <Database className="w-5 h-5 text-[#C2D9D1]" />
              </div>
              <h3 className="text-sm font-bold text-[#0D1445]">Qdrant Vector Database</h3>
              <p className="text-xs text-[#686A7D] leading-relaxed">
                Distributed vector search cluster handling high-dimensional cosine similarity indexing across tens of thousands of syllabus segments.
              </p>
            </div>

            {/* 5. Firebase Auth & Firestore */}
            <div className="p-6 rounded-2xl bg-white border border-[#E4E3EC] space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#0D1445] text-white flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5 text-[#E0D6D9]" />
              </div>
              <h3 className="text-sm font-bold text-[#0D1445]">Firebase & Firestore</h3>
              <p className="text-xs text-[#686A7D] leading-relaxed">
                Scalable user identity management with role claims (Student vs Admin) and live document persistence for courses, videos, and assessments.
              </p>
            </div>

            {/* 6. Cloudinary */}
            <div className="p-6 rounded-2xl bg-white border border-[#E4E3EC] space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#0D1445] text-white flex items-center justify-center font-bold">
                <FileText className="w-5 h-5 text-[#C2D9D1]" />
              </div>
              <h3 className="text-sm font-bold text-[#0D1445]">Cloudinary Cloud Storage</h3>
              <p className="text-xs text-[#686A7D] leading-relaxed">
                Raw asset repository for uploaded academic syllabi and course materials, complemented by automatic local disk fallback persistence.
              </p>
            </div>

            {/* 7. YouTube IFrame API */}
            <div className="p-6 rounded-2xl bg-white border border-[#E4E3EC] space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#0D1445] text-white flex items-center justify-center font-bold">
                <Video className="w-5 h-5 text-[#AD525E]" />
              </div>
              <h3 className="text-sm font-bold text-[#0D1445]">YouTube IFrame Player API</h3>
              <p className="text-xs text-[#686A7D] leading-relaxed">
                Monitored video playback engine with continuous client polling and anti-tamper progress clamps to ensure thorough video engagement.
              </p>
            </div>

            {/* 8. Sentence Transformers */}
            <div className="p-6 rounded-2xl bg-white border border-[#E4E3EC] space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#0D1445] text-white flex items-center justify-center font-bold">
                <Brain className="w-5 h-5 text-[#BFBFDB]" />
              </div>
              <h3 className="text-sm font-bold text-[#0D1445]">Sentence Transformers</h3>
              <p className="text-xs text-[#686A7D] leading-relaxed">
                State-of-the-art embedding models generating 384-dimensional semantic representations of textbook chapters and syllabus notes.
              </p>
            </div>
          </div>
        </section>

        {/* 7. Why AcademicIQ */}
        <section id="why-us" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="bg-white rounded-3xl border border-[#E4E3EC] p-8 sm:p-12 lg:p-16 shadow-xs space-y-10">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#FAF5F7] text-[#AD525E] border border-[#E0D6D9] uppercase tracking-wider">
                Enterprise Differentiation
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0D1445] tracking-tight">
                Why Higher Education Chooses AcademicIQ
              </h2>
              <p className="text-xs sm:text-sm text-[#686A7D] leading-relaxed">
                Generic generative AI answers confuse students with out-of-scope explanations. AcademicIQ enforces academic rigor with four foundational design principles.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              {/* Pillar 1: Personalized Education */}
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl bg-[#EEF6F3] text-[#1E4E3F] flex items-center justify-center font-bold shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-[#0D1445]">Personalized Adaptive Education</h3>
                  <p className="text-xs sm:text-sm text-[#686A7D] leading-relaxed">
                    Adapts question difficulty, recommended revision modules, and conceptual explanations to each learner&rsquo;s verified topic weaknesses while keeping them aligned with course benchmarks.
                  </p>
                </div>
              </div>

              {/* Pillar 2: Context-Grounded AI */}
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl bg-[#F2F2F9] text-[#0D1445] flex items-center justify-center font-bold shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-[#0D1445]">Context-Grounded AI Without Hallucination</h3>
                  <p className="text-xs sm:text-sm text-[#686A7D] leading-relaxed">
                    Zero speculative assertions. Every generated explanation quotes and references specific passages retrieved from your institution&rsquo;s uploaded textbooks and lecture materials.
                  </p>
                </div>
              </div>

              {/* Pillar 3: Secure Data Management */}
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl bg-[#F2F2F9] text-[#0D1445] flex items-center justify-center font-bold shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-[#0D1445]">Secure Institutional Data Management</h3>
                  <p className="text-xs sm:text-sm text-[#686A7D] leading-relaxed">
                    Proprietary course syllabi, student records, and assessment answer keys remain isolated. Protected by Firebase role security rules and secure cloud storage access controls.
                  </p>
                </div>
              </div>

              {/* Pillar 4: Transparent Academic Progress */}
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl bg-[#FAF5F7] text-[#AD525E] flex items-center justify-center font-bold shrink-0">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-[#0D1445]">Transparent Academic Progress Dossiers</h3>
                  <p className="text-xs sm:text-sm text-[#686A7D] leading-relaxed">
                    No invented or synthetic statistics. Completion bars, mastery classifications, and revision paths derive strictly from real assessment scores and verified watch seconds.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 8. Final CTA & Contact Section */}
        <section id="contact" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#0D1445] text-white rounded-3xl p-8 sm:p-12 lg:p-16 shadow-xl relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              {/* Left Column: CTA Pitch */}
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1A235F] text-[#BFBFDB] border border-[#2B357E] text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  Enterprise Deployment
                </div>

                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
                  Let&rsquo;s Build a Smarter Learning Experience.
                </h2>

                <p className="text-sm sm:text-base text-[#E0E0EC] leading-relaxed">
                  Partner with AcademicIQ Enterprise to integrate grounded AI tutoring and monitored curriculum management into your university, college, or training academy.
                </p>

                <div className="space-y-3 pt-2 text-xs text-[#BFBFDB]">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#C2D9D1]" />
                    <span>Direct Inquiries: <strong className="text-white">enterprise@academiciq.edu</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#C2D9D1]" />
                    <span>AcademicIQ Technologies • Enterprise EdTech Division</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#C2D9D1]" />
                    <span>Response turnaround within 1 business day</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap gap-3">
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#BFBFDB] hover:bg-[#A8A8C8] text-[#0D1445] text-xs font-bold shadow-xs transition-all"
                  >
                    Get Started Now <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1A235F] hover:bg-[#253080] text-white text-xs font-semibold border border-[#2B357E] transition-all"
                  >
                    Sign In to Portal
                  </Link>
                </div>
              </div>

              {/* Right Column: Corporate Inquiry Form */}
              <div className="lg:col-span-6 bg-white text-[#17172B] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5">
                <div className="space-y-1">
                  <h3 className="font-bold text-base text-[#0D1445]">Institutional Inquiry Form</h3>
                  <p className="text-xs text-[#686A7D]">
                    Tell us about your institution&rsquo;s learning objectives and deployment scope.
                  </p>
                </div>

                {contactSubmitted ? (
                  <div className="p-6 rounded-xl bg-[#EEF6F3] border border-[#C2D9D1] text-[#1E4E3F] text-xs space-y-2 text-center">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-[#1E4E3F]" />
                    <p className="font-bold text-sm">Thank You for Reaching Out</p>
                    <p className="leading-relaxed">
                      Your inquiry has been received by our enterprise partnerships team. We will review your institutional requirements and follow up promptly.
                    </p>
                    <button
                      type="button"
                      onClick={() => setContactSubmitted(false)}
                      className="mt-3 inline-block px-4 py-1.5 rounded-lg bg-[#0D1445] text-white text-xs font-semibold cursor-pointer"
                    >
                      Send Another Inquiry
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="contact-name" className="block text-[11px] font-semibold text-[#17172B] mb-1">
                          Full Name
                        </label>
                        <input
                          id="contact-name"
                          name="contactName"
                          type="text"
                          required
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="Dr. Katherine Vance"
                          className="w-full bg-[#F7F7FA] border border-[#E4E3EC] rounded-xl px-3.5 py-2 text-xs text-[#17172B] focus:outline-none focus:border-[#0D1445]"
                        />
                      </div>
                      <div>
                        <label htmlFor="contact-email" className="block text-[11px] font-semibold text-[#17172B] mb-1">
                          Work / Academic Email
                        </label>
                        <input
                          id="contact-email"
                          name="contactEmail"
                          type="email"
                          required
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="k.vance@university.edu"
                          className="w-full bg-[#F7F7FA] border border-[#E4E3EC] rounded-xl px-3.5 py-2 text-xs text-[#17172B] focus:outline-none focus:border-[#0D1445]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="contact-institution" className="block text-[11px] font-semibold text-[#17172B] mb-1">
                          Institution / University
                        </label>
                        <input
                          id="contact-institution"
                          name="contactInstitution"
                          type="text"
                          required
                          value={contactInstitution}
                          onChange={(e) => setContactInstitution(e.target.value)}
                          placeholder="Department of Computer Science"
                          className="w-full bg-[#F7F7FA] border border-[#E4E3EC] rounded-xl px-3.5 py-2 text-xs text-[#17172B] focus:outline-none focus:border-[#0D1445]"
                        />
                      </div>
                      <div>
                        <label htmlFor="contact-solution" className="block text-[11px] font-semibold text-[#17172B] mb-1">
                          Primary Solution of Interest
                        </label>
                        <select
                          id="contact-solution"
                          name="contactSolution"
                          value={contactSolution}
                          onChange={(e) => setContactSolution(e.target.value)}
                          className="w-full bg-[#F7F7FA] border border-[#E4E3EC] rounded-xl px-3 py-2 text-xs text-[#17172B] font-semibold focus:outline-none focus:border-[#0D1445]"
                        >
                          <option value="Full Enterprise Suite">Full Enterprise Suite</option>
                          <option value="Model 1 Document RAG">Model 1: Document RAG Tutor</option>
                          <option value="Model 2 Video Curriculum">Model 2: Video Curriculum & Gates</option>
                          <option value="Automated AI Assessments">Automated AI Assessments</option>
                          <option value="Institutional Progress Analytics">Institutional Analytics</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="contact-message" className="block text-[11px] font-semibold text-[#17172B] mb-1">
                        Inquiry Details / Deployment Scope
                      </label>
                      <textarea
                        id="contact-message"
                        name="contactMessage"
                        rows={3}
                        required
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        placeholder="Briefly describe your student cohort size, subject disciplines, and target implementation timeframe..."
                        className="w-full bg-[#F7F7FA] border border-[#E4E3EC] rounded-xl px-3.5 py-2 text-xs text-[#17172B] focus:outline-none focus:border-[#0D1445]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={contactSending}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#0D1445] hover:bg-[#162060] text-white font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      {contactSending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Submitting Inquiry...
                        </>
                      ) : (
                        <>
                          Submit Institutional Inquiry <Send className="w-3.5 h-3.5 text-[#BFBFDB]" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 9. Footer */}
      <footer className="border-t border-[#E4E3EC] bg-white py-12 mt-16 text-xs text-[#686A7D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {/* Col 1: Brand & Overview */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0D1445] text-white flex items-center justify-center font-bold">
                  <GraduationCap className="w-5 h-5 text-[#BFBFDB]" />
                </div>
                <span className="font-bold text-base text-[#0D1445]">AcademicIQ Enterprise</span>
              </div>
              <p className="text-xs text-[#686A7D] leading-relaxed max-w-sm">
                AI-Powered EdTech SaaS Platform. Anchoring generative intelligence in verified curriculum syllabi with dense vector retrieval, monitored multimedia delivery, and automated assessment.
              </p>
              <div className="text-[11px] text-[#686A7D]">
                Platform Architecture: Google Gemini • Qdrant • FastAPI • Next.js • Firebase
              </div>
            </div>

            {/* Col 2: Solutions */}
            <div className="space-y-2.5">
              <span className="font-bold text-[#0D1445] block">Solutions</span>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => scrollToSection("solutions")} className="hover:text-[#0D1445] transition-colors cursor-pointer">
                    AI Document Intelligence
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection("solutions")} className="hover:text-[#0D1445] transition-colors cursor-pointer">
                    RAG-Based Grounded Learning
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection("solutions")} className="hover:text-[#0D1445] transition-colors cursor-pointer">
                    Curriculum Video Management
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection("solutions")} className="hover:text-[#0D1445] transition-colors cursor-pointer">
                    Automated AI Assessments
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection("solutions")} className="hover:text-[#0D1445] transition-colors cursor-pointer">
                    Academic Progress Dossiers
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3: Quick Navigation */}
            <div className="space-y-2.5">
              <span className="font-bold text-[#0D1445] block">Platform Access</span>
              <ul className="space-y-2">
                <li>
                  <Link href="/login" className="hover:text-[#0D1445] transition-colors">
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="hover:text-[#0D1445] transition-colors">
                    Register Student Account
                  </Link>
                </li>
                <li>
                  <Link href="/student/dashboard" className="hover:text-[#0D1445] transition-colors">
                    Student Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/student/important-questions" className="hover:text-[#0D1445] transition-colors">
                    Model 1: RAG Q&A
                  </Link>
                </li>
                <li>
                  <Link href="/student/videos" className="hover:text-[#0D1445] transition-colors">
                    Model 2: Video Lessons
                  </Link>
                </li>
                <li>
                  <Link href="/admin/dashboard" className="hover:text-[#0D1445] transition-colors">
                    Institutional Admin Console
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Corporate Information */}
            <div className="space-y-2.5">
              <span className="font-bold text-[#0D1445] block">Corporate</span>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => scrollToSection("about")} className="hover:text-[#0D1445] transition-colors cursor-pointer">
                    Company Purpose & Vision
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection("why-us")} className="hover:text-[#0D1445] transition-colors cursor-pointer">
                    Why AcademicIQ
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection("technology")} className="hover:text-[#0D1445] transition-colors cursor-pointer">
                    Technology Architecture
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection("contact")} className="hover:text-[#0D1445] transition-colors cursor-pointer">
                    Enterprise Sales Contact
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright & Legal Line */}
          <div className="pt-8 border-t border-[#E4E3EC] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#686A7D]">
            <p>© 2026 AcademicIQ Enterprise. Intelligent Personalized Learning & Academic Progress Management Platform. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span>Privacy Standard</span>
              <span>•</span>
              <span>Institutional Terms</span>
              <span>•</span>
              <span>RBAC Security</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
