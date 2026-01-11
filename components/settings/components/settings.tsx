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
import { motion, AnimatePresence } from "framer-motion"
// Or, if the file does not exist, create it as shown below.
import { SystemPromptForm } from "./system-prompt-form"
import { ModelSelectionForm } from "./model-selection-form"
import { UserManagementForm } from './user-management-form';
import { Form } from "@/components/ui/form"
import { useSettingsStore, MapProvider } from "@/lib/store/settings";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/hooks/use-toast"
import { getSystemPrompt, saveSystemPrompt } from "../../../lib/actions/chat"
import { getSelectedModel, saveSelectedModel } from "../../../lib/actions/users"

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
  selectedModel: z.string().refine(value => value.trim() !== '', {
    message: "Please select a model.",
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

export type SettingsFormValues = z.infer<typeof settingsFormSchema>

// Default values
const defaultValues: Partial<SettingsFormValues> = {
  systemPrompt:
    "You are a planetary copilot, an AI assistant designed to help users with information about planets, space exploration, and astronomy. Provide accurate, educational, and engaging responses about our solar system and beyond.",
  selectedModel: "Grok 4.2",
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
  const { mapProvider, setMapProvider } = useSettingsStore();

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
    async function fetchData() {
      const [existingPrompt, selectedModel] = await Promise.all([
        getSystemPrompt(userId),
        getSelectedModel(),
      ]);

      if (existingPrompt) {
        form.setValue("systemPrompt", existingPrompt, { shouldValidate: true, shouldDirty: false });
      }
      if (selectedModel) {
        form.setValue("selectedModel", selectedModel, { shouldValidate: true, shouldDirty: false });
      }
    }
    fetchData();
  }, [form, userId]);

  async function onSubmit(data: SettingsFormValues) {
    setIsLoading(true)

    try {
      // Save the system prompt and selected model
      const [promptSaveResult, modelSaveResult] = await Promise.all([
        saveSystemPrompt(userId, data.systemPrompt),
        saveSelectedModel(data.selectedModel),
      ]);

      if (promptSaveResult?.error) {
        throw new Error(promptSaveResult.error);
      }
      if (modelSaveResult?.error) {
        throw new Error(modelSaveResult.error);
      }

      console.log("Submitted data:", data)

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
            <Tabs.List className="flex flex-wrap gap-2 md:grid md:w-full md:grid-cols-4 md:gap-x-2">
              <Tabs.Trigger value="system-prompt" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 data-[state=active]:bg-primary/80">System Prompt</Tabs.Trigger>
              <Tabs.Trigger value="model" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 data-[state=active]:bg-primary/80">Model Selection</Tabs.Trigger>
              <Tabs.Trigger value="user-management" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 data-[state=active]:bg-primary/80">User Management</Tabs.Trigger>
              <Tabs.Trigger value="map" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 data-[state=active]:bg-primary/80">Map</Tabs.Trigger>
            </Tabs.List>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Tabs.Content value="system-prompt" className="mt-6">
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

                <Tabs.Content value="model" className="mt-6">
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

                <Tabs.Content value="user-management" className="mt-6">
                  <UserManagementForm form={form} />
                </Tabs.Content>
                <Tabs.Content value="map" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Map Provider</CardTitle>
                      <CardDescription>Choose the map provider to use in the application.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <RadioGroup
                        value={mapProvider}
                        onValueChange={(value) => setMapProvider(value as MapProvider)}
                        className="space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="mapbox" id="mapbox" />
                          <Label htmlFor="mapbox">Mapbox</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="google" id="google" />
                          <Label htmlFor="google">Google Maps</Label>
                        </div>
                      </RadioGroup>
                    </CardContent>
                  </Card>
                </Tabs.Content>
              </motion.div>
            </AnimatePresence>
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
