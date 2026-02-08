'use client'
import { useState, useEffect } from "react"
import { User, Settings, Paintbrush, Shield, CircleUserRound, LogOut } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ProfileToggleEnum, useProfileToggle } from "./profile-toggle-context"
import { useUsageToggle } from "./usage-toggle-context"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { useRouter } from "next/navigation"

export function ProfileToggle() {
  const { toggleProfileSection, activeView } = useProfileToggle()
  const { isUsageOpen, closeUsage } = useUsageToggle()
  const [alignValue, setAlignValue] = useState<'start' | 'end'>("end")
  const [isMobile, setIsMobile] = useState(false)
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()
  
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

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.push('/auth')
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
    <>
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
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsLogoutDialogOpen(true)} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be logged out of your account and redirected to the login page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
