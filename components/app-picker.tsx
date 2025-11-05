"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExternalLink, Clock, Crown, Upload, FileText, Trash2, Eye, Zap, Activity, Brain } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { useToast } from "@/hooks/use-toast"

interface UploadedFile {
  id: string
  name: string
  size: string
  uploadDate: string
  type: string
}

interface AppCardProps {
  name: string
  description: string
  isClickable: boolean
  href?: string
  uptime?: string
  lastSession?: string
  tier?: string
  comingSoon?: boolean
  theme: string
  onUploadClick: (e: React.MouseEvent) => void
  uploadedFiles: UploadedFile[]
}

function AppCard({
  name,
  description,
  isClickable,
  href,
  uptime,
  lastSession,
  tier,
  comingSoon,
  theme,
  onUploadClick,
  uploadedFiles,
}: AppCardProps) {
  const handleCardClick = (e: React.MouseEvent) => {
    // Only navigate if clicking on the card itself, not on interactive elements
    const target = e.target as HTMLElement
    if (target.closest("button") || target.closest('[role="button"]')) {
      return
    }

    if (isClickable && href) {
      window.open(href, "_blank", "noopener,noreferrer")
    }
  }

  const getAppIcon = (appName: string) => {
    switch (appName) {
      case "QCX":
        return <Zap className="w-6 h-6" />
      case "Fluid":
        return <Activity className="w-6 h-6" />
      case "EVA":
        return <Brain className="w-6 h-6" />
      default:
        return <FileText className="w-6 h-6" />
    }
  }

  return (
    <Card
      className={`group ${
        theme === "dark" ? "glass-effect" : "glass-effect-light"
      } transition-fluid hover:scale-[1.02] ${
        isClickable ? (theme === "dark" ? "hover:shadow-2xl hover:border-white/30" : "hover:shadow-2xl hover:border-emerald-300/50") : "opacity-60"
      } ${isClickable ? "cursor-pointer" : ""} overflow-hidden relative shadow-xl`}
      onClick={handleCardClick}
    >
      {/* Gradient overlay for visual appeal */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${
          theme === "dark" ? "from-emerald-600/10 to-blue-600/10" : "from-emerald-400/15 to-blue-400/15"
        } opacity-0 group-hover:opacity-100 transition-fluid`}
      />

      <CardContent className="p-6 relative z-10">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <div
                className={`p-3 rounded-2xl ${
                  theme === "dark" ? "glass-effect text-emerald-400" : "glass-effect-light text-emerald-600"
                } transition-smooth group-hover:scale-110 shadow-lg`}
              >
                {getAppIcon(name)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-slate-900"}`}>{name}</h3>
                  {isClickable && (
                    <ExternalLink
                      className={`w-4 h-4 ${theme === "dark" ? "text-slate-400" : "text-slate-600"} opacity-0 group-hover:opacity-100 transition-opacity duration-200`}
                    />
                  )}
                  {comingSoon && (
                    <Badge
                      variant="secondary"
                      className={`${
                        theme === "dark" ? "bg-yellow-600/20 text-yellow-400" : "bg-yellow-500/20 text-yellow-700"
                      } animate-pulse`}
                    >
                      Coming Soon
                    </Badge>
                  )}
                </div>
                <p className={`text-base ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>{description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Status Information */}
        {isClickable && uptime && lastSession && tier && (
          <div className="space-y-3 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${uptime === "99.9%" ? "bg-green-500" : "bg-yellow-500"} animate-pulse`}
                ></div>
                <span className={`text-sm font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                  {uptime} uptime
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Clock className={`w-4 h-4 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`} />
                <span className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                  {lastSession}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Crown className={`w-4 h-4 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`} />
                <span className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>{tier}</span>
              </div>
            </div>
          </div>
        )}

        {/* Data Upload Section */}
        <div className={`border-t pt-4 ${theme === "dark" ? "border-white/10" : "border-black/10"}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className={`w-4 h-4 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`} />
              <span className={`text-sm font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Data Files
              </span>
              {uploadedFiles.length > 0 && (
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    theme === "dark" ? "border-white/20 text-slate-400" : "border-black/20 text-slate-600"
                  }`}
                >
                  {uploadedFiles.length}
                </Badge>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={onUploadClick}
              className={`rounded-xl ${
                theme === "dark"
                  ? "glass-button text-slate-300 hover:text-white"
                  : "glass-button-light text-emerald-700 hover:text-emerald-800"
              } transition-smooth hover:scale-105 shadow-md`}
            >
              <Upload className="w-3 h-3 mr-1" />
              Upload
            </Button>
          </div>

          <div className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
            {uploadedFiles.length > 0
              ? `${uploadedFiles.length} file${uploadedFiles.length > 1 ? "s" : ""} uploaded`
              : "No files uploaded yet"}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function AppPicker() {
  const { theme } = useTheme()
  const { toast } = useToast()
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedApp, setSelectedApp] = useState<string>("")
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, UploadedFile[]>>({
    QCX: [
      { id: "1", name: "user_preferences.json", size: "2.4 KB", uploadDate: "2024-01-15", type: "JSON" },
      { id: "2", name: "activity_log.csv", size: "156 KB", uploadDate: "2024-01-14", type: "CSV" },
    ],
    Fluid: [],
    EVA: [],
  })

  const apps = [
    {
      name: "QCX",
      description: "Multi-agent intelligence platform for exploration and automation",
      isClickable: true,
      href: "https://planet.queue.cx",
      uptime: "99.9%",
      lastSession: "2 hours ago",
      tier: "Standard",
    },
    {
      name: "Fluid",
      description: "Advanced benchmark suite for multi-agent systems",
      isClickable: false,
      comingSoon: true,
    },
    {
      name: "EVA",
      description: "Environment-aware AI agents with contextual intelligence",
      isClickable: false,
      comingSoon: true,
    },
  ]

  const handleUploadClick = (e: React.MouseEvent, appName: string) => {
    e.stopPropagation() // Prevent card click
    e.preventDefault()
    setSelectedApp(appName)
    setUploadDialogOpen(true)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const newFiles: UploadedFile[] = Array.from(files).map((file, index) => ({
      id: `${Date.now()}-${index}`,
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
      uploadDate: new Date().toISOString().split("T")[0],
      type: file.name.split(".").pop()?.toUpperCase() || "FILE",
    }))

    setUploadedFiles((prev) => ({
      ...prev,
      [selectedApp]: [...(prev[selectedApp] || []), ...newFiles],
    }))

    toast({
      title: "Files Uploaded Successfully",
      description: `${newFiles.length} file${newFiles.length > 1 ? "s" : ""} uploaded to ${selectedApp}`,
    })

    setUploadDialogOpen(false)
  }

  const handleDeleteFile = (appName: string, fileId: string) => {
    setUploadedFiles((prev) => ({
      ...prev,
      [appName]: prev[appName]?.filter((file) => file.id !== fileId) || [],
    }))

    toast({
      title: "File Deleted",
      description: "File has been removed successfully",
    })
  }

  return (
    <>
      <div className="space-y-8">
        <div>
          <h2 className={`text-3xl font-bold mb-4 ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
            Your Applications
          </h2>
          <p className={`text-lg ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
            Access your QueueCX applications and manage your data seamlessly
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {apps.map((app) => (
            <AppCard
              key={app.name}
              {...app}
              theme={theme}
              onUploadClick={(e) => handleUploadClick(e, app.name)}
              uploadedFiles={uploadedFiles[app.name] || []}
            />
          ))}
        </div>
      </div>

      {/* Enhanced Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent
          className={`max-w-5xl max-h-[85vh] ${
            theme === "dark" ? "bg-black/40" : "bg-white/40"
          } backdrop-blur-xl border-white/10`}
        >
          <DialogHeader>
            <DialogTitle className={`text-xl font-semibold ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
              Manage Data for {selectedApp}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="upload" className="w-full">
            <TabsList
              className={`grid w-full grid-cols-2 ${
                theme === "dark" ? "bg-black/20 border-white/10" : "bg-white/20 border-black/10"
              } backdrop-blur-xl border`}
            >
              <TabsTrigger
                value="upload"
                className={`${
                  theme === "dark"
                    ? "data-[state=active]:bg-blue-600/30 text-slate-300 data-[state=active]:text-white"
                    : "data-[state=active]:bg-green-600/20 text-slate-700 data-[state=active]:text-slate-900"
                }`}
              >
                Upload Files
              </TabsTrigger>
              <TabsTrigger
                value="view"
                className={`${
                  theme === "dark"
                    ? "data-[state=active]:bg-blue-600/30 text-slate-300 data-[state=active]:text-white"
                    : "data-[state=active]:bg-green-600/20 text-slate-700 data-[state=active]:text-slate-900"
                }`}
              >
                View Files ({uploadedFiles[selectedApp]?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="file-upload"
                    className={`text-base font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}
                  >
                    Select files to upload to {selectedApp}
                  </Label>
                  <p className={`text-sm mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                    Supported formats: JSON, CSV, TXT, PDF, XLSX • Maximum file size: 10MB per file
                  </p>
                </div>

                <div
                  className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 hover:scale-[1.01] ${
                    theme === "dark"
                      ? "border-white/20 bg-black/10 hover:bg-black/20"
                      : "border-black/20 bg-white/20 hover:bg-white/30"
                  } backdrop-blur-sm`}
                >
                  <Upload
                    className={`w-16 h-16 mx-auto mb-6 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}
                  />
                  <p className={`text-xl font-medium mb-3 ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                    Drop files here or click to browse
                  </p>
                  <p className={`text-base mb-6 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                    Drag and drop your files or click the button below
                  </p>
                  <Input
                    id="file-upload"
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".json,.csv,.txt,.pdf,.xlsx,.xls"
                  />
                  <Button
                    onClick={() => document.getElementById("file-upload")?.click()}
                    size="lg"
                    className={`${
                      theme === "dark"
                        ? "bg-blue-600/80 hover:bg-blue-600 text-white"
                        : "bg-green-600/80 hover:bg-green-600 text-white"
                    } transition-all duration-200 hover:scale-105`}
                  >
                    <Upload className="w-5 h-5 mr-2" />
                    Choose Files
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="view" className="space-y-4">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {uploadedFiles[selectedApp]?.length > 0 ? (
                  uploadedFiles[selectedApp].map((file) => (
                    <div
                      key={file.id}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 hover:scale-[1.01] ${
                        theme === "dark"
                          ? "border-white/10 bg-black/10 hover:bg-black/20"
                          : "border-black/10 bg-white/20 hover:bg-white/30"
                      } backdrop-blur-sm`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-2 rounded-lg ${
                            theme === "dark" ? "bg-blue-600/20 text-blue-400" : "bg-green-600/20 text-green-600"
                          }`}
                        >
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className={`font-medium ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                            {file.name}
                          </p>
                          <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                            {file.size} • {file.type} • {file.uploadDate}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`${
                            theme === "dark"
                              ? "text-slate-300 hover:text-white hover:bg-white/10"
                              : "text-slate-700 hover:text-slate-900 hover:bg-black/10"
                          } transition-all duration-200 hover:scale-105`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteFile(selectedApp, file.id)}
                          className={`${
                            theme === "dark"
                              ? "text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              : "text-red-600 hover:text-red-700 hover:bg-red-500/10"
                          } transition-all duration-200 hover:scale-105`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <FileText
                      className={`w-16 h-16 mx-auto mb-4 opacity-50 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}
                    />
                    <p className={`text-lg ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                      No files uploaded to {selectedApp} yet
                    </p>
                    <p className={`text-sm mt-2 ${theme === "dark" ? "text-slate-500" : "text-slate-500"}`}>
                      Upload your first file to get started
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  )
}
