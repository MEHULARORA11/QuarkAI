import Image from "next/image";
import {ModeToggle} from '@/components/ui/mode-toggle.tsx'

export default function Home() {
  return(
    <>
    <h1>Hello World</h1>
    <ModeToggle/>
    </>
  )
}

/*
bun add prisma @prisma/client @prisma/adapter-pg
bunx prisma init => to initialize prizma in our project
bunx prisma generate => t generate prisma client
prisma migrate dev
bunx prisma studio
*/ 
