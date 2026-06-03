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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          booking_type: string
          created_at: string
          customer_id: string
          id: string
          notes: string | null
          preferred_date: string
          preferred_time_slot: string | null
          status: string
          tenant_id: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          booking_type: string
          created_at?: string
          customer_id: string
          id?: string
          notes?: string | null
          preferred_date: string
          preferred_time_slot?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          booking_type?: string
          created_at?: string
          customer_id?: string
          id?: string
          notes?: string | null
          preferred_date?: string
          preferred_time_slot?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          close_time: string
          created_at: string
          id: string
          is_closed: boolean
          open_time: string
          tenant_id: string
          updated_at: string
          weekday: number
        }
        Insert: {
          close_time?: string
          created_at?: string
          id?: string
          is_closed?: boolean
          open_time?: string
          tenant_id: string
          updated_at?: string
          weekday: number
        }
        Update: {
          close_time?: string
          created_at?: string
          id?: string
          is_closed?: boolean
          open_time?: string
          tenant_id?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      corporate_contacts: {
        Row: {
          created_at: string
          customer_id: string
          email: string | null
          id: string
          line_user_id: string | null
          name: string
          phone: string | null
          role: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          email?: string | null
          id?: string
          line_user_id?: string | null
          name: string
          phone?: string | null
          role: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          email?: string | null
          id?: string
          line_user_id?: string | null
          name?: string
          phone?: string | null
          role?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "corporate_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corporate_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          birthday: string | null
          corporate_name: string | null
          created_at: string
          customer_type: string
          email: string | null
          id: string
          name: string
          name_kana: string | null
          notes: string | null
          phone: string | null
          postal_code: string | null
          representative_name: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          birthday?: string | null
          corporate_name?: string | null
          created_at?: string
          customer_type?: string
          email?: string | null
          id?: string
          name: string
          name_kana?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          representative_name?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          birthday?: string | null
          corporate_name?: string | null
          created_at?: string
          customer_type?: string
          email?: string | null
          id?: string
          name?: string
          name_kana?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          representative_name?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          customer_id: string | null
          document_type: string
          file_path: string
          id: string
          tenant_id: string
          title: string
          uploaded_by: string | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          document_type: string
          file_path: string
          id?: string
          tenant_id: string
          title: string
          uploaded_by?: string | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          document_type?: string
          file_path?: string
          id?: string
          tenant_id?: string
          title?: string
          uploaded_by?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "shop_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          amount: number | null
          created_at: string
          id: string
          inspection_type: string
          mileage: number | null
          next_due_date: string | null
          notes: string | null
          performed_at: string
          tenant_id: string
          vehicle_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          id?: string
          inspection_type: string
          mileage?: number | null
          next_due_date?: string | null
          notes?: string | null
          performed_at: string
          tenant_id: string
          vehicle_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          id?: string
          inspection_type?: string
          mileage?: number | null
          next_due_date?: string | null
          notes?: string | null
          performed_at?: string
          tenant_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      line_connections: {
        Row: {
          customer_id: string | null
          display_name: string | null
          id: string
          is_blocked: boolean
          line_user_id: string
          linked_at: string
          picture_url: string | null
          tenant_id: string
        }
        Insert: {
          customer_id?: string | null
          display_name?: string | null
          id?: string
          is_blocked?: boolean
          line_user_id: string
          linked_at?: string
          picture_url?: string | null
          tenant_id: string
        }
        Update: {
          customer_id?: string | null
          display_name?: string | null
          id?: string
          is_blocked?: boolean
          line_user_id?: string
          linked_at?: string
          picture_url?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "line_connections_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "line_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          channel: string
          customer_id: string | null
          error_message: string | null
          id: string
          opened_at: string | null
          recipient: string | null
          responded_at: string | null
          sent_at: string
          status: string
          tenant_id: string
          trigger_type: string
          vehicle_id: string | null
        }
        Insert: {
          channel: string
          customer_id?: string | null
          error_message?: string | null
          id?: string
          opened_at?: string | null
          recipient?: string | null
          responded_at?: string | null
          sent_at?: string
          status: string
          tenant_id: string
          trigger_type: string
          vehicle_id?: string | null
        }
        Update: {
          channel?: string
          customer_id?: string | null
          error_message?: string | null
          id?: string
          opened_at?: string | null
          recipient?: string | null
          responded_at?: string | null
          sent_at?: string
          status?: string
          tenant_id?: string
          trigger_type?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body: string
          channel: string
          created_at: string
          flex_message_json: Json | null
          id: string
          is_active: boolean
          tenant_id: string
          title: string | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          body: string
          channel?: string
          created_at?: string
          flex_message_json?: Json | null
          id?: string
          is_active?: boolean
          tenant_id: string
          title?: string | null
          trigger_type: string
          updated_at?: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          flex_message_json?: Json | null
          id?: string
          is_active?: boolean
          tenant_id?: string
          title?: string | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_events: {
        Row: {
          all_day: boolean
          created_at: string
          end_at: string
          event_type: string
          id: string
          notes: string | null
          start_at: string
          tenant_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          created_at?: string
          end_at: string
          event_type?: string
          id?: string
          notes?: string | null
          start_at: string
          tenant_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          created_at?: string
          end_at?: string
          event_type?: string
          id?: string
          notes?: string | null
          start_at?: string
          tenant_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_users: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          role: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          role?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          role?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan: string
          status: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          brand_color: string | null
          business_type: string | null
          created_at: string
          id: string
          liff_id: string | null
          line_channel_access_token_encrypted: string | null
          line_channel_id: string | null
          line_channel_secret_encrypted: string | null
          logo_url: string | null
          name: string
          slot_capacity: number
          slot_minutes: number
          slug: string
          status: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          brand_color?: string | null
          business_type?: string | null
          created_at?: string
          id?: string
          liff_id?: string | null
          line_channel_access_token_encrypted?: string | null
          line_channel_id?: string | null
          line_channel_secret_encrypted?: string | null
          logo_url?: string | null
          name: string
          slot_capacity?: number
          slot_minutes?: number
          slug: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          brand_color?: string | null
          business_type?: string | null
          created_at?: string
          id?: string
          liff_id?: string | null
          line_channel_access_token_encrypted?: string | null
          line_channel_id?: string | null
          line_channel_secret_encrypted?: string | null
          logo_url?: string | null
          name?: string
          slot_capacity?: number
          slot_minutes?: number
          slug?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          body_shape: string | null
          capacity: number | null
          created_at: string
          current_mileage: number | null
          customer_id: string
          displacement: number | null
          first_registration_date: string | null
          fuel_type: string | null
          id: string
          inspection_certificate_image_path: string | null
          inspection_expiry_date: string | null
          last_mileage_recorded_at: string | null
          liability_insurance_expiry_date: string | null
          model_code: string | null
          notes: string | null
          registration_date: string | null
          status: string
          tenant_id: string
          total_weight: number | null
          updated_at: string
          vehicle_name: string | null
          vehicle_number: string | null
          vehicle_weight: number | null
          vin: string | null
          voluntary_insurance_company: string | null
          voluntary_insurance_expiry_date: string | null
        }
        Insert: {
          body_shape?: string | null
          capacity?: number | null
          created_at?: string
          current_mileage?: number | null
          customer_id: string
          displacement?: number | null
          first_registration_date?: string | null
          fuel_type?: string | null
          id?: string
          inspection_certificate_image_path?: string | null
          inspection_expiry_date?: string | null
          last_mileage_recorded_at?: string | null
          liability_insurance_expiry_date?: string | null
          model_code?: string | null
          notes?: string | null
          registration_date?: string | null
          status?: string
          tenant_id: string
          total_weight?: number | null
          updated_at?: string
          vehicle_name?: string | null
          vehicle_number?: string | null
          vehicle_weight?: number | null
          vin?: string | null
          voluntary_insurance_company?: string | null
          voluntary_insurance_expiry_date?: string | null
        }
        Update: {
          body_shape?: string | null
          capacity?: number | null
          created_at?: string
          current_mileage?: number | null
          customer_id?: string
          displacement?: number | null
          first_registration_date?: string | null
          fuel_type?: string | null
          id?: string
          inspection_certificate_image_path?: string | null
          inspection_expiry_date?: string | null
          last_mileage_recorded_at?: string | null
          liability_insurance_expiry_date?: string | null
          model_code?: string | null
          notes?: string | null
          registration_date?: string | null
          status?: string
          tenant_id?: string
          total_weight?: number | null
          updated_at?: string
          vehicle_name?: string | null
          vehicle_number?: string | null
          vehicle_weight?: number | null
          vin?: string | null
          voluntary_insurance_company?: string | null
          voluntary_insurance_expiry_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_role: { Args: never; Returns: string }
      auth_tenant_id: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
