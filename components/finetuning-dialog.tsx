"use client"

import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare, Zap, Settings, Activity, Clock, Terminal } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTheme } from "@/components/theme-provider"

interface FinetuningDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface TrainingLog {
  id: number
  title: string
  date: string
  time: string
  loss: string
  rank?: number
}

const trainingLogs: TrainingLog[] = [
  { id: 1, title: "Initial Run", date: "2025-10-05", time: "19:34:00", loss: "0.182", rank: 1 },
  { id: 2, title: "Split Dataset", date: "2025-10-06", time: "10:15:00", loss: "0.165" },
  { id: 3, title: "Rank 1 LoRA", date: "2025-10-06", time: "14:22:00", loss: "0.189" },
  { id: 4, title: "Assistant First Conversation", date: "2025-10-06", time: "16:45:00", loss: "0.174" },
  { id: 5, title: "Rank 8 LoRA", date: "2025-10-06", time: "18:30:00", loss: "0.161" },
  { id: 6, title: "Lower LR Fine-tune", date: "2025-10-06", time: "20:15:00", loss: "0.158" },
]

const conversationSample = `EXAMPLE 001: IT sometimes gets into modes where it sounds more assistant/AI than me
6 turns

You
what do you want in life?

Bot
I want to be happy and to be able to help`

