'use client'
import { useState, useEffect } from "react"
import { User, Settings, Paintbrush, Shield, CircleUserRound } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ProfileToggleEnum, useProfileToggle } from "./profile-toggle-context"
import { useUsageToggle } from "./usage-toggle-context"

export function ProfileToggle() {
  const { toggleProfileSection, activeView } = useProfileToggle()
  const { isUsageOpen, closeUsage } = useUsageToggle()
  const [alignValue, setAlignValue] = useState<'start' | 'end'>("end")
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) {
        setAlignValue("start") // Right align on mobile too
      } else {
        setAlignValue("start") // Right align on desktop
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
  
  const handleSectionToggle = (section: ProfileToggleEnum) => {
    // If we're about to open a profile section and usage is open, close usage first
    if (activeView !== section && isUsageOpen) {
      closeUsage()
    }
    toggleProfileSection(section)
  }

  if (isMobile) {
    return (
      <Button variant="ghost" size="icon" className="relative" data-testid="profile-toggle" disabled>
        <CircleUserRound className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
        <span className="sr-only">Open profile menu</span>
      </Button>
    )
  }
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="profile-toggle">
          <CircleUserRound className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
          <span className="sr-only">Open profile menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align={alignValue} forceMount>
        <DropdownMenuItem onClick={() => handleSectionToggle(ProfileToggleEnum.Account)} data-testid="profile-account">
          <User className="mr-2 h-4 w-4" />
          <span>Account</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSectionToggle(ProfileToggleEnum.Settings)} data-testid="profile-settings">
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSectionToggle(ProfileToggleEnum.Appearance)} data-testid="profile-appearance">
          <Paintbrush className="mr-2 h-4 w-4" />
          <span>Appearance</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSectionToggle(ProfileToggleEnum.Security)} data-testid="profile-security">
          <Shield className="mr-2 h-4 w-4" />
          <span>Security</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
