"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  ShieldAlert,
  LayoutDashboard,
  Users,
  Video,
  FileCheck,
  TrendingUp,
  LogOut,
  Menu,
  X,
  User,
} from "lucide-react";

const adminNavItems = [
  { name: "Overview", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Students & Users", href: "/admin/users", icon: Users },
  { name: "Manage Videos", href: "/admin/videos", icon: Video },
  { name: "Manage Assessments", href: "/admin/assessments", icon: FileCheck },
  { name: "Academic Records", href: "/admin/progress", icon: TrendingUp },
];

export default function AdminNav() {
  const pathname = usePathname();
  const { profile, logout } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <header className="bg-[#0D1445] text-white sticky top-0 z-50 border-b border-[#1E2768] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-8">
            <Link href="/admin/dashboard" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-[#C2D9D1] text-[#0D1445] flex items-center justify-center font-bold shadow-sm transition-transform group-hover:scale-105">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold tracking-tight text-white">
                    Academic<span className="text-[#BFBFDB]">IQ</span>
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#1A235F] text-[#C2D9D1] border border-[#2B357E]">
                    ADMIN
                  </span>
                </div>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1.5">
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                      active
                        ? "bg-[#BFBFDB] text-[#0D1445] shadow-sm font-bold"
                        : "text-[#E0E0EC] hover:text-white hover:bg-[#1A235F]"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Admin User Info & Actions */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-white truncate max-w-[150px]">
                {profile?.name || "Administrator"}
              </span>
              <span className="text-[11px] text-[#C2D9D1] truncate max-w-[150px]">
                {profile?.email || "Superuser"}
              </span>
            </div>

            <div className="w-8 h-8 rounded-full bg-[#1A235F] border border-[#2B357E] text-[#C2D9D1] flex items-center justify-center font-semibold text-xs">
              <User className="w-4 h-4" />
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 text-[#E0E0EC] hover:text-[#E0D0D9] hover:bg-[#1A235F] rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-white hover:bg-[#1A235F] rounded-xl cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#1E2768] bg-[#0D1445] px-4 pt-3 pb-4 space-y-1.5 shadow-xl">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? "bg-[#BFBFDB] text-[#0D1445]"
                    : "text-[#E0E0EC] hover:text-white hover:bg-[#1A235F]"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
