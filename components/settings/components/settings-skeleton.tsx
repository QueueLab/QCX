import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import * as Tabs from "@radix-ui/react-tabs";

export function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <Tabs.Root defaultValue="system-prompt" className="w-full">
        <Tabs.List className="grid w-full grid-cols-3">
          <Tabs.Trigger value="system-prompt">System Prompt</Tabs.Trigger>
          <Tabs.Trigger value="users">User Management</Tabs.Trigger>
          <Tabs.Trigger value="model">Model Selection</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="system-prompt">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-[250px]" />
              <Skeleton className="h-4 w-[350px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[200px] w-full" />
            </CardContent>
          </Card>
        </Tabs.Content>
      </Tabs.Root>

      <Card>
        <CardFooter className="flex justify-between pt-6">
          <Skeleton className="h-10 w-[150px]" />
          <Skeleton className="h-10 w-[150px]" />
        </CardFooter>
      </Card>
    </div>
  );
}
