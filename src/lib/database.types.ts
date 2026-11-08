// Generated from the live `galmee` schema (Supabase generate_typescript_types).
// Regenerate after any migration; do not edit by hand.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          after: Json | null
          before: Json | null
          created_at: string
          id: number
          row_id: string | null
          table_name: string | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: never
          row_id?: string | null
          table_name?: string | null
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: never
          row_id?: string | null
          table_name?: string | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          created_at: string
          customer_id: string | null
          ends_at: string
          id: string
          notes: string | null
          resource_id: string
          resource_type: string
          starts_at: string
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          ends_at: string
          id?: string
          notes?: string | null
          resource_id: string
          resource_type: string
          starts_at: string
          status?: string
          tenant_id?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          ends_at?: string
          id?: string
          notes?: string | null
          resource_id?: string
          resource_type?: string
          starts_at?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_balances"
            referencedColumns: ["customer_id"]
          },
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
        ]
      }
      branches: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          tenant_id?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_ledger: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          due_date: string | null
          id: string
          note: string | null
          ref_id: string | null
          ref_table: string | null
          tenant_id: string
          type: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id: string
          due_date?: string | null
          id?: string
          note?: string | null
          ref_id?: string | null
          ref_table?: string | null
          tenant_id?: string
          type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          due_date?: string | null
          id?: string
          note?: string | null
          ref_id?: string | null
          ref_table?: string | null
          tenant_id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_balances"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "credit_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_ledger_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          credit_limit: number | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          telegram_chat_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          credit_limit?: number | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          telegram_chat_id?: string | null
          tenant_id?: string
        }
        Update: {
          created_at?: string
          credit_limit?: number | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          telegram_chat_id?: string | null
          tenant_id?: string
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
      ht_booking_requests: {
        Row: {
          adults: number
          check_in: string
          check_out: string
          created_at: string
          guest_name: string
          handled_by: string | null
          id: string
          message: string | null
          phone: string
          room_type_id: string | null
          status: string
          stay_id: string | null
          tenant_id: string
        }
        Insert: {
          adults?: number
          check_in: string
          check_out: string
          created_at?: string
          guest_name: string
          handled_by?: string | null
          id?: string
          message?: string | null
          phone: string
          room_type_id?: string | null
          status?: string
          stay_id?: string | null
          tenant_id?: string
        }
        Update: {
          adults?: number
          check_in?: string
          check_out?: string
          created_at?: string
          guest_name?: string
          handled_by?: string | null
          id?: string
          message?: string | null
          phone?: string
          room_type_id?: string | null
          status?: string
          stay_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ht_booking_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ht_booking_requests_tenant_id_room_type_id_fkey"
            columns: ["tenant_id", "room_type_id"]
            isOneToOne: false
            referencedRelation: "ht_room_types"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "ht_booking_requests_tenant_id_stay_id_fkey"
            columns: ["tenant_id", "stay_id"]
            isOneToOne: false
            referencedRelation: "ht_stays"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      ht_rate_plans: {
        Row: {
          active: boolean
          created_at: string
          id: string
          is_default: boolean
          name: string
          nightly_rate: number
          room_type_id: string
          tenant_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          nightly_rate: number
          room_type_id: string
          tenant_id?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          nightly_rate?: number
          room_type_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ht_rate_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ht_rate_plans_tenant_id_room_type_id_fkey"
            columns: ["tenant_id", "room_type_id"]
            isOneToOne: false
            referencedRelation: "ht_room_types"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      ht_room_types: {
        Row: {
          capacity: number
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          tenant_id: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          tenant_id?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ht_room_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ht_rooms: {
        Row: {
          created_at: string
          floor: string | null
          housekeeping: string
          id: string
          in_service: boolean
          notes: string | null
          number: string
          room_type_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          floor?: string | null
          housekeeping?: string
          id?: string
          in_service?: boolean
          notes?: string | null
          number: string
          room_type_id: string
          tenant_id?: string
        }
        Update: {
          created_at?: string
          floor?: string | null
          housekeeping?: string
          id?: string
          in_service?: boolean
          notes?: string | null
          number?: string
          room_type_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ht_rooms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ht_rooms_tenant_id_room_type_id_fkey"
            columns: ["tenant_id", "room_type_id"]
            isOneToOne: false
            referencedRelation: "ht_room_types"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      ht_sites: {
        Row: {
          about: string | null
          address: string | null
          created_at: string
          display_name: string
          headline: string | null
          phone: string | null
          published: boolean
          reception_telegram: string | null
          slug: string
          tenant_id: string
        }
        Insert: {
          about?: string | null
          address?: string | null
          created_at?: string
          display_name: string
          headline?: string | null
          phone?: string | null
          published?: boolean
          reception_telegram?: string | null
          slug: string
          tenant_id?: string
        }
        Update: {
          about?: string | null
          address?: string | null
          created_at?: string
          display_name?: string
          headline?: string | null
          phone?: string | null
          published?: boolean
          reception_telegram?: string | null
          slug?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ht_sites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ht_stay_charges: {
        Row: {
          amount: number
          client_ref: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          kind: string
          reverses_id: string | null
          stay_id: string
          tenant_id: string
        }
        Insert: {
          amount: number
          client_ref?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind: string
          reverses_id?: string | null
          stay_id: string
          tenant_id?: string
        }
        Update: {
          amount?: number
          client_ref?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind?: string
          reverses_id?: string | null
          stay_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ht_stay_charges_reverses_id_fkey"
            columns: ["reverses_id"]
            isOneToOne: true
            referencedRelation: "ht_stay_charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ht_stay_charges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ht_stay_charges_tenant_id_stay_id_fkey"
            columns: ["tenant_id", "stay_id"]
            isOneToOne: false
            referencedRelation: "ht_stays"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      ht_stay_payments: {
        Row: {
          amount: number
          client_ref: string | null
          created_at: string
          id: string
          payment_id: string
          stay_id: string
          tenant_id: string
        }
        Insert: {
          amount: number
          client_ref?: string | null
          created_at?: string
          id?: string
          payment_id: string
          stay_id: string
          tenant_id?: string
        }
        Update: {
          amount?: number
          client_ref?: string | null
          created_at?: string
          id?: string
          payment_id?: string
          stay_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ht_stay_payments_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ht_stay_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ht_stay_payments_tenant_id_stay_id_fkey"
            columns: ["tenant_id", "stay_id"]
            isOneToOne: false
            referencedRelation: "ht_stays"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      ht_stays: {
        Row: {
          adults: number
          booking_id: string
          check_in: string
          check_out: string
          checked_in_at: string | null
          checked_out_at: string | null
          children: number
          client_ref: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          final_balance: number | null
          final_charges_total: number | null
          final_paid_total: number | null
          final_room_total: number | null
          id: string
          id_number: string | null
          id_type: string | null
          nationality: string | null
          nightly_rate: number
          notes: string | null
          rate_plan_id: string | null
          room_id: string
          source: string
          status: string
          tenant_id: string
        }
        Insert: {
          adults?: number
          booking_id: string
          check_in: string
          check_out: string
          checked_in_at?: string | null
          checked_out_at?: string | null
          children?: number
          client_ref?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          final_balance?: number | null
          final_charges_total?: number | null
          final_paid_total?: number | null
          final_room_total?: number | null
          id?: string
          id_number?: string | null
          id_type?: string | null
          nationality?: string | null
          nightly_rate: number
          notes?: string | null
          rate_plan_id?: string | null
          room_id: string
          source?: string
          status?: string
          tenant_id?: string
        }
        Update: {
          adults?: number
          booking_id?: string
          check_in?: string
          check_out?: string
          checked_in_at?: string | null
          checked_out_at?: string | null
          children?: number
          client_ref?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          final_balance?: number | null
          final_charges_total?: number | null
          final_paid_total?: number | null
          final_room_total?: number | null
          id?: string
          id_number?: string | null
          id_type?: string | null
          nationality?: string | null
          nightly_rate?: number
          notes?: string | null
          rate_plan_id?: string | null
          room_id?: string
          source?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ht_stays_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ht_stays_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_balances"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "ht_stays_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ht_stays_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ht_stays_tenant_id_rate_plan_id_fkey"
            columns: ["tenant_id", "rate_plan_id"]
            isOneToOne: false
            referencedRelation: "ht_rate_plans"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "ht_stays_tenant_id_room_id_fkey"
            columns: ["tenant_id", "room_id"]
            isOneToOne: false
            referencedRelation: "ht_rooms"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      items: {
        Row: {
          active: boolean
          category: string | null
          cost: number
          created_at: string
          id: string
          name_am: string | null
          name_en: string
          name_om: string | null
          price: number
          reorder_level: number
          sku: string | null
          tenant_id: string
          tracks_expiry: boolean
          unit: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          cost?: number
          created_at?: string
          id?: string
          name_am?: string | null
          name_en: string
          name_om?: string | null
          price?: number
          reorder_level?: number
          sku?: string | null
          tenant_id?: string
          tracks_expiry?: boolean
          unit?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          cost?: number
          created_at?: string
          id?: string
          name_am?: string | null
          name_en?: string
          name_om?: string | null
          price?: number
          reorder_level?: number
          sku?: string | null
          tenant_id?: string
          tracks_expiry?: boolean
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          attempts: number
          body: string
          channel: string
          created_at: string
          id: string
          sent_at: string | null
          status: string
          tenant_id: string
          to_addr: string
        }
        Insert: {
          attempts?: number
          body: string
          channel: string
          created_at?: string
          id?: string
          sent_at?: string | null
          status?: string
          tenant_id?: string
          to_addr: string
        }
        Update: {
          attempts?: number
          body?: string
          channel?: string
          created_at?: string
          id?: string
          sent_at?: string | null
          status?: string
          tenant_id?: string
          to_addr?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          customer_id: string | null
          id: string
          method: Database["public"]["Enums"]["pay_method"]
          ref_id: string | null
          ref_table: string | null
          reference: string | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id?: string | null
          id?: string
          method?: Database["public"]["Enums"]["pay_method"]
          ref_id?: string | null
          ref_table?: string | null
          reference?: string | null
          tenant_id?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          id?: string
          method?: Database["public"]["Enums"]["pay_method"]
          ref_id?: string | null
          ref_table?: string | null
          reference?: string | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_balances"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          full_name: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          full_name: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          full_name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_lines: {
        Row: {
          id: string
          item_id: string
          price: number
          qty: number
          sale_id: string
          tenant_id: string
        }
        Insert: {
          id?: string
          item_id: string
          price: number
          qty: number
          sale_id: string
          tenant_id?: string
        }
        Update: {
          id?: string
          item_id?: string
          price?: number
          qty?: number
          sale_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_stock"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "sale_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_lines_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          client_ref: string | null
          created_at: string
          customer_id: string | null
          id: string
          method: Database["public"]["Enums"]["pay_method"] | null
          paid: number
          staff_id: string | null
          tenant_id: string
          total: number
        }
        Insert: {
          client_ref?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          method?: Database["public"]["Enums"]["pay_method"] | null
          paid?: number
          staff_id?: string | null
          tenant_id?: string
          total?: number
        }
        Update: {
          client_ref?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          method?: Database["public"]["Enums"]["pay_method"] | null
          paid?: number
          staff_id?: string | null
          tenant_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_balances"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_batches: {
        Row: {
          batch_no: string | null
          cost: number
          expiry_date: string | null
          id: string
          item_id: string
          qty: number
          received_at: string
          tenant_id: string
        }
        Insert: {
          batch_no?: string | null
          cost?: number
          expiry_date?: string | null
          id?: string
          item_id: string
          qty?: number
          received_at?: string
          tenant_id?: string
        }
        Update: {
          batch_no?: string | null
          cost?: number
          expiry_date?: string | null
          id?: string
          item_id?: string
          qty?: number
          received_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_batches_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_stock"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "stock_batches_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_batches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          batch_id: string | null
          created_at: string
          id: string
          item_id: string
          qty: number
          reason: string | null
          ref_id: string | null
          ref_table: string | null
          tenant_id: string
          type: string
          user_id: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          id?: string
          item_id: string
          qty: number
          reason?: string | null
          ref_id?: string | null
          ref_table?: string | null
          tenant_id?: string
          type: string
          user_id?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          id?: string
          item_id?: string
          qty?: number
          reason?: string | null
          ref_id?: string | null
          ref_table?: string | null
          tenant_id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "stock_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_stock"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          monthly_fee: number | null
          paid_until: string | null
          plan: string
          setup_fee: number | null
          tenant_id: string
        }
        Insert: {
          monthly_fee?: number | null
          paid_until?: string | null
          plan?: string
          setup_fee?: number | null
          tenant_id: string
        }
        Update: {
          monthly_fee?: number | null
          paid_until?: string | null
          plan?: string
          setup_fee?: number | null
          tenant_id?: string
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
          address: string | null
          created_at: string
          default_lang: string
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          status: string
          vertical: Database["public"]["Enums"]["vertical"]
        }
        Insert: {
          address?: string | null
          created_at?: string
          default_lang?: string
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          status?: string
          vertical: Database["public"]["Enums"]["vertical"]
        }
        Update: {
          address?: string | null
          created_at?: string
          default_lang?: string
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          status?: string
          vertical?: Database["public"]["Enums"]["vertical"]
        }
        Relationships: []
      }
    }
    Views: {
      customer_balances: {
        Row: {
          balance: number | null
          credit_limit: number | null
          customer_id: string | null
          name: string | null
          oldest_debt_at: string | null
          phone: string | null
          tenant_id: string | null
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
      item_stock: {
        Row: {
          item_id: string | null
          name_am: string | null
          name_en: string | null
          name_om: string | null
          next_expiry: string | null
          qty_on_hand: number | null
          reorder_level: number | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      adjust_stock: {
        Args: { p_batch: string; p_new_qty: number; p_reason: string }
        Returns: undefined
      }
      create_tenant: {
        Args: {
          p_full_name: string
          p_lang?: string
          p_name: string
          p_phone: string
          p_vertical: Database["public"]["Enums"]["vertical"]
        }
        Returns: string
      }
      ht_add_charge: {
        Args: {
          p_amount: number
          p_client_ref?: string
          p_description?: string
          p_kind: string
          p_stay: string
        }
        Returns: string
      }
      ht_cancel_stay: {
        Args: { p_no_show?: boolean; p_stay: string }
        Returns: undefined
      }
      ht_check_in: {
        Args: {
          p_id_number?: string
          p_id_type?: string
          p_nationality?: string
          p_stay: string
        }
        Returns: undefined
      }
      ht_check_out: {
        Args: {
          p_amount?: number
          p_leave_balance?: boolean
          p_method?: Database["public"]["Enums"]["pay_method"]
          p_reference?: string
          p_stay: string
        }
        Returns: Json
      }
      ht_create_stay: {
        Args: {
          p_adults?: number
          p_check_in: string
          p_check_in_now?: boolean
          p_check_out: string
          p_children?: number
          p_client_ref?: string
          p_customer?: string
          p_guest_name?: string
          p_guest_phone?: string
          p_id_number?: string
          p_id_type?: string
          p_nationality?: string
          p_nightly_rate?: number
          p_notes?: string
          p_rate_plan?: string
          p_request?: string
          p_room: string
          p_source?: string
        }
        Returns: string
      }
      ht_daily_report: {
        Args: { p_from: string; p_to: string }
        Returns: {
          arrivals: number
          day: string
          departures: number
          income: number
          occupied: number
          rooms: number
        }[]
      }
      ht_decline_request: { Args: { p_request: string }; Returns: undefined }
      ht_load_demo_data: { Args: never; Returns: number }
      ht_pay_stay: {
        Args: {
          p_amount: number
          p_client_ref?: string
          p_method?: Database["public"]["Enums"]["pay_method"]
          p_reference?: string
          p_stay: string
        }
        Returns: string
      }
      ht_reverse_charge: { Args: { p_charge: string }; Returns: string }
      ht_set_housekeeping: {
        Args: { p_room: string; p_state: string }
        Returns: undefined
      }
      ht_stay_totals: {
        Args: { p_stay: string }
        Returns: {
          balance: number
          charges_total: number
          nights: number
          paid_total: number
          room_total: number
        }[]
      }
      receive_stock: {
        Args: {
          p_batch?: string
          p_cost: number
          p_expiry?: string
          p_item: string
          p_qty: number
        }
        Returns: string
      }
      record_repayment: {
        Args: {
          p_amount: number
          p_customer: string
          p_method?: Database["public"]["Enums"]["pay_method"]
          p_reference?: string
        }
        Returns: string
      }
      record_sale: {
        Args: {
          p_client_ref?: string
          p_customer?: string
          p_due?: string
          p_lines: Json
          p_method?: Database["public"]["Enums"]["pay_method"]
          p_paid?: number
        }
        Returns: string
      }
    }
    Enums: {
      pay_method: "cash" | "telebirr" | "cbe_birr" | "chapa" | "bank" | "other"
      user_role: "owner" | "manager" | "staff"
      vertical:
        | "clinic"
        | "pharmacy"
        | "school"
        | "hotel"
        | "garage"
        | "wholesale"
        | "transport"
        | "coffee"
        | "driving"
        | "rentals"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  T extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]),
> = (DefaultSchema["Tables"] & DefaultSchema["Views"])[T] extends { Row: infer R } ? R : never

export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Insert: infer I } ? I : never

export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Update: infer U } ? U : never

export type Enums<T extends keyof DefaultSchema["Enums"]> = DefaultSchema["Enums"][T]

export const Constants = {
  public: {
    Enums: {
      pay_method: ["cash", "telebirr", "cbe_birr", "chapa", "bank", "other"],
      user_role: ["owner", "manager", "staff"],
      vertical: [
        "clinic",
        "pharmacy",
        "school",
        "hotel",
        "garage",
        "wholesale",
        "transport",
        "coffee",
        "driving",
        "rentals",
      ],
    },
  },
} as const
