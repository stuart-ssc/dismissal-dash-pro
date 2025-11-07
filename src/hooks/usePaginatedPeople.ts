import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PersonData {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  role: 'School Admin' | 'Teacher' | 'Student';
  grade?: string;
  studentId?: string;
  dismissalModeId?: string;
  classes: string[];
  classIds?: string[];
  transportation?: string;
  invitationStatus?: string;
  invitationSentAt?: string;
  invitationExpiresAt?: string;
  accountCompletedAt?: string;
  authProvider?: string;
  daysUntilExpiry?: number;
}

interface UsePaginatedPeopleParams {
  schoolId: number | null;
  page: number;
  pageSize: number;
  roleFilter: string;
  gradeFilter: string;
  searchQuery: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  enabled?: boolean;
}

interface PaginatedPeopleResult {
  people: PersonData[];
  totalCount: number;
}

export const usePaginatedPeople = ({
  schoolId,
  page,
  pageSize,
  roleFilter,
  gradeFilter,
  searchQuery,
  sortBy,
  sortOrder,
  enabled = true,
}: UsePaginatedPeopleParams) => {
  return useQuery<PaginatedPeopleResult>({
    queryKey: ['people-paginated', schoolId, page, pageSize, roleFilter, gradeFilter, searchQuery, sortBy, sortOrder],
    queryFn: async () => {
      if (!schoolId) {
        return { people: [], totalCount: 0 };
      }

      const offset = (page - 1) * pageSize;

      // Call the RPC function for paginated results
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_people_paginated', {
        p_school_id: schoolId,
        p_role_filter: roleFilter,
        p_grade_filter: gradeFilter,
        p_search_query: searchQuery,
        p_sort_by: sortBy,
        p_sort_order: sortOrder,
        p_limit: pageSize,
        p_offset: offset,
      });

      if (rpcError) {
        console.error('Error fetching paginated people:', rpcError);
        throw rpcError;
      }

      if (!rpcData || rpcData.length === 0) {
        return { people: [], totalCount: 0 };
      }

      // Extract total count from first row
      const totalCount = rpcData[0]?.total_count || 0;

      // Get student IDs for fetching child data
      const studentIds = rpcData
        .filter(p => p.person_type === 'student')
        .map(p => p.id);

      // Fetch child data in parallel (only for students on this page)
      const [rosterData, busData, walkerData, carData, activityData] = await Promise.all([
        studentIds.length > 0
          ? supabase
              .from('class_rosters')
              .select('student_id, class_id, classes(class_name, grade_level)')
              .in('student_id', studentIds)
          : Promise.resolve({ data: null, error: null }),
        studentIds.length > 0
          ? supabase
              .from('student_bus_assignments')
              .select('student_id')
              .in('student_id', studentIds)
          : Promise.resolve({ data: null, error: null }),
        studentIds.length > 0
          ? supabase
              .from('student_walker_assignments')
              .select('student_id')
              .in('student_id', studentIds)
          : Promise.resolve({ data: null, error: null }),
        studentIds.length > 0
          ? supabase
              .from('student_car_assignments')
              .select('student_id')
              .in('student_id', studentIds)
          : Promise.resolve({ data: null, error: null }),
        studentIds.length > 0
          ? supabase
              .from('student_after_school_assignments')
              .select('student_id')
              .in('student_id', studentIds)
          : Promise.resolve({ data: null, error: null }),
      ]);

      // Log errors for debugging
      if (rosterData.error) console.error('Error fetching class rosters:', rosterData.error);
      if (busData.error) console.error('Error fetching bus assignments:', busData.error);
      if (walkerData.error) console.error('Error fetching walker assignments:', walkerData.error);
      if (carData.error) console.error('Error fetching car assignments:', carData.error);
      if (activityData.error) console.error('Error fetching activity assignments:', activityData.error);

      // Log counts for debugging
      console.log('Transportation data:', {
        students: studentIds.length,
        buses: busData.data?.length ?? 0,
        walkers: walkerData.data?.length ?? 0,
        cars: carData.data?.length ?? 0,
        activities: activityData.data?.length ?? 0,
      });

      // Build lookup maps
      const classesByStudent = new Map<string, Array<{ name: string; grade?: string; id: string }>>();
      rosterData.data?.forEach((r: any) => {
        if (!classesByStudent.has(r.student_id)) {
          classesByStudent.set(r.student_id, []);
        }
        if (r.classes) {
          classesByStudent.get(r.student_id)!.push({
            name: r.classes.class_name,
            grade: r.classes.grade_level,
            id: r.class_id,
          });
        }
      });

      const hasBus = new Set(busData.data?.map((b: any) => b.student_id) ?? []);
      const hasWalker = new Set(walkerData.data?.map((w: any) => w.student_id) ?? []);
      const hasCar = new Set(carData.data?.map((c: any) => c.student_id) ?? []);
      const hasActivity = new Set(activityData.data?.map((a: any) => a.student_id) ?? []);

      // Transform data
      const people: PersonData[] = rpcData.map((person) => {
        const isStudent = person.person_type === 'student';
        const classData = isStudent ? (classesByStudent.get(person.id) ?? []) : [];
        const classes = classData.map(c => c.name);
        const classIds = classData.map(c => c.id);
        
        const transportation = isStudent
          ? hasBus.has(person.id)
            ? 'Bus'
            : hasWalker.has(person.id)
            ? 'Walker'
            : hasCar.has(person.id)
            ? 'Car Rider'
            : hasActivity.has(person.id)
            ? 'After School'
            : undefined
          : undefined;

        // Calculate days until expiry for teachers
        let daysUntilExpiry: number | undefined;
        if (!isStudent && person.invitation_expires_at) {
          const now = new Date();
          const expiresAt = new Date(person.invitation_expires_at);
          daysUntilExpiry = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        }

        // Map role to proper type
        const mappedRole = 
          person.role === 'school_admin' ? 'School Admin' :
          person.role === 'teacher' ? 'Teacher' :
          'Student';

        return {
          id: person.id,
          firstName: person.first_name || '',
          lastName: person.last_name || '',
          email: person.email || undefined,
          role: mappedRole,
          grade: person.grade_level || undefined,
          studentId: person.student_id || undefined,
          dismissalModeId: (person as any).dismissal_mode_id || undefined,
          classes,
          classIds,
          transportation,
          invitationStatus: person.invitation_status || undefined,
          invitationSentAt: person.invitation_sent_at || undefined,
          invitationExpiresAt: person.invitation_expires_at || undefined,
          accountCompletedAt: person.account_completed_at || undefined,
          authProvider: person.auth_provider || undefined,
          daysUntilExpiry,
        };
      });

      return { people, totalCount };
    },
    enabled: enabled && !!schoolId,
    staleTime: 30000, // Cache for 30 seconds
  });
};
