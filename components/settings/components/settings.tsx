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
import { getSettings, saveSettings } from '@/lib/actions/settings';

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

export type SettingsFormValues = z.infer<typeof settingsFormSchema>

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

interface SettingsProps {
  initialTab?: string;
}

const userId = 'default-user'; // Placeholder for actual user ID management

export function Settings({ initialTab = "system-prompt" }: SettingsProps) {
  const { toast } = useToast()
  const router = useRouter() // Keep router if needed for other operations, though refresh is often handled by revalidatePath
  const [isLoading, setIsLoading] = useState(true) // Start true for initial fetch
  const [currentTab, setCurrentTab] = useState(initialTab);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues,
  });

  useEffect(() => {
    setCurrentTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    async function fetchSettings() {
      setIsLoading(true);
      try {
        const currentSettings = await getSettings(userId);
        form.reset({
          ...defaultValues, // Start with component defaults
          systemPrompt: currentSettings.systemPrompt,
          selectedModel: currentSettings.selectedModel || defaultValues.selectedModel,
          // users array will come from defaultValues unless getSettings also returns it in the future
          // newUserEmail and newUserRole will also remain from defaultValues (which is undefined/empty string)
        });
      } catch (error) {
        console.error("Failed to fetch settings:", error);
        toast({
          title: "Error loading settings",
          description: "Could not load your saved settings. Displaying default values.",
          variant: "destructive",
        });
        // Form will retain defaultValues if fetch fails
      } finally {
        setIsLoading(false);
      }
    }
    fetchSettings();
  }, [form, toast]); // form.reset is stable, so form is fine. toast for error reporting.

  async function onSubmit(data: SettingsFormValues) {
    setIsLoading(true);
    try {
      const settingsToSave = {
        systemPrompt: data.systemPrompt,
        selectedModel: data.selectedModel,
        // users: data.users // Not handled by current saveSettings in lib/actions/settings.ts
      };
      const result = await saveSettings(userId, settingsToSave);

      if (result.error) {
        toast({
          title: "Error saving settings",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Settings updated",
          description: "Your settings have been saved successfully.",
        });
        // Data should be refreshed by revalidatePath in the action.
        // If needed, could re-fetch here:
        // const updatedSettings = await getSettings(userId);
        // form.reset({ ...defaultValues, ...updatedSettings });
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast({
        title: "Something went wrong",
        description: "Your settings could not be saved. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function onReset() {
    // Option 1: Reset to initial component defaults
    form.reset(defaultValues);
    toast({
      title: "Settings reset",
      description: "Settings have been reset to the initial default values.",
    });

    // Option 2: Refetch last saved settings (more complex, might need another state for 'lastFetchedSettings')
    // async function resetToSaved() {
    //   setIsLoading(true);
    //   try {
    //     const savedSettings = await getSettings(userId);
    //     form.reset({ ...defaultValues, ...savedSettings });
    //     toast({ title: "Settings reset", description: "Settings have been reset to your last saved configuration." });
    //   } catch (error) {
    //     toast({ title: "Error", description: "Could not reload saved settings.", variant: "destructive" });
    //   } finally {
    //     setIsLoading(false);
    //   }
    // }
    // resetToSaved();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-6">
          <Tabs.Root value={currentTab} onValueChange={setCurrentTab} className="w-full">
            <Tabs.List className="grid w-full grid-cols-3">
              <Tabs.Trigger value="system-prompt">System Prompt</Tabs.Trigger>
              <Tabs.Trigger value="model">Model Selection</Tabs.Trigger>
              <Tabs.Trigger value="user-management">User Management</Tabs.Trigger>
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
