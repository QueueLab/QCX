import { Suspense } from "react"
import { Settings } from "@/components/settings/components/settings"
import { SettingsSkeleton } from "@/components/settings/components/settings-skeleton"

export default function SettingsPage({ section }: { section?: string }) {
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings: {section}</h1>
        <p className="text-muted-foreground">Manage your planetary copilot preferences and user access</p>
      </div>
      <Suspense fallback={<SettingsSkeleton />}>
        <Settings />
      </Suspense>
    </div>
  )
}
