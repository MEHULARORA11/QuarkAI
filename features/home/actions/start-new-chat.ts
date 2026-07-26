"use server";

import { requireUser } from "@/features/auth/action/require-user";
import { prisma } from "@/lib/db";


/**
 * Server action that creates a new conversation titled "New Chat".
 *
 * @returns The ID of the newly created conversation.
 */
export async function startNewChat(){
    const user = await requireUser();

    // Reuse an existing unused "New Chat" conversation if one exists,
    // instead of creating a new one on every visit/reload.
    const existing = await prisma.conversation.findFirst({
        where: {
            userId: user.id,
            title: "New Chat",
            messages: { none: {} },
        },
        select: { id: true },
    });

    if (existing) {
        return existing.id;
    }

    const conversation = await prisma.conversation.create({
        data:{
            userId:user.id,
            title:"New Chat"
        }
    });

    return conversation.id;
}