'use client'
import { useState, useEffect } from "react"
import { User, Settings, Paintbrush, Shield, CircleUserRound } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ProfileToggleEnum, useProfileToggle } from "./profile-toggle-context"

export function ProfileToggle() {
  const { toggleProfileSection } = useProfileToggle()
  const [alignValue, setAlignValue] = useState<'start' | 'end'>("end")
  
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
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
  
  const handleSectionChange = (section: ProfileToggleEnum) => {
    toggleProfileSection(section)
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
        <DropdownMenuItem onClick={() => handleSectionChange(ProfileToggleEnum.Account)} data-testid="profile-account">
          <User className="mr-2 h-4 w-4" />
          <span>Account</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSectionChange(ProfileToggleEnum.Settings)} data-testid="profile-settings">
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSectionChange(ProfileToggleEnum.Appearance)} data-testid="profile-appearance">
          <Paintbrush className="mr-2 h-4 w-4" />
          <span>Appearance</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSectionChange(ProfileToggleEnum.Security)} data-testid="profile-security">
          <Shield className="mr-2 h-4 w-4" />
          <span>Security</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
