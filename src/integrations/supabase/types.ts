export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      academic_sessions: {
        Row: {
          created_at: string | null
          created_by: string | null
          end_date: string
          ic_external_id: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          parent_session_id: string | null
          school_id: number
          session_code: string
          session_name: string
          session_type: string | null
          start_date: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          end_date: string
          ic_external_id?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          parent_session_id?: string | null
          school_id: number
          session_code: string
          session_name: string
          session_type?: string | null
          start_date: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          end_date?: string
          ic_external_id?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          parent_session_id?: string | null
          school_id?: number
          session_code?: string
          session_name?: string
          session_type?: string | null
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_sessions_parent_session_id_fkey"
            columns: ["parent_session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_sessions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_impersonation_sessions: {
        Row: {
          admin_user_id: string
          created_at: string
          expires_at: string
          id: string
          impersonated_school_id: number
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          expires_at?: string
          id?: string
          impersonated_school_id: number
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          impersonated_school_id?: number
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_impersonation_sessions_impersonated_school_id_fkey"
            columns: ["impersonated_school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      after_school_activities: {
        Row: {
          activity_name: string
          capacity: number | null
          created_at: string
          description: string | null
          id: string
          location: string | null
          school_id: number
          status: string
          supervisor_name: string | null
          updated_at: string
        }
        Insert: {
          activity_name: string
          capacity?: number | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          school_id: number
          status?: string
          supervisor_name?: string | null
          updated_at?: string
        }
        Update: {
          activity_name?: string
          capacity?: number | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          school_id?: number
          status?: string
          supervisor_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      app_secrets: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          record_id: string | null
          table_name: string
          timestamp: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          record_id?: string | null
          table_name: string
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          record_id?: string | null
          table_name?: string
          timestamp?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_run_events: {
        Row: {
          bus_id: string
          check_in_time: string | null
          checked_in_by: string | null
          created_at: string
          departed_at: string | null
          departed_by: string | null
          dismissal_run_id: string
          id: string
          order_index: number | null
          school_id: number
          updated_at: string
        }
        Insert: {
          bus_id: string
          check_in_time?: string | null
          checked_in_by?: string | null
          created_at?: string
          departed_at?: string | null
          departed_by?: string | null
          dismissal_run_id: string
          id?: string
          order_index?: number | null
          school_id: number
          updated_at?: string
        }
        Update: {
          bus_id?: string
          check_in_time?: string | null
          checked_in_by?: string | null
          created_at?: string
          departed_at?: string | null
          departed_by?: string | null
          dismissal_run_id?: string
          id?: string
          order_index?: number | null
          school_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bus_run_events_dismissal_run_id_fkey"
            columns: ["dismissal_run_id"]
            isOneToOne: false
            referencedRelation: "dismissal_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_student_loading_events: {
        Row: {
          bus_id: string
          created_at: string
          dismissal_run_id: string
          id: string
          loaded_at: string
          loaded_by: string
          student_id: string
        }
        Insert: {
          bus_id: string
          created_at?: string
          dismissal_run_id: string
          id?: string
          loaded_at?: string
          loaded_by: string
          student_id: string
        }
        Update: {
          bus_id?: string
          created_at?: string
          dismissal_run_id?: string
          id?: string
          loaded_at?: string
          loaded_by?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bus_student_loading_events_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_student_loading_events_dismissal_run_id_fkey"
            columns: ["dismissal_run_id"]
            isOneToOne: false
            referencedRelation: "dismissal_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_student_loading_events_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      buses: {
        Row: {
          bus_number: string
          created_at: string
          driver_first_name: string
          driver_last_name: string
          id: string
          school_id: number
          status: string
          updated_at: string
        }
        Insert: {
          bus_number: string
          created_at?: string
          driver_first_name: string
          driver_last_name: string
          id?: string
          school_id: number
          status?: string
          updated_at?: string
        }
        Update: {
          bus_number?: string
          created_at?: string
          driver_first_name?: string
          driver_last_name?: string
          id?: string
          school_id?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      car_line_completions: {
        Row: {
          car_line_id: string
          completed_at: string
          completed_by: string
          created_at: string
          dismissal_run_id: string
          id: string
        }
        Insert: {
          car_line_id: string
          completed_at?: string
          completed_by: string
          created_at?: string
          dismissal_run_id: string
          id?: string
        }
        Update: {
          car_line_id?: string
          completed_at?: string
          completed_by?: string
          created_at?: string
          dismissal_run_id?: string
          id?: string
        }
        Relationships: []
      }
      car_line_lanes: {
        Row: {
          car_line_id: string
          color: string
          created_at: string
          id: string
          lane_name: string
          order_index: number
          updated_at: string
        }
        Insert: {
          car_line_id: string
          color: string
          created_at?: string
          id?: string
          lane_name: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          car_line_id?: string
          color?: string
          created_at?: string
          id?: string
          lane_name?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "car_line_lanes_car_line_id_fkey"
            columns: ["car_line_id"]
            isOneToOne: false
            referencedRelation: "car_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      car_line_pickups: {
        Row: {
          car_line_session_id: string
          created_at: string
          id: string
          lane_id: string | null
          managed_by: string
          parent_arrived_at: string | null
          picked_up_at: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          car_line_session_id: string
          created_at?: string
          id?: string
          lane_id?: string | null
          managed_by: string
          parent_arrived_at?: string | null
          picked_up_at?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          car_line_session_id?: string
          created_at?: string
          id?: string
          lane_id?: string | null
          managed_by?: string
          parent_arrived_at?: string | null
          picked_up_at?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "car_line_pickups_car_line_session_id_fkey"
            columns: ["car_line_session_id"]
            isOneToOne: false
            referencedRelation: "car_line_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_line_pickups_lane_id_fkey"
            columns: ["lane_id"]
            isOneToOne: false
            referencedRelation: "car_line_lanes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_line_pickups_managed_by_fkey"
            columns: ["managed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_line_pickups_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      car_line_sessions: {
        Row: {
          arrived_at: string
          car_line_id: string
          created_at: string
          dismissal_run_id: string
          finished_at: string | null
          id: string
          managed_by: string
          school_id: number
        }
        Insert: {
          arrived_at?: string
          car_line_id: string
          created_at?: string
          dismissal_run_id: string
          finished_at?: string | null
          id?: string
          managed_by: string
          school_id: number
        }
        Update: {
          arrived_at?: string
          car_line_id?: string
          created_at?: string
          dismissal_run_id?: string
          finished_at?: string | null
          id?: string
          managed_by?: string
          school_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "car_line_sessions_dismissal_run_id_fkey"
            columns: ["dismissal_run_id"]
            isOneToOne: false
            referencedRelation: "dismissal_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_line_sessions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      car_lines: {
        Row: {
          color: string
          created_at: string
          has_lanes: boolean | null
          id: string
          line_name: string
          pickup_location: string
          school_id: number
          status: string
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          has_lanes?: boolean | null
          id?: string
          line_name: string
          pickup_location: string
          school_id: number
          status?: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          has_lanes?: boolean | null
          id?: string
          line_name?: string
          pickup_location?: string
          school_id?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      class_coverage: {
        Row: {
          assigned_by: string
          class_id: string
          coverage_date: string
          covering_teacher_id: string
          created_at: string
          id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          assigned_by: string
          class_id: string
          coverage_date: string
          covering_teacher_id: string
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          class_id?: string
          coverage_date?: string
          covering_teacher_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_coverage_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_coverage_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_coverage_covering_teacher_id_fkey"
            columns: ["covering_teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_rosters: {
        Row: {
          academic_session_id: string | null
          class_id: string
          enrolled_at: string
          id: string
          student_id: string
        }
        Insert: {
          academic_session_id?: string | null
          class_id: string
          enrolled_at?: string
          id?: string
          student_id: string
        }
        Update: {
          academic_session_id?: string | null
          class_id?: string
          enrolled_at?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_rosters_academic_session_id_fkey"
            columns: ["academic_session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_rosters_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_rosters_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      class_teachers: {
        Row: {
          assigned_at: string
          class_id: string
          id: string
          teacher_id: string
        }
        Insert: {
          assigned_at?: string
          class_id: string
          id?: string
          teacher_id: string
        }
        Update: {
          assigned_at?: string
          class_id?: string
          id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_teachers_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_teachers_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          academic_session_id: string | null
          class_name: string
          created_at: string
          grade_level: string | null
          ic_external_id: string | null
          id: string
          period_end_time: string | null
          period_name: string | null
          period_number: number | null
          period_start_time: string | null
          room_number: string | null
          school_id: number
          updated_at: string
        }
        Insert: {
          academic_session_id?: string | null
          class_name: string
          created_at?: string
          grade_level?: string | null
          ic_external_id?: string | null
          id?: string
          period_end_time?: string | null
          period_name?: string | null
          period_number?: number | null
          period_start_time?: string | null
          room_number?: string | null
          school_id: number
          updated_at?: string
        }
        Update: {
          academic_session_id?: string | null
          class_name?: string
          created_at?: string
          grade_level?: string | null
          ic_external_id?: string | null
          id?: string
          period_end_time?: string | null
          period_name?: string | null
          period_number?: number | null
          period_start_time?: string | null
          room_number?: string | null
          school_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_academic_session_id_fkey"
            columns: ["academic_session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          organization: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          organization?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          organization?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      dismissal_group_activities: {
        Row: {
          after_school_activity_id: string
          created_at: string
          dismissal_group_id: string
          id: string
        }
        Insert: {
          after_school_activity_id: string
          created_at?: string
          dismissal_group_id: string
          id?: string
        }
        Update: {
          after_school_activity_id?: string
          created_at?: string
          dismissal_group_id?: string
          id?: string
        }
        Relationships: []
      }
      dismissal_group_buses: {
        Row: {
          bus_id: string
          created_at: string
          dismissal_group_id: string
          id: string
        }
        Insert: {
          bus_id: string
          created_at?: string
          dismissal_group_id: string
          id?: string
        }
        Update: {
          bus_id?: string
          created_at?: string
          dismissal_group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dismissal_group_buses_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dismissal_group_buses_dismissal_group_id_fkey"
            columns: ["dismissal_group_id"]
            isOneToOne: false
            referencedRelation: "dismissal_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      dismissal_group_car_lines: {
        Row: {
          car_line_id: string
          created_at: string
          dismissal_group_id: string
          id: string
        }
        Insert: {
          car_line_id: string
          created_at?: string
          dismissal_group_id: string
          id?: string
        }
        Update: {
          car_line_id?: string
          created_at?: string
          dismissal_group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_dismissal_group_car_lines_car_line"
            columns: ["car_line_id"]
            isOneToOne: false
            referencedRelation: "car_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dismissal_group_car_lines_group"
            columns: ["dismissal_group_id"]
            isOneToOne: false
            referencedRelation: "dismissal_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      dismissal_group_classes: {
        Row: {
          class_id: string
          created_at: string
          dismissal_group_id: string
          id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          dismissal_group_id: string
          id?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          dismissal_group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dismissal_group_classes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dismissal_group_classes_dismissal_group_id_fkey"
            columns: ["dismissal_group_id"]
            isOneToOne: false
            referencedRelation: "dismissal_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      dismissal_group_students: {
        Row: {
          created_at: string
          dismissal_group_id: string
          id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          dismissal_group_id: string
          id?: string
          student_id: string
        }
        Update: {
          created_at?: string
          dismissal_group_id?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dismissal_group_students_dismissal_group_id_fkey"
            columns: ["dismissal_group_id"]
            isOneToOne: false
            referencedRelation: "dismissal_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dismissal_group_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      dismissal_groups: {
        Row: {
          car_rider_capacity: number | null
          car_rider_type: string | null
          created_at: string
          dismissal_plan_id: string
          group_type: string
          id: string
          name: string
          release_offset_minutes: number | null
          updated_at: string
          walker_location_id: string | null
        }
        Insert: {
          car_rider_capacity?: number | null
          car_rider_type?: string | null
          created_at?: string
          dismissal_plan_id: string
          group_type: string
          id?: string
          name: string
          release_offset_minutes?: number | null
          updated_at?: string
          walker_location_id?: string | null
        }
        Update: {
          car_rider_capacity?: number | null
          car_rider_type?: string | null
          created_at?: string
          dismissal_plan_id?: string
          group_type?: string
          id?: string
          name?: string
          release_offset_minutes?: number | null
          updated_at?: string
          walker_location_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dismissal_groups_dismissal_plan_id_fkey"
            columns: ["dismissal_plan_id"]
            isOneToOne: false
            referencedRelation: "dismissal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dismissal_groups_walker_location_id_fkey"
            columns: ["walker_location_id"]
            isOneToOne: false
            referencedRelation: "walker_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      dismissal_plans: {
        Row: {
          academic_session_id: string | null
          created_at: string
          description: string | null
          dismissal_time: string | null
          end_date: string | null
          id: string
          is_default: boolean
          name: string
          school_id: number
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          academic_session_id?: string | null
          created_at?: string
          description?: string | null
          dismissal_time?: string | null
          end_date?: string | null
          id?: string
          is_default?: boolean
          name: string
          school_id: number
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          academic_session_id?: string | null
          created_at?: string
          description?: string | null
          dismissal_time?: string | null
          end_date?: string | null
          id?: string
          is_default?: boolean
          name?: string
          school_id?: number
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dismissal_plans_academic_session_id_fkey"
            columns: ["academic_session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      dismissal_run_groups: {
        Row: {
          activated_at: string
          created_at: string
          created_by: string
          deactivated_at: string | null
          dismissal_group_id: string
          dismissal_run_id: string
          id: string
        }
        Insert: {
          activated_at?: string
          created_at?: string
          created_by: string
          deactivated_at?: string | null
          dismissal_group_id: string
          dismissal_run_id: string
          id?: string
        }
        Update: {
          activated_at?: string
          created_at?: string
          created_by?: string
          deactivated_at?: string | null
          dismissal_group_id?: string
          dismissal_run_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dismissal_run_groups_dismissal_run_id_fkey"
            columns: ["dismissal_run_id"]
            isOneToOne: false
            referencedRelation: "dismissal_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      dismissal_runs: {
        Row: {
          academic_session_id: string | null
          bus_completed: boolean | null
          bus_completed_at: string | null
          bus_completed_by: string | null
          car_line_completed: boolean | null
          car_line_completed_at: string | null
          car_line_completed_by: string | null
          completion_method: string | null
          created_at: string
          date: string
          dismissal_period: number | null
          dismissal_period_name: string | null
          ended_at: string | null
          id: string
          plan_id: string | null
          preparation_start_time: string | null
          scheduled_start_time: string | null
          school_id: number
          started_at: string
          started_by: string | null
          status: string
          testing_mode: boolean | null
          updated_at: string
          walker_completed: boolean | null
          walker_completed_at: string | null
          walker_completed_by: string | null
        }
        Insert: {
          academic_session_id?: string | null
          bus_completed?: boolean | null
          bus_completed_at?: string | null
          bus_completed_by?: string | null
          car_line_completed?: boolean | null
          car_line_completed_at?: string | null
          car_line_completed_by?: string | null
          completion_method?: string | null
          created_at?: string
          date?: string
          dismissal_period?: number | null
          dismissal_period_name?: string | null
          ended_at?: string | null
          id?: string
          plan_id?: string | null
          preparation_start_time?: string | null
          scheduled_start_time?: string | null
          school_id: number
          started_at?: string
          started_by?: string | null
          status?: string
          testing_mode?: boolean | null
          updated_at?: string
          walker_completed?: boolean | null
          walker_completed_at?: string | null
          walker_completed_by?: string | null
        }
        Update: {
          academic_session_id?: string | null
          bus_completed?: boolean | null
          bus_completed_at?: string | null
          bus_completed_by?: string | null
          car_line_completed?: boolean | null
          car_line_completed_at?: string | null
          car_line_completed_by?: string | null
          completion_method?: string | null
          created_at?: string
          date?: string
          dismissal_period?: number | null
          dismissal_period_name?: string | null
          ended_at?: string | null
          id?: string
          plan_id?: string | null
          preparation_start_time?: string | null
          scheduled_start_time?: string | null
          school_id?: number
          started_at?: string
          started_by?: string | null
          status?: string
          testing_mode?: boolean | null
          updated_at?: string
          walker_completed?: boolean | null
          walker_completed_at?: string | null
          walker_completed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dismissal_runs_academic_session_id_fkey"
            columns: ["academic_session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dismissal_runs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dismissal_runs_started_by_fkey"
            columns: ["started_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      district_admin_verification_requests: {
        Row: {
          created_at: string | null
          district_name: string
          email: string
          expires_at: string
          first_name: string
          id: string
          last_name: string
          phone_number: string | null
          rejection_reason: string | null
          role_title: string | null
          status: string | null
          verification_token: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string | null
          district_name: string
          email: string
          expires_at?: string
          first_name: string
          id?: string
          last_name: string
          phone_number?: string | null
          rejection_reason?: string | null
          role_title?: string | null
          status?: string | null
          verification_token: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string | null
          district_name?: string
          email?: string
          expires_at?: string
          first_name?: string
          id?: string
          last_name?: string
          phone_number?: string | null
          rejection_reason?: string | null
          role_title?: string | null
          status?: string | null
          verification_token?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      district_impersonation_sessions: {
        Row: {
          created_at: string
          district_admin_user_id: string
          expires_at: string
          id: string
          impersonated_school_id: number
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          district_admin_user_id: string
          expires_at?: string
          id?: string
          impersonated_school_id: number
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          district_admin_user_id?: string
          expires_at?: string
          id?: string
          impersonated_school_id?: number
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "district_impersonation_sessions_impersonated_school_id_fkey"
            columns: ["impersonated_school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      districts: {
        Row: {
          allow_school_colors_override: boolean | null
          allow_school_dismissal_time_override: boolean | null
          allow_school_timezone_override: boolean | null
          city: string | null
          created_at: string | null
          created_by: string | null
          district_name: string
          email: string | null
          id: string
          phone_number: string | null
          state: string | null
          street_address: string | null
          timezone: string | null
          updated_at: string | null
          website: string | null
          zipcode: string | null
        }
        Insert: {
          allow_school_colors_override?: boolean | null
          allow_school_dismissal_time_override?: boolean | null
          allow_school_timezone_override?: boolean | null
          city?: string | null
          created_at?: string | null
          created_by?: string | null
          district_name: string
          email?: string | null
          id?: string
          phone_number?: string | null
          state?: string | null
          street_address?: string | null
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
          zipcode?: string | null
        }
        Update: {
          allow_school_colors_override?: boolean | null
          allow_school_dismissal_time_override?: boolean | null
          allow_school_timezone_override?: boolean | null
          city?: string | null
          created_at?: string | null
          created_by?: string | null
          district_name?: string
          email?: string | null
          id?: string
          phone_number?: string | null
          state?: string | null
          street_address?: string | null
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
          zipcode?: string | null
        }
        Relationships: []
      }
      districts_backup_pre_split: {
        Row: {
          allow_school_colors_override: boolean | null
          allow_school_dismissal_time_override: boolean | null
          allow_school_timezone_override: boolean | null
          city: string | null
          created_at: string | null
          created_by: string | null
          district_name: string | null
          email: string | null
          id: string | null
          phone_number: string | null
          state: string | null
          street_address: string | null
          timezone: string | null
          updated_at: string | null
          website: string | null
          zipcode: string | null
        }
        Insert: {
          allow_school_colors_override?: boolean | null
          allow_school_dismissal_time_override?: boolean | null
          allow_school_timezone_override?: boolean | null
          city?: string | null
          created_at?: string | null
          created_by?: string | null
          district_name?: string | null
          email?: string | null
          id?: string | null
          phone_number?: string | null
          state?: string | null
          street_address?: string | null
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
          zipcode?: string | null
        }
        Update: {
          allow_school_colors_override?: boolean | null
          allow_school_dismissal_time_override?: boolean | null
          allow_school_timezone_override?: boolean | null
          city?: string | null
          created_at?: string | null
          created_by?: string | null
          district_name?: string | null
          email?: string | null
          id?: string | null
          phone_number?: string | null
          state?: string | null
          street_address?: string | null
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
          zipcode?: string | null
        }
        Relationships: []
      }
      email_change_requests: {
        Row: {
          approved_by: string | null
          created_at: string
          expires_at: string
          id: string
          last_verification_attempt_at: string | null
          new_email: string
          notes: string | null
          old_email: string
          reason: string | null
          request_ip: string | null
          requested_by: string
          status: string
          updated_at: string
          user_agent: string | null
          user_id: string
          verification_attempts: number | null
          verification_token: string | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          last_verification_attempt_at?: string | null
          new_email: string
          notes?: string | null
          old_email: string
          reason?: string | null
          request_ip?: string | null
          requested_by: string
          status?: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
          verification_attempts?: number | null
          verification_token?: string | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          last_verification_attempt_at?: string | null
          new_email?: string
          notes?: string | null
          old_email?: string
          reason?: string | null
          request_ip?: string | null
          requested_by?: string
          status?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
          verification_attempts?: number | null
          verification_token?: string | null
        }
        Relationships: []
      }
      help_requests: {
        Row: {
          attachments: string[] | null
          created_at: string | null
          description: string
          id: string
          request_type: string
          school_id: number | null
          school_name: string | null
          status: string | null
          subject: string
          updated_at: string | null
          user_email: string
          user_id: string
          user_name: string
        }
        Insert: {
          attachments?: string[] | null
          created_at?: string | null
          description: string
          id?: string
          request_type: string
          school_id?: number | null
          school_name?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
          user_email: string
          user_id: string
          user_name: string
        }
        Update: {
          attachments?: string[] | null
          created_at?: string | null
          description?: string
          id?: string
          request_type?: string
          school_id?: number | null
          school_name?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
          user_email?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_requests_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      ic_auto_merge_rules: {
        Row: {
          allowed_match_types: string[]
          created_at: string
          created_by: string | null
          description: string | null
          enabled: boolean
          id: string
          min_confidence_score: number
          priority: number
          record_types: string[]
          rule_name: string
          school_id: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allowed_match_types?: string[]
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          id?: string
          min_confidence_score?: number
          priority?: number
          record_types?: string[]
          rule_name: string
          school_id: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allowed_match_types?: string[]
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          id?: string
          min_confidence_score?: number
          priority?: number
          record_types?: string[]
          rule_name?: string
          school_id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ic_auto_merge_rules_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      ic_data_quality_alert_config: {
        Row: {
          alert_cooldown_hours: number | null
          alert_email_recipients: string[] | null
          alert_enabled: boolean | null
          class_coverage_threshold: number | null
          created_at: string | null
          id: string
          overall_threshold: number | null
          school_id: number
          student_contact_threshold: number | null
          student_parent_threshold: number | null
          teacher_email_threshold: number | null
          updated_at: string | null
          weekly_summary_day: number | null
          weekly_summary_enabled: boolean | null
        }
        Insert: {
          alert_cooldown_hours?: number | null
          alert_email_recipients?: string[] | null
          alert_enabled?: boolean | null
          class_coverage_threshold?: number | null
          created_at?: string | null
          id?: string
          overall_threshold?: number | null
          school_id: number
          student_contact_threshold?: number | null
          student_parent_threshold?: number | null
          teacher_email_threshold?: number | null
          updated_at?: string | null
          weekly_summary_day?: number | null
          weekly_summary_enabled?: boolean | null
        }
        Update: {
          alert_cooldown_hours?: number | null
          alert_email_recipients?: string[] | null
          alert_enabled?: boolean | null
          class_coverage_threshold?: number | null
          created_at?: string | null
          id?: string
          overall_threshold?: number | null
          school_id?: number
          student_contact_threshold?: number | null
          student_parent_threshold?: number | null
          teacher_email_threshold?: number | null
          updated_at?: string | null
          weekly_summary_day?: number | null
          weekly_summary_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ic_data_quality_alert_config_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      ic_data_quality_alerts: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          acknowledgment_notes: string | null
          alert_type: string
          created_at: string | null
          data_quality_grade: string | null
          id: string
          issues_detected: Json | null
          notification_sent: boolean | null
          notification_sent_at: string | null
          overall_completeness_score: number | null
          recipients: string[] | null
          school_id: number
          severity: string
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          acknowledgment_notes?: string | null
          alert_type: string
          created_at?: string | null
          data_quality_grade?: string | null
          id?: string
          issues_detected?: Json | null
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          overall_completeness_score?: number | null
          recipients?: string[] | null
          school_id: number
          severity: string
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          acknowledgment_notes?: string | null
          alert_type?: string
          created_at?: string | null
          data_quality_grade?: string | null
          id?: string
          issues_detected?: Json | null
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          overall_completeness_score?: number | null
          recipients?: string[] | null
          school_id?: number
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "ic_data_quality_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ic_data_quality_alerts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      ic_data_quality_snapshots: {
        Row: {
          classes_without_students: number
          classes_without_teachers: number
          created_at: string
          data_quality_grade: string | null
          id: string
          overall_completeness_score: number | null
          school_id: number
          snapshot_date: string
          students_missing_contact_info: number
          students_missing_ic_id: number
          students_missing_parent_name: number
          students_without_classes: number
          teachers_missing_email: number
          teachers_missing_ic_id: number
          teachers_without_accounts: number
          teachers_without_classes: number
          total_classes: number
          total_students: number
          total_teachers: number
        }
        Insert: {
          classes_without_students?: number
          classes_without_teachers?: number
          created_at?: string
          data_quality_grade?: string | null
          id?: string
          overall_completeness_score?: number | null
          school_id: number
          snapshot_date?: string
          students_missing_contact_info?: number
          students_missing_ic_id?: number
          students_missing_parent_name?: number
          students_without_classes?: number
          teachers_missing_email?: number
          teachers_missing_ic_id?: number
          teachers_without_accounts?: number
          teachers_without_classes?: number
          total_classes?: number
          total_students?: number
          total_teachers?: number
        }
        Update: {
          classes_without_students?: number
          classes_without_teachers?: number
          created_at?: string
          data_quality_grade?: string | null
          id?: string
          overall_completeness_score?: number | null
          school_id?: number
          snapshot_date?: string
          students_missing_contact_info?: number
          students_missing_ic_id?: number
          students_missing_parent_name?: number
          students_without_classes?: number
          teachers_missing_email?: number
          teachers_missing_ic_id?: number
          teachers_without_accounts?: number
          teachers_without_classes?: number
          total_classes?: number
          total_students?: number
          total_teachers?: number
        }
        Relationships: [
          {
            foreignKeyName: "ic_data_quality_snapshots_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      ic_data_quality_weekly_summaries: {
        Row: {
          avg_completeness_score: number | null
          created_at: string | null
          id: string
          max_completeness_score: number | null
          min_completeness_score: number | null
          recipients: string[] | null
          school_id: number
          score_change_from_previous_week: number | null
          sent_at: string | null
          top_issues: Json | null
          total_alerts_triggered: number | null
          week_end_date: string
          week_start_date: string
        }
        Insert: {
          avg_completeness_score?: number | null
          created_at?: string | null
          id?: string
          max_completeness_score?: number | null
          min_completeness_score?: number | null
          recipients?: string[] | null
          school_id: number
          score_change_from_previous_week?: number | null
          sent_at?: string | null
          top_issues?: Json | null
          total_alerts_triggered?: number | null
          week_end_date: string
          week_start_date: string
        }
        Update: {
          avg_completeness_score?: number | null
          created_at?: string | null
          id?: string
          max_completeness_score?: number | null
          min_completeness_score?: number | null
          recipients?: string[] | null
          school_id?: number
          score_change_from_previous_week?: number | null
          sent_at?: string | null
          top_issues?: Json | null
          total_alerts_triggered?: number | null
          week_end_date?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "ic_data_quality_weekly_summaries_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      ic_district_connections: {
        Row: {
          app_name: string
          base_url: string
          client_id: string
          client_secret: string
          configured_by: string | null
          configured_by_role: string | null
          created_at: string
          district_id: string
          id: string
          last_test_status: string | null
          last_tested_at: string | null
          oneroster_version: string
          status: string
          token_url: string
          updated_at: string
        }
        Insert: {
          app_name: string
          base_url: string
          client_id: string
          client_secret: string
          configured_by?: string | null
          configured_by_role?: string | null
          created_at?: string
          district_id: string
          id?: string
          last_test_status?: string | null
          last_tested_at?: string | null
          oneroster_version?: string
          status?: string
          token_url: string
          updated_at?: string
        }
        Update: {
          app_name?: string
          base_url?: string
          client_id?: string
          client_secret?: string
          configured_by?: string | null
          configured_by_role?: string | null
          created_at?: string
          district_id?: string
          id?: string
          last_test_status?: string | null
          last_tested_at?: string | null
          oneroster_version?: string
          status?: string
          token_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ic_district_connections_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: true
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      ic_merge_audit_log: {
        Row: {
          auto_approved: boolean
          auto_approved_by_rule_id: string | null
          created_at: string
          decided_at: string
          decided_by: string | null
          decision: string
          id: string
          merge_data: Json
          merge_id: string
          notes: string | null
          school_id: number
        }
        Insert: {
          auto_approved?: boolean
          auto_approved_by_rule_id?: string | null
          created_at?: string
          decided_at?: string
          decided_by?: string | null
          decision: string
          id?: string
          merge_data: Json
          merge_id: string
          notes?: string | null
          school_id: number
        }
        Update: {
          auto_approved?: boolean
          auto_approved_by_rule_id?: string | null
          created_at?: string
          decided_at?: string
          decided_by?: string | null
          decision?: string
          id?: string
          merge_data?: Json
          merge_id?: string
          notes?: string | null
          school_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "ic_merge_audit_log_auto_approved_by_rule_id_fkey"
            columns: ["auto_approved_by_rule_id"]
            isOneToOne: false
            referencedRelation: "ic_auto_merge_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      ic_merge_comments: {
        Row: {
          comment: string
          created_at: string
          edited: boolean
          id: string
          merge_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          edited?: boolean
          id?: string
          merge_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          edited?: boolean
          id?: string
          merge_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ic_merge_comments_merge_id_fkey"
            columns: ["merge_id"]
            isOneToOne: false
            referencedRelation: "ic_pending_merges"
            referencedColumns: ["id"]
          },
        ]
      }
      ic_pending_merges: {
        Row: {
          auto_approved_at: string | null
          auto_approved_by_rule_id: string | null
          created_at: string | null
          decision_made_at: string | null
          decision_made_by: string | null
          decision_notes: string | null
          existing_record_id: string | null
          ic_data: Json
          ic_external_id: string
          id: string
          match_confidence: number | null
          match_criteria: string | null
          record_type: string
          school_id: number
          status: string
          sync_log_id: string | null
          updated_at: string | null
        }
        Insert: {
          auto_approved_at?: string | null
          auto_approved_by_rule_id?: string | null
          created_at?: string | null
          decision_made_at?: string | null
          decision_made_by?: string | null
          decision_notes?: string | null
          existing_record_id?: string | null
          ic_data: Json
          ic_external_id: string
          id?: string
          match_confidence?: number | null
          match_criteria?: string | null
          record_type: string
          school_id: number
          status?: string
          sync_log_id?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_approved_at?: string | null
          auto_approved_by_rule_id?: string | null
          created_at?: string | null
          decision_made_at?: string | null
          decision_made_by?: string | null
          decision_notes?: string | null
          existing_record_id?: string | null
          ic_data?: Json
          ic_external_id?: string
          id?: string
          match_confidence?: number | null
          match_criteria?: string | null
          record_type?: string
          school_id?: number
          status?: string
          sync_log_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ic_pending_merges_auto_approved_by_rule_id_fkey"
            columns: ["auto_approved_by_rule_id"]
            isOneToOne: false
            referencedRelation: "ic_auto_merge_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ic_pending_merges_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ic_pending_merges_sync_log_id_fkey"
            columns: ["sync_log_id"]
            isOneToOne: false
            referencedRelation: "ic_sync_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      ic_scheduler_execution_logs: {
        Row: {
          created_at: string
          errors: Json | null
          execution_duration_ms: number
          failed_schools: number
          id: string
          skipped_schools: number
          status: string
          successful_schools: number
          total_schools_processed: number
        }
        Insert: {
          created_at?: string
          errors?: Json | null
          execution_duration_ms: number
          failed_schools?: number
          id?: string
          skipped_schools?: number
          status: string
          successful_schools?: number
          total_schools_processed?: number
        }
        Update: {
          created_at?: string
          errors?: Json | null
          execution_duration_ms?: number
          failed_schools?: number
          id?: string
          skipped_schools?: number
          status?: string
          successful_schools?: number
          total_schools_processed?: number
        }
        Relationships: []
      }
      ic_school_mappings: {
        Row: {
          created_at: string
          district_connection_id: string
          ic_school_name: string
          ic_school_sourced_id: string
          id: string
          mapped_at: string
          mapped_by: string | null
          school_id: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          district_connection_id: string
          ic_school_name: string
          ic_school_sourced_id: string
          id?: string
          mapped_at?: string
          mapped_by?: string | null
          school_id: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          district_connection_id?: string
          ic_school_name?: string
          ic_school_sourced_id?: string
          id?: string
          mapped_at?: string
          mapped_by?: string | null
          school_id?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ic_school_mappings_district_connection_id_fkey"
            columns: ["district_connection_id"]
            isOneToOne: false
            referencedRelation: "ic_district_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ic_school_mappings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      ic_sync_logs: {
        Row: {
          classes_archived: number | null
          classes_created: number | null
          classes_updated: number | null
          completed_at: string | null
          connection_id: string | null
          created_at: string | null
          enrollments_created: number | null
          enrollments_updated: number | null
          error_details: Json | null
          error_message: string | null
          id: string
          metadata: Json | null
          school_id: number
          started_at: string | null
          status: string
          students_archived: number | null
          students_created: number | null
          students_updated: number | null
          sync_type: string
          teachers_archived: number | null
          teachers_created: number | null
          teachers_updated: number | null
          triggered_by: string | null
        }
        Insert: {
          classes_archived?: number | null
          classes_created?: number | null
          classes_updated?: number | null
          completed_at?: string | null
          connection_id?: string | null
          created_at?: string | null
          enrollments_created?: number | null
          enrollments_updated?: number | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          school_id: number
          started_at?: string | null
          status: string
          students_archived?: number | null
          students_created?: number | null
          students_updated?: number | null
          sync_type: string
          teachers_archived?: number | null
          teachers_created?: number | null
          teachers_updated?: number | null
          triggered_by?: string | null
        }
        Update: {
          classes_archived?: number | null
          classes_created?: number | null
          classes_updated?: number | null
          completed_at?: string | null
          connection_id?: string | null
          created_at?: string | null
          enrollments_created?: number | null
          enrollments_updated?: number | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          school_id?: number
          started_at?: string | null
          status?: string
          students_archived?: number | null
          students_created?: number | null
          students_updated?: number | null
          sync_type?: string
          teachers_archived?: number | null
          teachers_created?: number | null
          teachers_updated?: number | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ic_sync_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "infinite_campus_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ic_sync_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      ic_sync_rate_limits: {
        Row: {
          created_at: string | null
          id: string
          school_id: number
          sync_count: number | null
          sync_date: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          school_id: number
          sync_count?: number | null
          sync_date: string
        }
        Update: {
          created_at?: string | null
          id?: string
          school_id?: number
          sync_count?: number | null
          sync_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "ic_sync_rate_limits_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      infinite_campus_connections: {
        Row: {
          client_key: string
          client_secret: string
          configured_by: string | null
          configured_by_role: string | null
          created_at: string | null
          created_by: string | null
          host_url: string
          id: string
          last_sync_at: string | null
          last_sync_error: string | null
          last_sync_status: string | null
          metadata: Json | null
          oneroster_version: string
          school_id: number
          status: string
          sync_count: number | null
          token_url: string
          updated_at: string | null
        }
        Insert: {
          client_key: string
          client_secret: string
          configured_by?: string | null
          configured_by_role?: string | null
          created_at?: string | null
          created_by?: string | null
          host_url: string
          id?: string
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          metadata?: Json | null
          oneroster_version?: string
          school_id: number
          status?: string
          sync_count?: number | null
          token_url: string
          updated_at?: string | null
        }
        Update: {
          client_key?: string
          client_secret?: string
          configured_by?: string | null
          configured_by_role?: string | null
          created_at?: string | null
          created_by?: string | null
          host_url?: string
          id?: string
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          metadata?: Json | null
          oneroster_version?: string
          school_id?: number
          status?: string
          sync_count?: number | null
          token_url?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "infinite_campus_connections_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      mode_sessions: {
        Row: {
          created_at: string
          dismissal_run_id: string | null
          ended_at: string | null
          id: string
          location_id: string | null
          location_name: string | null
          mode_type: string
          school_id: number
          session_duration_seconds: number | null
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dismissal_run_id?: string | null
          ended_at?: string | null
          id?: string
          location_id?: string | null
          location_name?: string | null
          mode_type: string
          school_id: number
          session_duration_seconds?: number | null
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dismissal_run_id?: string | null
          ended_at?: string | null
          id?: string
          location_id?: string | null
          location_name?: string | null
          mode_type?: string
          school_id?: number
          session_duration_seconds?: number | null
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mode_sessions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mode_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_pending_signups: {
        Row: {
          completed: boolean
          created_at: string
          email: string | null
          expires_at: string
          id: string
          invitation_token: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          school_id: number | null
          state_token: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invitation_token?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          school_id?: number | null
          state_token: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invitation_token?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          school_id?: number | null
          state_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_pending_signups_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_provider: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          multi_school_migrated: boolean | null
          needs_school_association: boolean | null
          oauth_sub: string | null
          school_id: number | null
          updated_at: string
        }
        Insert: {
          auth_provider?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          multi_school_migrated?: boolean | null
          needs_school_association?: boolean | null
          oauth_sub?: string | null
          school_id?: number | null
          updated_at?: string
        }
        Update: {
          auth_provider?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          multi_school_migrated?: boolean | null
          needs_school_association?: boolean | null
          oauth_sub?: string | null
          school_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduler_execution_logs: {
        Row: {
          created_at: string
          errors: Json | null
          execution_duration_ms: number
          execution_time: string
          failed_schools: number
          id: string
          status: string
          successful_schools: number
          total_schools_processed: number
        }
        Insert: {
          created_at?: string
          errors?: Json | null
          execution_duration_ms: number
          execution_time?: string
          failed_schools?: number
          id?: string
          status: string
          successful_schools?: number
          total_schools_processed?: number
        }
        Update: {
          created_at?: string
          errors?: Json | null
          execution_duration_ms?: number
          execution_time?: string
          failed_schools?: number
          id?: string
          status?: string
          successful_schools?: number
          total_schools_processed?: number
        }
        Relationships: []
      }
      school_creation_logs: {
        Row: {
          created_at: string | null
          created_by_email: string
          created_by_ip: string | null
          flag_reasons: string[] | null
          flagged: boolean | null
          id: string
          school_data: Json
          school_id: number | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          created_by_email: string
          created_by_ip?: string | null
          flag_reasons?: string[] | null
          flagged?: boolean | null
          id?: string
          school_data: Json
          school_id?: number | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          created_by_email?: string
          created_by_ip?: string | null
          flag_reasons?: string[] | null
          flagged?: boolean | null
          id?: string
          school_data?: Json
          school_id?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_creation_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          after_school_activities_enabled: boolean | null
          audit_logs_enabled: boolean | null
          auto_dismissal_enabled: boolean | null
          car_lines_enabled: boolean | null
          city: string | null
          classroom_mode_layout: string | null
          county: string | null
          created_at: string
          created_at_ip: string | null
          created_by: string | null
          dismissal_time: string | null
          district_id: string | null
          email_notifications_enabled: boolean | null
          emergency_alerts_enabled: boolean | null
          flagged_reason: string | null
          id: number
          parent_notifications_enabled: boolean | null
          phone_number: string | null
          preparation_time_minutes: number | null
          primary_color: string | null
          school_district: string | null
          school_logo: string | null
          school_name: string | null
          secondary_color: string | null
          session_timeout_enabled: boolean | null
          sms_notifications_enabled: boolean | null
          state: string | null
          street_address: string | null
          timezone: string | null
          two_factor_required: boolean | null
          updated_at: string
          verification_status: string | null
          verified_at: string | null
          verified_by: string | null
          walkers_enabled: boolean | null
          zipcode: string | null
          zipcode_4_digit: string | null
        }
        Insert: {
          address?: string | null
          after_school_activities_enabled?: boolean | null
          audit_logs_enabled?: boolean | null
          auto_dismissal_enabled?: boolean | null
          car_lines_enabled?: boolean | null
          city?: string | null
          classroom_mode_layout?: string | null
          county?: string | null
          created_at?: string
          created_at_ip?: string | null
          created_by?: string | null
          dismissal_time?: string | null
          district_id?: string | null
          email_notifications_enabled?: boolean | null
          emergency_alerts_enabled?: boolean | null
          flagged_reason?: string | null
          id?: number
          parent_notifications_enabled?: boolean | null
          phone_number?: string | null
          preparation_time_minutes?: number | null
          primary_color?: string | null
          school_district?: string | null
          school_logo?: string | null
          school_name?: string | null
          secondary_color?: string | null
          session_timeout_enabled?: boolean | null
          sms_notifications_enabled?: boolean | null
          state?: string | null
          street_address?: string | null
          timezone?: string | null
          two_factor_required?: boolean | null
          updated_at?: string
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
          walkers_enabled?: boolean | null
          zipcode?: string | null
          zipcode_4_digit?: string | null
        }
        Update: {
          address?: string | null
          after_school_activities_enabled?: boolean | null
          audit_logs_enabled?: boolean | null
          auto_dismissal_enabled?: boolean | null
          car_lines_enabled?: boolean | null
          city?: string | null
          classroom_mode_layout?: string | null
          county?: string | null
          created_at?: string
          created_at_ip?: string | null
          created_by?: string | null
          dismissal_time?: string | null
          district_id?: string | null
          email_notifications_enabled?: boolean | null
          emergency_alerts_enabled?: boolean | null
          flagged_reason?: string | null
          id?: number
          parent_notifications_enabled?: boolean | null
          phone_number?: string | null
          preparation_time_minutes?: number | null
          primary_color?: string | null
          school_district?: string | null
          school_logo?: string | null
          school_name?: string | null
          secondary_color?: string | null
          session_timeout_enabled?: boolean | null
          sms_notifications_enabled?: boolean | null
          state?: string | null
          street_address?: string | null
          timezone?: string | null
          two_factor_required?: boolean | null
          updated_at?: string
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
          walkers_enabled?: boolean | null
          zipcode?: string | null
          zipcode_4_digit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schools_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schools_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schools_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      schools_backup_pre_split: {
        Row: {
          district_id: string | null
          id: number | null
        }
        Insert: {
          district_id?: string | null
          id?: number | null
        }
        Update: {
          district_id?: string | null
          id?: number | null
        }
        Relationships: []
      }
      special_use_group_managers: {
        Row: {
          assigned_at: string
          assigned_by: string
          group_id: string
          id: string
          manager_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          group_id: string
          id?: string
          manager_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          group_id?: string
          id?: string
          manager_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_use_group_managers_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_use_group_managers_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "special_use_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_use_group_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      special_use_group_students: {
        Row: {
          added_at: string
          added_by: string
          group_id: string
          id: string
          notes: string | null
          student_id: string
        }
        Insert: {
          added_at?: string
          added_by: string
          group_id: string
          id?: string
          notes?: string | null
          student_id: string
        }
        Update: {
          added_at?: string
          added_by?: string
          group_id?: string
          id?: string
          notes?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_use_group_students_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_use_group_students_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "special_use_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_use_group_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      special_use_groups: {
        Row: {
          academic_session_id: string | null
          created_at: string
          created_by: string
          description: string | null
          group_type: string
          id: string
          is_active: boolean | null
          name: string
          school_id: number
          updated_at: string
        }
        Insert: {
          academic_session_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          group_type: string
          id?: string
          is_active?: boolean | null
          name: string
          school_id: number
          updated_at?: string
        }
        Update: {
          academic_session_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          group_type?: string
          id?: string
          is_active?: boolean | null
          name?: string
          school_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_use_groups_academic_session_id_fkey"
            columns: ["academic_session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_use_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_use_groups_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      special_use_run_buses: {
        Row: {
          assigned_at: string
          bus_id: string
          capacity: number | null
          id: string
          run_id: string
        }
        Insert: {
          assigned_at?: string
          bus_id: string
          capacity?: number | null
          id?: string
          run_id: string
        }
        Update: {
          assigned_at?: string
          bus_id?: string
          capacity?: number | null
          id?: string
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_use_run_buses_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_use_run_buses_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "special_use_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      special_use_run_managers: {
        Row: {
          assigned_at: string
          assigned_by: string
          id: string
          manager_id: string
          run_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          id?: string
          manager_id: string
          run_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          id?: string
          manager_id?: string
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_use_run_managers_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_use_run_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_use_run_managers_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "special_use_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      special_use_runs: {
        Row: {
          academic_session_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string
          group_id: string
          id: string
          notes: string | null
          outbound_completed_at: string | null
          outbound_completed_by: string | null
          outbound_started_at: string | null
          outbound_started_by: string | null
          return_completed_at: string | null
          return_completed_by: string | null
          return_started_at: string | null
          return_started_by: string | null
          run_date: string
          run_name: string
          scheduled_departure_time: string | null
          scheduled_return_time: string | null
          school_id: number
          status: string
          updated_at: string
        }
        Insert: {
          academic_session_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by: string
          group_id: string
          id?: string
          notes?: string | null
          outbound_completed_at?: string | null
          outbound_completed_by?: string | null
          outbound_started_at?: string | null
          outbound_started_by?: string | null
          return_completed_at?: string | null
          return_completed_by?: string | null
          return_started_at?: string | null
          return_started_by?: string | null
          run_date: string
          run_name: string
          scheduled_departure_time?: string | null
          scheduled_return_time?: string | null
          school_id: number
          status?: string
          updated_at?: string
        }
        Update: {
          academic_session_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string
          group_id?: string
          id?: string
          notes?: string | null
          outbound_completed_at?: string | null
          outbound_completed_by?: string | null
          outbound_started_at?: string | null
          outbound_started_by?: string | null
          return_completed_at?: string | null
          return_completed_by?: string | null
          return_started_at?: string | null
          return_started_by?: string | null
          run_date?: string
          run_name?: string
          scheduled_departure_time?: string | null
          scheduled_return_time?: string | null
          school_id?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_use_runs_academic_session_id_fkey"
            columns: ["academic_session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_use_runs_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_use_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_use_runs_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "special_use_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_use_runs_outbound_completed_by_fkey"
            columns: ["outbound_completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_use_runs_outbound_started_by_fkey"
            columns: ["outbound_started_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_use_runs_return_completed_by_fkey"
            columns: ["return_completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_use_runs_return_started_by_fkey"
            columns: ["return_started_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_use_runs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      special_use_student_events: {
        Row: {
          bus_id: string
          created_at: string
          event_time: string
          event_type: string
          id: string
          notes: string | null
          parent_name: string | null
          recorded_by: string
          run_id: string
          student_id: string
        }
        Insert: {
          bus_id: string
          created_at?: string
          event_time?: string
          event_type: string
          id?: string
          notes?: string | null
          parent_name?: string | null
          recorded_by: string
          run_id: string
          student_id: string
        }
        Update: {
          bus_id?: string
          created_at?: string
          event_time?: string
          event_type?: string
          id?: string
          notes?: string | null
          parent_name?: string | null
          recorded_by?: string
          run_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_use_student_events_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_use_student_events_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_use_student_events_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "special_use_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_use_student_events_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_absences: {
        Row: {
          absence_type: string
          academic_session_id: string | null
          created_at: string
          end_date: string | null
          id: string
          marked_by: string
          notes: string | null
          reason: string | null
          returned_at: string | null
          returned_by: string | null
          school_id: number
          start_date: string
          student_id: string
          updated_at: string
        }
        Insert: {
          absence_type: string
          academic_session_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          marked_by: string
          notes?: string | null
          reason?: string | null
          returned_at?: string | null
          returned_by?: string | null
          school_id: number
          start_date: string
          student_id: string
          updated_at?: string
        }
        Update: {
          absence_type?: string
          academic_session_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          marked_by?: string
          notes?: string | null
          reason?: string | null
          returned_at?: string | null
          returned_by?: string | null
          school_id?: number
          start_date?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_absences_academic_session_id_fkey"
            columns: ["academic_session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_absences_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_absences_returned_by_fkey"
            columns: ["returned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_absences_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_absences_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_after_school_assignments: {
        Row: {
          after_school_activity_id: string
          assigned_at: string
          id: string
          student_id: string
        }
        Insert: {
          after_school_activity_id: string
          assigned_at?: string
          id?: string
          student_id: string
        }
        Update: {
          after_school_activity_id?: string
          assigned_at?: string
          id?: string
          student_id?: string
        }
        Relationships: []
      }
      student_bus_assignments: {
        Row: {
          assigned_at: string
          bus_id: string
          id: string
          student_id: string
        }
        Insert: {
          assigned_at?: string
          bus_id: string
          id?: string
          student_id: string
        }
        Update: {
          assigned_at?: string
          bus_id?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_bus_assignments_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_bus_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_car_assignments: {
        Row: {
          assigned_at: string
          car_line_id: string
          id: string
          student_id: string
        }
        Insert: {
          assigned_at?: string
          car_line_id: string
          id?: string
          student_id: string
        }
        Update: {
          assigned_at?: string
          car_line_id?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_student_car_line"
            columns: ["car_line_id"]
            isOneToOne: false
            referencedRelation: "car_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_student_car_student"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_temporary_transportation: {
        Row: {
          after_school_activity_id: string | null
          bus_id: string | null
          car_line_id: string | null
          created_at: string
          created_by: string
          end_date: string | null
          id: string
          notes: string | null
          notification_sent: boolean | null
          notification_sent_at: string | null
          override_type: string
          specific_dates: string[] | null
          start_date: string
          student_id: string
          updated_at: string
          walker_location_id: string | null
          weekday_pattern: number[] | null
        }
        Insert: {
          after_school_activity_id?: string | null
          bus_id?: string | null
          car_line_id?: string | null
          created_at?: string
          created_by: string
          end_date?: string | null
          id?: string
          notes?: string | null
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          override_type: string
          specific_dates?: string[] | null
          start_date: string
          student_id: string
          updated_at?: string
          walker_location_id?: string | null
          weekday_pattern?: number[] | null
        }
        Update: {
          after_school_activity_id?: string | null
          bus_id?: string | null
          car_line_id?: string | null
          created_at?: string
          created_by?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          override_type?: string
          specific_dates?: string[] | null
          start_date?: string
          student_id?: string
          updated_at?: string
          walker_location_id?: string | null
          weekday_pattern?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "student_temporary_transportation_after_school_activity_id_fkey"
            columns: ["after_school_activity_id"]
            isOneToOne: false
            referencedRelation: "after_school_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_temporary_transportation_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_temporary_transportation_car_line_id_fkey"
            columns: ["car_line_id"]
            isOneToOne: false
            referencedRelation: "car_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_temporary_transportation_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_temporary_transportation_walker_location_id_fkey"
            columns: ["walker_location_id"]
            isOneToOne: false
            referencedRelation: "walker_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      student_walker_assignments: {
        Row: {
          assigned_at: string
          id: string
          student_id: string
          walker_location_id: string
        }
        Insert: {
          assigned_at?: string
          id?: string
          student_id: string
          walker_location_id: string
        }
        Update: {
          assigned_at?: string
          id?: string
          student_id?: string
          walker_location_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_student_walker_location"
            columns: ["walker_location_id"]
            isOneToOne: false
            referencedRelation: "walker_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_student_walker_student"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          academic_session_id: string | null
          archived: boolean | null
          archived_at: string | null
          archived_by: string | null
          archived_reason: string | null
          contact_info: string | null
          created_at: string
          dismissal_group: string | null
          dismissal_mode_id: string | null
          first_name: string
          grade_level: string
          ic_external_id: string | null
          id: string
          last_name: string
          parent_guardian_name: string | null
          school_id: number
          special_notes: string | null
          student_id: string | null
          updated_at: string
        }
        Insert: {
          academic_session_id?: string | null
          archived?: boolean | null
          archived_at?: string | null
          archived_by?: string | null
          archived_reason?: string | null
          contact_info?: string | null
          created_at?: string
          dismissal_group?: string | null
          dismissal_mode_id?: string | null
          first_name: string
          grade_level: string
          ic_external_id?: string | null
          id?: string
          last_name: string
          parent_guardian_name?: string | null
          school_id: number
          special_notes?: string | null
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          academic_session_id?: string | null
          archived?: boolean | null
          archived_at?: string | null
          archived_by?: string | null
          archived_reason?: string | null
          contact_info?: string | null
          created_at?: string
          dismissal_group?: string | null
          dismissal_mode_id?: string | null
          first_name?: string
          grade_level?: string
          ic_external_id?: string | null
          id?: string
          last_name?: string
          parent_guardian_name?: string | null
          school_id?: number
          special_notes?: string | null
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_academic_session_id_fkey"
            columns: ["academic_session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          account_completed_at: string | null
          archived: boolean | null
          archived_at: string | null
          archived_by: string | null
          archived_reason: string | null
          auth_provider: string | null
          created_at: string
          email: string
          first_name: string
          ic_external_id: string | null
          id: string
          invitation_expires_at: string | null
          invitation_sent_at: string | null
          invitation_status: string | null
          invitation_token: string | null
          last_name: string
          school_id: number
          updated_at: string
        }
        Insert: {
          account_completed_at?: string | null
          archived?: boolean | null
          archived_at?: string | null
          archived_by?: string | null
          archived_reason?: string | null
          auth_provider?: string | null
          created_at?: string
          email: string
          first_name: string
          ic_external_id?: string | null
          id?: string
          invitation_expires_at?: string | null
          invitation_sent_at?: string | null
          invitation_status?: string | null
          invitation_token?: string | null
          last_name: string
          school_id: number
          updated_at?: string
        }
        Update: {
          account_completed_at?: string | null
          archived?: boolean | null
          archived_at?: string | null
          archived_by?: string | null
          archived_reason?: string | null
          auth_provider?: string | null
          created_at?: string
          email?: string
          first_name?: string
          ic_external_id?: string | null
          id?: string
          invitation_expires_at?: string | null
          invitation_sent_at?: string | null
          invitation_status?: string | null
          invitation_token?: string | null
          last_name?: string
          school_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teachers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      user_districts: {
        Row: {
          created_at: string | null
          district_id: string
          id: string
          is_primary: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          district_id: string
          id?: string
          is_primary?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          district_id?: string
          id?: string
          is_primary?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_districts_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_districts_backup_pre_split: {
        Row: {
          created_at: string | null
          district_id: string | null
          id: string | null
          is_primary: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          district_id?: string | null
          id?: string | null
          is_primary?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          district_id?: string | null
          id?: string | null
          is_primary?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_roles_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_schools: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          school_id: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          school_id: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          school_id?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_schools_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      walker_location_completions: {
        Row: {
          completed_at: string
          completed_by: string
          created_at: string
          dismissal_run_id: string
          id: string
          walker_location_id: string
        }
        Insert: {
          completed_at?: string
          completed_by: string
          created_at?: string
          dismissal_run_id: string
          id?: string
          walker_location_id: string
        }
        Update: {
          completed_at?: string
          completed_by?: string
          created_at?: string
          dismissal_run_id?: string
          id?: string
          walker_location_id?: string
        }
        Relationships: []
      }
      walker_locations: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          location_name: string
          school_id: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          location_name: string
          school_id: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          location_name?: string
          school_id?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      walker_pickups: {
        Row: {
          created_at: string
          id: string
          left_at: string | null
          managed_by: string
          status: string
          student_id: string
          updated_at: string
          walker_session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          left_at?: string | null
          managed_by: string
          status?: string
          student_id: string
          updated_at?: string
          walker_session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          left_at?: string | null
          managed_by?: string
          status?: string
          student_id?: string
          updated_at?: string
          walker_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "walker_pickups_managed_by_fkey"
            columns: ["managed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "walker_pickups_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "walker_pickups_walker_session_id_fkey"
            columns: ["walker_session_id"]
            isOneToOne: false
            referencedRelation: "walker_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      walker_sessions: {
        Row: {
          arrived_at: string
          created_at: string
          dismissal_run_id: string
          finished_at: string | null
          id: string
          managed_by: string
          school_id: number
          walker_location_id: string
        }
        Insert: {
          arrived_at?: string
          created_at?: string
          dismissal_run_id: string
          finished_at?: string | null
          id?: string
          managed_by: string
          school_id: number
          walker_location_id: string
        }
        Update: {
          arrived_at?: string
          created_at?: string
          dismissal_run_id?: string
          finished_at?: string | null
          id?: string
          managed_by?: string
          school_id?: number
          walker_location_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "walker_sessions_dismissal_run_id_fkey"
            columns: ["dismissal_run_id"]
            isOneToOne: false
            referencedRelation: "dismissal_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "walker_sessions_managed_by_fkey"
            columns: ["managed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "walker_sessions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "walker_sessions_walker_location_id_fkey"
            columns: ["walker_location_id"]
            isOneToOne: false
            referencedRelation: "walker_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      year_end_rollover_logs: {
        Row: {
          archived_session_id: string | null
          archived_session_name: string
          created_at: string
          groups_available: number | null
          groups_migrated: number | null
          groups_selected: number | null
          id: string
          metadata: Json | null
          new_session_id: string | null
          new_session_name: string
          performed_at: string
          performed_by: string
          school_id: number
          validation_errors: Json | null
          validation_passed: boolean
          validation_warnings: Json | null
        }
        Insert: {
          archived_session_id?: string | null
          archived_session_name: string
          created_at?: string
          groups_available?: number | null
          groups_migrated?: number | null
          groups_selected?: number | null
          id?: string
          metadata?: Json | null
          new_session_id?: string | null
          new_session_name: string
          performed_at?: string
          performed_by: string
          school_id: number
          validation_errors?: Json | null
          validation_passed?: boolean
          validation_warnings?: Json | null
        }
        Update: {
          archived_session_id?: string | null
          archived_session_name?: string
          created_at?: string
          groups_available?: number | null
          groups_migrated?: number | null
          groups_selected?: number | null
          id?: string
          metadata?: Json | null
          new_session_id?: string | null
          new_session_name?: string
          performed_at?: string
          performed_by?: string
          school_id?: number
          validation_errors?: Json | null
          validation_passed?: boolean
          validation_warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "year_end_rollover_logs_archived_session_id_fkey"
            columns: ["archived_session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "year_end_rollover_logs_new_session_id_fkey"
            columns: ["new_session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "year_end_rollover_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      active_temp_transportation: {
        Row: {
          after_school_activity_id: string | null
          bus_id: string | null
          car_line_id: string | null
          created_at: string | null
          created_by: string | null
          end_date: string | null
          id: string | null
          notes: string | null
          notification_sent: boolean | null
          notification_sent_at: string | null
          override_type: string | null
          specific_dates: string[] | null
          start_date: string | null
          student_id: string | null
          updated_at: string | null
          walker_location_id: string | null
          weekday_pattern: number[] | null
        }
        Insert: {
          after_school_activity_id?: string | null
          bus_id?: string | null
          car_line_id?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string | null
          notes?: string | null
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          override_type?: string | null
          specific_dates?: string[] | null
          start_date?: string | null
          student_id?: string | null
          updated_at?: string | null
          walker_location_id?: string | null
          weekday_pattern?: number[] | null
        }
        Update: {
          after_school_activity_id?: string | null
          bus_id?: string | null
          car_line_id?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string | null
          notes?: string | null
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          override_type?: string | null
          specific_dates?: string[] | null
          start_date?: string | null
          student_id?: string | null
          updated_at?: string | null
          walker_location_id?: string | null
          weekday_pattern?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "student_temporary_transportation_after_school_activity_id_fkey"
            columns: ["after_school_activity_id"]
            isOneToOne: false
            referencedRelation: "after_school_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_temporary_transportation_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_temporary_transportation_car_line_id_fkey"
            columns: ["car_line_id"]
            isOneToOne: false
            referencedRelation: "car_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_temporary_transportation_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_temporary_transportation_walker_location_id_fkey"
            columns: ["walker_location_id"]
            isOneToOne: false
            referencedRelation: "walker_locations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_dismissal_times:
        | {
            Args: { plan_dismissal_time: string; preparation_minutes?: number }
            Returns: {
              dismissal_start_time: string
              preparation_start_time: string
            }[]
          }
        | {
            Args: {
              plan_dismissal_time: string
              preparation_minutes?: number
              school_timezone?: string
            }
            Returns: {
              dismissal_start_time: string
              preparation_start_time: string
            }[]
          }
        | {
            Args: {
              plan_dismissal_time: string
              preparation_minutes?: number
              school_timezone?: string
              target_date?: string
            }
            Returns: {
              dismissal_start_time: string
              preparation_start_time: string
            }[]
          }
      calculate_ic_data_quality: {
        Args: { p_school_id: number }
        Returns: {
          classes_without_students: number
          classes_without_teachers: number
          data_quality_grade: string
          overall_completeness_score: number
          students_missing_contact_info: number
          students_missing_ic_id: number
          students_missing_parent_name: number
          students_without_classes: number
          teachers_missing_email: number
          teachers_missing_ic_id: number
          teachers_without_accounts: number
          teachers_without_classes: number
          total_classes: number
          total_students: number
          total_teachers: number
        }[]
      }
      can_manage_district_data: {
        Args: { target_district_id: string }
        Returns: boolean
      }
      can_manage_school_data: {
        Args: { target_school_id: number }
        Returns: boolean
      }
      can_manage_special_use_run: {
        Args: { p_run_id: string }
        Returns: boolean
      }
      can_manage_student: { Args: { student_uuid: string }; Returns: boolean }
      can_manage_student_safe: {
        Args: { student_uuid: string }
        Returns: boolean
      }
      can_operate_school_data: {
        Args: { target_school_id: number }
        Returns: boolean
      }
      can_view_district_data: {
        Args: { target_district_id: string }
        Returns: boolean
      }
      can_view_school_data: {
        Args: { target_school_id: number }
        Returns: boolean
      }
      check_auto_merge_rules: {
        Args: {
          p_confidence_score: number
          p_match_type: string
          p_record_type: string
          p_school_id: number
        }
        Returns: string
      }
      check_suspicious_school: {
        Args: { email: string; ip_address: string; school_name: string }
        Returns: string[]
      }
      cleanup_expired_email_requests: { Args: never; Returns: number }
      cleanup_expired_impersonation_sessions: { Args: never; Returns: number }
      cleanup_expired_oauth_signups: { Args: never; Returns: number }
      create_scheduled_dismissal_run: {
        Args: { target_date?: string; target_school_id: number }
        Returns: string
      }
      get_active_temp_transportation: {
        Args: { p_date?: string; p_student_id: string }
        Returns: {
          after_school_activity_id: string
          bus_id: string
          car_line_id: string
          created_by: string
          end_date: string
          id: string
          notes: string
          override_type: string
          start_date: string
          walker_location_id: string
        }[]
      }
      get_active_temp_transportation_batch: {
        Args: { p_date?: string; p_student_ids: string[] }
        Returns: {
          after_school_activity_id: string
          bus_id: string
          car_line_id: string
          end_date: string
          notes: string
          override_type: string
          start_date: string
          student_id: string
          walker_location_id: string
        }[]
      }
      get_active_temp_transportation_for_student: {
        Args: { _check_date?: string; _student_id: string }
        Returns: {
          after_school_activity_id: string
          bus_id: string
          car_line_id: string
          created_at: string
          created_by: string
          end_date: string
          id: string
          notes: string
          notification_sent: boolean
          notification_sent_at: string
          override_type: string
          specific_dates: string[]
          start_date: string
          student_id: string
          updated_at: string
          walker_location_id: string
          weekday_pattern: string[]
        }[]
      }
      get_any_impersonated_school_id: { Args: never; Returns: number }
      get_app_secret: { Args: { p_key: string }; Returns: string }
      get_current_academic_session: {
        Args: { p_school_id: number }
        Returns: string
      }
      get_current_user_school_id: { Args: never; Returns: number }
      get_district_school_ids: { Args: never; Returns: number[] }
      get_group_school_id: { Args: { p_group_id: string }; Returns: number }
      get_impersonated_school_id: { Args: never; Returns: number }
      get_people_paginated: {
        Args: {
          p_grade_filter?: string
          p_limit?: number
          p_offset?: number
          p_role_filter?: string
          p_school_id: number
          p_search_query?: string
          p_session_id?: string
          p_sort_by?: string
          p_sort_order?: string
        }
        Returns: {
          account_completed_at: string
          auth_provider: string
          email: string
          first_name: string
          grade_level: string
          id: string
          invitation_expires_at: string
          invitation_sent_at: string
          invitation_status: string
          last_name: string
          person_type: string
          role: string
          student_id: string
          total_count: number
        }[]
      }
      get_primary_school_id: { Args: { user_uuid: string }; Returns: number }
      get_run_school_id: { Args: { p_run_id: string }; Returns: number }
      get_school_admins_for_current_user: {
        Args: never
        Returns: {
          email: string
          first_name: string
          id: string
          last_name: string
        }[]
      }
      get_school_classes: {
        Args: { p_school_id: number; p_session_id?: string }
        Returns: {
          class_name: string
          id: string
        }[]
      }
      get_school_setup_status: {
        Args: { target_school_id?: number }
        Returns: {
          has_class: boolean
          has_student: boolean
          has_teacher: boolean
          school_updated: boolean
          transportation_ready: boolean
        }[]
      }
      get_schools_for_signup: {
        Args: never
        Returns: {
          city: string
          id: number
          school_name: string
          state: string
        }[]
      }
      get_special_use_run_students: {
        Args: { p_bus_id: string; p_run_id: string }
        Returns: {
          first_name: string
          grade_level: string
          last_name: string
          left_with_parent: boolean
          outbound_checked: boolean
          parent_name: string
          return_checked: boolean
          student_id: string
          student_number: string
        }[]
      }
      get_student_class_map: {
        Args: { p_session_id?: string; p_student_ids: string[] }
        Returns: {
          class_id: string
          class_name: string
          student_id: string
        }[]
      }
      get_student_safe_view: {
        Args: { student_uuid: string }
        Returns: {
          contact_info: string
          first_name: string
          grade_level: string
          id: string
          last_name: string
          parent_guardian_name: string
          school_id: number
          special_notes: string
        }[]
      }
      get_students_for_teacher: {
        Args: { session_id?: string; teacher_uuid?: string }
        Returns: {
          contact_info: string
          created_at: string
          dismissal_group: string
          first_name: string
          grade_level: string
          id: string
          last_name: string
          parent_guardian_name: string
          school_id: number
          special_notes: string
          student_id: string
          updated_at: string
        }[]
      }
      get_teacher_accessible_classes: {
        Args: {
          session_id?: string
          target_date?: string
          teacher_uuid: string
        }
        Returns: {
          class_id: string
          class_name: string
          coverage_notes: string
          grade_level: string
          is_permanent: boolean
          period_end_time: string
          period_name: string
          period_number: number
          period_start_time: string
        }[]
      }
      get_teacher_class_ids: {
        Args: { teacher_uuid: string }
        Returns: string[]
      }
      get_teacher_school_id: { Args: { p_teacher_id: string }; Returns: number }
      get_user_accessible_school_ids: { Args: never; Returns: number[] }
      get_user_district_id: { Args: { user_id: string }; Returns: string }
      get_user_school_id: { Args: { user_uuid: string }; Returns: number }
      get_user_school_ids: { Args: { user_uuid: string }; Returns: number[] }
      get_user_taught_class_ids: { Args: never; Returns: string[] }
      has_district_admin_role: { Args: { user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_group_manager: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: boolean
      }
      is_impersonating_school: {
        Args: { check_school_id: number }
        Returns: boolean
      }
      is_run_manager: {
        Args: { p_run_id: string; p_user_id: string }
        Returns: boolean
      }
      is_student_absent: {
        Args: { p_date?: string; p_student_id: string }
        Returns: boolean
      }
      promote_user_to_admin: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      search_schools_for_signup: {
        Args: { q: string }
        Returns: {
          city: string
          id: number
          school_name: string
          state: string
        }[]
      }
      should_trigger_data_quality_alert: {
        Args: { p_current_score: number; p_school_id: number }
        Returns: boolean
      }
      student_in_user_school: {
        Args: { _student_id: string }
        Returns: boolean
      }
      update_dismissal_run_times: {
        Args: {
          new_dismissal_time: string
          preparation_minutes?: number
          run_id: string
          school_timezone?: string
        }
        Returns: boolean
      }
      validate_school_impersonation: {
        Args: { target_school_id: number }
        Returns: boolean
      }
      validate_teacher_invitation_token: {
        Args: { token_input: string }
        Returns: {
          first_name: string
          school_name: string
          valid: boolean
        }[]
      }
    }
    Enums: {
      app_role: "system_admin" | "school_admin" | "teacher" | "district_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["system_admin", "school_admin", "teacher", "district_admin"],
    },
  },
} as const
