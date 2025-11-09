import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMultiSchool } from "@/hooks/useMultiSchool";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Filter, CheckCircle, XCircle, Bot, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

export default function ICMergeAudit() {
  const navigate = useNavigate();
  const { activeSchoolId } = useMultiSchool();
  const [searchQuery, setSearchQuery] = useState("");
  const [decisionFilter, setDecisionFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ["ic-merge-audit", activeSchoolId, decisionFilter, typeFilter],
    queryFn: async () => {
      let query = supabase
        .from("ic_merge_audit_log")
        .select(`
          *,
          decided_by_profile:profiles!ic_merge_audit_log_decided_by_fkey(first_name, last_name),
          auto_merge_rule:ic_auto_merge_rules(rule_name)
        `)
        .eq("school_id", activeSchoolId)
        .order("decided_at", { ascending: false });

      if (decisionFilter !== "all") {
        query = query.eq("decision", decisionFilter);
      }

      if (typeFilter === "auto") {
        query = query.eq("auto_approved", true);
      } else if (typeFilter === "manual") {
        query = query.eq("auto_approved", false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!activeSchoolId,
  });

  const filteredLogs = auditLogs?.filter((log) => {
    if (!searchQuery) return true;
    
    const mergeData = log.merge_data as any;
    const searchLower = searchQuery.toLowerCase();
    
    const firstName = mergeData?.ic_data?.givenName || "";
    const lastName = mergeData?.ic_data?.familyName || "";
    const email = mergeData?.ic_data?.email || "";
    const fullName = `${firstName} ${lastName}`.toLowerCase();
    
    return (
      fullName.includes(searchLower) ||
      email.toLowerCase().includes(searchLower) ||
      mergeData?.record_type?.toLowerCase().includes(searchLower)
    );
  });

  const getDecidedByName = (log: any) => {
    if (log.auto_approved) {
      return (
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            Auto-approved by {log.auto_merge_rule?.rule_name || "rule"}
          </span>
        </div>
      );
    }
    
    if (log.decided_by_profile) {
      return (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {log.decided_by_profile.first_name} {log.decided_by_profile.last_name}
          </span>
        </div>
      );
    }
    
    return <span className="text-sm text-muted-foreground">Unknown</span>;
  };

  const getMergeInfo = (mergeData: any) => {
    const firstName = mergeData?.ic_data?.givenName || "";
    const lastName = mergeData?.ic_data?.familyName || "";
    const recordType = mergeData?.record_type || "";
    const matchType = mergeData?.match_type || "";
    const confidence = mergeData?.confidence_score || 0;

    return {
      name: `${firstName} ${lastName}`.trim() || "Unknown",
      recordType,
      matchType,
      confidence,
    };
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/ic-pending-merges")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">IC Merge Audit Log</h1>
        </div>
        <Card className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/ic-pending-merges")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">IC Merge Audit Log</h1>
      </div>

      <Card className="p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or record type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={decisionFilter} onValueChange={setDecisionFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Decision" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Decisions</SelectItem>
                <SelectItem value="approve">Approved</SelectItem>
                <SelectItem value="reject">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="auto">Auto-approved</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date & Time</TableHead>
              <TableHead>Record</TableHead>
              <TableHead>Match Type</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Decision</TableHead>
              <TableHead>Decided By</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs && filteredLogs.length > 0 ? (
              filteredLogs.map((log) => {
                const info = getMergeInfo(log.merge_data);
                return (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(log.decided_at), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{info.name}</span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {info.recordType}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {info.matchType.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={info.confidence >= 0.9 ? "default" : "secondary"}
                      >
                        {(info.confidence * 100).toFixed(0)}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.decision === "approve" ? (
                        <Badge className="bg-green-500 hover:bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approved
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Rejected
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{getDecidedByName(log)}</TableCell>
                    <TableCell>
                      {log.notes ? (
                        <span className="text-sm text-muted-foreground">
                          {log.notes.length > 50
                            ? `${log.notes.slice(0, 50)}...`
                            : log.notes}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          No notes
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Filter className="h-8 w-8" />
                    <p>No audit logs found</p>
                    {(searchQuery || decisionFilter !== "all" || typeFilter !== "all") && (
                      <p className="text-sm">Try adjusting your filters</p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {filteredLogs && filteredLogs.length > 0 && (
        <div className="mt-4 text-sm text-muted-foreground text-center">
          Showing {filteredLogs.length} audit log{filteredLogs.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
