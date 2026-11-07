/**
 * Centralized API client for communicating with the FastAPI backend.
 * Automatically injects the Firebase Authorization Bearer token.
 */

/**
 * Centralized API client for communicating with the FastAPI backend.
 * Automatically injects the Firebase Authorization Bearer token.
 * 
 * Base URL Priority:
 * 1. process.env.NEXT_PUBLIC_API_URL (Primary standard)
 * 2. process.env.NEXT_PUBLIC_BACKEND_URL (Backward compatibility for existing setups)
 * 3. http://localhost:8000 (Local development default)
 */

export const API_BASE_URL = (() => {
  const envUrl = (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:8000"
  ).trim().replace(/\/+$/, "");

  return envUrl.startsWith("http://") || envUrl.startsWith("https://")
    ? envUrl
    : `https://${envUrl}`;
})();

let authTokenGetter: (() => Promise<string | null>) | null = null;

export function setAuthTokenGetter(getter: () => Promise<string | null>) {
  authTokenGetter = getter;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

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
