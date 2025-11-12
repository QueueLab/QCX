"use client"

import type React from "react"

import { useState, useTransition, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { SearchDialog } from "@/components/search-dialog"
import { useTheme } from "@/components/theme-provider"
import { useAuth } from "@/components/auth/auth-provider"
import { updatePersonalization } from "@/app/actions/profile-actions"
import { useRouter } from "next/navigation"
import {
  Search,
  Activity,
  MessageSquare,
  SettingsIcon,
  HelpCircle,
  Download,
  Loader2,
  Sun,
  Moon,
  LogOut,
  Save,
  Clock,
  Sparkles,
} from "lucide-react"
import Image from "next/image"

const mockPersonalization = {
  systemPrompt:
    "You are a helpful AI assistant designed to support productivity and creative work. Please provide clear, actionable responses and ask clarifying questions when needed. Maintain a professional yet friendly tone in all interactions.",
}

export default function ContextPage() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [systemPrompt, setSystemPrompt] = useState(mockPersonalization.systemPrompt)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const { user, signOut, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Don't do anything while loading
    if (loading) return

    // If no user after loading is complete, we're in demo mode
    if (!user) {
      // In demo mode, we can still show the page
      return
    }
  }, [user, loading])

  const handleSave = async () => {
    startTransition(async () => {
      const result = await updatePersonalization({ systemPrompt, notes: "" })
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: result.message,
        })
      }
    })
  }

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
    // Remove the router.push("/landing") line
  }

  const handleNavigation = (path: string) => {
    router.push(path)
  }

  const formatLastSaved = () => {
    return "Auto-saved 2 minutes ago"
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
        {/* Sidebar */}
        <div
          className={`w-64 ${
            theme === "dark" ? "glass-sidebar" : "glass-sidebar-light"
          } flex flex-col relative z-10 transition-smooth shadow-2xl`}
        >
          <div className={`p-4 border-b ${theme === "dark" ? "border-white/10" : "border-black/10"}`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 relative">
                <Image
                  src="/logo.png"
                  alt="QueueCX"
                  width={32}
                  height={32}
                  className={theme === "dark" ? "invert" : ""}
                />
              </div>
              <span className={`font-semibold text-lg ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                QueueCX
              </span>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 px-3 py-2 h-auto ${
                theme === "dark"
                  ? "text-slate-300 hover:bg-white/10 hover:text-white"
                  : "text-slate-700 hover:bg-black/10 hover:text-slate-900"
              } backdrop-blur-sm`}
              onClick={() => setSearchOpen(true)}
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
            </Button>

            <div className="space-y-1 pt-4">
              <SidebarItem
                icon={Activity}
                label="My Activity"
                theme={theme}
                onClick={() => handleNavigation("/dashboard")}
              />
              <SidebarItem icon={MessageSquare} label="Context" active nested theme={theme} onClick={() => {}} />
              <SidebarItem
                icon={SettingsIcon}
                label="Settings"
                theme={theme}
                onClick={() => handleNavigation("/settings")}
              />
            </div>
          </nav>

          <div className={`p-4 border-t ${theme === "dark" ? "border-white/10" : "border-black/10"} space-y-2`}>
            <SidebarItem icon={HelpCircle} label="Help Center" theme={theme} onClick={() => {}} />
            <SidebarItem icon={Download} label="Download QueueCX" theme={theme} onClick={() => {}} />

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.user_metadata?.avatar_url || "/placeholder.svg"} />
                  <AvatarFallback
                    className={`${
                      theme === "dark" ? "bg-blue-600/50 text-white" : "bg-blue-600/70 text-white"
                    } backdrop-blur-sm`}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                    {displayName}
                  </p>
                  <p className={`text-xs truncate ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                    {user?.email || "demo@queuecx.com"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleThemeToggle}
                  className={`${
                    theme === "dark"
                      ? "text-slate-300 hover:text-white hover:bg-white/10"
                      : "text-slate-700 hover:text-slate-900 hover:bg-black/10"
                  }`}
                >
                  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className={`${
                    theme === "dark"
                      ? "text-slate-300 hover:text-white hover:bg-white/10"
                      : "text-slate-700 hover:text-slate-900 hover:bg-black/10"
                  }`}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col relative z-10 overflow-auto">
          <div className="max-w-4xl mx-auto p-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`p-3 rounded-2xl ${
                    theme === "dark" ? "glass-effect text-emerald-400" : "glass-effect-light text-emerald-600"
                  } transition-smooth shadow-lg`}
                >
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h1 className={`text-3xl font-bold ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                    Context
                  </h1>
                  <p className={`text-lg ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                    Personalize your AI assistant's behavior and responses
                  </p>
                </div>
              </div>
            </div>

            {/* Main Context Card */}
            <Card
              className={`mb-8 ${
                theme === "dark" ? "glass-effect" : "glass-effect-light"
              } transition-smooth shadow-xl border-0`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className={`text-xl font-mono ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                      System Prompt
                    </CardTitle>
                    <CardDescription className={`font-mono ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                      Define how your AI assistant should behave and respond to your requests
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className={`w-4 h-4 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`} />
                    <span className={`text-sm font-mono ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                      {formatLastSaved()}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Large Text Area */}
                <div className="space-y-4">
                  <Textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="Enter your personalization instructions here..."
                    className={`min-h-[400px] font-mono text-base leading-relaxed p-6 rounded-xl resize-none border-2 transition-all duration-200 ${
                      theme === "dark"
                        ? "bg-black/10 border-white/10 text-white placeholder:text-slate-400 focus:border-blue-500/50 focus:bg-black/20"
                        : "bg-white/60 border-black/10 text-slate-900 placeholder:text-slate-600 focus:border-green-500/50 focus:bg-white/80"
                    } backdrop-blur-sm`}
                    maxLength={2000}
                  />
                  <div
                    className={`flex items-center justify-between text-sm font-mono ${
                      theme === "dark" ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    <span>{systemPrompt.length}/2000 characters</span>
                    <div className="flex items-center gap-4">
                      <Button
                        onClick={handleSave}
                        disabled={isPending}
                        className={`font-mono ${
                          theme === "dark"
                            ? "bg-emerald-600/80 hover:bg-emerald-600 text-white"
                            : "bg-emerald-600/80 hover:bg-emerald-600 text-white"
                        } transition-fluid hover:scale-105 shadow-lg`}
                      >
                        {isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Context
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tips Card */}
            <Card
              className={`mb-8 ${
                theme === "dark" ? "glass-effect" : "glass-effect-light"
              } transition-smooth shadow-xl border-0`}
            >
              <CardHeader>
                <CardTitle
                  className={`flex items-center gap-2 font-mono ${theme === "dark" ? "text-white" : "text-slate-900"}`}
                >
                  <Sparkles className="w-5 h-5" />
                  Personalization Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h3 className={`font-mono font-semibold ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                      Communication Style
                    </h3>
                    <ul
                      className={`space-y-2 text-sm font-mono ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}
                    >
                      <li>• Specify your preferred tone (formal, casual, friendly)</li>
                      <li>• Define response length preferences</li>
                      <li>• Set communication boundaries</li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h3 className={`font-mono font-semibold ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                      Work Context
                    </h3>
                    <ul
                      className={`space-y-2 text-sm font-mono ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}
                    >
                      <li>• Include your role and industry</li>
                      <li>• Mention specific tools you use</li>
                      <li>• Add relevant expertise areas</li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h3 className={`font-mono font-semibold ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                      Response Format
                    </h3>
                    <ul
                      className={`space-y-2 text-sm font-mono ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}
                    >
                      <li>• Request specific output formats</li>
                      <li>• Define structure preferences</li>
                      <li>• Set example requirements</li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h3 className={`font-mono font-semibold ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                      Constraints
                    </h3>
                    <ul
                      className={`space-y-2 text-sm font-mono ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}
                    >
                      <li>• Add any topic limitations</li>
                      <li>• Specify accuracy requirements</li>
                      <li>• Include safety guidelines</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Example Templates */}
            <Card
              className={`${
                theme === "dark" ? "glass-effect" : "glass-effect-light"
              } transition-smooth shadow-xl border-0`}
            >
              <CardHeader>
                <CardTitle className={`font-mono ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                  Example Templates
                </CardTitle>
                <CardDescription className={`font-mono ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                  Click to use these example prompts as starting points
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className={`h-auto p-4 text-left justify-start ${
                      theme === "dark"
                        ? "border-white/20 hover:bg-white/10 text-slate-300 hover:text-white"
                        : "border-black/20 hover:bg-black/10 text-slate-700 hover:text-slate-900"
                    } backdrop-blur-sm`}
                    onClick={() =>
                      setSystemPrompt(
                        "You are a professional software development assistant. Provide clear, well-documented code examples with explanations. Focus on best practices, security, and maintainability. Ask clarifying questions about requirements and constraints.",
                      )
                    }
                  >
                    <div className="space-y-2">
                      <h4 className="font-mono font-semibold">Software Developer</h4>
                      <p className="text-sm opacity-80 font-mono">Code-focused with best practices</p>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className={`h-auto p-4 text-left justify-start ${
                      theme === "dark"
                        ? "border-white/20 hover:bg-white/10 text-slate-300 hover:text-white"
                        : "border-black/20 hover:bg-black/10 text-slate-700 hover:text-slate-900"
                    } backdrop-blur-sm`}
                    onClick={() =>
                      setSystemPrompt(
                        "You are a creative writing assistant with expertise in storytelling, content creation, and marketing copy. Provide engaging, original content with strong narrative structure. Focus on audience engagement and brand voice consistency.",
                      )
                    }
                  >
                    <div className="space-y-2">
                      <h4 className="font-mono font-semibold">Content Creator</h4>
                      <p className="text-sm opacity-80 font-mono">Creative and engaging writing</p>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className={`h-auto p-4 text-left justify-start ${
                      theme === "dark"
                        ? "border-white/20 hover:bg-white/10 text-slate-300 hover:text-white"
                        : "border-black/20 hover:bg-black/10 text-slate-700 hover:text-slate-900"
                    } backdrop-blur-sm`}
                    onClick={() =>
                      setSystemPrompt(
                        "You are a business strategy consultant with expertise in data analysis, market research, and strategic planning. Provide actionable insights backed by data. Focus on ROI, scalability, and competitive advantage.",
                      )
                    }
                  >
                    <div className="space-y-2">
                      <h4 className="font-mono font-semibold">Business Analyst</h4>
                      <p className="text-sm opacity-80 font-mono">Data-driven strategic insights</p>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className={`h-auto p-4 text-left justify-start ${
                      theme === "dark"
                        ? "border-white/20 hover:bg-white/10 text-slate-300 hover:text-white"
                        : "border-black/20 hover:bg-black/10 text-slate-700 hover:text-slate-900"
                    } backdrop-blur-sm`}
                    onClick={() =>
                      setSystemPrompt(
                        "You are an educational tutor specializing in clear explanations and step-by-step learning. Break down complex topics into digestible parts. Use examples, analogies, and interactive elements to enhance understanding.",
                      )
                    }
                  >
                    <div className="space-y-2">
                      <h4 className="font-mono font-semibold">Educational Tutor</h4>
                      <p className="text-sm opacity-80 font-mono">Clear, step-by-step learning</p>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
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
      flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer transition-all duration-200
      ${
        active
          ? theme === "dark"
            ? "bg-blue-600/30 text-white font-medium backdrop-blur-sm"
            : "bg-green-600/20 text-slate-900 font-medium backdrop-blur-sm"
          : theme === "dark"
            ? "text-slate-300 hover:bg-white/10 hover:text-white hover:backdrop-blur-sm"
            : "text-slate-700 hover:bg-black/10 hover:text-slate-900 hover:backdrop-blur-sm"
      }
      ${nested ? "ml-4" : ""}
    `}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </div>
  )
}