export function FinetuningDialog({ open, onOpenChange }: FinetuningDialogProps) {
  const { theme } = useTheme()
  const [selectedLog, setSelectedLog] = useState<TrainingLog>(trainingLogs[0])
  const [temperature, setTemperature] = useState<number[]>([0.7])
  const [maxTokens, setMaxTokens] = useState<number[]>([100])
  const [topP, setTopP] = useState<number[]>([0.9])

  const isDark = theme === "dark"

  const cardClass = cn(
    "transition-smooth",
    isDark ? "glass-effect border-white/10" : "glass-effect-light border-black/10"
  )

  const headerClass = cn(
    "text-lg font-semibold",
    isDark ? "text-white" : "text-slate-900"
  )

  const labelClass = cn(
    "text-sm font-medium",
    isDark ? "text-slate-300" : "text-slate-700"
  )

  const valueClass = cn(
    "text-sm font-mono",
    isDark ? "text-emerald-400" : "text-emerald-600"
  )

  const logItemClass = (log: TrainingLog) => cn(
    "flex flex-col p-3 rounded-lg cursor-pointer transition-all duration-200",
    isDark ? "hover:bg-white/10" : "hover:bg-black/5",
    log.id === selectedLog.id
      ? isDark ? "bg-emerald-600/30 text-white font-medium border border-emerald-400/30" : "bg-emerald-600/10 text-slate-900 font-medium border border-emerald-500/40"
      : isDark ? "text-slate-300" : "text-slate-700"
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0",
        isDark ? "bg-black/40 backdrop-blur-xl border-white/10" : "bg-white/40 backdrop-blur-xl border-black/10"
      )}>
        <DialogHeader className="p-4 border-b border-border/50">
          <DialogTitle className={headerClass}>Finetuning Interface</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          {/* Left Panel: Training Logs */}
          <div className={cn(
            "w-72 flex flex-col border-r",
            isDark ? "border-white/10" : "border-black/10"
          )}>
            <div className="p-4">
              <h3 className={cn("text-sm font-bold uppercase tracking-wider", isDark ? "text-slate-400" : "text-slate-600")}>
                Training Logs
              </h3>
            </div>
            <ScrollArea className="flex-1 px-2 pb-4">
              <div className="space-y-2">
                {trainingLogs.map((log) => (
                  <div
                    key={log.id}
                    className={logItemClass(log)}
                    onClick={() => setSelectedLog(log)}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm">{log.title}</p>
                      {log.rank && (
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs font-mono",
                            isDark ? "bg-emerald-600/50 text-white" : "bg-emerald-600/20 text-emerald-800"
                          )}
                        >
                          #{log.rank}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1">
                      <p className={cn("font-mono", isDark ? "text-slate-400" : "text-slate-600")}>
                        {log.date} {log.time}
                      </p>
                      <p className={cn("font-mono", isDark ? "text-red-400" : "text-red-600")}>
                        Loss: {log.loss}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel: Inference and Metrics */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Top Section: Inference */}
            <div className={cn(
              "p-4 border-b",
              isDark ? "border-white/10" : "border-black/10"
            )}>
              <h3 className={cn("text-sm font-bold uppercase tracking-wider", isDark ? "text-slate-400" : "text-slate-600")}>
                Inference
              </h3>
              <div className="flex items-center justify-between mt-2">
                <p className={headerClass}>Interactive Chat</p>
                <Button variant="outline" size="sm" className={cn(
                  isDark ? "glass-button text-slate-300 hover:text-white" : "glass-button-light text-slate-700 hover:text-slate-900"
                )}>
                  <Zap className="w-4 h-4 mr-2" />
                  Run Inference
                </Button>
              </div>
            </div>

            <div className="flex flex-1 min-h-0">
              {/* Middle Section: Metrics and Configuration */}
              <div className={cn(
                "w-1/2 flex flex-col p-4 border-r",
                isDark ? "border-white/10" : "border-black/10"
              )}>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <Card className={cardClass}>
                    <CardHeader className="p-3">
                      <CardTitle className={cn("text-xs font-bold uppercase", isDark ? "text-slate-400" : "text-slate-600")}>Loss</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <p className={cn("text-2xl font-bold", isDark ? "text-red-400" : "text-red-600")}>0.1654</p>
                    </CardContent>
                  </Card>
                  <Card className={cardClass}>
                    <CardHeader className="p-3">
                      <CardTitle className={cn("text-xs font-bold uppercase", isDark ? "text-slate-400" : "text-slate-600")}>Perplexity</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <p className={cn("text-2xl font-bold", isDark ? "text-blue-400" : "text-blue-600")}>5.52</p>
                    </CardContent>
                  </Card>
                  <Card className={cardClass}>
                    <CardHeader className="p-3">
                      <CardTitle className={cn("text-xs font-bold uppercase", isDark ? "text-slate-400" : "text-slate-600")}>Num Tokens</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <p className={cn("text-2xl font-bold", isDark ? "text-emerald-400" : "text-emerald-600")}>8,342</p>
                    </CardContent>
                  </Card>
                </div>

                <Card className={cn(cardClass, "mb-6")}>
                  <CardHeader className="p-4">
                    <CardTitle className={cn("text-sm font-bold uppercase tracking-wider", isDark ? "text-slate-400" : "text-slate-600")}>
                      Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className={labelClass}>BASE MODEL</p>
                        <p className={valueClass}>Qwen/Qwen-8B-Base</p>
                      </div>
                      <div className="space-y-1">
                        <p className={labelClass}>DATASET</p>
                        <p className={valueClass}>fb_msgs.split_jsonl</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className={labelClass}>CHECKPOINT PATH</p>
                      <p className={valueClass}>tinker://61224af2-ab0a-41bc-8b0b-cd9dc26b6ab7/sampler_weights/final</p>
                    </div>
                    <Separator className={isDark ? "bg-white/10" : "bg-black/10"} />
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <p className={labelClass}>LEARNING RATE</p>
                        <p className={valueClass}>0.00002</p>
                      </div>
                      <div className="space-y-1">
                        <p className={labelClass}>BATCH SIZE</p>
                        <p className={valueClass}>16</p>
                      </div>
                      <div className="space-y-1">
                        <p className={labelClass}>LORA RANK</p>
                        <p className={valueClass}>16</p>
                      </div>
                      <div className="space-y-1">
                        <p className={labelClass}>EVAL EVERY</p>
                        <p className={valueClass}>100</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={cardClass}>
                  <CardHeader className="p-4">
                    <CardTitle className={cn("text-sm font-bold uppercase tracking-wider", isDark ? "text-slate-400" : "text-slate-600")}>
                      Conversation Samples
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <pre className={cn(
                      "whitespace-pre-wrap p-3 rounded-lg text-xs font-mono overflow-auto",
                      isDark ? "bg-black/20 text-white" : "bg-white/50 text-slate-900"
                    )}>
                      {conversationSample}
                    </pre>
                  </CardContent>
                </Card>
              </div>

              {/* Right Section: Sampling Parameters and Chat */}
              <div className="w-1/2 flex flex-col p-4 space-y-6">
                <Card className={cardClass}>
                  <CardHeader className="p-4">
                    <CardTitle className={cn("text-sm font-bold uppercase tracking-wider", isDark ? "text-slate-400" : "text-slate-600")}>
                      Sampling Parameters
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className={labelClass}>Temperature</Label>
                        <span className={valueClass}>{temperature[0].toFixed(1)}</span>
                      </div>
                      <Slider
                        defaultValue={[0.7]}
                        max={1.0}
                        step={0.1}
                        onValueChange={setTemperature}
                        className="[&>span:first-child]:h-2 [&>span:first-child]:bg-emerald-500/50 [&>span:first-child>span]:bg-emerald-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className={labelClass}>Max Tokens</Label>
                        <span className={valueClass}>{maxTokens[0]}</span>
                      </div>
                      <Slider
                        defaultValue={[100]}
                        max={512}
                        step={1}
                        onValueChange={setMaxTokens}
                        className="[&>span:first-child]:h-2 [&>span:first-child]:bg-blue-500/50 [&>span:first-child>span]:bg-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className={labelClass}>Top P</Label>
                        <span className={valueClass}>{topP[0].toFixed(1)}</span>
                      </div>
                      <Slider
                        defaultValue={[0.9]}
                        max={1.0}
                        step={0.1}
                        onValueChange={setTopP}
                        className="[&>span:first-child]:h-2 [&>span:first-child]:bg-red-500/50 [&>span:first-child>span]:bg-red-500"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className={cn(cardClass, "flex-1 flex flex-col min-h-0")}>
                  <CardHeader className="p-4">
                    <CardTitle className={cn("text-sm font-bold uppercase tracking-wider", isDark ? "text-slate-400" : "text-slate-600")}>
                      Chat Window
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col p-4 pt-0 min-h-0">
                    <ScrollArea className="flex-1 mb-4">
                      <p className={cn("text-sm", isDark ? "text-slate-400" : "text-slate-600")}>No messages yet. Start a conversation!</p>
                    </ScrollArea>
                    <div className="flex items-center">
                      <Input
                        placeholder="Type message..."
                        className={cn(
                          "flex-1 mr-2",
                          isDark ? "bg-black/20 border-white/10 text-white placeholder:text-slate-400" : "bg-white/50 border-black/10 text-slate-900 placeholder:text-slate-600"
                        )}
                      />
                      <Button size="icon" className={cn(
                        isDark ? "bg-emerald-600 hover:bg-emerald-700" : "bg-emerald-600 hover:bg-emerald-700"
                      )}>
                        <Terminal className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
