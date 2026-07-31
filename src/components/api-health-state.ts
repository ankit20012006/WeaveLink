import type {
  ApiReadiness,
  ApiReadinessStatus,
} from "@/lib/weavelink-api";

export type ApiHealthViewStatus = ApiReadinessStatus | "checking";

export function getApiHealthViewStatus(
  readiness: ApiReadiness | null,
  isChecking: boolean,
): ApiHealthViewStatus {
  if (isChecking) {
    return "checking";
  }

  return readiness?.status ?? "offline";
}

export function getApiHealthStatusCopy(status: ApiHealthViewStatus): {
  label: string;
  hint: string;
} {
  if (status === "checking") {
    return {
      label: "Checking backend...",
      hint: "Connecting to the configured API endpoint.",
    };
  }

  if (status === "ready") {
    return {
      label: "Backend live",
      hint: "Catalog and RFQ actions are hitting API-backed endpoints",
    };
  }

  if (status === "degraded") {
    return {
      label: "Backend degraded",
      hint:
        "API returned partial errors. The app is using whatever endpoints are available and retrying failed calls.",
    };
  }

  return {
    label: "Backend offline",
    hint: "Backend is offline; retry with a live endpoint to restore full behavior.",
  };
}
