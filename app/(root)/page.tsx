import Image from "next/image";
import {ModeToggle} from '@/components/ui/mode-toggle.tsx'
import { UserButton } from "@clerk/nextjs";

export default function Home() {
  return(
    <>
    <h1>Hello World</h1>
    <ModeToggle/>
    <UserButton/>
    </>
  )
}

/*
bun add prisma @prisma/client @prisma/adapter-pg
bunx prisma init => to initialize prizma in our project
bunx prisma generate => t generate prisma client
bunx prisma migrate dev
bunx prisma studio
*/ 
