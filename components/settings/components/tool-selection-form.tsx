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
import { Earth, Orbit } from "lucide-react";

interface ToolSelectionFormProps {
  form: UseFormReturn<any>;
}

const tools = [
  {
    id: "QCX-Terra",
    name: "QCX-Terra",
    description: "Geospatial foundational model for planetary insights.",
    icon: Earth,
    badge: "Recommended",
    badgeVariant: "default" as const,
  },
  {
    id: "SkyFi",
    name: "SkyFi",
    description: "On-demand satellite imagery and Earth intelligence analytics.",
    icon: Orbit,
    badge: "Satellite",
    badgeVariant: "secondary" as const,
  },
];

export function ToolSelectionForm({ form }: ToolSelectionFormProps) {
  return (
    <FormField
      control={form.control}
      name="selectedModel"
      render={({ field }) => (
        <FormItem className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <FormLabel className="text-base font-semibold">Planetary Tool</FormLabel>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Quick Select:</span>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Select tool" />
                </SelectTrigger>
                <SelectContent>
                  {tools.map((tool) => {
                    const Icon = tool.icon;
                    return (
                      <SelectItem key={tool.id} value={tool.id}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{tool.name}</span>
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
              {tools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <FormItem key={tool.id} className="space-y-0">
                    <FormControl>
                      <RadioGroupItem
                        value={tool.id}
                        id={tool.id}
                        className="peer sr-only"
                      />
                    </FormControl>
                    <FormLabel htmlFor={tool.id} className="cursor-pointer">
                      <Card className="border-2 transition-all peer-data-[state=checked]:border-primary">
                        <CardContent className="p-4 flex items-start gap-4">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{tool.name}</h4>
                              <Badge variant={tool.badgeVariant}>
                                {tool.badge}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {tool.description}
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
            Select the tool that will power your planetary copilot.
            Different tools have different capabilities and performance
            characteristics.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
