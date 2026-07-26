"use client";

import { AppSidebar } from "@/features/conversation/components/app-sidebar";
import { ByokWarmer } from "@/features/ai/components/byok-warmer";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

/**
 * App shell with collapsible sidebar and main content area for chat views.
 */
export function ChatShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <ByokWarmer /> {/* warms the BYOK cache cookie from the DB once per session */}
      <AppSidebar />
      <SidebarInset className="min-h-svh overflow-hidden">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}