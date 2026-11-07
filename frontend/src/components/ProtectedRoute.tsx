"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("admin" | "student")[];
}

export default function ProtectedRoute({
  children,
  allowedRoles = ["student", "admin"],
}: ProtectedRouteProps) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!profile) {
        router.push("/login");
      } else if (!allowedRoles.includes(profile.role)) {
        if (profile.role === "admin") {
          router.push("/admin/dashboard");
        } else {
          router.push("/student/dashboard");
        }
      }
    }
  }, [profile, loading, router, allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D1445] flex flex-col items-center justify-center text-white font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-[#BFBFDB] mb-3" />
        <p className="text-sm font-semibold tracking-wide">Verifying authorization...</p>
      </div>
    );
  }

  if (!profile || !allowedRoles.includes(profile.role)) {
    return null;
  }

  return <>{children}</>;
}
