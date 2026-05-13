"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useStudioStore } from "./useStudioStore";

const POLL_INITIAL_MS = 2000;
const POLL_MAX_MS = 30000;
const POLL_TIMEOUT_MS = 120000;

export function useBuildPoller() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countRef = useRef(0);
  const { setBuildStatus, setBuildErrorMessage } = useStudioStore();

  const cancelPoll = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    countRef.current = 0;
  }, []);

  useEffect(() => cancelPoll, [cancelPoll]);

  const startPoll = useCallback(
    (buildId: string) => {
      cancelPoll();
      countRef.current = 0;

      const poll = () => {
        countRef.current += 1;
        const elapsed = countRef.current * POLL_INITIAL_MS;
        if (elapsed >= POLL_TIMEOUT_MS) {
          setBuildStatus("failed");
          setBuildErrorMessage("Le build a expiré");
          toast.error("Le build a expiré");
          return;
        }

        const delay = Math.min(
          POLL_INITIAL_MS * Math.pow(1.5, countRef.current - 1),
          POLL_MAX_MS,
        );

        timerRef.current = setTimeout(async () => {
          try {
            const res = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/api/v1/studio/builds/${buildId}`,
              { credentials: "include" },
            );
            const data = await res.json();
            if (data.status === "success") {
              setBuildStatus("success");
              toast.success("Compilation réussie !");
            } else if (data.status === "failed") {
              setBuildStatus("failed");
              setBuildErrorMessage(data.error_message || "Échec de la compilation");
              toast.error("Échec de la compilation");
            } else {
              setBuildStatus(data.status);
              poll();
            }
          } catch {
            setBuildStatus("failed");
            setBuildErrorMessage("Erreur réseau pendant le build");
            toast.error("Erreur réseau pendant le build");
          }
        }, delay);
      };

      poll();
    },
    [setBuildStatus, setBuildErrorMessage, cancelPoll],
  );

  return { startPoll, cancelPoll };
}
