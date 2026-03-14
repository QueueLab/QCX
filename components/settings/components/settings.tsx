'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Tabs from '@radix-ui/react-tabs'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Loader2, Save, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { SystemPromptForm } from './system-prompt-form'
import { ModelSelectionForm } from './model-selection-form'
import { UserManagementForm } from './user-management-form';
import { Form } from "@/components/ui/form"
import { useSettingsStore, MapProvider } from "@/lib/store/settings";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/hooks/use-toast"
import { getSystemPrompt, saveSystemPrompt } from "../../../lib/actions/chat"
import { getSelectedModel, saveSelectedModel } from "../../../lib/actions/users"
import { useCurrentUser } from "@/lib/auth/use-current-user"
import { SettingsSkeleton } from './settings-skeleton'

// Define the form schema with enum validation for roles
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
  newUserEmail: z.string().email().optional().or(z.literal('')),
  newUserRole: z.enum(["admin", "editor", "viewer"]).optional(),
})

export type SettingsFormValues = z.infer<typeof settingsFormSchema>

// Default values
const defaultValues: Partial<SettingsFormValues> = {
  systemPrompt:
    "You are a planetary copilot, an AI assistant designed to help users with information about planets, space exploration, and astronomy. Provide accurate, educational, and engaging responses about our solar system and beyond.",
  selectedModel: "Grok 4.2",
  users: [],
}

interface SettingsProps {
  initialTab?: string;
}

export function Settings({ initialTab = "system-prompt" }: SettingsProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [currentTab, setCurrentTab] = useState(initialTab);
  const { mapProvider, setMapProvider } = useSettingsStore();
  const { user, loading: authLoading } = useCurrentUser();

  useEffect(() => {
    setCurrentTab(initialTab);
  }, [initialTab]);

  const userId = user?.id;

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues,
  })

  useEffect(() => {
    async function fetchData() {
      if (!userId || authLoading) return;

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
  }, [form, userId, authLoading]);

  if (authLoading) {
    return <SettingsSkeleton />;
  }

  async function onSubmit(data: SettingsFormValues) {
    if (!userId) {
      toast({
        title: "Error",
        description: "You must be logged in to save settings.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true)

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
    } catch (error: any) {
      // Error notification
      toast({
        title: "Something went wrong",
        description: error.message || "Your settings could not be saved. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
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
            <Tabs.List className="grid w-full grid-cols-4 gap-x-2">
              <Tabs.Trigger value="system-prompt" asChild>
                <Button variant="outline" className="data-[state=active]:bg-primary/80">System Prompt</Button>
              </Tabs.Trigger>
              <Tabs.Trigger value="model" asChild>
                <Button variant="outline" className="data-[state=active]:bg-primary/80">Model Selection</Button>
              </Tabs.Trigger>
              <Tabs.Trigger value="user-management" asChild>
                <Button variant="outline" className="data-[state=active]:bg-primary/80">User Management</Button>
              </Tabs.Trigger>
              <Tabs.Trigger value="map" asChild>
                <Button variant="outline" className="data-[state=active]:bg-primary/80">Map</Button>
              </Tabs.Trigger>
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
              <Button type="button" variant="outline" onClick={onReset} disabled={isSaving}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset to Defaults
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
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
