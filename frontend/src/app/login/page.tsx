"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { GraduationCap, ShieldCheck, Mail, Lock, ArrowRight, Loader2, Sparkles } from "lucide-react";

export default function LoginPage() {
  const [roleTab, setRoleTab] = useState<"student" | "admin">("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login, resetPassword, devLogin } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      if (roleTab === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/student/dashboard");
      }
    } catch (err: any) {
      setError(err?.message || "Invalid credentials or authentication failure.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError("Please enter your email address to receive password reset instructions.");
      return;
    }
    setError(null);
    setIsResetting(true);
    try {
      await resetPassword(email);
      setResetEmailSent(true);
    } catch (err: any) {
      setError(err?.message || "Failed to send reset email.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleDevLogin = async (role: "admin" | "student") => {
    await devLogin(role);
    if (role === "admin") {
      router.push("/admin/dashboard");
    } else {
      router.push("/student/dashboard");
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
          Sign in to your account
        </h2>
        <p className="mt-1 text-center text-xs text-[#686A7D]">
          Adaptive Learning & Academic Progress Management Platform
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white border border-[#E4E3EC] shadow-sm rounded-2xl p-6 sm:p-8">
          {/* Role selector tabs */}
          <div className="flex p-1 bg-[#F7F7FA] rounded-xl mb-6 border border-[#E4E3EC]">
            <button
              type="button"
              onClick={() => { setRoleTab("student"); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                roleTab === "student"
                  ? "bg-[#0D1445] text-white shadow-xs font-bold"
                  : "text-[#686A7D] hover:text-[#17172B]"
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Student Portal
            </button>
            <button
              type="button"
              onClick={() => { setRoleTab("admin"); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                roleTab === "admin"
                  ? "bg-[#0D1445] text-white shadow-xs font-bold"
                  : "text-[#686A7D] hover:text-[#17172B]"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Administrator
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-[#FBF1F2] border border-[#AD525E] text-[#7A2633] text-xs font-medium">
              {error}
            </div>
          )}

          {resetEmailSent && (
            <div className="mb-4 p-3 rounded-xl bg-[#EEF6F3] border border-[#C2D9D1] text-[#1E4E3F] text-xs font-medium">
              Password reset link sent to {email}. Please check your inbox.
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-[#17172B] mb-1.5">
                {roleTab === "admin" ? "Administrator Email" : "Student Email"}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#686A7D]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={roleTab === "admin" ? "admin@academic.edu" : "student@university.edu"}
                  className="w-full bg-[#F7F7FA] border border-[#E4E3EC] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-[#17172B] placeholder-[#686A7D] focus:outline-none focus:border-[#0D1445] transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="block text-xs font-semibold text-[#17172B]">Password</label>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={isResetting}
                  className="text-xs text-[#0D1445] hover:underline font-medium cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#686A7D]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
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
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In as {roleTab === "admin" ? "Administrator" : "Student"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {roleTab === "student" && (
            <div className="mt-5 text-center text-xs text-[#686A7D]">
              New student?{" "}
              <Link href="/register" className="text-[#0D1445] font-bold hover:underline">
                Create student account
              </Link>
            </div>
          )}

          {/* Quick Demo Access Bar */}
          <div className="mt-6 pt-5 border-t border-[#E4E3EC]">
            <div className="flex items-center justify-between text-[11px] text-[#686A7D] mb-2.5">
              <span className="flex items-center gap-1.5 font-semibold text-[#0D1445]">
                <Sparkles className="w-3.5 h-3.5 text-[#58587A]" /> Quick Testing Mode
              </span>
              <span>Bypass login</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleDevLogin("student")}
                className="py-2 px-3 rounded-xl bg-[#F7F7FA] hover:bg-[#BFBFDB]/30 text-[#0D1445] text-xs font-semibold text-center border border-[#E4E3EC] transition-colors cursor-pointer"
              >
                Enter as Student
              </button>
              <button
                type="button"
                onClick={() => handleDevLogin("admin")}
                className="py-2 px-3 rounded-xl bg-[#0D1445]/5 hover:bg-[#0D1445]/10 text-[#0D1445] text-xs font-semibold text-center border border-[#BFBFDB] transition-colors cursor-pointer"
              >
                Enter as Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
