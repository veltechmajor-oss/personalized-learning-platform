"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { auth } from "./firebase";
import { apiRequest, setAuthTokenGetter } from "./api";

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: "admin" | "student";
  status: "active" | "disabled";
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  role: "admin" | "student" | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  devLogin: (role: "admin" | "student") => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Hook up token getter for api client
  useEffect(() => {
    setAuthTokenGetter(async () => {
      if (user) {
        return user.getIdToken();
      }
      // Check dev token stored in localStorage
      if (typeof window !== "undefined") {
        return localStorage.getItem("dev_auth_token");
      }
      return null;
    });
  }, [user]);

  // Sync profile from backend
  const fetchProfile = async (firebaseUser?: FirebaseUser | null) => {
    try {
      const data = await apiRequest<UserProfile>("/api/auth/me");
      setProfile(data);
    } catch {
      // Fallback profile if backend request failed during dev mode
      if (firebaseUser) {
        setProfile({
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Student",
          role: "student",
          status: "active",
        });
      }
    }
  };

  useEffect(() => {
    const devToken = typeof window !== "undefined" ? localStorage.getItem("dev_auth_token") : null;

    if (devToken) {
      const role = devToken.includes("admin") ? "admin" : "student";
      setProfile({
        uid: devToken.replace("dev-token-", ""),
        email: `${devToken.replace("dev-token-", "")}@academic.edu`,
        name: role === "admin" ? "Platform Administrator" : "Academic Student",
        role,
        status: "active",
      });
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    if (typeof window !== "undefined") localStorage.removeItem("dev_auth_token");
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    setUser(cred.user);
    await fetchProfile(cred.user);
  };

  const register = async (name: string, email: string, pass: string) => {
    if (typeof window !== "undefined") localStorage.removeItem("dev_auth_token");
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });
    setUser(cred.user);

    // Sync with backend database
    try {
      await apiRequest("/api/auth/sync", {
        method: "POST",
        body: JSON.stringify({ name, email }),
      });
    } catch {
      // Sync deferred
    }

    await fetchProfile(cred.user);
  };

  const logout = async () => {
    if (typeof window !== "undefined") localStorage.removeItem("dev_auth_token");
    setUser(null);
    setProfile(null);
    try {
      await signOut(auth);
    } catch {
      // Ignore
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const devLogin = async (role: "admin" | "student") => {
    const token = role === "admin" ? "dev-token-admin1" : "dev-token-student1";
    if (typeof window !== "undefined") {
      localStorage.setItem("dev_auth_token", token);
    }
    setProfile({
      uid: token.replace("dev-token-", ""),
      email: `${role}@academic.edu`,
      name: role === "admin" ? "Platform Administrator" : "Academic Student",
      role,
      status: "active",
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: profile?.role || null,
        loading,
        login,
        register,
        logout,
        resetPassword,
        devLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
