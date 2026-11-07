"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { GraduationCap, Mail, Lock, User, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password);
      router.push("/student/dashboard");
    } catch (err: any) {
      setError(err?.message || "Failed to register student account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7FA] text-[#17172B] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0D1445] text-white flex items-center justify-center font-bold shadow-sm">
            <GraduationCap className="w-6 h-6 text-[#BFBFDB]" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-[#0D1445]">
            Academic<span className="text-[#58587A]">IQ</span>
          </span>
        </div>
        <h2 className="mt-4 text-center text-xl font-bold tracking-tight text-[#0D1445]">
          Student Registration
        </h2>
        <p className="mt-1 text-center text-xs text-[#686A7D]">
          Sign up to unlock personalized RAG learning and progress tracking
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white border border-[#E4E3EC] shadow-sm rounded-2xl p-6 sm:p-8">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-[#FBF1F2] border border-[#AD525E] text-[#7A2633] text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label htmlFor="reg-name" className="block text-xs font-semibold text-[#17172B] mb-1.5">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#686A7D]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="reg-name"
                  name="fullName"
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full bg-[#F7F7FA] border border-[#E4E3EC] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-[#17172B] placeholder-[#686A7D] focus:outline-none focus:border-[#0D1445] transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-xs font-semibold text-[#17172B] mb-1.5">Student Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#686A7D]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="reg-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  className="w-full bg-[#F7F7FA] border border-[#E4E3EC] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-[#17172B] placeholder-[#686A7D] focus:outline-none focus:border-[#0D1445] transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-xs font-semibold text-[#17172B] mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#686A7D]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="reg-password"
                  name="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-[#F7F7FA] border border-[#E4E3EC] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-[#17172B] placeholder-[#686A7D] focus:outline-none focus:border-[#0D1445] transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-confirm-password" className="block text-xs font-semibold text-[#17172B] mb-1.5">Confirm Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#686A7D]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="reg-confirm-password"
                  name="confirmPassword"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full bg-[#F7F7FA] border border-[#E4E3EC] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-[#17172B] placeholder-[#686A7D] focus:outline-none focus:border-[#0D1445] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#0D1445] hover:bg-[#162060] text-white font-bold text-xs transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Create Student Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-[#686A7D]">
            Already have an account?{" "}
            <Link href="/login" className="text-[#0D1445] font-bold hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
