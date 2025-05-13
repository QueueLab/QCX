import { History } from './history'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CircleUserRound } from 'lucide-react'

export async function Sidebar() {
  return (
    <div className="h-screen p-2 fixed top-0 right-0 flex-col justify-center pb-24 hidden sm:flex">
      <History location="sidebar" />
      <Link href="/settings">
        <Button variant="ghost" size="icon">
          <CircleUserRound className="h-[1.2rem] w-[1.2rem]" />
        </Button>
      </Link>
    </div>
  )
}
