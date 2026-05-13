"use client";

import { useEffect, useRef } from "react";
import { Terminal } from "lucide-react";
import { useStudioStore } from "./useStudioStore";

const POLL_MS = 3000;

export function BuildStatus() {
  const { buildStatus, buildErrorMessage, buildId, setBuildStatus, setBuildErrorMessage } =
    useStudioStore();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Independent poller: fetches build status even if Toolbar is not mounted
  useEffect(() => {
    if (!buildId || buildStatus === "success" || buildStatus === "failed") {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/api/v1/studio/builds/${buildId}`,
          { credentials: "include" },
        );
        const data = await res.json();
        if (data.status === "success") {
          setBuildStatus("success");
        } else if (data.status === "failed") {
          setBuildStatus("failed");
          setBuildErrorMessage(data.error_message || "Échec de la compilation");
        } else {
          setBuildStatus(data.status);
        }
      } catch {
        // network errors: keep current status, retry next poll
      }
    }, POLL_MS);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [buildId, buildStatus, setBuildStatus, setBuildErrorMessage]);

  if (buildStatus === "idle") return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-50">
      <div className="bg-[#0a0a0a] border-t border-[#262626]">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#262626]">
          <div className="flex items-center gap-2">
            <Terminal size={12} className="text-[#a3a3a3]" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#a3a3a3]">
              Build Output
            </span>
            <span
              className={`text-[10px] ${
                buildStatus === "success"
                  ? "text-[#22c55e]"
                  : buildStatus === "failed"
                    ? "text-red-400"
                    : "text-yellow-400"
              }`}
            >
              {buildStatus}
            </span>
          </div>
        </div>
        <div className="max-h-48 overflow-y-auto p-2">
          {(buildStatus === "running" || buildStatus === "queued") && (
            <div className="flex items-center gap-2 text-[10px] text-[#666]">
              <span className="animate-pulse">●</span>
              Compilation en cours...
            </div>
          )}
          {buildStatus === "success" && (
            <pre className="text-[10px] leading-4 text-[#22c55e] font-mono">
              Compilation réussie !
            </pre>
          )}
          {buildStatus === "failed" && buildErrorMessage && (
            <pre className="text-[10px] leading-4 text-red-400 font-mono whitespace-pre-wrap">
              {buildErrorMessage}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
