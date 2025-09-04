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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_messages: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          message: string
          read: boolean | null
          title: string
          updated_at: string
          updated_by: string
          user_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          message: string
          read?: boolean | null
          title: string
          updated_at?: string
          updated_by: string
          user_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          updated_at?: string
          updated_by?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          message: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          message: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          message?: string
          subject?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          amount: number
          code: string
          created_at: string
          expires_at: string | null
          id: string
          seo_purchase_id: string | null
          status: string
          updated_at: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          seo_purchase_id?: string | null
          status?: string
          updated_at?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          seo_purchase_id?: string | null
          status?: string
          updated_at?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupons_seo_purchase_id_fkey"
            columns: ["seo_purchase_id"]
            isOneToOne: false
            referencedRelation: "seo_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      email_subscriptions: {
        Row: {
          email: string
          id: string
          subscribed_at: string
        }
        Insert: {
          email: string
          id?: string
          subscribed_at?: string
        }
        Update: {
          email?: string
          id?: string
          subscribed_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          payment_id: string | null
          read: boolean | null
          title: string
          type: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          payment_id?: string | null
          read?: boolean | null
          title: string
          type?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          payment_id?: string | null
          read?: boolean | null
          title?: string
          type?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          campaign_id: string
          campaign_title: string | null
          created_at: string | null
          id: string
          invoice_pdf_url: string | null
          invoice_url: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string | null
          user_id: string
          youtube_video_title: string | null
        }
        Insert: {
          amount: number
          campaign_id: string
          campaign_title?: string | null
          created_at?: string | null
          id?: string
          invoice_pdf_url?: string | null
          invoice_url?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
          user_id: string
          youtube_video_title?: string | null
        }
        Update: {
          amount?: number
          campaign_id?: string
          campaign_title?: string | null
          created_at?: string | null
          id?: string
          invoice_pdf_url?: string | null
          invoice_url?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
          user_id?: string
          youtube_video_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_promotion_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string | null
          channel_name: string | null
          contact_email: string | null
          created_at: string | null
          email: string
          full_name: string | null
          google_access_token: string | null
          google_picture: string | null
          google_refresh_token: string | null
          google_sub: string | null
          id: string
          location: string | null
          phone_number: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          bio?: string | null
          channel_name?: string | null
          contact_email?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          google_access_token?: string | null
          google_picture?: string | null
          google_refresh_token?: string | null
          google_sub?: string | null
          id: string
          location?: string | null
          phone_number?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          bio?: string | null
          channel_name?: string | null
          contact_email?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          google_access_token?: string | null
          google_picture?: string | null
          google_refresh_token?: string | null
          google_sub?: string | null
          id?: string
          location?: string | null
          phone_number?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string | null
          discount_amount: number
          id: string
          is_active: boolean | null
          max_usage: number | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          discount_amount: number
          id?: string
          is_active?: boolean | null
          max_usage?: number | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          discount_amount?: number
          id?: string
          is_active?: boolean | null
          max_usage?: number | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      promotion_analytics: {
        Row: {
          campaign_id: string
          clicks_count: number | null
          engagement_rate: number | null
          id: string
          recorded_at: string | null
          views_count: number | null
        }
        Insert: {
          campaign_id: string
          clicks_count?: number | null
          engagement_rate?: number | null
          id?: string
          recorded_at?: string | null
          views_count?: number | null
        }
        Update: {
          campaign_id?: string
          clicks_count?: number | null
          engagement_rate?: number | null
          id?: string
          recorded_at?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_analytics_promotion_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_promo_codes: {
        Row: {
          created_at: string | null
          discount_applied: number
          id: string
          promo_code_id: string | null
          promotion_id: string | null
        }
        Insert: {
          created_at?: string | null
          discount_applied: number
          id?: string
          promo_code_id?: string | null
          promotion_id?: string | null
        }
        Update: {
          created_at?: string | null
          discount_applied?: number
          id?: string
          promo_code_id?: string | null
          promotion_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_promo_codes_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_promo_codes_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          account_manager: string | null
          budget: number
          campaign_duration: number | null
          channel_ctr: number | null
          channel_current_subscribers: number | null
          channel_current_views: number | null
          channel_starting_subscribers: number | null
          channel_starting_views: number | null
          channel_total_subscribers: number | null
          channel_total_views: number | null
          channel_url: string | null
          created_at: string | null
          current_views: number | null
          engagement_rate: number | null
          id: string
          last_view_update: string | null
          promotion_type: string | null
          starting_views: number | null
          status: Database["public"]["Enums"]["promotion_status"] | null
          target_audience: string | null
          target_views: number
          title: string
          updated_at: string | null
          user_id: string
          youtube_video_url: string
        }
        Insert: {
          account_manager?: string | null
          budget: number
          campaign_duration?: number | null
          channel_ctr?: number | null
          channel_current_subscribers?: number | null
          channel_current_views?: number | null
          channel_starting_subscribers?: number | null
          channel_starting_views?: number | null
          channel_total_subscribers?: number | null
          channel_total_views?: number | null
          channel_url?: string | null
          created_at?: string | null
          current_views?: number | null
          engagement_rate?: number | null
          id?: string
          last_view_update?: string | null
          promotion_type?: string | null
          starting_views?: number | null
          status?: Database["public"]["Enums"]["promotion_status"] | null
          target_audience?: string | null
          target_views: number
          title: string
          updated_at?: string | null
          user_id: string
          youtube_video_url: string
        }
        Update: {
          account_manager?: string | null
          budget?: number
          campaign_duration?: number | null
          channel_ctr?: number | null
          channel_current_subscribers?: number | null
          channel_current_views?: number | null
          channel_starting_subscribers?: number | null
          channel_starting_views?: number | null
          channel_total_subscribers?: number | null
          channel_total_views?: number | null
          channel_url?: string | null
          created_at?: string | null
          current_views?: number | null
          engagement_rate?: number | null
          id?: string
          last_view_update?: string | null
          promotion_type?: string | null
          starting_views?: number | null
          status?: Database["public"]["Enums"]["promotion_status"] | null
          target_audience?: string | null
          target_views?: number
          title?: string
          updated_at?: string | null
          user_id?: string
          youtube_video_url?: string
        }
        Relationships: []
      }
      recent_activities: {
        Row: {
          activity_date: string
          activity_text: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_date?: string
          activity_text: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_date?: string
          activity_text?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seo_analytics: {
        Row: {
          average_position: number | null
          backlinks_count: number | null
          channel_url: string | null
          click_through_rate: number | null
          created_at: string
          domain_authority: number | null
          id: string
          keywords_ranking: number | null
          organic_traffic: number | null
          search_clicks: number | null
          search_impressions: number | null
          seo_access_enabled: boolean | null
          subscribers_current: number | null
          subscribers_last_week: number | null
          updated_at: string
          updated_by: string | null
          user_id: string
          views_current: number | null
          views_last_week: number | null
          watch_time_hours: number | null
        }
        Insert: {
          average_position?: number | null
          backlinks_count?: number | null
          channel_url?: string | null
          click_through_rate?: number | null
          created_at?: string
          domain_authority?: number | null
          id?: string
          keywords_ranking?: number | null
          organic_traffic?: number | null
          search_clicks?: number | null
          search_impressions?: number | null
          seo_access_enabled?: boolean | null
          subscribers_current?: number | null
          subscribers_last_week?: number | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
          views_current?: number | null
          views_last_week?: number | null
          watch_time_hours?: number | null
        }
        Update: {
          average_position?: number | null
          backlinks_count?: number | null
          channel_url?: string | null
          click_through_rate?: number | null
          created_at?: string
          domain_authority?: number | null
          id?: string
          keywords_ranking?: number | null
          organic_traffic?: number | null
          search_clicks?: number | null
          search_impressions?: number | null
          seo_access_enabled?: boolean | null
          subscribers_current?: number | null
          subscribers_last_week?: number | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          views_current?: number | null
          views_last_week?: number | null
          watch_time_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_analytics_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_analytics_history: {
        Row: {
          id: string
          organic_traffic: number | null
          recorded_at: string
          search_clicks: number | null
          search_impressions: number | null
          subscribers_count: number | null
          user_id: string
          views_count: number | null
        }
        Insert: {
          id?: string
          organic_traffic?: number | null
          recorded_at?: string
          search_clicks?: number | null
          search_impressions?: number | null
          subscribers_count?: number | null
          user_id: string
          views_count?: number | null
        }
        Update: {
          id?: string
          organic_traffic?: number | null
          recorded_at?: string
          search_clicks?: number | null
          search_impressions?: number | null
          subscribers_count?: number | null
          user_id?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_analytics_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_analytics_manual_entries: {
        Row: {
          created_at: string
          entered_by: string | null
          entry_date: string
          entry_type: string
          id: string
          starting_date: string | null
          subscribers_count: number | null
          updated_at: string
          user_id: string
          views_count: number | null
          watch_time_hours: number | null
        }
        Insert: {
          created_at?: string
          entered_by?: string | null
          entry_date: string
          entry_type: string
          id?: string
          starting_date?: string | null
          subscribers_count?: number | null
          updated_at?: string
          user_id: string
          views_count?: number | null
          watch_time_hours?: number | null
        }
        Update: {
          created_at?: string
          entered_by?: string | null
          entry_date?: string
          entry_type?: string
          id?: string
          starting_date?: string | null
          subscribers_count?: number | null
          updated_at?: string
          user_id?: string
          views_count?: number | null
          watch_time_hours?: number | null
        }
        Relationships: []
      }
      seo_plans: {
        Row: {
          created_at: string
          description: string | null
          duration_months: number
          features: string[] | null
          id: string
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_months: number
          features?: string[] | null
          id?: string
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_months?: number
          features?: string[] | null
          id?: string
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      seo_purchases: {
        Row: {
          amount: number
          assigned_manager: string | null
          channel_url: string | null
          coupon_generated: boolean | null
          created_at: string
          discount_applied: number | null
          id: string
          promo_code_used: string | null
          seo_plan_id: string
          status: string
          stripe_session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          assigned_manager?: string | null
          channel_url?: string | null
          coupon_generated?: boolean | null
          created_at?: string
          discount_applied?: number | null
          id?: string
          promo_code_used?: string | null
          seo_plan_id: string
          status?: string
          stripe_session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          assigned_manager?: string | null
          channel_url?: string | null
          coupon_generated?: boolean | null
          created_at?: string
          discount_applied?: number | null
          id?: string
          promo_code_used?: string | null
          seo_plan_id?: string
          status?: string
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_purchases_seo_plan_id_fkey"
            columns: ["seo_plan_id"]
            isOneToOne: false
            referencedRelation: "seo_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_channel_cache: {
        Row: {
          channel_id: string | null
          channel_url: string
          created_at: string | null
          id: string
          last_updated: string | null
          total_subscribers: number | null
          total_views: number | null
        }
        Insert: {
          channel_id?: string | null
          channel_url: string
          created_at?: string | null
          id?: string
          last_updated?: string | null
          total_subscribers?: number | null
          total_views?: number | null
        }
        Update: {
          channel_id?: string | null
          channel_url?: string
          created_at?: string | null
          id?: string
          last_updated?: string | null
          total_subscribers?: number | null
          total_views?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      make_user_admin: {
        Args: { user_email: string }
        Returns: undefined
      }
    }
    Enums: {
      payment_status: "pending" | "completed" | "failed" | "refunded"
      promotion_status:
        | "pending"
        | "active"
        | "completed"
        | "cancelled"
        | "draft"
      user_role: "user" | "admin"
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
      payment_status: ["pending", "completed", "failed", "refunded"],
      promotion_status: [
        "pending",
        "active",
        "completed",
        "cancelled",
        "draft",
      ],
      user_role: ["user", "admin"],
    },
  },
} as const
