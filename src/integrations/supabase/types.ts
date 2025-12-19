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
      admin_permissions: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          permission: Database["public"]["Enums"]["admin_permission"]
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          permission: Database["public"]["Enums"]["admin_permission"]
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          permission?: Database["public"]["Enums"]["admin_permission"]
          user_id?: string
        }
        Relationships: []
      }
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
      audit_logs: {
        Row: {
          action_details: Json | null
          action_type: string
          created_at: string
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          created_at?: string
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      building_home_ids: {
        Row: {
          building_id: string
          created_at: string
          home_id_type: string
          home_id_value: string
          id: string
          unit_number: number
          updated_at: string
        }
        Insert: {
          building_id: string
          created_at?: string
          home_id_type?: string
          home_id_value?: string
          id?: string
          unit_number?: number
          updated_at?: string
        }
        Update: {
          building_id?: string
          created_at?: string
          home_id_type?: string
          home_id_value?: string
          id?: string
          unit_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "building_home_ids_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      building_k7_services: {
        Row: {
          bandbreite: string | null
          building_id: string
          created_at: string
          id: string
          leistungsprodukt: string | null
          leistungsprodukt_id: string | null
          nt_dsl_bandbreite_id: string | null
          std_kabel_gebaeude_id: string | null
          updated_at: string
        }
        Insert: {
          bandbreite?: string | null
          building_id: string
          created_at?: string
          id?: string
          leistungsprodukt?: string | null
          leistungsprodukt_id?: string | null
          nt_dsl_bandbreite_id?: string | null
          std_kabel_gebaeude_id?: string | null
          updated_at?: string
        }
        Update: {
          bandbreite?: string | null
          building_id?: string
          created_at?: string
          id?: string
          leistungsprodukt?: string | null
          leistungsprodukt_id?: string | null
          nt_dsl_bandbreite_id?: string | null
          std_kabel_gebaeude_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "building_k7_services_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      buildings: {
        Row: {
          apl_set: boolean | null
          ausbau_art: Database["public"]["Enums"]["ausbau_art"] | null
          ausbau_status: Database["public"]["Enums"]["ausbau_status"] | null
          building_type: Database["public"]["Enums"]["building_type"] | null
          building_type_manual:
            | Database["public"]["Enums"]["building_type"]
            | null
          city: string
          cluster: string | null
          created_at: string
          dslam_id: string | null
          dslam_port_number: number | null
          dslam_ports_available: number | null
          dslam_ports_occupied: number | null
          gebaeude_id_k7: string | null
          gebaeude_id_v2: string | null
          gnv_vorhanden: boolean | null
          has_manual_override: boolean | null
          house_number: string
          id: string
          is_manual_entry: boolean | null
          kabel_tv_available: boolean | null
          kmu_tariffs_available: boolean | null
          last_import_batch_id: string | null
          manual_override_active: boolean | null
          original_csv_data: Json | null
          pk_tariffs_available: boolean | null
          postal_code: string | null
          protected_fields: string[] | null
          residential_units: number | null
          street: string
          tiefbau_done: boolean | null
          updated_at: string
        }
        Insert: {
          apl_set?: boolean | null
          ausbau_art?: Database["public"]["Enums"]["ausbau_art"] | null
          ausbau_status?: Database["public"]["Enums"]["ausbau_status"] | null
          building_type?: Database["public"]["Enums"]["building_type"] | null
          building_type_manual?:
            | Database["public"]["Enums"]["building_type"]
            | null
          city?: string
          cluster?: string | null
          created_at?: string
          dslam_id?: string | null
          dslam_port_number?: number | null
          dslam_ports_available?: number | null
          dslam_ports_occupied?: number | null
          gebaeude_id_k7?: string | null
          gebaeude_id_v2?: string | null
          gnv_vorhanden?: boolean | null
          has_manual_override?: boolean | null
          house_number: string
          id?: string
          is_manual_entry?: boolean | null
          kabel_tv_available?: boolean | null
          kmu_tariffs_available?: boolean | null
          last_import_batch_id?: string | null
          manual_override_active?: boolean | null
          original_csv_data?: Json | null
          pk_tariffs_available?: boolean | null
          postal_code?: string | null
          protected_fields?: string[] | null
          residential_units?: number | null
          street: string
          tiefbau_done?: boolean | null
          updated_at?: string
        }
        Update: {
          apl_set?: boolean | null
          ausbau_art?: Database["public"]["Enums"]["ausbau_art"] | null
          ausbau_status?: Database["public"]["Enums"]["ausbau_status"] | null
          building_type?: Database["public"]["Enums"]["building_type"] | null
          building_type_manual?:
            | Database["public"]["Enums"]["building_type"]
            | null
          city?: string
          cluster?: string | null
          created_at?: string
          dslam_id?: string | null
          dslam_port_number?: number | null
          dslam_ports_available?: number | null
          dslam_ports_occupied?: number | null
          gebaeude_id_k7?: string | null
          gebaeude_id_v2?: string | null
          gnv_vorhanden?: boolean | null
          has_manual_override?: boolean | null
          house_number?: string
          id?: string
          is_manual_entry?: boolean | null
          kabel_tv_available?: boolean | null
          kmu_tariffs_available?: boolean | null
          last_import_batch_id?: string | null
          manual_override_active?: boolean | null
          original_csv_data?: Json | null
          pk_tariffs_available?: boolean | null
          postal_code?: string | null
          protected_fields?: string[] | null
          residential_units?: number | null
          street?: string
          tiefbau_done?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buildings_dslam_id_fkey"
            columns: ["dslam_id"]
            isOneToOne: false
            referencedRelation: "dslams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buildings_last_import_batch_id_fkey"
            columns: ["last_import_batch_id"]
            isOneToOne: false
            referencedRelation: "csv_import_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      csv_import_logs: {
        Row: {
          affected_building_ids: string[] | null
          created_at: string
          errors: Json | null
          file_name: string | null
          id: string
          import_type: string
          imported_by: string | null
          is_reverted: boolean | null
          previous_states: Json | null
          records_created: number | null
          records_processed: number | null
          records_skipped: number | null
          records_updated: number | null
          reverted_at: string | null
          reverted_by: string | null
          source_url: string | null
        }
        Insert: {
          affected_building_ids?: string[] | null
          created_at?: string
          errors?: Json | null
          file_name?: string | null
          id?: string
          import_type: string
          imported_by?: string | null
          is_reverted?: boolean | null
          previous_states?: Json | null
          records_created?: number | null
          records_processed?: number | null
          records_skipped?: number | null
          records_updated?: number | null
          reverted_at?: string | null
          reverted_by?: string | null
          source_url?: string | null
        }
        Update: {
          affected_building_ids?: string[] | null
          created_at?: string
          errors?: Json | null
          file_name?: string | null
          id?: string
          import_type?: string
          imported_by?: string | null
          is_reverted?: boolean | null
          previous_states?: Json | null
          records_created?: number | null
          records_processed?: number | null
          records_skipped?: number | null
          records_updated?: number | null
          reverted_at?: string | null
          reverted_by?: string | null
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
      decision_tree_actions: {
        Row: {
          action_type: Database["public"]["Enums"]["decision_action_type"]
          config: Json
          created_at: string
          id: string
          node_id: string
        }
        Insert: {
          action_type: Database["public"]["Enums"]["decision_action_type"]
          config?: Json
          created_at?: string
          id?: string
          node_id: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["decision_action_type"]
          config?: Json
          created_at?: string
          id?: string
          node_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_tree_actions_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "decision_tree_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_tree_conditions: {
        Row: {
          compare_value: string | null
          created_at: string
          field_name: string
          id: string
          node_id: string
          operator: Database["public"]["Enums"]["decision_operator"]
          sort_order: number
        }
        Insert: {
          compare_value?: string | null
          created_at?: string
          field_name: string
          id?: string
          node_id: string
          operator?: Database["public"]["Enums"]["decision_operator"]
          sort_order?: number
        }
        Update: {
          compare_value?: string | null
          created_at?: string
          field_name?: string
          id?: string
          node_id?: string
          operator?: Database["public"]["Enums"]["decision_operator"]
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "decision_tree_conditions_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "decision_tree_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_tree_edges: {
        Row: {
          created_at: string
          id: string
          label: string | null
          sort_order: number
          source_node_id: string
          target_node_id: string
          tree_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          sort_order?: number
          source_node_id: string
          target_node_id: string
          tree_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          sort_order?: number
          source_node_id?: string
          target_node_id?: string
          tree_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_tree_edges_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "decision_tree_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_tree_edges_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "decision_tree_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_tree_edges_tree_id_fkey"
            columns: ["tree_id"]
            isOneToOne: false
            referencedRelation: "decision_trees"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_tree_nodes: {
        Row: {
          created_at: string
          id: string
          is_root: boolean
          name: string
          node_type: Database["public"]["Enums"]["decision_node_type"]
          position_x: number
          position_y: number
          tree_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_root?: boolean
          name: string
          node_type: Database["public"]["Enums"]["decision_node_type"]
          position_x?: number
          position_y?: number
          tree_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_root?: boolean
          name?: string
          node_type?: Database["public"]["Enums"]["decision_node_type"]
          position_x?: number
          position_y?: number
          tree_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_tree_nodes_tree_id_fkey"
            columns: ["tree_id"]
            isOneToOne: false
            referencedRelation: "decision_trees"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_trees: {
        Row: {
          created_at: string
          customer_type: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_type?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_type?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_templates: {
        Row: {
          auto_send: boolean | null
          content: string
          created_at: string
          description: string | null
          email_subject_template: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          pdf_url: string | null
          placeholders: Json | null
          recipient_type: string | null
          send_as_attachment: boolean | null
          template_type: string
          trigger_event: string | null
          updated_at: string
          use_case: string | null
          use_cases: string[] | null
          variable_mappings: Json | null
        }
        Insert: {
          auto_send?: boolean | null
          content: string
          created_at?: string
          description?: string | null
          email_subject_template?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          pdf_url?: string | null
          placeholders?: Json | null
          recipient_type?: string | null
          send_as_attachment?: boolean | null
          template_type?: string
          trigger_event?: string | null
          updated_at?: string
          use_case?: string | null
          use_cases?: string[] | null
          variable_mappings?: Json | null
        }
        Update: {
          auto_send?: boolean | null
          content?: string
          created_at?: string
          description?: string | null
          email_subject_template?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          pdf_url?: string | null
          placeholders?: Json | null
          recipient_type?: string | null
          send_as_attachment?: boolean | null
          template_type?: string
          trigger_event?: string | null
          updated_at?: string
          use_case?: string | null
          use_cases?: string[] | null
          variable_mappings?: Json | null
        }
        Relationships: []
      }
      dslams: {
        Row: {
          created_at: string
          id: string
          location_description: string | null
          name: string
          total_ports: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_description?: string | null
          name: string
          total_ports?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          location_description?: string | null
          name?: string
          total_ports?: number
          updated_at?: string
        }
        Relationships: []
      }
      option_buildings: {
        Row: {
          building_id: string
          created_at: string
          id: string
          option_id: string
        }
        Insert: {
          building_id: string
          created_at?: string
          id?: string
          option_id: string
        }
        Update: {
          building_id?: string
          created_at?: string
          id?: string
          option_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "option_buildings_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "option_buildings_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "product_options"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          apartment: string | null
          applied_promotions: Json | null
          archived_at: string | null
          archived_by: string | null
          bank_account_holder: string | null
          bank_iban: string | null
          cancel_previous_provider: boolean | null
          city: string
          connection_type: string | null
          consent_advertising: boolean | null
          consent_agb: boolean | null
          contract_months: number
          created_at: string
          customer_email: string
          customer_first_name: string | null
          customer_last_name: string | null
          customer_name: string
          customer_phone: string | null
          desired_start_date: string | null
          express_activation: boolean | null
          floor: string | null
          house_number: string
          id: string
          is_archived: boolean
          monthly_total: number
          one_time_total: number
          phone_book_custom_address: string | null
          phone_book_custom_name: string | null
          phone_book_entry_type: string | null
          phone_book_internet: boolean | null
          phone_book_phone_info: boolean | null
          phone_book_printed: boolean | null
          phone_book_show_address: boolean | null
          phone_evn: boolean | null
          phone_porting: boolean | null
          phone_porting_numbers: Json | null
          phone_porting_provider: string | null
          postal_code: string | null
          previous_provider_customer_number: string | null
          previous_provider_name: string | null
          previous_provider_phone: string | null
          product_id: string | null
          product_monthly_price: number
          product_name: string
          promo_code: string | null
          referral_customer_number: string | null
          selected_options: Json | null
          setup_fee: number
          status: string
          street: string
          updated_at: string
          vzf_data: Json
          vzf_generated_at: string
        }
        Insert: {
          apartment?: string | null
          applied_promotions?: Json | null
          archived_at?: string | null
          archived_by?: string | null
          bank_account_holder?: string | null
          bank_iban?: string | null
          cancel_previous_provider?: boolean | null
          city?: string
          connection_type?: string | null
          consent_advertising?: boolean | null
          consent_agb?: boolean | null
          contract_months?: number
          created_at?: string
          customer_email: string
          customer_first_name?: string | null
          customer_last_name?: string | null
          customer_name: string
          customer_phone?: string | null
          desired_start_date?: string | null
          express_activation?: boolean | null
          floor?: string | null
          house_number: string
          id?: string
          is_archived?: boolean
          monthly_total: number
          one_time_total?: number
          phone_book_custom_address?: string | null
          phone_book_custom_name?: string | null
          phone_book_entry_type?: string | null
          phone_book_internet?: boolean | null
          phone_book_phone_info?: boolean | null
          phone_book_printed?: boolean | null
          phone_book_show_address?: boolean | null
          phone_evn?: boolean | null
          phone_porting?: boolean | null
          phone_porting_numbers?: Json | null
          phone_porting_provider?: string | null
          postal_code?: string | null
          previous_provider_customer_number?: string | null
          previous_provider_name?: string | null
          previous_provider_phone?: string | null
          product_id?: string | null
          product_monthly_price: number
          product_name: string
          promo_code?: string | null
          referral_customer_number?: string | null
          selected_options?: Json | null
          setup_fee?: number
          status?: string
          street: string
          updated_at?: string
          vzf_data: Json
          vzf_generated_at?: string
        }
        Update: {
          apartment?: string | null
          applied_promotions?: Json | null
          archived_at?: string | null
          archived_by?: string | null
          bank_account_holder?: string | null
          bank_iban?: string | null
          cancel_previous_provider?: boolean | null
          city?: string
          connection_type?: string | null
          consent_advertising?: boolean | null
          consent_agb?: boolean | null
          contract_months?: number
          created_at?: string
          customer_email?: string
          customer_first_name?: string | null
          customer_last_name?: string | null
          customer_name?: string
          customer_phone?: string | null
          desired_start_date?: string | null
          express_activation?: boolean | null
          floor?: string | null
          house_number?: string
          id?: string
          is_archived?: boolean
          monthly_total?: number
          one_time_total?: number
          phone_book_custom_address?: string | null
          phone_book_custom_name?: string | null
          phone_book_entry_type?: string | null
          phone_book_internet?: boolean | null
          phone_book_phone_info?: boolean | null
          phone_book_printed?: boolean | null
          phone_book_show_address?: boolean | null
          phone_evn?: boolean | null
          phone_porting?: boolean | null
          phone_porting_numbers?: Json | null
          phone_porting_provider?: string | null
          postal_code?: string | null
          previous_provider_customer_number?: string | null
          previous_provider_name?: string | null
          previous_provider_phone?: string | null
          product_id?: string | null
          product_monthly_price?: number
          product_name?: string
          promo_code?: string | null
          referral_customer_number?: string | null
          selected_options?: Json | null
          setup_fee?: number
          status?: string
          street?: string
          updated_at?: string
          vzf_data?: Json
          vzf_generated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_porting_providers: {
        Row: {
          created_at: string
          display_name: string
          display_order: number | null
          id: string
          is_active: boolean | null
          is_other: boolean | null
          name: string
          provider_code: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_other?: boolean | null
          name: string
          provider_code?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_other?: boolean | null
          name?: string
          provider_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      product_buildings: {
        Row: {
          building_id: string
          created_at: string
          id: string
          product_id: string
        }
        Insert: {
          building_id: string
          created_at?: string
          id?: string
          product_id: string
        }
        Update: {
          building_id?: string
          created_at?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_buildings_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_buildings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
          auto_include_option_slug: string[] | null
          category: string
          created_at: string
          customer_type: string
          description: string | null
          display_order: number | null
          exclusive_group: string | null
          external_link_label: string | null
          external_link_url: string | null
          id: string
          image_url: string | null
          image_urls: string[] | null
          info_text: string | null
          is_active: boolean | null
          is_building_restricted: boolean | null
          is_fttb: boolean | null
          is_ftth: boolean | null
          is_quantitative: boolean | null
          is_sondertarif_only: boolean | null
          max_quantity: number | null
          monthly_price: number | null
          name: string
          one_time_price: number | null
          parent_option_slug: string[] | null
          quantity_label: string | null
          requires_kabel_tv: boolean | null
          slug: string
          updated_at: string
          vzf_text: string | null
        }
        Insert: {
          auto_include_option_slug?: string[] | null
          category: string
          created_at?: string
          customer_type?: string
          description?: string | null
          display_order?: number | null
          exclusive_group?: string | null
          external_link_label?: string | null
          external_link_url?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          info_text?: string | null
          is_active?: boolean | null
          is_building_restricted?: boolean | null
          is_fttb?: boolean | null
          is_ftth?: boolean | null
          is_quantitative?: boolean | null
          is_sondertarif_only?: boolean | null
          max_quantity?: number | null
          monthly_price?: number | null
          name: string
          one_time_price?: number | null
          parent_option_slug?: string[] | null
          quantity_label?: string | null
          requires_kabel_tv?: boolean | null
          slug: string
          updated_at?: string
          vzf_text?: string | null
        }
        Update: {
          auto_include_option_slug?: string[] | null
          category?: string
          created_at?: string
          customer_type?: string
          description?: string | null
          display_order?: number | null
          exclusive_group?: string | null
          external_link_label?: string | null
          external_link_url?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          info_text?: string | null
          is_active?: boolean | null
          is_building_restricted?: boolean | null
          is_fttb?: boolean | null
          is_ftth?: boolean | null
          is_quantitative?: boolean | null
          is_sondertarif_only?: boolean | null
          max_quantity?: number | null
          monthly_price?: number | null
          name?: string
          one_time_price?: number | null
          parent_option_slug?: string[] | null
          quantity_label?: string | null
          requires_kabel_tv?: boolean | null
          slug?: string
          updated_at?: string
          vzf_text?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          archived_at: string | null
          contract_months: number | null
          created_at: string
          customer_type: string
          description: string | null
          display_name: string | null
          display_order: number | null
          download_speed: number | null
          download_speed_min: number | null
          download_speed_normal: number | null
          external_link_label: string | null
          external_link_url: string | null
          hide_for_ftth: boolean | null
          id: string
          includes_fiber_tv: boolean | null
          includes_phone: boolean | null
          info_text: string | null
          is_active: boolean | null
          is_archived: boolean | null
          is_building_restricted: boolean | null
          is_fttb: boolean | null
          is_ftth: boolean | null
          is_ftth_limited: boolean | null
          is_sondertarif: boolean | null
          monthly_price: number
          name: string
          phone_terms_text: string | null
          product_id_k7: string | null
          setup_fee: number | null
          slug: string
          sondertarif_k7_option_ids: string[] | null
          updated_at: string
          upload_speed: number | null
          upload_speed_min: number | null
          upload_speed_normal: number | null
        }
        Insert: {
          archived_at?: string | null
          contract_months?: number | null
          created_at?: string
          customer_type?: string
          description?: string | null
          display_name?: string | null
          display_order?: number | null
          download_speed?: number | null
          download_speed_min?: number | null
          download_speed_normal?: number | null
          external_link_label?: string | null
          external_link_url?: string | null
          hide_for_ftth?: boolean | null
          id?: string
          includes_fiber_tv?: boolean | null
          includes_phone?: boolean | null
          info_text?: string | null
          is_active?: boolean | null
          is_archived?: boolean | null
          is_building_restricted?: boolean | null
          is_fttb?: boolean | null
          is_ftth?: boolean | null
          is_ftth_limited?: boolean | null
          is_sondertarif?: boolean | null
          monthly_price: number
          name: string
          phone_terms_text?: string | null
          product_id_k7?: string | null
          setup_fee?: number | null
          slug: string
          sondertarif_k7_option_ids?: string[] | null
          updated_at?: string
          upload_speed?: number | null
          upload_speed_min?: number | null
          upload_speed_normal?: number | null
        }
        Update: {
          archived_at?: string | null
          contract_months?: number | null
          created_at?: string
          customer_type?: string
          description?: string | null
          display_name?: string | null
          display_order?: number | null
          download_speed?: number | null
          download_speed_min?: number | null
          download_speed_normal?: number | null
          external_link_label?: string | null
          external_link_url?: string | null
          hide_for_ftth?: boolean | null
          id?: string
          includes_fiber_tv?: boolean | null
          includes_phone?: boolean | null
          info_text?: string | null
          is_active?: boolean | null
          is_archived?: boolean | null
          is_building_restricted?: boolean | null
          is_fttb?: boolean | null
          is_ftth?: boolean | null
          is_ftth_limited?: boolean | null
          is_sondertarif?: boolean | null
          monthly_price?: number
          name?: string
          phone_terms_text?: string | null
          product_id_k7?: string | null
          setup_fee?: number | null
          slug?: string
          sondertarif_k7_option_ids?: string[] | null
          updated_at?: string
          upload_speed?: number | null
          upload_speed_min?: number | null
          upload_speed_normal?: number | null
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
          discount_duration_months: number | null
          discount_type: string
          id: string
          k7_product_id: string | null
          k7_template_id: string | null
          k7_template_type: string | null
          price_type: string
          promotion_id: string
          target_option_id: string | null
          target_product_id: string | null
        }
        Insert: {
          applies_to: string
          created_at?: string
          discount_amount?: number | null
          discount_duration_months?: number | null
          discount_type: string
          id?: string
          k7_product_id?: string | null
          k7_template_id?: string | null
          k7_template_type?: string | null
          price_type?: string
          promotion_id: string
          target_option_id?: string | null
          target_product_id?: string | null
        }
        Update: {
          applies_to?: string
          created_at?: string
          discount_amount?: number | null
          discount_duration_months?: number | null
          discount_type?: string
          id?: string
          k7_product_id?: string | null
          k7_template_id?: string | null
          k7_template_type?: string | null
          price_type?: string
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
          customer_type: string
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
          customer_type?: string
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
          customer_type?: string
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
      rate_limits: {
        Row: {
          action_type: string
          attempts: number
          blocked_until: string | null
          first_attempt_at: string
          id: string
          ip_address: string
          last_attempt_at: string
        }
        Insert: {
          action_type: string
          attempts?: number
          blocked_until?: string | null
          first_attempt_at?: string
          id?: string
          ip_address: string
          last_attempt_at?: string
        }
        Update: {
          action_type?: string
          attempts?: number
          blocked_until?: string | null
          first_attempt_at?: string
          id?: string
          ip_address?: string
          last_attempt_at?: string
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
          building_id: string
          city: string
          gnv_vorhanden: boolean
          house_number: string
          kabel_tv_available: boolean
          postal_code: string
          residential_units: number
          street: string
        }[]
      }
      check_building_dslam_availability: {
        Args: { p_building_id: string }
        Returns: {
          available_ports: number
          can_connect: boolean
          max_ports: number
          occupied_ports: number
          reason: string
        }[]
      }
      check_rate_limit: {
        Args: {
          p_action_type: string
          p_block_minutes?: number
          p_ip_address: string
          p_max_attempts?: number
          p_window_minutes?: number
        }
        Returns: Json
      }
      cleanup_rate_limits: { Args: never; Returns: number }
      get_dslam_availability: {
        Args: { p_dslam_id: string }
        Returns: {
          available_ports: number
          buildings_count: number
          dslam_id: string
          dslam_name: string
          max_usable_ports: number
          occupied_ports: number
          total_ports: number
        }[]
      }
      get_house_numbers: {
        Args: { p_city?: string; p_street: string }
        Returns: {
          house_number: string
        }[]
      }
      has_permission: {
        Args: {
          _permission: Database["public"]["Enums"]["admin_permission"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      search_cities: {
        Args: { p_query: string }
        Returns: {
          city: string
        }[]
      }
      search_streets: {
        Args: { p_city?: string; p_query: string }
        Returns: {
          street: string
        }[]
      }
    }
    Enums: {
      admin_permission:
        | "buildings_read"
        | "buildings_write"
        | "products_read"
        | "products_write"
        | "options_read"
        | "options_write"
        | "promotions_read"
        | "promotions_write"
        | "orders_read"
        | "orders_write"
        | "customers_read"
        | "customers_write"
        | "settings_read"
        | "settings_write"
        | "users_read"
        | "users_write"
        | "logs_read"
        | "decision_tree_read"
        | "decision_tree_write"
        | "documents_read"
        | "documents_write"
      app_role: "admin" | "user"
      ausbau_art: "ftth" | "fttb" | "ftth_limited"
      ausbau_status: "abgeschlossen" | "im_ausbau" | "geplant"
      building_type: "efh" | "mfh" | "wowi"
      decision_action_type:
        | "show_products"
        | "show_contact_form"
        | "show_message"
        | "redirect"
        | "show_gnv_form"
        | "filter_buildings_dropdown"
        | "set_connection_type"
      decision_node_type: "condition" | "action"
      decision_operator:
        | "equals"
        | "not_equals"
        | "is_null"
        | "is_not_null"
        | "in_list"
        | "not_in_list"
        | "greater_than"
        | "less_than"
        | "contains"
        | "not_contains"
        | "starts_with"
        | "greater_or_equal"
        | "less_or_equal"
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
      admin_permission: [
        "buildings_read",
        "buildings_write",
        "products_read",
        "products_write",
        "options_read",
        "options_write",
        "promotions_read",
        "promotions_write",
        "orders_read",
        "orders_write",
        "customers_read",
        "customers_write",
        "settings_read",
        "settings_write",
        "users_read",
        "users_write",
        "logs_read",
        "decision_tree_read",
        "decision_tree_write",
        "documents_read",
        "documents_write",
      ],
      app_role: ["admin", "user"],
      ausbau_art: ["ftth", "fttb", "ftth_limited"],
      ausbau_status: ["abgeschlossen", "im_ausbau", "geplant"],
      building_type: ["efh", "mfh", "wowi"],
      decision_action_type: [
        "show_products",
        "show_contact_form",
        "show_message",
        "redirect",
        "show_gnv_form",
        "filter_buildings_dropdown",
        "set_connection_type",
      ],
      decision_node_type: ["condition", "action"],
      decision_operator: [
        "equals",
        "not_equals",
        "is_null",
        "is_not_null",
        "in_list",
        "not_in_list",
        "greater_than",
        "less_than",
        "contains",
        "not_contains",
        "starts_with",
        "greater_or_equal",
        "less_or_equal",
      ],
    },
  },
} as const
