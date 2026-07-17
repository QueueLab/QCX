'use client'
import { User, Settings, Shield, CircleUserRound, LogOut } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ProfileToggleEnum, useProfileToggle } from "./profile-toggle-context"
import { useUsageToggle } from "./usage-toggle-context"
import { useClerk, useUser, SignInButton } from "@clerk/nextjs"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useMediaQuery } from "@/hooks/use-media-query"

export function ProfileToggle() {
  const { toggleProfileSection, activeView } = useProfileToggle()
  const { isUsageOpen, closeUsage } = useUsageToggle()
  const isMobile = useMediaQuery("(max-width: 767px)")

  // Call hooks unconditionally
  const { isLoaded, isSignedIn, user } = useUser()
  const { signOut } = useClerk()

  const handleSectionToggle = (section: ProfileToggleEnum) => {
    if (activeView !== section && isUsageOpen) {
      closeUsage()
    }
    toggleProfileSection(section)
  }

  const handleSignOut = () => {
    signOut(() => {
      window.location.href = "/"
    })
  }

  const ProfileIcon = () => {
    if (isLoaded && isSignedIn && user?.imageUrl) {
      return (
        <Avatar className="h-[1.2rem] w-[1.2rem]">
          <AvatarImage src={user.imageUrl} alt={user.fullName || 'User'} />
          <AvatarFallback><CircleUserRound className="h-full w-full" /></AvatarFallback>
        </Avatar>
      )
    }
    return <CircleUserRound className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="profile-toggle"
          onClick={isMobile ? () => handleSectionToggle(ProfileToggleEnum.Settings) : undefined}
        >
          <ProfileIcon />
          <span className="sr-only">Open profile menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start" forceMount>
        <DropdownMenuItem onClick={() => handleSectionToggle(ProfileToggleEnum.Account)} data-testid="profile-account">
          <User className="mr-2 h-4 w-4" />
          <span>Account</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSectionToggle(ProfileToggleEnum.Settings)} data-testid="profile-settings">
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSectionToggle(ProfileToggleEnum.Security)} data-testid="profile-security">
          <Shield className="mr-2 h-4 w-4" />
          <span>Security</span>
        </DropdownMenuItem>

        {isLoaded && isSignedIn && (
          <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        )}
        {isLoaded && !isSignedIn && (
          <SignInButton mode="modal">
            <DropdownMenuItem>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign in</span>
            </DropdownMenuItem>
          </SignInButton>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
