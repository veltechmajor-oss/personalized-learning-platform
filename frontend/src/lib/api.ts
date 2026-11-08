/**
 * Centralized API client for communicating with the FastAPI backend.
 * Automatically injects the fresh Firebase Authorization Bearer token.
 * 
 * Base URL Priority:
 * 1. process.env.NEXT_PUBLIC_API_URL (Primary standard)
 * 2. process.env.NEXT_PUBLIC_BACKEND_URL (Backward compatibility for existing setups)
 * 3. http://localhost:8000 (Local development default)
 */

import { auth } from "./firebase";

export const API_BASE_URL = (() => {
  const isBrowser = typeof window !== "undefined";
  const isLocalHost = isBrowser && (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );

  const rawUrl = (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    (isLocalHost ? "http://localhost:8000" : "https://personalized-learning-platform-8707.onrender.com")
  ).trim().replace(/\/+$/, "");

  // Prevent production browsers from sending requests to localhost
  const finalUrl = (isBrowser && !isLocalHost && (rawUrl.includes("localhost") || rawUrl.includes("127.0.0.1")))
    ? "https://personalized-learning-platform-8707.onrender.com"
    : rawUrl;

  return finalUrl.startsWith("http://") || finalUrl.startsWith("https://")
    ? finalUrl
    : `https://${finalUrl}`;
})();

let authTokenGetter: (() => Promise<string | null>) | null = null;

export function setAuthTokenGetter(getter: () => Promise<string | null>) {
  authTokenGetter = getter;
}

/**
 * Obtains a fresh Firebase ID token.
 * 1. Waits for Firebase authentication to initialize via auth.authStateReady().
 * 2. Uses auth.currentUser.getIdToken(forceRefresh) to ensure an unexpired token.
 * 3. Falls back to dev_auth_token in localStorage for local testing.
 */
export async function getFreshIdToken(forceRefresh: boolean = false): Promise<string | null> {
  // If a custom token getter is explicitly set and provides a token, check it
  if (authTokenGetter) {
    try {
      const customToken = await authTokenGetter();
      if (customToken) return customToken;
    } catch {
      // Fall through to direct Firebase auth retrieval
    }
  }

  // Retrieve directly from Firebase Auth singleton
  if (typeof window !== "undefined") {
    try {
      if (typeof auth.authStateReady === "function") {
        await auth.authStateReady();
      }
    } catch (e) {
      console.warn("[Auth] authStateReady initialization error:", e);
    }

    const user = auth.currentUser;
    if (user) {
      try {
        return await user.getIdToken(forceRefresh);
      } catch (err: any) {
        console.warn("[Auth] Failed to retrieve fresh Firebase ID token:", err);
      }
    }

    // Support dev bypass token stored in localStorage
    const devToken = localStorage.getItem("dev_auth_token");
    if (devToken) {
      return devToken;
    }
  }

  return null;
}

interface ExtendedRequestInit extends RequestInit {
  _retried?: boolean;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: ExtendedRequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  const isPublicEndpoint = (
    endpoint === "/api/health" ||
    endpoint === "/health" ||
    endpoint === "/"
  );

  // Automatically attach fresh Bearer token if not explicitly supplied
  if (!headers["Authorization"]) {
    const token = await getFreshIdToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  // Set default JSON Content-Type unless FormData is used
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
    });
  } catch (netErr: any) {
    const errorMsg = netErr?.message || "Connection refused / network offline";
    console.error(`[API Network Failure] Failed to reach ${url}:`, netErr);
    throw new Error(
      `Unable to connect to backend (${API_BASE_URL}): ${errorMsg}. Please verify that the backend is running and NEXT_PUBLIC_API_URL is configured correctly.`
    );
  }

  // If 401 Unauthorized, attempt a single token force-refresh and retry
  if (res.status === 401 && !options._retried && !isPublicEndpoint) {
    const freshToken = await getFreshIdToken(true);
    if (freshToken) {
      const retryHeaders = {
        ...headers,
        Authorization: `Bearer ${freshToken}`,
      };
      return apiRequest<T>(endpoint, {
        ...options,
        headers: retryHeaders,
        _retried: true,
      });
    }
  }

  if (!res.ok) {
    let errorDetail = `Request failed with status ${res.status}`;
    try {
      const errorJson = await res.json();
      errorDetail = errorJson.detail || errorJson.message || errorDetail;
    } catch {
      // Fallback to response text
    }
    throw new Error(errorDetail);
  }

  return res.json();
}
