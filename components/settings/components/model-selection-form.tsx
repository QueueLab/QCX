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
import { Sparkles, Zap, Rocket, Cpu } from "lucide-react";

interface ModelSelectionFormProps {
  form: UseFormReturn<any>;
}

const models = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    description: "Most capable model for complex tasks, reasoning, and creative content generation.",
    icon: Sparkles,
    badge: "Recommended",
    badgeVariant: "default" as const,
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    description: "Fast and efficient model for most everyday tasks and queries.",
    icon: Zap,
    badge: "Fast",
    badgeVariant: "secondary" as const,
  },
  {
    id: "claude-3-opus",
    name: "Claude 3 Opus",
    description: "Advanced model with strong reasoning and detailed planetary knowledge.",
    icon: Rocket,
    badge: "Advanced",
    badgeVariant: "outline" as const,
  },
  {
    id: "llama-3",
    name: "Llama 3",
    description: "Open-source model with good performance for general planetary information.",
    icon: Cpu,
    badge: "Open Source",
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
          <FormLabel>AI Model</FormLabel>
          <FormControl>
            <RadioGroup
              onValueChange={field.onChange}
              defaultValue={field.value}
              className="space-y-3"
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
                    <FormLabel htmlFor={model.id} className="cursor-pointer">
                      <Card className="border-2 transition-all peer-data-[state=checked]:border-primary">
                        <CardContent className="p-4 flex items-start gap-4">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{model.name}</h4>
                              <Badge variant={model.badgeVariant}>
                                {model.badge}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {model.description}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
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
