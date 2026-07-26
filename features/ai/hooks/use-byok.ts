"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  deleteByokKey,
  getByokStatus,
  saveByokKey,
} from "@/features/ai/actions/byok-actions";

/** Query key for the BYOK status check — scoped to features/ai, not the shared conversation query-keys file. */
const byokStatusKey = ["byok", "status"] as const;

/** Whether the signed-in user currently has a BYOK key saved. */
export function useByokStatus() {
  return useQuery({
    queryKey: byokStatusKey,
    queryFn: () => getByokStatus(),
  });
}

/** Validates and saves a new BYOK key. */
export function useSaveByokKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (apiKey: string) => saveByokKey(apiKey),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: byokStatusKey });
      toast.success("OpenAI API key saved");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save API key");
    },
  });
}

/** Removes the saved BYOK key. */
export function useDeleteByokKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteByokKey(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: byokStatusKey });
      toast.success("API key removed");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to remove API key");
    },
  });
}
