"use client";

import { SWRConfig } from "swr";
import { ApiError } from "@/lib/types";
import { toast } from "sonner";
import type React from "react";

export function SWRProvider({ children }: { readonly children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        onError: (err: unknown) => {
          if (err instanceof ApiError && err.status < 500) return;
          const message = err instanceof Error ? err.message : "A network error occurred";
          toast.error(message);
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
