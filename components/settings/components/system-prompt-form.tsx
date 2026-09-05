import React, { useState, useEffect } from 'react'
import type { UseFormReturn } from "react-hook-form"
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Sparkles, Trash2 } from "lucide-react"
import { useToast } from "@/components/ui/hooks/use-toast"
import { startSystemPromptGeneration, getSystemPromptGenerationJob } from "@/lib/actions/system-prompt"
import { deleteSystemPrompt } from "@/lib/actions/chat"

interface SystemPromptFormProps {
  form: UseFormReturn<any>
}

export function SystemPromptForm({ form }: SystemPromptFormProps) {
  const { toast } = useToast()
  const systemPrompt = form.watch("systemPrompt")
  const domain = form.watch("domain")
  const characterCount = systemPrompt?.length || 0
  const [jobId, setJobId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleGenerate = async () => {
    const rawDomain = form.getValues("domain") || domain
    const trimmedDomain = rawDomain ? rawDomain.trim() : ""

    if (!trimmedDomain) {
      toast({
        title: "Domain required",
        description: "Please enter a domain to generate a system prompt.",
        variant: "destructive",
      })
      return
    }

    const normalizedDomain = /^https?:\/\//i.test(trimmedDomain)
      ? trimmedDomain
      : `https://${trimmedDomain}`

    setIsGenerating(true)
    const result = await startSystemPromptGeneration(normalizedDomain)

    if (result.error) {
      toast({
        title: "Generation failed",
        description: result.error,
        variant: "destructive",
      })
      setIsGenerating(false)
    } else if (result.jobId) {
      setJobId(result.jobId)
    }
  }

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (jobId) {
      const pollStartTime = Date.now()
      const MAX_POLL_DURATION = 120000 // 2 minutes

      interval = setInterval(async () => {
        const elapsed = Date.now() - pollStartTime
        if (elapsed > MAX_POLL_DURATION) {
          if (interval) clearInterval(interval)
          setJobId(null)
          setIsGenerating(false)
          toast({
            title: "Generation timeout",
            description: "The prompt generation took too long. Please try again.",
            variant: "destructive",
          })
          return
        }

        const job = await getSystemPromptGenerationJob(jobId)

        if (job.error || job.status === 'error') {
          if (interval) clearInterval(interval)
          setJobId(null)
          setIsGenerating(false)
          toast({
            title: "Generation error",
            description: job.errorMessage || job.error || "An error occurred during generation.",
            variant: "destructive",
          })
        } else if (job.status === 'complete') {
          if (interval) clearInterval(interval)
          setJobId(null)
          setIsGenerating(false)
          if (job.resultPrompt) {
            form.setValue("systemPrompt", job.resultPrompt, { shouldValidate: true, shouldDirty: true })
            toast({
              title: "Prompt generated",
              description: "Your system prompt has been generated based on the domain content.",
            })
          }
        }
      }, 3000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [jobId, form, toast])

  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="domain"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Business Domain</FormLabel>
            <div className="flex gap-2">
              <FormControl>
                <Input
                  placeholder="example.com"
                  {...field}
                  disabled={isGenerating}
                />
              </FormControl>
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !domain}
                className="shrink-0"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate
                  </>
                )}
              </Button>
            </div>
            <FormDescription>
              Enter your business website to automatically generate a tailored system prompt.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="systemPrompt"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>System</FormLabel>
              {systemPrompt?.trim() && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isDeleting}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                  onClick={async () => {
                    setIsDeleting(true)
                    try {
                      const res = await deleteSystemPrompt()
                      if (res?.error) {
                        toast({
                          title: "Error deleting system prompt",
                          description: res.error,
                          variant: "destructive",
                        })
                        return
                      }

                      form.setValue("systemPrompt", "", { shouldValidate: true, shouldDirty: true })
                      toast({
                        title: "System prompt cleared",
                        description: "Your system prompt has been cleared and reset.",
                      })
                    } finally {
                      setIsDeleting(false)
                    }
                  }}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Delete Prompt
                </Button>
              )}
            </div>
            <FormControl>
              <Textarea
                placeholder="Enter the system prompt for your planetary copilot..."
                className="min-h-[200px] resize-y"
                {...field}
              />
            </FormControl>
            <FormDescription className="flex justify-between">
              <span>Define how your copilot should behave and respond to user queries.</span>
              <span className={characterCount > 1800 ? "text-amber-500" : ""}>{characterCount}/2000</span>
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
