"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Rocket } from "lucide-react";

const selectedModel = {
  name: "Grok 4.2",
  description: "The latest from xAI, pushing the boundaries of reasoning and problem-solving.",
  icon: Rocket,
  badge: "Default",
  badgeVariant: "secondary" as const,
};

export function ModelSelectionForm() {
  const Icon = selectedModel.icon;
  return (
    <div className="space-y-4">
      <label className="text-sm font-medium">AI Model</label>
      <Card className="border-2 border-primary">
        <CardContent className="p-4 flex items-start gap-4">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium">{selectedModel.name}</h4>
              <Badge variant={selectedModel.badgeVariant}>
                {selectedModel.badge}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {selectedModel.description}
            </p>
          </div>
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">
        The AI model has been set to Grok 4.2 to provide the best balance of performance and advanced reasoning for your planetary copilot.
      </p>
    </div>
  );
}
