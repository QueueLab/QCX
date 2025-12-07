import type { UseFormReturn } from "react-hook-form"
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"

interface SystemPromptFormProps {
  form: UseFormReturn<any>
}

import { Input } from "@/components/ui/input" // Added import for Input

export function SystemPromptForm({ form }: SystemPromptFormProps) {
  const systemPrompt = form.watch("systemPrompt")
  const characterCount = systemPrompt?.length || 0

  return (
    <>
      <FormField
        control={form.control}
        name="systemPrompt"
        render={({ field }: { field: import("react-hook-form").ControllerRenderProps<any, "systemPrompt"> }) => (
          <FormItem>
            <FormLabel>System Prompt</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Enter the system prompt for your planetary copilot..."
                className="min-h-[200px] resize-y"
                {...field}
              />
            </FormControl>
            <FormDescription className="flex justify-between">
              <span>Define how your copilot should behave. Instruct it to prioritize accuracy and truthfulness, and to use the provided latitude, longitude, and date/time for real-time information.</span>
              <span className={characterCount > 1800 ? "text-amber-500" : ""}>{characterCount}/2000</span>
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="latitude"
        render={({ field }: { field: import("react-hook-form").ControllerRenderProps<any, "latitude"> }) => (
          <FormItem className="mt-4">
            <FormLabel>Latitude</FormLabel>
            <FormControl>
              <Input type="number" placeholder="e.g., 34.0522" {...field} />
            </FormControl>
            <FormDescription>
              Optional: Latitude for location-specific context.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="longitude"
        render={({ field }: { field: import("react-hook-form").ControllerRenderProps<any, "longitude"> }) => (
          <FormItem className="mt-4">
            <FormLabel>Longitude</FormLabel>
            <FormControl>
              <Input type="number" placeholder="e.g., -118.2437" {...field} />
            </FormControl>
            <FormDescription>
              Optional: Longitude for location-specific context.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="datetime"
        render={({ field }: { field: import("react-hook-form").ControllerRenderProps<any, "datetime"> }) => (
          <FormItem className="mt-4">
            <FormLabel>Date/Time</FormLabel>
            <FormControl>
              <Input placeholder="YYYY-MM-DD HH:MM:SS" {...field} />
            </FormControl>
            <FormDescription>
              Optional: Specific date and time for context-sensitive information.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}
