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
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      buildings: {
        Row: {
          apl_set: boolean | null
          ausbau_art: Database["public"]["Enums"]["ausbau_art"] | null
          ausbau_status: Database["public"]["Enums"]["ausbau_status"] | null
          city: string
          created_at: string
          gebaeude_id_k7: string | null
          gebaeude_id_v2: string | null
          has_manual_override: boolean | null
          house_number: string
          id: string
          is_manual_entry: boolean | null
          kabel_tv_available: boolean | null
          manual_override_active: boolean | null
          original_csv_data: Json | null
          postal_code: string | null
          residential_units: number | null
          street: string
          tiefbau_done: boolean | null
          updated_at: string
        }
        Insert: {
          apl_set?: boolean | null
          ausbau_art?: Database["public"]["Enums"]["ausbau_art"] | null
          ausbau_status?: Database["public"]["Enums"]["ausbau_status"] | null
          city?: string
          created_at?: string
          gebaeude_id_k7?: string | null
          gebaeude_id_v2?: string | null
          has_manual_override?: boolean | null
          house_number: string
          id?: string
          is_manual_entry?: boolean | null
          kabel_tv_available?: boolean | null
          manual_override_active?: boolean | null
          original_csv_data?: Json | null
          postal_code?: string | null
          residential_units?: number | null
          street: string
          tiefbau_done?: boolean | null
          updated_at?: string
        }
        Update: {
          apl_set?: boolean | null
          ausbau_art?: Database["public"]["Enums"]["ausbau_art"] | null
          ausbau_status?: Database["public"]["Enums"]["ausbau_status"] | null
          city?: string
          created_at?: string
          gebaeude_id_k7?: string | null
          gebaeude_id_v2?: string | null
          has_manual_override?: boolean | null
          house_number?: string
          id?: string
          is_manual_entry?: boolean | null
          kabel_tv_available?: boolean | null
          manual_override_active?: boolean | null
          original_csv_data?: Json | null
          postal_code?: string | null
          residential_units?: number | null
          street?: string
          tiefbau_done?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      csv_import_logs: {
        Row: {
          created_at: string
          errors: Json | null
          file_name: string | null
          id: string
          import_type: string
          imported_by: string | null
          records_created: number | null
          records_processed: number | null
          records_skipped: number | null
          records_updated: number | null
          source_url: string | null
        }
        Insert: {
          created_at?: string
          errors?: Json | null
          file_name?: string | null
          id?: string
          import_type: string
          imported_by?: string | null
          records_created?: number | null
          records_processed?: number | null
          records_skipped?: number | null
          records_updated?: number | null
          source_url?: string | null
        }
        Update: {
          created_at?: string
          errors?: Json | null
          file_name?: string | null
          id?: string
          import_type?: string
          imported_by?: string | null
          records_created?: number | null
          records_processed?: number | null
          records_skipped?: number | null
          records_updated?: number | null
          source_url?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          customer_number: string
          email: string | null
          id: string
          is_active: boolean | null
          name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_number: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_number?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      product_option_mappings: {
        Row: {
          created_at: string
          discount_amount: number | null
          id: string
          is_included: boolean | null
          option_id: string
          option_id_k7: string | null
          product_id: string
        }
        Insert: {
          created_at?: string
          discount_amount?: number | null
          id?: string
          is_included?: boolean | null
          option_id: string
          option_id_k7?: string | null
          product_id: string
        }
        Update: {
          created_at?: string
          discount_amount?: number | null
          id?: string
          is_included?: boolean | null
          option_id?: string
          option_id_k7?: string | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_option_mappings_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "product_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_option_mappings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_options: {
        Row: {
          category: string
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_fttb: boolean | null
          is_ftth: boolean | null
          monthly_price: number | null
          name: string
          one_time_price: number | null
          requires_kabel_tv: boolean | null
          slug: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_fttb?: boolean | null
          is_ftth?: boolean | null
          monthly_price?: number | null
          name: string
          one_time_price?: number | null
          requires_kabel_tv?: boolean | null
          slug: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_fttb?: boolean | null
          is_ftth?: boolean | null
          monthly_price?: number | null
          name?: string
          one_time_price?: number | null
          requires_kabel_tv?: boolean | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          contract_months: number | null
          created_at: string
          description: string | null
          display_order: number | null
          download_speed: number | null
          id: string
          includes_phone: boolean | null
          is_active: boolean | null
          is_fttb: boolean | null
          is_ftth: boolean | null
          monthly_price: number
          name: string
          product_id_k7: string | null
          setup_fee: number | null
          slug: string
          updated_at: string
          upload_speed: number | null
        }
        Insert: {
          contract_months?: number | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          download_speed?: number | null
          id?: string
          includes_phone?: boolean | null
          is_active?: boolean | null
          is_fttb?: boolean | null
          is_ftth?: boolean | null
          monthly_price: number
          name: string
          product_id_k7?: string | null
          setup_fee?: number | null
          slug: string
          updated_at?: string
          upload_speed?: number | null
        }
        Update: {
          contract_months?: number | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          download_speed?: number | null
          id?: string
          includes_phone?: boolean | null
          is_active?: boolean | null
          is_fttb?: boolean | null
          is_ftth?: boolean | null
          monthly_price?: number
          name?: string
          product_id_k7?: string | null
          setup_fee?: number | null
          slug?: string
          updated_at?: string
          upload_speed?: number | null
        }
        Relationships: []
      }
      promotion_buildings: {
        Row: {
          building_id: string
          created_at: string
          id: string
          promotion_id: string
        }
        Insert: {
          building_id: string
          created_at?: string
          id?: string
          promotion_id: string
        }
        Update: {
          building_id?: string
          created_at?: string
          id?: string
          promotion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_buildings_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_buildings_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_discounts: {
        Row: {
          applies_to: string
          created_at: string
          discount_amount: number | null
          discount_type: string
          id: string
          k7_product_id: string | null
          k7_template_id: string | null
          k7_template_type: string | null
          promotion_id: string
          target_option_id: string | null
          target_product_id: string | null
        }
        Insert: {
          applies_to: string
          created_at?: string
          discount_amount?: number | null
          discount_type: string
          id?: string
          k7_product_id?: string | null
          k7_template_id?: string | null
          k7_template_type?: string | null
          promotion_id: string
          target_option_id?: string | null
          target_product_id?: string | null
        }
        Update: {
          applies_to?: string
          created_at?: string
          discount_amount?: number | null
          discount_type?: string
          id?: string
          k7_product_id?: string | null
          k7_template_id?: string | null
          k7_template_type?: string | null
          promotion_id?: string
          target_option_id?: string | null
          target_product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_discounts_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_discounts_target_option_id_fkey"
            columns: ["target_option_id"]
            isOneToOne: false
            referencedRelation: "product_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_discounts_target_product_id_fkey"
            columns: ["target_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          available_text: string | null
          code: string | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          is_global: boolean | null
          name: string
          requires_customer_number: boolean | null
          start_date: string | null
          unavailable_text: string | null
          updated_at: string
        }
        Insert: {
          available_text?: string | null
          code?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          is_global?: boolean | null
          name: string
          requires_customer_number?: boolean | null
          start_date?: string | null
          unavailable_text?: string | null
          updated_at?: string
        }
        Update: {
          available_text?: string | null
          code?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          is_global?: boolean | null
          name?: string
          requires_customer_number?: boolean | null
          start_date?: string | null
          unavailable_text?: string | null
          updated_at?: string
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
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_address_availability: {
        Args: { p_city?: string; p_house_number: string; p_street: string }
        Returns: {
          ausbau_art: Database["public"]["Enums"]["ausbau_art"]
          ausbau_status: Database["public"]["Enums"]["ausbau_status"]
          city: string
          house_number: string
          kabel_tv_available: boolean
          street: string
        }[]
      }
      get_house_numbers: {
        Args: { p_city?: string; p_street: string }
        Returns: {
          house_number: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      search_streets: {
        Args: { p_city?: string; p_query: string }
        Returns: {
          street: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      ausbau_art: "ftth" | "fttb"
      ausbau_status: "abgeschlossen" | "im_ausbau" | "geplant"
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
      app_role: ["admin", "user"],
      ausbau_art: ["ftth", "fttb"],
      ausbau_status: ["abgeschlossen", "im_ausbau", "geplant"],
    },
  },
} as const
