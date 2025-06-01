'use client'

import { useState, useEffect } from "react"
import { User, Settings, Paintbrush, Shield, CircleUserRound } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ProfileToggleEnum, useProfileToggle } from "./profile-toggle-context"
import { useRouter } from "next/navigation"
//import { settings } from "@components/settings/components/settings.tsx"


export function ProfileToggle() {
  const { setProfileSection } = useProfileToggle()
  const router = useRouter()
  const [alignValue, setAlignValue] = useState<'start' | 'end'>("start")

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setAlignValue("start")
      } else {
        setAlignValue("start")
      }
    }

    handleResize() // Set initial value
  
    let resizeTimer: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(handleResize, 100);
    };
  
    window.addEventListener("resize", debouncedResize)
    return () => window.removeEventListener("resize", debouncedResize)
  }, [])
  
  const handleSectionChange = (section: string) => {
    setProfileSection(section as ProfileToggleEnum)
    router.push(`/settings/${section}`)
  }
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <CircleUserRound className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
          <span className="sr-only">Open profile menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align={alignValue} forceMount>
        <DropdownMenuItem onClick={() => handleSectionChange("account")}>
          <User className="mr-2 h-4 w-4" />
          <span>Account</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSectionChange("settings")}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSectionChange("appearance")}>
          <Paintbrush className="mr-2 h-4 w-4" />
          <span>Appearance</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSectionChange("security")}>
          <Shield className="mr-2 h-4 w-4" />
          <span>Security</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
