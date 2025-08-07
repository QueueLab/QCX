"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import * as Tabs from "@radix-ui/react-tabs";
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { FormProvider, UseFormReturn } from "react-hook-form"; import React from "react";
import { Loader2, Save, RotateCcw } from "lucide-react"
// Or, if the file does not exist, create it as shown below.
import { SystemPromptForm } from "./system-prompt-form"
import { ModelSelectionForm } from "./model-selection-form"
import { UserManagementForm } from './user-management-form';
import { Form } from "@/components/ui/form"
import { useToast } from "@/components/ui/hooks/use-toast"
import { getSystemPrompt, saveSystemPrompt } from "../../../lib/actions/chat" // Added import

// Define the form schema
const settingsFormSchema = z.object({
  systemPrompt: z
    .string()
    .min(10, {
      message: "System prompt must be at least 10 characters.",
    })
    .max(2000, {
      message: "System prompt cannot exceed 2000 characters.",
    }),
  selectedModel: z.string({
    required_error: "Please select a model.",
  }),
  showReasoning: z.boolean(),
  users: z.array(
    z.object({
      id: z.string(),
      email: z.string().email(),
      role: z.enum(["admin", "editor", "viewer"]),
    }),
  ),
  newUserEmail: z.string().email().optional(),
  newUserRole: z.enum(["admin", "editor", "viewer"]).optional(),
})

export type SettingsFormValues = z.infer<typeof settingsFormSchema>

// Default values
const defaultValues: Partial<SettingsFormValues> = {
  systemPrompt:
    "You are a planetary copilot, an AI assistant designed to help users with information about planets, space exploration, and astronomy. Provide accurate, educational, and engaging responses about our solar system and beyond.",
  selectedModel: "gpt-4o",
  showReasoning: false,
  users: [
    { id: "1", email: "admin@example.com", role: "admin" },
    { id: "2", email: "user@example.com", role: "editor" },
  ],
}

interface SettingsProps {
  initialTab?: string;
}

export function Settings({ initialTab = "system-prompt" }: SettingsProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [currentTab, setCurrentTab] = useState(initialTab);

  useEffect(() => {
    setCurrentTab(initialTab);
  }, [initialTab]);

  // TODO: Replace 'anonymous' with actual user ID from session/auth context
  const userId = 'anonymous';

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues,
  })

  useEffect(() => {
    async function fetchPrompt() {
      const existingPrompt = await getSystemPrompt(userId);
      if (existingPrompt) {
        form.setValue("systemPrompt", existingPrompt, { shouldValidate: true, shouldDirty: false });
      }
      const showReasoning = localStorage.getItem("showReasoning");
      if (showReasoning) {
        form.setValue("showReasoning", JSON.parse(showReasoning), { shouldValidate: true, shouldDirty: false });
      }
    }
    fetchPrompt();
  }, [form, userId]);

  const showReasoning = form.watch("showReasoning");
  useEffect(() => {
    localStorage.setItem("showReasoning", JSON.stringify(showReasoning));
  }, [showReasoning]);

  async function onSubmit(data: SettingsFormValues) {
    setIsLoading(true)

    try {
      // Save the system prompt
      const saveResult = await saveSystemPrompt(userId, data.systemPrompt);

      if (saveResult?.error) {
        throw new Error(saveResult.error);
      }

      // Simulate other API calls if necessary or remove if only saving system prompt for this form
      await new Promise((resolve) => setTimeout(resolve, 200)) // Shorter delay now
      console.log("Submitted data (including system prompt):", data)

      // Success notification
      toast({
        title: "Settings updated",
        description: "Your settings have been saved successfully.",
      })

      // Refresh the page to reflect changes
      // router.refresh(); // Consider if refresh is needed or if optimistic update is enough
    } catch (error: any) {
      // Error notification
      toast({
        title: "Something went wrong",
        description: error.message || "Your settings could not be saved. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  function onReset() {
    form.reset(defaultValues)
    toast({
      title: "Settings reset",
      description: "Your settings have been reset to default values.",
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-6">
          <Tabs.Root value={currentTab} onValueChange={setCurrentTab} className="w-full">
            <Tabs.List className="grid w-full grid-cols-3 gap-x-2">
              <Tabs.Trigger value="system-prompt" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 data-[state=active]:bg-primary/80">System Prompt</Tabs.Trigger>
              <Tabs.Trigger value="model" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 data-[state=active]:bg-primary/80">Model Selection</Tabs.Trigger>
              <Tabs.Trigger value="user-management" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 data-[state=active]:bg-primary/80">User Management</Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="system-prompt">
              <Card>
                <CardHeader>
                  <CardTitle>System Prompt</CardTitle>
                  <CardDescription>Customize the behavior and persona of your planetary copilot</CardDescription>
                </CardHeader>
                <CardContent>
                  <SystemPromptForm form={form} />
                </CardContent>
              </Card>
            </Tabs.Content>

            <Tabs.Content value="model">
              <Card>
                <CardHeader>
                  <CardTitle>Model Selection</CardTitle>
                  <CardDescription>Choose the AI model that powers your planetary copilot</CardDescription>
                </CardHeader>
                <CardContent>
                  <ModelSelectionForm form={form} />
                </CardContent>
              </Card>
            </Tabs.Content>

            <Tabs.Content value="user-management">
              <UserManagementForm form={form} />
            </Tabs.Content>
          </Tabs.Root>

          <Card>
            <CardFooter className="flex justify-between pt-6">
              <Button type="button" variant="outline" onClick={onReset} disabled={isLoading}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset to Defaults
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </Form>
  )
}
