'use client'
import { useState, useEffect } from "react"
import { User, Settings, Shield, CircleUserRound, LogOut } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ProfileToggleEnum, useProfileToggle } from "./profile-toggle-context"
import { useUsageToggle } from "./usage-toggle-context"
import { useClerk, useUser, SignInButton } from "@clerk/nextjs"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

export function ProfileToggle() {
  const { toggleProfileSection, activeView } = useProfileToggle()
  const { isUsageOpen, closeUsage } = useUsageToggle()
  const [alignValue, setAlignValue] = useState<'start' | 'end'>("end")
  const [isMobile, setIsMobile] = useState(false)
  
  // Call hooks unconditionally
  const { isLoaded, isSignedIn, user } = useUser()
  const { signOut } = useClerk()

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) {
        setAlignValue("start")
      } else {
        setAlignValue("start")
      }
    }
    handleResize()
  
    let resizeTimer: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(handleResize, 100);
    };
  
    window.addEventListener("resize", debouncedResize)
    return () => window.removeEventListener("resize", debouncedResize)
  }, [])
  
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

  // Mobile: show profile icon as a direct button that opens the profile view
  if (isMobile) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        data-testid="profile-toggle"
        onClick={() => handleSectionToggle(ProfileToggleEnum.Settings)}
      >
        <ProfileIcon />
        <span className="sr-only">Open profile menu</span>
      </Button>
    )
  }
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="profile-toggle">
          <ProfileIcon />
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
