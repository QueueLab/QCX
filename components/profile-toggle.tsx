'use client'
import { User, Settings, Paintbrush, Shield, CircleUserRound } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ProfileToggleEnum, useProfileToggle } from "./profile-toggle-context"

export function ProfileToggle() {
  const { toggleProfileSection } = useProfileToggle()
  
  const handleSectionChange = (section: ProfileToggleEnum) => {
    toggleProfileSection(section)
  }
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <CircleUserRound className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
          <span className="sr-only">Open profile menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56"
        align="end" // Default alignment for desktop
        alignOnMobile={true} // Enable mobile-specific alignment
        forceMount
      >
        <DropdownMenuItem onClick={() => handleSectionChange(ProfileToggleEnum.Account)}>
          <User className="mr-2 h-4 w-4" />
          <span>Account</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSectionChange(ProfileToggleEnum.Settings)}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSectionChange(ProfileToggleEnum.Appearance)}>
          <Paintbrush className="mr-2 h-4 w-4" />
          <span>Appearance</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSectionChange(ProfileToggleEnum.Security)}>
          <Shield className="mr-2 h-4 w-4" />
          <span>Security</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
