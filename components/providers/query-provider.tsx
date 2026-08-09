"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"; // hover and see => here QueryClient is a class and QueryClientProvider is a function that accepts client and childeren as a prop

import * as React from "react";

/**
 * Provides a TanStack Query client to the React tree (30s default stale time).
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = React.useState( // why we are doing this => so that on every re-render , our query cache do not get cleaned up as if use simply query = new QueryClient then on every re render a fresh clientis generated
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 2 * 1000, // 30 seconds // that after how much time ou need to fetch the fresh data 
                    },
                },
            })
    );

    return (

        <QueryClientProvider client={queryClient}>
            {children}

        </QueryClientProvider>
    );
}