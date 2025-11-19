import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDistrictAuth } from "@/hooks/useDistrictAuth";
import { School, Users, Database } from "lucide-react";

export default function DistrictDashboard() {
  const { district, districtSchools } = useDistrictAuth();

  return (
    <div className="px-4 py-6 sm:p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome to {district?.district_name}</h1>
        <p className="text-muted-foreground mt-2">District Administration Dashboard</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{districtSchools.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Coming soon</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IC Connected</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Coming soon</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>Manage your district schools and users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Use the navigation menu to access schools, users, IC integrations, reports, and settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
