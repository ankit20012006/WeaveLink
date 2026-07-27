"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleAlert, CircleCheck, CircleX, RefreshCw } from "lucide-react";
import {
  getApiReadiness,
  type ApiReadiness,
  type ApiReadinessStatus,
} from "@/lib/weavelink-api";

type ApiBannerState = {
  readiness: ApiReadiness;
  label: string;
  isChecking: boolean;
};

function statusCopy(status: ApiReadinessStatus): {
  label: string;
  hint: string;
} {
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

function paletteClass(status: ApiReadinessStatus): string {
  if (status === "ready") {
    return "border-loom-soft bg-loom-soft text-loom";
  }

  if (status === "degraded") {
    return "border-warp-gold/60 bg-warp-gold-soft text-warp-gold";
  }

  return "border-lac/40 bg-lac-soft text-lac";
}

function statusIcon(status: ApiReadinessStatus) {
  if (status === "ready") {
    return <CircleCheck size={14} />;
  }

  if (status === "degraded") {
    return <CircleAlert size={14} />;
  }

  return <CircleX size={14} />;
}

export function ApiHealthBanner() {
  const [state, setState] = useState<ApiBannerState>({
    readiness: { status: "offline", database: "disconnected" },
    label: "Checking backend...",
    isChecking: true,
  });

  const refresh = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      isChecking: true,
      label: "Checking backend...",
    }));

    const readiness = await getApiReadiness();
    const copy = statusCopy(readiness.status);

    setState({
      readiness,
      label: copy.label,
      isChecking: false,
    });
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      void refresh();
    }, 30000);

    return () => clearInterval(timer);
  }, [refresh]);

  const copy = statusCopy(state.readiness.status);
  const colors = paletteClass(state.readiness.status);

  return (
    <div className={`mt-2 w-full rounded-xl border px-3 py-2 text-xs sm:text-sm ${colors}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {statusIcon(state.readiness.status)}
          <p>
            <span className="font-medium">{state.label}</span>
            <span className="ml-2 text-ink/70">{copy.hint}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border bg-paper/60 px-2 py-1 text-xs transition hover:bg-paper"
          disabled={state.isChecking}
        >
          <RefreshCw size={12} className={state.isChecking ? "animate-spin" : ""} />
          <span>{state.isChecking ? "Checking" : "Retry"}</span>
        </button>
      </div>
    </div>
  );
}
