import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMultiSchool } from "@/hooks/useMultiSchool";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { ICOverviewTab } from "@/components/ic/ICOverviewTab";
import { ICSyncTab } from "@/components/ic/ICSyncTab";
import { ICDataQualityTab } from "@/components/ic/ICDataQualityTab";
import { ICPendingMergesTab } from "@/components/ic/ICPendingMergesTab";
import { ICAutoMergeRulesTab } from "@/components/ic/ICAutoMergeRulesTab";
import { ICAuditTab } from "@/components/ic/ICAuditTab";
import { ICSettingsTab } from "@/components/ic/ICSettingsTab";

export default function InfiniteCampus() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const { activeSchoolId } = useMultiSchool();

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  // Query IC connection
  const { data: connection, isLoading: connectionLoading } = useQuery({
    queryKey: ['ic-connection', activeSchoolId],
    queryFn: async () => {
      const { data } = await supabase
        .from('infinite_campus_connections')
        .select('*')
        .eq('school_id', activeSchoolId)
        .maybeSingle();
      return data;
    },
    enabled: !!activeSchoolId
  });

  if (connectionLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2">Infinite Campus Integration</h1>
        <p className="text-muted-foreground">
          Manage your Infinite Campus connection, sync data, and monitor data quality
        </p>
      </div>

      {/* Tabs */}
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
          <ICOverviewTab connection={connection} schoolId={activeSchoolId} />
        </TabsContent>
        <TabsContent value="sync">
          <ICSyncTab schoolId={activeSchoolId} />
        </TabsContent>
        <TabsContent value="quality">
          <ICDataQualityTab schoolId={activeSchoolId} />
        </TabsContent>
        <TabsContent value="merges">
          <ICPendingMergesTab schoolId={activeSchoolId} />
        </TabsContent>
        <TabsContent value="rules">
          <ICAutoMergeRulesTab schoolId={activeSchoolId} />
        </TabsContent>
        <TabsContent value="audit">
          <ICAuditTab schoolId={activeSchoolId} />
        </TabsContent>
        <TabsContent value="settings">
          <ICSettingsTab connection={connection} schoolId={activeSchoolId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
