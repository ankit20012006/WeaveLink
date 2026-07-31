const ACCESS_TOKEN_KEYS = [
  "weavelink_access_token",
  "weavelink_auth_token",
  "weavelink-token",
  "token",
];

const DEMO_WEAVER_ID_KEY = "weavelink_demo_weaver_id";
export const DEMO_FALLBACK_WEAVER_ID = "w-lakshmi";

function readWindowStorageItem(key: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function getStoredAccessToken(): string | null {
  for (const key of ACCESS_TOKEN_KEYS) {
    const token = readWindowStorageItem(key);
    if (token) {
      return token.trim();
    }
  }
  return null;
}

export function getStoredDemoWeaverId(): string | null {
  const demo = readWindowStorageItem(DEMO_WEAVER_ID_KEY);
  if (!demo) {
    return null;
  }

  const normalized = demo.trim();
  return normalized || null;
}

export function getStoredOrDefaultWeaverId(): string {
  return getStoredDemoWeaverId() || DEMO_FALLBACK_WEAVER_ID;
}

export async function resolveAuthHeaders(
  initHeaders: HeadersInit = {},
): Promise<Record<string, string>> {
  const headers = new Headers(initHeaders as HeadersInit);
  headers.set("Accept", "application/json");

  let token = getStoredAccessToken();
  const supabase = getSupabaseBrowserClient();
  if (supabase) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    token = session?.access_token ?? token;
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const demoWeaverId = getStoredDemoWeaverId();
  if (!token && demoWeaverId) {
    headers.set("X-Demo-Weaver-Id", demoWeaverId);
  }

  return Object.fromEntries(headers.entries()) as Record<string, string>;
}
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
