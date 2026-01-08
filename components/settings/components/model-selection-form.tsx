"use client";

import type { UseFormReturn } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Zap, Rocket, Cpu, Earth } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ModelSelectionFormProps {
  form: UseFormReturn<any>;
}

const models = [
  {
    id: "QCX-Terra",
    name: "QCX-Terra",
    description: "Geospatial foundational model for planetary insights.",
    icon: Earth,
    badge: "Recommended",
    badgeVariant: "default" as const,
  },
  {
    id: "Grok 4.2",
    name: "Grok 4.2",
    description: "The latest from xAI, pushing the boundaries of reasoning and problem-solving.",
    icon: Rocket,
    badge: "New",
    badgeVariant: "secondary" as const,
  },
  {
    id: "Gemini 3",
    name: "Gemini 3",
    description: "Google's next-generation multimodal model, excelling at understanding and processing diverse information.",
    icon: Sparkles,
    badge: "Multimodal",
    badgeVariant: "outline" as const,
  },
  {
    id: "GPT-5.1",
    name: "GPT-5.1",
    description: "The cutting-edge of language models, offering unparalleled performance in creative and analytical tasks.",
    icon: Zap,
    badge: "Advanced",
    badgeVariant: "outline" as const,
  },
];

export function ModelSelectionForm({ form }: ModelSelectionFormProps) {
  return (
    <FormField
      control={form.control}
      name="selectedModel"
      render={({ field }) => (
        <FormItem className="space-y-4">
          <div className="flex items-center justify-between">
            <FormLabel>AI Model</FormLabel>
          </div>
          <FormControl>
            <RadioGroup
              onValueChange={field.onChange}
              value={field.value}
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              {models.map((model) => {
                const Icon = model.icon;
                return (
                  <FormItem key={model.id} className="space-y-0">
                    <FormControl>
                      <RadioGroupItem
                        value={model.id}
                        id={model.id}
                        className="peer sr-only"
                      />
                    </FormControl>
                    <FormLabel
                      htmlFor={model.id}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                      )}
                    >
                      <Icon className="mb-3 h-6 w-6" />
                      {model.name}
                    </FormLabel>
                  </FormItem>
                );
              })}
            </RadioGroup>
          </FormControl>
          <FormDescription>
            Select the AI model that will power your planetary copilot.
            Different models have different capabilities and performance
            characteristics.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
