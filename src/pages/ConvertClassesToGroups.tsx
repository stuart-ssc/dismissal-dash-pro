import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useActiveSchoolId } from "@/hooks/useActiveSchoolId";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, ArrowRight, Check, RefreshCw, Search, Users, EyeOff, Repeat, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

// --- Keyword definitions ---

interface KeywordDef {
  label: string;
  regex: RegExp;
  defaultType: string;
  defaultActive: boolean;
}

const KEYWORDS: KeywordDef[] = [
  { label: "Athletics", regex: /athletics?/i, defaultType: "athletics", defaultActive: true },
  { label: "Club", regex: /clubs?(?:\s|$)/i, defaultType: "club", defaultActive: true },
  { label: "Field Trip", regex: /field[\s._-]?trip|^128_FT/i, defaultType: "field_trip", defaultActive: true },
  { label: "Band/Choir/Music", regex: /band|orchestra|choir|choral|chorus|music|ensemble/i, defaultType: "club", defaultActive: true },
  { label: "Homeroom", regex: /homeroom/i, defaultType: "other", defaultActive: false },
  { label: "Advisory", regex: /advisory/i, defaultType: "other", defaultActive: false },
  { label: "Study Hall", regex: /study[\s._-]?hall/i, defaultType: "other", defaultActive: false },
];

function detectType(name: string): string {
  for (const kw of KEYWORDS) {
    if (kw.regex.test(name)) return kw.defaultType;
  }
  return "other";
}

function matchesAnyKeyword(name: string, activeKeywords: Set<string>): boolean {
  return KEYWORDS.some((kw) => activeKeywords.has(kw.label) && kw.regex.test(name));
}

const TRUNCATION_FIXES: Record<string, string> = {
  volleyba: "Volleyball",
  sofball: "Softball",
  basketba: "Basketball",
  cheerlea: "Cheerleading",
  wrestlin: "Wrestling",
  basebal: "Baseball",
  footbal: "Football",
  crosscou: "Cross Country",
};

function cleanDisplayName(raw: string): string {
  let name = raw.replace(/^\d+_/, "");
  name = name.replace(/\s+\d+\s+(Athletics?|Clubs?)$/i, "");
  name = name.replace(/^FT\s*/i, "");
  const lower = name.toLowerCase().trim();
  for (const [trunc, full] of Object.entries(TRUNCATION_FIXES)) {
    if (lower.endsWith(trunc) || lower === trunc) {
      name = name.slice(0, name.length - trunc.length) + full;
    }
  }
  return name.replace(/\s+/g, " ").trim();
}

const GROUP_TYPE_LABELS: Record<string, string> = {
  athletics: "Athletics",
  club: "Club",
  field_trip: "Field Trip",
  other: "Other",
};

interface ClassCandidate {
  class_id: string;
  original_name: string;
  display_name: string;
  group_type: string;
  student_count: number;
  action: "convert" | "hide";
  selected: boolean;
  is_reviewed: boolean;
}

