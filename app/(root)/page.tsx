import { startNewChat } from '@/features/home/actions/start-new-chat'
import { redirect } from 'next/navigation'
import React from 'react'

/**
 * Home page — creates a new chat and redirects to `/c/{id}`.
 */
const page = async() => {
  const conversationId = await startNewChat()
  
  
  redirect(`/c/${conversationId}`)
}

export default page

/*
bun add prisma @prisma/client @prisma/adapter-pg
bunx prisma init => to initialize prizma in our project
bunx prisma generate => t generate prisma client
bunx prisma migrate dev
bunx prisma studio
*/ 
