"use client"

import { useState } from "react"
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
import { UserManagementForm } from "./user-management-form"
import { ModelSelectionForm } from "./model-selection-form"
import { Form } from "@/components/ui/form"
import { useToast } from "@/components/ui/hooks/use-toast"

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

type SettingsFormValues = z.infer<typeof settingsFormSchema>

// Default values
const defaultValues: Partial<SettingsFormValues> = {
  systemPrompt:
    "You are a planetary copilot, an AI assistant designed to help users with information about planets, space exploration, and astronomy. Provide accurate, educational, and engaging responses about our solar system and beyond.",
  selectedModel: "gpt-4o",
  users: [
    { id: "1", email: "admin@example.com", role: "admin" },
    { id: "2", email: "user@example.com", role: "editor" },
  ],
}

export function Settings() {
  const { toast } = useToast()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues,
  })

  async function onSubmit(data: SettingsFormValues) {
    setIsLoading(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Use the data parameter to avoid unused variable error
      console.log("Submitted data:", data)

      // Success notification
      toast({
        title: "Settings updated",
        description: "Your settings have been saved successfully.",
      })

      // Refresh the page to reflect changes
      router.refresh()
    } catch (error) {
      // Error notification
      toast({
        title: "Something went wrong",
        description: "Your settings could not be saved. Please try again.",
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
          <Tabs.Root defaultValue="system-prompt" className="w-full">
            <Tabs.List className="grid w-full grid-cols-3">
              <Tabs.Trigger value="system-prompt">System Prompt</Tabs.Trigger>
              <Tabs.Trigger value="users">User Management</Tabs.Trigger>
              <Tabs.Trigger value="model">Model Selection</Tabs.Trigger>
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

            <Tabs.Content value="users">
              <Card>
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Invite users and manage access to your planetary copilot</CardDescription>
                </CardHeader>
                <CardContent>
                  <UserManagementForm form={form} />
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
