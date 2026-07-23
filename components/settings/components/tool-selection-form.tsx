"use client";

import { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { startSkyfiConnection, getSkyfiConnectionStatus, disconnectSkyfi } from "@/lib/actions/skyfi";
import { Earth, Orbit, ShieldCheck, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/hooks/use-toast";
import { cn } from "@/lib/utils";

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
  const selectedModel = form.watch("selectedModel");
  const { toast } = useToast();
  const [skyfiConnected, setSkyfiConnected] = useState(false);
  const [skyfiBudget, setSkyfiBudget] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    async function loadStatus() {
      if (selectedModel === "SkyFi") {
        setLoadingStatus(true);
        try {
          const status = await getSkyfiConnectionStatus();
          setSkyfiConnected(status.connected);
          setSkyfiBudget(status.budget || null);
        } catch (err) {
          console.error("Failed to load SkyFi connection status:", err);
        } finally {
          setLoadingStatus(false);
        }
      }
    }
    loadStatus();
  }, [selectedModel]);

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

          {selectedModel === "SkyFi" && (
            <Card className="mt-4 border-2 border-primary/20 bg-muted/20">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <Orbit className="h-5 w-5 animate-pulse" />
                  <h4>SkyFi Account Connection</h4>
                </div>
                {loadingStatus ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking SkyFi connection status...
                  </div>
                ) : skyfiConnected ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 border rounded-xl bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="h-10 w-10 shrink-0" />
                      <div className="flex-1 space-y-1">
                        <p className="font-semibold text-foreground">SkyFi Account Linked</p>
                        {skyfiBudget ? (
                          <div className="text-xs text-muted-foreground font-mono bg-card p-2 rounded-lg max-h-[100px] overflow-y-auto">
                            {skyfiBudget}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">Successfully authenticated and ready to query satellite imagery.</p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={async () => {
                          setLoadingStatus(true);
                          try {
                            const res = await disconnectSkyfi();
                            if (res.success) {
                              setSkyfiConnected(false);
                              setSkyfiBudget(null);
                              toast({
                                title: "SkyFi Disconnected",
                                description: "Your SkyFi account has been disconnected.",
                              });
                            } else {
                              throw new Error(res.error);
                            }
                          } catch (err: any) {
                            toast({
                              title: "Disconnection Error",
                              description: err.message || "Failed to disconnect SkyFi.",
                              variant: "destructive",
                            });
                          } finally {
                            setLoadingStatus(false);
                          }
                        }}
                      >
                        Disconnect
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Connect your SkyFi account to search existing satellite imagery, task new captures, and manage Areas of Interest (AOIs) directly from your chats.
                    </p>
                    <Button
                      type="button"
                      disabled={isConnecting}
                      className="bg-[#000000] hover:bg-[#333333] text-white flex items-center gap-2 px-6 py-5 text-base font-semibold"
                      onClick={async () => {
                        setIsConnecting(true);
                        try {
                          const res = await startSkyfiConnection();
                          if (res.error) {
                            throw new Error(res.error);
                          }
                          if (res.url) {
                            window.location.href = res.url;
                          }
                        } catch (err: any) {
                          toast({
                            title: "Connection Error",
                            description: err.message || "Failed to initiate SkyFi connection.",
                            variant: "destructive",
                          });
                          setIsConnecting(false);
                        }
                      }}
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                          <span>Initiating OAuth...</span>
                        </>
                      ) : (
                        <>
                          <Orbit className="h-5 w-5 mr-2" />
                          <span>Connect SkyFi Account</span>
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </FormItem>
      )}
    />
  );
}