export default function ConvertClassesToGroups() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { schoolId } = useActiveSchoolId();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<ClassCandidate[]>([]);
  const [showAllClasses, setShowAllClasses] = useState(false);
  const [activeKeywords, setActiveKeywords] = useState<Set<string>>(
    () => new Set(KEYWORDS.filter((k) => k.defaultActive).map((k) => k.label))
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data: sessionId } = useQuery({
    queryKey: ["current-session", schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      const { data } = await supabase.rpc("get_current_academic_session", { p_school_id: schoolId });
      return data as string | null;
    },
    enabled: !!schoolId,
  });

  const { data: allClasses, isLoading } = useQuery({
    queryKey: ["all-classes-for-conversion", schoolId, sessionId],
    queryFn: async () => {
      if (!schoolId || !sessionId) return [];
      let allData: any[] = [];
      let offset = 0;
      const limit = 1000;
      while (true) {
        const { data, error } = await supabase.rpc("get_classes_paginated", {
          p_school_id: schoolId,
          p_session_id: sessionId,
          p_search_query: "",
          p_filter: "all",
          p_limit: limit,
          p_offset: offset,
        });
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData = [...allData, ...data];
        if (data.length < limit) break;
        offset += limit;
      }
      return allData;
    },
    enabled: !!schoolId && !!sessionId,
  });

  // Build candidates when classes load or keywords change
  useEffect(() => {
    if (!allClasses || allClasses.length === 0) return;
    const items: ClassCandidate[] = allClasses
      .filter((c: any) => showAllClasses || matchesAnyKeyword(c.class_name, activeKeywords))
      .map((c: any) => ({
        class_id: c.class_id,
        original_name: c.class_name,
        display_name: cleanDisplayName(c.class_name),
        group_type: detectType(c.class_name),
        student_count: Number(c.student_count) || 0,
        action: detectType(c.class_name) === "other" ? ("hide" as const) : ("convert" as const),
        selected: matchesAnyKeyword(c.class_name, activeKeywords) && !c.is_reviewed,
        is_reviewed: !!c.is_reviewed,
      }));
    // Sort: unreviewed first, reviewed last
    items.sort((a, b) => (a.is_reviewed === b.is_reviewed ? 0 : a.is_reviewed ? 1 : -1));
    setCandidates(items);
    setPage(1);
  }, [allClasses, showAllClasses, activeKeywords]);

  // Filtered + paginated
  const filtered = useMemo(() => {
    if (!search) return candidates;
    const q = search.toLowerCase();
    return candidates.filter(
      (c) => c.original_name.toLowerCase().includes(q) || c.display_name.toLowerCase().includes(q)
    );
  }, [candidates, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safeCurrentPage = Math.min(page, totalPages);
  const paginatedItems = filtered.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);
  const showFrom = filtered.length > 0 ? (safeCurrentPage - 1) * pageSize + 1 : 0;
  const showTo = Math.min(safeCurrentPage * pageSize, filtered.length);

  const selectedCount = candidates.filter((c) => c.selected).length;
  const convertCount = candidates.filter((c) => c.selected && c.action === "convert").length;
  const hideCount = candidates.filter((c) => c.selected && c.action === "hide").length;

  // Reset page when search changes
  useEffect(() => { setPage(1); }, [search]);

  const convertMutation = useMutation({
    mutationFn: async () => {
      if (!schoolId || !sessionId) throw new Error("Missing school/session");
      const selected = candidates.filter((c) => c.selected);
      const conversions = selected.map((c) => ({
        class_id: c.class_id,
        display_name: c.display_name,
        group_type: c.group_type,
        action: c.action,
      }));
      // IDs of unselected candidates to mark as reviewed
      const selectedIds = new Set(selected.map((c) => c.class_id));
      const reviewedIds = candidates
        .filter((c) => !selectedIds.has(c.class_id) && !c.is_reviewed)
        .map((c) => c.class_id);
      const { data, error } = await supabase.rpc("convert_classes_to_groups", {
        p_school_id: schoolId,
        p_session_id: sessionId,
        p_conversions: conversions,
        p_reviewed_class_ids: reviewedIds,
      } as any);
      if (error) throw error;
      return data as any;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["all-classes-for-conversion"] });
      setStep(3);
      toast.success(`Created ${result.groups_created} groups, hidden ${result.classes_hidden} classes`);
    },
    onError: (err: any) => {
      toast.error("Conversion failed: " + (err.message || "Unknown error"));
    },
  });

  // Handlers
  const toggleAll = (checked: boolean) => {
    const visibleIds = new Set(filtered.map((c) => c.class_id));
    setCandidates((prev) =>
      prev.map((c) => (visibleIds.has(c.class_id) ? { ...c, selected: checked } : c))
    );
  };

  const bulkSetAction = (action: "convert" | "hide") => {
    const visibleSelectedIds = new Set(
      filtered.filter((c) => c.selected).map((c) => c.class_id)
    );
    setCandidates((prev) =>
      prev.map((c) => (visibleSelectedIds.has(c.class_id) ? { ...c, action } : c))
    );
  };

  const toggleKeyword = (label: string) => {
    setActiveKeywords((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const updateCandidate = (classId: string, updates: Partial<ClassCandidate>) => {
    setCandidates((prev) => prev.map((c) => (c.class_id === classId ? { ...c, ...updates } : c)));
  };

  if (!schoolId) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No school selected. Please select a school first.
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 sm:px-6 pt-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Convert Classes to Groups & Teams</h1>
        <p className="text-muted-foreground text-sm">
          Identify non-instructional IC sections and convert them into Groups & Teams with their student rosters.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s
                  ? "bg-primary text-primary-foreground"
                  : step > s
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step > s ? <Check className="h-4 w-4" /> : s}
            </div>
            <span className={step === s ? "font-medium" : "text-muted-foreground"}>
              {s === 1 ? "Review" : s === 2 ? "Confirm" : "Done"}
            </span>
            {s < 3 && <div className="w-8 h-px bg-border" />}
          </div>
        ))}
      </div>

      {/* Step 1: Review */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Review Detected Sections</CardTitle>
                <CardDescription>
                  {candidates.length} sections detected • {selectedCount} selected
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllClasses(!showAllClasses)}
                >
                  {showAllClasses ? "Show Suggestions Only" : "Show All Classes"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                Loading classes...
              </div>
            ) : (
              <div className="space-y-4">
                {/* Keyword toggles */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Filter by keyword pattern:</p>
                  <div className="flex flex-wrap gap-2">
                    {KEYWORDS.map((kw) => (
                      <button
                        key={kw.label}
                        onClick={() => toggleKeyword(kw.label)}
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                          activeKeywords.has(kw.label)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                        }`}
                      >
                        {kw.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search & bulk actions */}
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search classes..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => toggleAll(true)}>
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toggleAll(false)}>
                      Deselect All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => bulkSetAction("convert")}
                      disabled={selectedCount === 0}
                    >
                      <Repeat className="h-3 w-3 mr-1" />
                      Set Convert
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => bulkSetAction("hide")}
                      disabled={selectedCount === 0}
                    >
                      <EyeOff className="h-3 w-3 mr-1" />
                      Set Hide
                    </Button>
                  </div>
                </div>

                {/* Table */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>IC Class Name</TableHead>
                        <TableHead>Display Name</TableHead>
                        <TableHead className="w-[140px]">Type</TableHead>
                        <TableHead className="w-[80px] text-right">Students</TableHead>
                        <TableHead className="w-[120px]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            {search
                              ? "No matching classes found"
                              : "No candidate classes detected. Try 'Show All Classes' to browse manually."}
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedItems.map((c) => (
                          <TableRow key={c.class_id} className={c.selected ? "" : "opacity-60"}>
                            <TableCell>
                              <Checkbox
                                checked={c.selected}
                                onCheckedChange={(checked) =>
                                  updateCandidate(c.class_id, { selected: !!checked })
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <span className="text-xs font-mono text-muted-foreground">
                                {c.original_name}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Input
                                value={c.display_name}
                                onChange={(e) =>
                                  updateCandidate(c.class_id, { display_name: e.target.value })
                                }
                                className="h-8 text-sm"
                                disabled={!c.selected}
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={c.group_type}
                                onValueChange={(val) =>
                                  updateCandidate(c.class_id, { group_type: val })
                                }
                                disabled={!c.selected || c.action === "hide"}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(GROUP_TYPE_LABELS).map(([val, label]) => (
                                    <SelectItem key={val} value={val}>
                                      {label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary" className="text-xs">
                                <Users className="h-3 w-3 mr-1" />
                                {c.student_count}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={c.action}
                                onValueChange={(val) =>
                                  updateCandidate(c.class_id, {
                                    action: val as "convert" | "hide",
                                  })
                                }
                                disabled={!c.selected}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="convert">
                                    <span className="flex items-center gap-1">
                                      <Repeat className="h-3 w-3" /> Convert
                                    </span>
                                  </SelectItem>
                                  <SelectItem value="hide">
                                    <span className="flex items-center gap-1">
                                      <EyeOff className="h-3 w-3" /> Hide Only
                                    </span>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <p className="text-sm text-muted-foreground w-full sm:w-auto text-center sm:text-left">
                    Showing {showFrom} to {showTo} of {filtered.length}
                  </p>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
                    <Select
                      value={String(pageSize)}
                      onValueChange={(val) => {
                        setPageSize(Number(val));
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="h-8 w-[70px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[10, 25, 50, 100].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={safeCurrentPage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Previous</span>
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {safeCurrentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safeCurrentPage >= totalPages}
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center pt-4">
                  <Button variant="outline" onClick={() => navigate("/dashboard/people/classes")}>
                    Cancel
                  </Button>
                  <Button onClick={() => setStep(2)} disabled={selectedCount === 0}>
                    Review {selectedCount} Selected
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Confirm */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Confirm Conversion</CardTitle>
            <CardDescription>
              Review the following changes before proceeding.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-primary">{convertCount}</div>
                <div className="text-sm text-muted-foreground">Groups to Create</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-muted-foreground">{hideCount}</div>
                <div className="text-sm text-muted-foreground">Classes to Hide</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold">
                  {candidates
                    .filter((c) => c.selected && c.action === "convert")
                    .reduce((sum, c) => sum + c.student_count, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Students to Migrate</div>
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Students</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates
                    .filter((c) => c.selected)
                    .map((c) => (
                      <TableRow key={c.class_id}>
                        <TableCell className="font-medium">{c.display_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{GROUP_TYPE_LABELS[c.group_type] || c.group_type}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{c.student_count}</TableCell>
                        <TableCell>
                          <Badge variant={c.action === "convert" ? "default" : "secondary"}>
                            {c.action === "convert" ? "Convert" : "Hide"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between items-center pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => convertMutation.mutate()}
                disabled={convertMutation.isPending}
              >
                {convertMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Convert {selectedCount} Classes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Done */}
      {step === 3 && (
        <Card>
          <CardContent className="py-12 text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Conversion Complete!</h2>
              <p className="text-muted-foreground mt-2">
                {convertMutation.data?.groups_created || 0} groups created with{" "}
                {convertMutation.data?.total_students_migrated || 0} students migrated.
                {(convertMutation.data?.classes_hidden || 0) > 0 &&
                  ` ${convertMutation.data.classes_hidden} classes hidden from the classes list.`}
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => navigate("/dashboard/people/classes")}>
                Back to Classes
              </Button>
              <Button onClick={() => navigate("/dashboard/people/groups-teams")}>
                View Groups & Teams
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
