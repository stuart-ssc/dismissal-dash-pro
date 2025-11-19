import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

export default function DistrictSettings() {
  return (
    <div className="space-y-6 px-4 py-6 sm:p-6">
      <Card className="shadow-elevated border-0 bg-card backdrop-blur">
        <CardHeader>
          <div className="flex items-center gap-3">
            <SettingsIcon className="h-6 w-6 text-primary" />
            <CardTitle>District Settings</CardTitle>
          </div>
          <CardDescription className="mt-2">
            Configure district-wide settings and preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <SettingsIcon className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p>District settings coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
