"use client";

import { useState } from "react";
import { KeyRound, Eye, EyeOff, Loader2, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useByokStatus,
  useDeleteByokKey,
  useSaveByokKey,
} from "@/features/ai/hooks/use-byok";

/**
 * Sidebar control for Bring Your Own Key. Lets the user save, view status of,
 * or remove a personal OpenAI API key used instead of the app's default key.
 */
export function ByokControl() {
  const { data, isLoading } = useByokStatus();
  const saveKey = useSaveByokKey();
  const deleteKey = useDeleteByokKey();

  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  const hasKey = Boolean(data?.hasKey);

  async function handleSave() {
    await saveKey.mutateAsync(apiKey.trim());
    setApiKey("");
    setShowKey(false);
    setOpen(false);
  }

  async function handleDelete() {
    await deleteKey.mutateAsync();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
          />
        }
      >
        <KeyRound className="size-4" />
        <span>Your API key</span>
        {!isLoading && hasKey && (
          <Badge variant="secondary" className="ml-auto text-[10px]">
            Active
          </Badge>
        )}
      </PopoverTrigger>

      <PopoverContent align="start" side="right" className="w-72">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium">Bring your own OpenAI key</p>
            <p className="text-xs text-muted-foreground">
              Requests use this key instead of the app&apos;s default one.
            </p>
          </div>

          {hasKey ? (
            <div className="flex items-center justify-between rounded-2xl border border-border/80 px-3 py-2">
              <span className="text-xs text-muted-foreground">Key active</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={handleDelete}
                disabled={deleteKey.isPending}
                aria-label="Remove saved API key"
              >
                {deleteKey.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <Input
                  type={showKey ? "text" : "password"}
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  disabled={saveKey.isPending}
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setShowKey((value) => !value)}
                  aria-label={showKey ? "Hide key" : "Show key"}
                >
                  {showKey ? (
                    <EyeOff className="size-3.5" />
                  ) : (
                    <Eye className="size-3.5" />
                  )}
                </Button>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={saveKey.isPending || !apiKey.trim()}
              >
                {saveKey.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  "Save key"
                )}
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
