import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { ICOverviewTab } from "@/components/ic/ICOverviewTab";
import { ICSyncTab } from "@/components/ic/ICSyncTab";
import { ICDataQualityTab } from "@/components/ic/ICDataQualityTab";
import { ICPendingMergesTab } from "@/components/ic/ICPendingMergesTab";
import { ICAutoMergeRulesTab } from "@/components/ic/ICAutoMergeRulesTab";
import { ICAuditTab } from "@/components/ic/ICAuditTab";
import { ICSettingsTab } from "@/components/ic/ICSettingsTab";

export default function ICIntegrationDetail() {
  const { schoolId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  
  // Convert schoolId to number
  const schoolIdNum = schoolId ? parseInt(schoolId) : null;
  
  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  // Fetch school details
  const { data: school, isLoading: schoolLoading } = useQuery({
    queryKey: ['school', schoolIdNum],
    queryFn: async () => {
      const { data } = await supabase
        .from('schools')
        .select('school_name')
        .eq('id', schoolIdNum)
        .single();
      return data;
    },
    enabled: !!schoolIdNum
  });
  
  // Query IC connection
  const { data: connection, isLoading: connectionLoading } = useQuery({
    queryKey: ['ic-connection', schoolIdNum],
    queryFn: async () => {
      const { data } = await supabase
        .from('infinite_campus_connections')
        .select('*')
        .eq('school_id', schoolIdNum)
        .maybeSingle();
      return data;
    },
    enabled: !!schoolIdNum
  });

  if (schoolLoading || connectionLoading) {
    return (
      <main className="flex-1 p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/district-dash/ic-integrations')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to IC Integrations
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold">Infinite Campus Integration</h1>
        {school && (
          <p className="text-muted-foreground mt-1">{school.school_name}</p>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sync">Sync</TabsTrigger>
          <TabsTrigger value="quality">Data Quality</TabsTrigger>
          <TabsTrigger value="merges">Merges</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ICOverviewTab connection={connection} schoolId={schoolIdNum} />
        </TabsContent>
        <TabsContent value="sync">
          <ICSyncTab schoolId={schoolIdNum} />
        </TabsContent>
        <TabsContent value="quality">
          <ICDataQualityTab schoolId={schoolIdNum} />
        </TabsContent>
        <TabsContent value="merges">
          <ICPendingMergesTab schoolId={schoolIdNum} />
        </TabsContent>
        <TabsContent value="rules">
          <ICAutoMergeRulesTab schoolId={schoolIdNum} />
        </TabsContent>
        <TabsContent value="audit">
          <ICAuditTab schoolId={schoolIdNum} />
        </TabsContent>
        <TabsContent value="settings">
          <ICSettingsTab connection={connection} schoolId={schoolIdNum} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
