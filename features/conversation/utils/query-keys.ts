/** TanStack Query key factory for conversations and messages caches. */
export const queryKeys = {
    conversations: {
      all: ["conversations"] as const,
      detail: (id: string) => ["conversations", id] as const,
    },
    messages: {
      byConversation: (conversationId: string) =>
        ["messages", conversationId] as const,
    },
  };
  
  /*
  Think of the Cache like a Filing Cabinet
Imagine the cache as a giant key-value store (like a JavaScript Map or a physical filing cabinet):

The queryKey (["conversations"]) is the label written on the folder.

The result of listConversations() is the paper inside the folder.

TypeScript
// Inside React Query's internal memory store:
{
  ["conversations"]: [
    { id: "1", title: "Project Brainstorm", ... },
    { id: "2", title: "Next.js Help", ... }
  ]
}
  */

