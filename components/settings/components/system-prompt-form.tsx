import type { UseFormReturn } from "react-hook-form"
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"

interface SystemPromptFormProps {
  form: UseFormReturn<any>
}

export function SystemPromptForm({ form }: SystemPromptFormProps) {
  const systemPrompt = form.watch("systemPrompt")
  const characterCount = systemPrompt?.length || 0

  return (
    <FormField
      control={form.control}
      name="systemPrompt"
      render={({ field, fieldState, formState }: { field: import("react-hook-form").ControllerRenderProps<any, "systemPrompt">; fieldState: import("react-hook-form").ControllerFieldState; formState: import("react-hook-form").UseFormStateReturn<any>; }) => (
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
            <span>Define how your copilot should behave and respond to user queries.</span>
            <span className={characterCount > 1800 ? "text-amber-500" : ""}>{characterCount}/2000</span>
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
