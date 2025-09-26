import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Users, AlertCircle } from "lucide-react";
import { useSchoolAdmins } from "@/hooks/useSchoolAdmins";
import InviteSchoolAdminForm from "@/components/InviteSchoolAdminForm";

export default function TeacherSetupGuide() {
  const { loading, schoolAdmins, hasSchoolAdmin } = useSchoolAdmins();
  const [showInviteForm, setShowInviteForm] = useState(false);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span>Checking school setup...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Case 1: No school admin exists - show invite option
  if (!hasSchoolAdmin) {
    if (showInviteForm) {
      return (
        <InviteSchoolAdminForm 
          onSuccess={() => setShowInviteForm(false)} 
        />
      );
    }

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <CardTitle>School Setup Required</CardTitle>
          </div>
          <CardDescription>
            Your school needs to complete its setup before you can use all features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-medium text-amber-800 mb-2">No School Administrator Found</h4>
            <p className="text-sm text-amber-700 mb-3">
              Your school doesn't have an administrator yet. A school admin can complete the setup and manage school settings.
            </p>
            <Button 
              onClick={() => setShowInviteForm(true)}
              className="w-full"
            >
              <Mail className="h-4 w-4 mr-2" />
              Invite School Administrator
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p className="mb-2"><strong>What needs to be completed:</strong></p>
            <ul className="space-y-1 ml-4">
              <li>• Confirm school details and settings</li>
              <li>• Set up transportation (buses, car lines, walker locations)</li>
              <li>• Add students and organize classes</li>
              <li>• Configure dismissal procedures</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Case 2: School admin exists - show contact info
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          <CardTitle>School Setup Required</CardTitle>
        </div>
        <CardDescription>
          Your school needs to complete its setup before you can use all features.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-blue-600" />
            <h4 className="font-medium text-blue-800">Contact Your School Administrator</h4>
          </div>
          <p className="text-sm text-blue-700 mb-3">
            Please reach out to your school administrator(s) to complete the setup:
          </p>
          
          <div className="space-y-2">
            {schoolAdmins.map((admin) => (
              <div key={admin.id} className="flex items-center justify-between bg-white rounded p-2 border">
                <div>
                  <p className="font-medium text-sm">
                    {admin.first_name} {admin.last_name}
                  </p>
                  {admin.email && (
                    <p className="text-sm text-muted-foreground">{admin.email}</p>
                  )}
                </div>
                {admin.email && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.location.href = `mailto:${admin.email}`}
                  >
                    <Mail className="h-3 w-3 mr-1" />
                    Email
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="text-sm text-muted-foreground">
          <p className="mb-2"><strong>What needs to be completed:</strong></p>
          <ul className="space-y-1 ml-4">
            <li>• Confirm school details and settings</li>
            <li>• Set up transportation (buses, car lines, walker locations)</li>
            <li>• Add students and organize classes</li>
            <li>• Configure dismissal procedures</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}