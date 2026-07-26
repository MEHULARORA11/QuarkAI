import { loadChatMessages, saveChatMessages } from "@/features/ai/actions/chat-store";
import { resolveByokKey } from "@/features/ai/actions/byok-actions";
import { getChatModel } from "@/features/ai/utils/model";
import { requireUser } from "@/features/auth/action/require-user";
import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { convertToModelMessages, createIdGenerator, createUIMessageStream, createUIMessageStreamResponse, streamText, toUIMessageStream, type UIMessage } from "ai";
/**
 * POST /api/chat — Streams an AI assistant reply for a conversation.
 *
 * Validates auth and ownership, persists the user message, then streams the
 * assistant response via the AI SDK. Final messages are saved when the stream ends.
 */
export async function POST(req: Request) {
    await auth.protect();

    const { message, id }: { message: UIMessage, id: string } = await req.json();

    if (!message || !id) {
        return new Response("Missing message or conversation id", { status: 400 });
    }

    const user = await requireUser();

    const conversation = await prisma.conversation.findFirst({
        where: {
            id,
            userId: user.id
        }
    });

    if (!conversation) {
        return new Response("Conversation not found", { status: 404 });
    }

    const previousMessages = await loadChatMessages(id);

    const alreadySaved = previousMessages.some(
        (storedMessage)=>storedMessage.id === message.id
    )

    const messages = alreadySaved ? previousMessages : [...previousMessages, message];

    if(!alreadySaved){
        await saveChatMessages(id, [message]);
    }

    const userApiKey = await resolveByokKey();

    // No fallback to a server-wide key — short-circuit here with a clear message.
    if (!userApiKey) {
        return new Response(
            "No OpenAI API key found for your account. Add one from the sidebar to start chatting.",
            { status: 401 }
        );
    }

    const result =  streamText({
        model: getChatModel(conversation.model, userApiKey),
        system: conversation.systemPrompt ?? "You are ChaiGpt , a helpful assistant",
        messages: await convertToModelMessages(messages),
    });

    result.consumeStream();

    return createUIMessageStreamResponse({
        stream:toUIMessageStream({
           stream:result.stream,
           originalMessages:messages,
           generateMessageId:createIdGenerator({prefix:"msg" , size:16}),
           onEnd:async({messages:finalMessages})=>{
            try {
                await saveChatMessages(id , finalMessages , {updateTitle:false})
            } catch (error) {
                console.error(error);
            }
           },
           onError:(error: unknown): string => {
               const msg = error instanceof Error ? error.message : String(error);
               if (
                   msg.includes("401") ||
                   msg.includes("invalid_api_key") ||
                   msg.includes("Incorrect API key") ||
                   msg.includes("insufficient_quota") ||
                   msg.includes("You exceeded your current quota")
               ) {
                   return "Your OpenAI key looks invalid or out of quota — check it in the sidebar.";
               }
               return msg;
           }
        })
    })

}

/**
 * const conversation = await prisma.conversation.findUnique({
    where: { id }
});

// Manual ownership check
if (!conversation || conversation.userId !== user.id) {
    return new Response("Conversation not found", { status: 404 });
}
Option 2: Add a compound unique constraint in schema.prisma

Code snippet
model Conversation {
  id     String @id @default(cuid())
  userId String

  @@unique([id, userId]) // Tells Prisma this pair is unique
}
Then in your API route:

TypeScript
const conversation = await prisma.conversation.findUnique({
    where: {
        id_userId: {
            id,
            userId: user.id
        }
    }
});
 */