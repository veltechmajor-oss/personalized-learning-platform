/**
 * Centralized API client for communicating with the FastAPI backend.
 * Automatically injects the Firebase Authorization Bearer token.
 */

const rawBackendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000").trim().replace(/\/+$/, "");
const BACKEND_URL = rawBackendUrl.startsWith("http://") || rawBackendUrl.startsWith("https://")
  ? rawBackendUrl
  : `https://${rawBackendUrl}`;

let authTokenGetter: (() => Promise<string | null>) | null = null;

export function setAuthTokenGetter(getter: () => Promise<string | null>) {
  authTokenGetter = getter;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BACKEND_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  // Attach token if available
  if (authTokenGetter) {
    try {
      const token = await authTokenGetter();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    } catch {
      // Ignore token fetch failure
    }
  }

  // Set default JSON Content-Type unless FormData is used
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

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
