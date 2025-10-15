import { Suspense } from "react"
import { Settings } from "@/components/settings/components/settings"
import { SettingsSkeleton } from "@/components/settings/components/settings-skeleton"
import { useProfileToggle, ProfileToggleEnum } from "@/components/profile-toggle-context"
import { Button } from "@/components/ui/button"
import { Minus } from "lucide-react"

export default function SettingsView() {
  const { toggleProfileSection, activeView } = useProfileToggle();
  const initialTab = activeView === ProfileToggleEnum.Security ? "user-management" : "system-prompt";

  const handleClose = () => {
    if (activeView) {
      toggleProfileSection(activeView);
    }
  };

  return (
    <div className="container py-8 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your planetary copilot preferences and user access</p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleClose}>
          <Minus className="h-6 w-6" />
          <span className="sr-only">Close settings</span>
        </Button>
      </div>
      <Suspense fallback={<SettingsSkeleton />}>
        <Settings initialTab={initialTab} />
      </Suspense>
    </div>
  )
}
