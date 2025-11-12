"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SearchDialog } from "@/components/search-dialog"
import { AppPicker } from "@/components/app-picker"
import { useTheme } from "@/components/theme-provider"
import { useAuth } from "@/components/auth/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Search, Activity, MessageSquare, SettingsIcon, HelpCircle, Download, Sun, Moon, LogOut } from "lucide-react"
import Image from "next/image"

export default function DashboardPage() {
  const [searchOpen, setSearchOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const { user, signOut, loading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const handleThemeToggle = () => {
    const newTheme = theme === "dark" ? "light" : "dark"
    setTheme(newTheme)

    document.documentElement.classList.remove("light", "dark")
    document.documentElement.classList.add(newTheme)

    toast({
      title: "Theme Changed",
      description: `Switched to ${newTheme} mode`,
    })
  }

  const handleSignOut = async () => {
    await signOut()
    toast({
      title: "Signed Out",
      description: "You have been signed out successfully",
    })
  }

  const handleNavigation = (path: string) => {
    router.push(path)
  }

  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Demo User"

  if (loading) {
    return (
      <div className="min-h-screen bg-nature-dark flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="/backgrounds/nature-bg-2.jpg"
            alt="Background"
            fill
            className="object-cover blur-3xl"
            priority
          />
        </div>
        <div className={`animate-spin rounded-full h-12 w-12 border-b-3 ${theme === "dark" ? "border-emerald-400" : "border-emerald-600"} glass-effect p-3`}></div>
      </div>
    )
  }

  return (
    <>
      <div className="flex min-h-screen relative overflow-hidden">
        {/* Nature-Inspired Background Layer */}
        <div className="fixed inset-0 z-0">
          {theme === "dark" ? (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-emerald-950/30 to-slate-900">
              <div className="absolute inset-0 opacity-15">
                <Image
                  src="/backgrounds/nature-bg-2.jpg"
                  alt="Nature Background"
                  fill
                  className="object-cover blur-3xl"
                  priority
                />
              </div>
              {/* Organic floating shapes */}
              <div className="absolute top-20 right-20 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-float-slow"></div>
              <div className="absolute bottom-40 left-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl animate-float"></div>
            </div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-emerald-50/50 to-blue-50/30">
              <div className="absolute inset-0 opacity-30">
                <Image
                  src="/backgrounds/nature-bg-1.jpg"
                  alt="Nature Background"
                  fill
                  className="object-cover blur-2xl"
                  priority
                />
              </div>
              {/* Organic floating shapes */}
              <div className="absolute top-20 right-20 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl animate-float-slow"></div>
              <div className="absolute bottom-40 left-40 w-80 h-80 bg-blue-200/20 rounded-full blur-3xl animate-float"></div>
              <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-yellow-200/15 rounded-full blur-3xl animate-float"></div>
            </div>
          )}
        </div>

        {/* Enhanced Glassmorphic Sidebar */}
        <div
          className={`w-64 ${
            theme === "dark" ? "glass-sidebar" : "glass-sidebar-light"
          } flex flex-col relative z-10 transition-smooth shadow-2xl`}
        >
          <div className={`p-4 border-b transition-smooth ${theme === "dark" ? "border-white/10" : "border-black/10"}`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 relative">
                <Image
                  src="/logo.png"
                  alt="QueueCX"
                  width={32}
                  height={32}
                  className={`transition-smooth ${theme === "dark" ? "invert" : ""}`}
                />
              </div>
              <span className={`font-semibold text-lg transition-smooth ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                QueueCX
              </span>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 px-3 py-2 h-auto rounded-xl ${
                theme === "dark"
                  ? "text-slate-300 hover:glass-effect hover:text-white"
                  : "text-slate-700 hover:glass-effect-light hover:text-slate-900"
              } transition-smooth`}
              onClick={() => setSearchOpen(true)}
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
            </Button>

            <div className="space-y-1 pt-4">
              <SidebarItem icon={Activity} label="My Activity" active theme={theme} onClick={() => {}} />
              <SidebarItem
                icon={MessageSquare}
                label="Context"
                nested
                theme={theme}
                onClick={() => handleNavigation("/context")}
              />
              <SidebarItem
                icon={SettingsIcon}
                label="Settings"
                theme={theme}
                onClick={() => handleNavigation("/settings")}
              />
            </div>
          </nav>

          <div className={`p-4 border-t transition-smooth ${theme === "dark" ? "border-white/10" : "border-black/10"} space-y-2`}>
            <SidebarItem icon={HelpCircle} label="Help Center" theme={theme} onClick={() => {}} />
            <SidebarItem icon={Download} label="Download QueueCX" theme={theme} onClick={() => {}} />

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8 ring-2 ring-white/20">
                  <AvatarImage src={user?.user_metadata?.avatar_url || "/placeholder.svg"} />
                  <AvatarFallback
                    className={`transition-smooth ${
                      theme === "dark" ? "bg-emerald-600/60 text-white" : "bg-emerald-600/80 text-white"
                    } backdrop-blur-sm`}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium transition-smooth ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                    {displayName}
                  </p>
                  <p className={`text-xs truncate transition-smooth ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                    {user?.email || "demo@queuecx.com"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleThemeToggle}
                  className={`rounded-full ${
                    theme === "dark"
                      ? "text-slate-300 hover:text-white hover:glass-effect"
                      : "text-slate-700 hover:text-slate-900 hover:glass-effect-light"
                  } transition-smooth`}
                >
                  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className={`rounded-full ${
                    theme === "dark"
                      ? "text-slate-300 hover:text-white hover:glass-effect"
                      : "text-slate-700 hover:text-slate-900 hover:glass-effect-light"
                  } transition-smooth`}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Main Content with Fluid Design */}
        <div className="flex-1 flex flex-col relative z-10">
          <div className="p-8">
            <div className="flex items-center justify-between mb-12">
              <div>
                <h1
                  className={`text-4xl font-bold mb-2 ${
                    theme === "dark" ? "text-white" : "text-slate-900"
                  } transition-smooth`}
                >
                  Good morning, {displayName}
                </h1>
                <p
                  className={`text-lg ${
                    theme === "dark" ? "text-slate-300" : "text-slate-600"
                  } transition-smooth`}
                >
                  Welcome back to your QueueCX dashboard
                </p>
              </div>
            </div>

            {/* Enhanced Glassmorphic Search Bar */}
            <div className="max-w-3xl mx-auto mb-16">
              <div
                className="relative cursor-pointer group transition-fluid hover:scale-[1.02]"
                onClick={() => setSearchOpen(true)}
              >
                <Search
                  className={`absolute left-6 top-1/2 transform -translate-y-1/2 w-6 h-6 ${
                    theme === "dark"
                      ? "text-slate-400 group-hover:text-emerald-300"
                      : "text-slate-600 group-hover:text-emerald-600"
                  } transition-smooth`}
                />
                <Input
                  placeholder="Search your activity, files, and more..."
                  className={`pl-16 pr-6 py-7 text-lg rounded-3xl shadow-2xl cursor-pointer border-2 transition-fluid ${
                    theme === "dark"
                      ? "glass-effect text-white placeholder:text-slate-400 hover:border-white/30 focus-glass"
                      : "glass-effect-light text-slate-900 placeholder:text-slate-600 hover:border-emerald-300/50 focus-glass"
                  } group-hover:shadow-[0_20px_60px_rgba(0,0,0,0.15)]`}
                  readOnly
                />
                <div
                  className={`absolute right-6 top-1/2 transform -translate-y-1/2 flex items-center gap-3 text-sm ${
                    theme === "dark" ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  <span className="hidden sm:inline">Type</span>
                  <kbd
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono ${
                      theme === "dark" ? "glass-effect text-slate-300" : "glass-effect-light text-slate-700"
                    }`}
                  >
                    #
                  </kbd>
                  <span className="hidden md:inline">for summaries,</span>
                  <kbd
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono ${
                      theme === "dark" ? "glass-effect text-slate-300" : "glass-effect-light text-slate-700"
                    }`}
                  >
                    ?
                  </kbd>
                  <span className="hidden sm:inline">for help</span>
                </div>
              </div>
            </div>

            {/* App Picker with Enhanced Glass Effect */}
            <div className="transition-smooth">
              <AppPicker />
            </div>
          </div>
        </div>
      </div>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}

interface SidebarItemProps {
  icon: React.ElementType
  label: string
  active?: boolean
  nested?: boolean
  theme: string
  onClick: () => void
}

function SidebarItem({ icon: Icon, label, active = false, nested = false, theme, onClick }: SidebarItemProps) {
  return (
    <div
      onClick={onClick}
      className={`
      flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm cursor-pointer transition-smooth
      ${
        active
          ? theme === "dark"
            ? "glass-effect text-white font-medium shadow-lg border border-emerald-400/30"
            : "glass-effect-light text-slate-900 font-medium shadow-lg border border-emerald-500/40"
          : theme === "dark"
            ? "text-slate-300 hover:glass-effect hover:text-white"
            : "text-slate-700 hover:glass-effect-light hover:text-slate-900"
      }
      ${nested ? "ml-4" : ""}
      hover:translate-x-1
    `}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </div>
  )
}
