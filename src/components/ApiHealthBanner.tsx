"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleAlert, CircleCheck, CircleX, RefreshCw } from "lucide-react";
import { getApiReadiness, type ApiReadiness } from "@/lib/weavelink-api";
import {
  getApiHealthStatusCopy,
  getApiHealthViewStatus,
  type ApiHealthViewStatus,
} from "@/components/api-health-state";

type ApiBannerState = {
  readiness: ApiReadiness | null;
  isChecking: boolean;
};

function paletteClass(status: ApiHealthViewStatus): string {
  if (status === "checking") {
    return "border-slate-200 bg-paper text-muted";
  }

  if (status === "ready") {
    return "border-loom-soft bg-loom-soft text-loom";
  }

  if (status === "degraded") {
    return "border-warp-gold/60 bg-warp-gold-soft text-warp-gold";
  }

  return "border-lac/40 bg-lac-soft text-lac";
}

function statusIcon(status: ApiHealthViewStatus) {
  if (status === "checking") {
    return <RefreshCw size={14} className="animate-spin" />;
  }

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
    readiness: null,
    isChecking: true,
  });

  const refresh = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      isChecking: true,
    }));

    const readiness = await getApiReadiness();

    setState({
      readiness,
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

  const status = getApiHealthViewStatus(state.readiness, state.isChecking);
  const copy = getApiHealthStatusCopy(status);
  const colors = paletteClass(status);

  return (
    <div className={`mt-2 w-full rounded-xl border px-3 py-2 text-xs sm:text-sm ${colors}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {statusIcon(status)}
          <p>
            <span className="font-medium">{copy.label}</span>
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
