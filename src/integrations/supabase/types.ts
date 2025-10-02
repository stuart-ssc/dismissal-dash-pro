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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
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
        Relationships: []
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
      car_line_pickups: {
        Row: {
          car_line_session_id: string
          created_at: string
          id: string
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
          managed_by?: string
          parent_arrived_at?: string | null
          picked_up_at?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: []
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
        ]
      }
      car_lines: {
        Row: {
          color: string
          created_at: string
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
          id?: string
          line_name?: string
          pickup_location?: string
          school_id?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      class_rosters: {
        Row: {
          class_id: string
          enrolled_at: string
          id: string
          student_id: string
        }
        Insert: {
          class_id: string
          enrolled_at?: string
          id?: string
          student_id: string
        }
        Update: {
          class_id?: string
          enrolled_at?: string
          id?: string
          student_id?: string
        }
        Relationships: [
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
          class_name: string
          created_at: string
          grade_level: string | null
          id: string
          room_number: string | null
          school_id: number
          updated_at: string
        }
        Insert: {
          class_name: string
          created_at?: string
          grade_level?: string | null
          id?: string
          room_number?: string | null
          school_id: number
          updated_at?: string
        }
        Update: {
          class_name?: string
          created_at?: string
          grade_level?: string | null
          id?: string
          room_number?: string | null
          school_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: []
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
          bus_completed: boolean | null
          bus_completed_at: string | null
          bus_completed_by: string | null
          car_line_completed: boolean | null
          car_line_completed_at: string | null
          car_line_completed_by: string | null
          completion_method: string | null
          created_at: string
          date: string
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
          bus_completed?: boolean | null
          bus_completed_at?: string | null
          bus_completed_by?: string | null
          car_line_completed?: boolean | null
          car_line_completed_at?: string | null
          car_line_completed_by?: string | null
          completion_method?: string | null
          created_at?: string
          date?: string
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
          bus_completed?: boolean | null
          bus_completed_at?: string | null
          bus_completed_by?: string | null
          car_line_completed?: boolean | null
          car_line_completed_at?: string | null
          car_line_completed_by?: string | null
          completion_method?: string | null
          created_at?: string
          date?: string
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
        Relationships: []
      }
      email_change_requests: {
        Row: {
          approved_by: string | null
          created_at: string
          expires_at: string
          id: string
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
          verification_token: string | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
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
          verification_token?: string | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
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
          verification_token?: string | null
        }
        Relationships: []
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
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          school_id: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          school_id?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
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
      schools: {
        Row: {
          address: string | null
          after_school_activities_enabled: boolean | null
          audit_logs_enabled: boolean | null
          auto_dismissal_enabled: boolean | null
          car_lines_enabled: boolean | null
          city: string | null
          county: string | null
          created_at: string
          dismissal_time: string | null
          email_notifications_enabled: boolean | null
          emergency_alerts_enabled: boolean | null
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
          county?: string | null
          created_at?: string
          dismissal_time?: string | null
          email_notifications_enabled?: boolean | null
          emergency_alerts_enabled?: boolean | null
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
          county?: string | null
          created_at?: string
          dismissal_time?: string | null
          email_notifications_enabled?: boolean | null
          emergency_alerts_enabled?: boolean | null
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
          walkers_enabled?: boolean | null
          zipcode?: string | null
          zipcode_4_digit?: string | null
        }
        Relationships: []
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
          contact_info: string | null
          created_at: string
          dismissal_group: string | null
          first_name: string
          grade_level: string
          id: string
          last_name: string
          parent_guardian_name: string | null
          school_id: number
          special_notes: string | null
          student_id: string | null
          updated_at: string
        }
        Insert: {
          contact_info?: string | null
          created_at?: string
          dismissal_group?: string | null
          first_name: string
          grade_level: string
          id?: string
          last_name: string
          parent_guardian_name?: string | null
          school_id: number
          special_notes?: string | null
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          contact_info?: string | null
          created_at?: string
          dismissal_group?: string | null
          first_name?: string
          grade_level?: string
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
          created_at: string
          email: string
          first_name: string
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
          created_at?: string
          email: string
          first_name: string
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
          created_at?: string
          email?: string
          first_name?: string
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
        Relationships: []
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
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_dismissal_times: {
        Args:
          | { plan_dismissal_time: string; preparation_minutes?: number }
          | {
              plan_dismissal_time: string
              preparation_minutes?: number
              school_timezone?: string
            }
          | {
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
      can_manage_school_data: {
        Args: { target_school_id: number }
        Returns: boolean
      }
      can_manage_student: {
        Args: { student_uuid: string }
        Returns: boolean
      }
      can_manage_student_safe: {
        Args: { student_uuid: string }
        Returns: boolean
      }
      can_operate_school_data: {
        Args: { target_school_id: number }
        Returns: boolean
      }
      can_view_school_data: {
        Args: { target_school_id: number }
        Returns: boolean
      }
      cleanup_expired_email_requests: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      create_scheduled_dismissal_run: {
        Args: { target_date?: string; target_school_id: number }
        Returns: string
      }
      get_current_user_school_id: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_school_admins_for_current_user: {
        Args: Record<PropertyKey, never>
        Returns: {
          email: string
          first_name: string
          id: string
          last_name: string
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
        Args: Record<PropertyKey, never>
        Returns: {
          city: string
          id: number
          school_name: string
          state: string
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
        Args: { teacher_uuid?: string }
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
      get_students_for_teacher_safe: {
        Args: { teacher_uuid?: string }
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
      get_teacher_class_ids: {
        Args: { teacher_uuid: string }
        Returns: string[]
      }
      get_user_accessible_school_ids: {
        Args: Record<PropertyKey, never>
        Returns: number[]
      }
      get_user_school_id: {
        Args: { user_uuid: string }
        Returns: number
      }
      get_user_taught_class_ids: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
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
    }
    Enums: {
      app_role: "system_admin" | "school_admin" | "teacher"
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
      app_role: ["system_admin", "school_admin", "teacher"],
    },
  },
} as const
