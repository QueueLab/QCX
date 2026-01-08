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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Zap, Rocket, Cpu, Earth } from "lucide-react";

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
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Quick Select:</span>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => {
                    const Icon = model.icon;
                    return (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{model.name}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <FormControl>
            <RadioGroup
              onValueChange={field.onChange}
              value={field.value}
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
