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
      audit_submissions: {
        Row: {
          amount: number
          channel_url: string
          created_at: string
          email: string
          id: string
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          channel_url: string
          created_at?: string
          email: string
          id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          channel_url?: string
          created_at?: string
          email?: string
          id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      blog_analytics_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          post_id: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          post_id?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          post_id?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_analytics_events_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_authors: {
        Row: {
          about_content: string | null
          banner_url: string | null
          bio: string | null
          channel_url: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          page_title: string | null
          profile_image_url: string | null
          short_bio: string | null
          slug: string | null
          subscribers: number | null
          updated_at: string
        }
        Insert: {
          about_content?: string | null
          banner_url?: string | null
          bio?: string | null
          channel_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          page_title?: string | null
          profile_image_url?: string | null
          short_bio?: string | null
          slug?: string | null
          subscribers?: number | null
          updated_at?: string
        }
        Update: {
          about_content?: string | null
          banner_url?: string | null
          bio?: string | null
          channel_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          page_title?: string | null
          profile_image_url?: string | null
          short_bio?: string | null
          slug?: string | null
          subscribers?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      blog_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      blog_comments: {
        Row: {
          blog_post_id: string
          content: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          blog_post_id: string
          content: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          blog_post_id?: string
          content?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          additional_videos: Json | null
          allow_comments: boolean | null
          author_id: string | null
          canonical_url: string | null
          category_id: string | null
          content_html: string
          create_child_video_pages: boolean | null
          created_at: string
          creator_channel_url: string | null
          creator_email: string | null
          creator_name: string | null
          creator_profile_image: string | null
          creator_short_bio: string | null
          creator_slug: string | null
          creator_subscribers: number | null
          cta_style: string | null
          cta_text: string | null
          cta_url: string | null
          featured_youtube_url: string | null
          focus_keyword: string | null
          gallery: Json | null
          hero_image_alt: string | null
          hero_image_caption: string | null
          hero_image_url: string | null
          hero_media_type: string | null
          hero_video_url: string | null
          id: string
          insight_boxes: Json | null
          meta_robots: string | null
          oembed_embeds: Json | null
          publish_at: string | null
          published_at: string | null
          pull_quote: string | null
          read_time_minutes: number | null
          related_posts: Json | null
          seo_description: string | null
          seo_title: string | null
          sitemap_include: boolean | null
          slug: string
          status: string | null
          subtitle: string | null
          tags: Json | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          views_count: number | null
        }
        Insert: {
          additional_videos?: Json | null
          allow_comments?: boolean | null
          author_id?: string | null
          canonical_url?: string | null
          category_id?: string | null
          content_html: string
          create_child_video_pages?: boolean | null
          created_at?: string
          creator_channel_url?: string | null
          creator_email?: string | null
          creator_name?: string | null
          creator_profile_image?: string | null
          creator_short_bio?: string | null
          creator_slug?: string | null
          creator_subscribers?: number | null
          cta_style?: string | null
          cta_text?: string | null
          cta_url?: string | null
          featured_youtube_url?: string | null
          focus_keyword?: string | null
          gallery?: Json | null
          hero_image_alt?: string | null
          hero_image_caption?: string | null
          hero_image_url?: string | null
          hero_media_type?: string | null
          hero_video_url?: string | null
          id?: string
          insight_boxes?: Json | null
          meta_robots?: string | null
          oembed_embeds?: Json | null
          publish_at?: string | null
          published_at?: string | null
          pull_quote?: string | null
          read_time_minutes?: number | null
          related_posts?: Json | null
          seo_description?: string | null
          seo_title?: string | null
          sitemap_include?: boolean | null
          slug: string
          status?: string | null
          subtitle?: string | null
          tags?: Json | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          views_count?: number | null
        }
        Update: {
          additional_videos?: Json | null
          allow_comments?: boolean | null
          author_id?: string | null
          canonical_url?: string | null
          category_id?: string | null
          content_html?: string
          create_child_video_pages?: boolean | null
          created_at?: string
          creator_channel_url?: string | null
          creator_email?: string | null
          creator_name?: string | null
          creator_profile_image?: string | null
          creator_short_bio?: string | null
          creator_slug?: string | null
          creator_subscribers?: number | null
          cta_style?: string | null
          cta_text?: string | null
          cta_url?: string | null
          featured_youtube_url?: string | null
          focus_keyword?: string | null
          gallery?: Json | null
          hero_image_alt?: string | null
          hero_image_caption?: string | null
          hero_image_url?: string | null
          hero_media_type?: string | null
          hero_video_url?: string | null
          id?: string
          insight_boxes?: Json | null
          meta_robots?: string | null
          oembed_embeds?: Json | null
          publish_at?: string | null
          published_at?: string | null
          pull_quote?: string | null
          read_time_minutes?: number | null
          related_posts?: Json | null
          seo_description?: string | null
          seo_title?: string | null
          sitemap_include?: boolean | null
          slug?: string
          status?: string | null
          subtitle?: string | null
          tags?: Json | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "blog_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_videos: {
        Row: {
          blog_post_id: string
          content_html: string | null
          created_at: string
          id: string
          position: number | null
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          slug: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          views_count: number | null
          youtube_url: string
        }
        Insert: {
          blog_post_id: string
          content_html?: string | null
          created_at?: string
          id?: string
          position?: number | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          views_count?: number | null
          youtube_url: string
        }
        Update: {
          blog_post_id?: string
          content_html?: string | null
          created_at?: string
          id?: string
          position?: number | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          views_count?: number | null
          youtube_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_videos_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
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
      crm_clients: {
        Row: {
          created_at: string
          data: Json
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_reports: {
        Row: {
          additional_notes: string | null
          attachment_urls: string[] | null
          blockers: string | null
          calls_made: number | null
          created_at: string
          edited_count: number
          emails_sent: number
          follow_ups_done: number | null
          hours_worked: number | null
          id: string
          last_edited_at: string | null
          leads_generated: number | null
          meetings_attended: number | null
          mood_rating: number | null
          report_date: string
          sales_numbers: number
          tasks_completed: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_notes?: string | null
          attachment_urls?: string[] | null
          blockers?: string | null
          calls_made?: number | null
          created_at?: string
          edited_count?: number
          emails_sent?: number
          follow_ups_done?: number | null
          hours_worked?: number | null
          id?: string
          last_edited_at?: string | null
          leads_generated?: number | null
          meetings_attended?: number | null
          mood_rating?: number | null
          report_date: string
          sales_numbers?: number
          tasks_completed?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_notes?: string | null
          attachment_urls?: string[] | null
          blockers?: string | null
          calls_made?: number | null
          created_at?: string
          edited_count?: number
          emails_sent?: number
          follow_ups_done?: number | null
          hours_worked?: number | null
          id?: string
          last_edited_at?: string | null
          leads_generated?: number | null
          meetings_attended?: number | null
          mood_rating?: number | null
          report_date?: string
          sales_numbers?: number
          tasks_completed?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      email_tracker_alerts: {
        Row: {
          alert_type: string
          created_at: string
          description: string | null
          employee_email: string
          id: string
          related_data: Json | null
          related_message_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          status: string | null
          title: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          description?: string | null
          employee_email: string
          id?: string
          related_data?: Json | null
          related_message_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          status?: string | null
          title: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          description?: string | null
          employee_email?: string
          id?: string
          related_data?: Json | null
          related_message_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      email_tracker_attachments: {
        Row: {
          created_at: string
          employee_email: string
          file_extension: string | null
          file_name: string
          file_size_bytes: number | null
          file_type: string | null
          hash_value: string | null
          id: string
          is_encrypted: boolean | null
          message_id: string
          sent_at: string
        }
        Insert: {
          created_at?: string
          employee_email: string
          file_extension?: string | null
          file_name: string
          file_size_bytes?: number | null
          file_type?: string | null
          hash_value?: string | null
          id?: string
          is_encrypted?: boolean | null
          message_id: string
          sent_at: string
        }
        Update: {
          created_at?: string
          employee_email?: string
          file_extension?: string | null
          file_name?: string
          file_size_bytes?: number | null
          file_type?: string | null
          hash_value?: string | null
          id?: string
          is_encrypted?: boolean | null
          message_id?: string
          sent_at?: string
        }
        Relationships: []
      }
      email_tracker_daily_stats: {
        Row: {
          alert_count: number | null
          created_at: string
          external_emails: number | null
          id: string
          internal_emails: number | null
          stat_date: string
          total_emails: number | null
          unique_recipients: number | null
          unique_senders: number | null
          updated_at: string
        }
        Insert: {
          alert_count?: number | null
          created_at?: string
          external_emails?: number | null
          id?: string
          internal_emails?: number | null
          stat_date: string
          total_emails?: number | null
          unique_recipients?: number | null
          unique_senders?: number | null
          updated_at?: string
        }
        Update: {
          alert_count?: number | null
          created_at?: string
          external_emails?: number | null
          id?: string
          internal_emails?: number | null
          stat_date?: string
          total_emails?: number | null
          unique_recipients?: number | null
          unique_senders?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      email_tracker_domain_stats: {
        Row: {
          avg_response_time_minutes: number | null
          created_at: string
          domain: string
          emails_received: number | null
          emails_sent: number | null
          employee_email: string
          first_communication_at: string | null
          id: string
          is_internal: boolean | null
          last_communication_at: string | null
          total_data_exchanged_bytes: number | null
          updated_at: string
        }
        Insert: {
          avg_response_time_minutes?: number | null
          created_at?: string
          domain: string
          emails_received?: number | null
          emails_sent?: number | null
          employee_email: string
          first_communication_at?: string | null
          id?: string
          is_internal?: boolean | null
          last_communication_at?: string | null
          total_data_exchanged_bytes?: number | null
          updated_at?: string
        }
        Update: {
          avg_response_time_minutes?: number | null
          created_at?: string
          domain?: string
          emails_received?: number | null
          emails_sent?: number | null
          employee_email?: string
          first_communication_at?: string | null
          id?: string
          is_internal?: boolean | null
          last_communication_at?: string | null
          total_data_exchanged_bytes?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      email_tracker_employees: {
        Row: {
          avg_response_time_minutes: number | null
          common_labels: string[] | null
          created_at: string
          department: string | null
          devices_used: string[] | null
          email: string
          emails_sent_month: number | null
          emails_sent_today: number | null
          emails_sent_week: number | null
          external_email_percent: number | null
          forward_rate_percent: number | null
          id: string
          ip_addresses_used: string[] | null
          last_email_received_at: string | null
          last_email_sent_at: string | null
          last_suspicious_activity_at: string | null
          locations_used: string[] | null
          most_active_day: string | null
          most_active_hour: number | null
          name: string | null
          reply_rate_percent: number | null
          suspicious_activity_count: number | null
          top_recipient: string | null
          total_attachments_sent: number | null
          total_data_sent_bytes: number | null
          unique_recipients: number | null
          unique_threads: number | null
          updated_at: string
        }
        Insert: {
          avg_response_time_minutes?: number | null
          common_labels?: string[] | null
          created_at?: string
          department?: string | null
          devices_used?: string[] | null
          email: string
          emails_sent_month?: number | null
          emails_sent_today?: number | null
          emails_sent_week?: number | null
          external_email_percent?: number | null
          forward_rate_percent?: number | null
          id?: string
          ip_addresses_used?: string[] | null
          last_email_received_at?: string | null
          last_email_sent_at?: string | null
          last_suspicious_activity_at?: string | null
          locations_used?: string[] | null
          most_active_day?: string | null
          most_active_hour?: number | null
          name?: string | null
          reply_rate_percent?: number | null
          suspicious_activity_count?: number | null
          top_recipient?: string | null
          total_attachments_sent?: number | null
          total_data_sent_bytes?: number | null
          unique_recipients?: number | null
          unique_threads?: number | null
          updated_at?: string
        }
        Update: {
          avg_response_time_minutes?: number | null
          common_labels?: string[] | null
          created_at?: string
          department?: string | null
          devices_used?: string[] | null
          email?: string
          emails_sent_month?: number | null
          emails_sent_today?: number | null
          emails_sent_week?: number | null
          external_email_percent?: number | null
          forward_rate_percent?: number | null
          id?: string
          ip_addresses_used?: string[] | null
          last_email_received_at?: string | null
          last_email_sent_at?: string | null
          last_suspicious_activity_at?: string | null
          locations_used?: string[] | null
          most_active_day?: string | null
          most_active_hour?: number | null
          name?: string | null
          reply_rate_percent?: number | null
          suspicious_activity_count?: number | null
          top_recipient?: string | null
          total_attachments_sent?: number | null
          total_data_sent_bytes?: number | null
          unique_recipients?: number | null
          unique_threads?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      email_tracker_events: {
        Row: {
          additional_data: Json | null
          created_at: string
          device_type: string | null
          employee_email: string
          event_time: string
          event_type: string
          id: string
          ip_address: string | null
          location_city: string | null
          location_country: string | null
          message_id: string
          user_agent: string | null
        }
        Insert: {
          additional_data?: Json | null
          created_at?: string
          device_type?: string | null
          employee_email: string
          event_time: string
          event_type: string
          id?: string
          ip_address?: string | null
          location_city?: string | null
          location_country?: string | null
          message_id: string
          user_agent?: string | null
        }
        Update: {
          additional_data?: Json | null
          created_at?: string
          device_type?: string | null
          employee_email?: string
          event_time?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          location_city?: string | null
          location_country?: string | null
          message_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      email_tracker_hourly_stats: {
        Row: {
          attachments_sent: number | null
          created_at: string
          data_sent_bytes: number | null
          emails_read: number | null
          emails_received: number | null
          emails_replied: number | null
          emails_sent: number | null
          employee_email: string | null
          hour_of_day: number
          id: string
          stat_date: string
        }
        Insert: {
          attachments_sent?: number | null
          created_at?: string
          data_sent_bytes?: number | null
          emails_read?: number | null
          emails_received?: number | null
          emails_replied?: number | null
          emails_sent?: number | null
          employee_email?: string | null
          hour_of_day: number
          id?: string
          stat_date: string
        }
        Update: {
          attachments_sent?: number | null
          created_at?: string
          data_sent_bytes?: number | null
          emails_read?: number | null
          emails_received?: number | null
          emails_replied?: number | null
          emails_sent?: number | null
          employee_email?: string | null
          hour_of_day?: number
          id?: string
          stat_date?: string
        }
        Relationships: []
      }
      email_tracker_logs: {
        Row: {
          action_type: string | null
          actor_device_id: string | null
          actor_ip: string | null
          attachment_count: number | null
          attachment_names: string[] | null
          attachment_total_size_bytes: number | null
          attachment_types: string[] | null
          bcc_recipients: string[] | null
          bounce_reason: string | null
          cc_recipients: string[] | null
          client_type: string | null
          created_at: string
          delivery_status: string | null
          destination_folder: string | null
          device_type: string | null
          employee_email: string
          event_type: string | null
          forwarded_at: string | null
          has_attachments: boolean | null
          id: string
          in_reply_to: string | null
          ip_address: string | null
          is_encrypted: boolean | null
          is_external: boolean | null
          is_phishing_suspect: boolean | null
          is_signed: boolean | null
          is_spam: boolean | null
          labels: string[] | null
          location_city: string | null
          location_country: string | null
          message_id: string
          message_size_bytes: number | null
          raw_event_data: Json | null
          read_at: string | null
          recipient_domains: string[]
          recipients: string[]
          replied_at: string | null
          sent_at: string
          session_id: string | null
          source_folder: string | null
          spam_score: number | null
          subject: string | null
          thread_id: string | null
          user_agent: string | null
        }
        Insert: {
          action_type?: string | null
          actor_device_id?: string | null
          actor_ip?: string | null
          attachment_count?: number | null
          attachment_names?: string[] | null
          attachment_total_size_bytes?: number | null
          attachment_types?: string[] | null
          bcc_recipients?: string[] | null
          bounce_reason?: string | null
          cc_recipients?: string[] | null
          client_type?: string | null
          created_at?: string
          delivery_status?: string | null
          destination_folder?: string | null
          device_type?: string | null
          employee_email: string
          event_type?: string | null
          forwarded_at?: string | null
          has_attachments?: boolean | null
          id?: string
          in_reply_to?: string | null
          ip_address?: string | null
          is_encrypted?: boolean | null
          is_external?: boolean | null
          is_phishing_suspect?: boolean | null
          is_signed?: boolean | null
          is_spam?: boolean | null
          labels?: string[] | null
          location_city?: string | null
          location_country?: string | null
          message_id: string
          message_size_bytes?: number | null
          raw_event_data?: Json | null
          read_at?: string | null
          recipient_domains?: string[]
          recipients?: string[]
          replied_at?: string | null
          sent_at: string
          session_id?: string | null
          source_folder?: string | null
          spam_score?: number | null
          subject?: string | null
          thread_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action_type?: string | null
          actor_device_id?: string | null
          actor_ip?: string | null
          attachment_count?: number | null
          attachment_names?: string[] | null
          attachment_total_size_bytes?: number | null
          attachment_types?: string[] | null
          bcc_recipients?: string[] | null
          bounce_reason?: string | null
          cc_recipients?: string[] | null
          client_type?: string | null
          created_at?: string
          delivery_status?: string | null
          destination_folder?: string | null
          device_type?: string | null
          employee_email?: string
          event_type?: string | null
          forwarded_at?: string | null
          has_attachments?: boolean | null
          id?: string
          in_reply_to?: string | null
          ip_address?: string | null
          is_encrypted?: boolean | null
          is_external?: boolean | null
          is_phishing_suspect?: boolean | null
          is_signed?: boolean | null
          is_spam?: boolean | null
          labels?: string[] | null
          location_city?: string | null
          location_country?: string | null
          message_id?: string
          message_size_bytes?: number | null
          raw_event_data?: Json | null
          read_at?: string | null
          recipient_domains?: string[]
          recipients?: string[]
          replied_at?: string | null
          sent_at?: string
          session_id?: string | null
          source_folder?: string | null
          spam_score?: number | null
          subject?: string | null
          thread_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      email_tracker_sync_config: {
        Row: {
          created_at: string
          domain: string
          id: string
          last_error: string | null
          last_sync_at: string | null
          sync_status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          sync_status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          sync_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_tracker_threads: {
        Row: {
          attachment_count: number | null
          created_at: string
          external_domains: string[] | null
          first_message_at: string | null
          id: string
          is_external_thread: boolean | null
          labels: string[] | null
          last_message_at: string | null
          message_count: number | null
          participants: string[] | null
          subject: string | null
          thread_id: string
          total_size_bytes: number | null
          updated_at: string
        }
        Insert: {
          attachment_count?: number | null
          created_at?: string
          external_domains?: string[] | null
          first_message_at?: string | null
          id?: string
          is_external_thread?: boolean | null
          labels?: string[] | null
          last_message_at?: string | null
          message_count?: number | null
          participants?: string[] | null
          subject?: string | null
          thread_id: string
          total_size_bytes?: number | null
          updated_at?: string
        }
        Update: {
          attachment_count?: number | null
          created_at?: string
          external_domains?: string[] | null
          first_message_at?: string | null
          id?: string
          is_external_thread?: boolean | null
          labels?: string[] | null
          last_message_at?: string | null
          message_count?: number | null
          participants?: string[] | null
          subject?: string | null
          thread_id?: string
          total_size_bytes?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          created_at: string
          id: string
          leave_date: string
          leave_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          leave_date: string
          leave_type: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          leave_date?: string
          leave_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          attachment_urls: string[] | null
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
          attachment_urls?: string[] | null
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
          attachment_urls?: string[] | null
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
      partner_clients: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          client_id: string
          id: string
          partner_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          client_id: string
          id?: string
          partner_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          client_id?: string
          id?: string
          partner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_clients_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_clients_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          alt_password: string
          bio: string | null
          channel_analytics_access: boolean | null
          channel_name: string | null
          channel_start_date: string | null
          channel_url: string | null
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
          alt_password?: string
          bio?: string | null
          channel_analytics_access?: boolean | null
          channel_name?: string | null
          channel_start_date?: string | null
          channel_url?: string | null
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
          alt_password?: string
          bio?: string | null
          channel_analytics_access?: boolean | null
          channel_name?: string | null
          channel_start_date?: string | null
          channel_url?: string | null
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
          video_urls: Json | null
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
          video_urls?: Json | null
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
          video_urls?: Json | null
          youtube_video_url?: string
        }
        Relationships: []
      }
      prospect_email_jobs: {
        Row: {
          attempts: number
          batch_id: string
          bcc: string | null
          body_text: string
          cc: string | null
          created_at: string
          from_email: string
          from_name: string | null
          id: string
          last_error: string | null
          message_id: string | null
          prospect_id: string | null
          reply_to: string | null
          scheduled_at: string
          sent_at: string | null
          status: string
          subject: string
          to_email: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          batch_id: string
          bcc?: string | null
          body_text: string
          cc?: string | null
          created_at?: string
          from_email: string
          from_name?: string | null
          id?: string
          last_error?: string | null
          message_id?: string | null
          prospect_id?: string | null
          reply_to?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          subject: string
          to_email: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          batch_id?: string
          bcc?: string | null
          body_text?: string
          cc?: string | null
          created_at?: string
          from_email?: string
          from_name?: string | null
          id?: string
          last_error?: string | null
          message_id?: string | null
          prospect_id?: string | null
          reply_to?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          subject?: string
          to_email?: string
          updated_at?: string
        }
        Relationships: []
      }
      prospect_sender_config: {
        Row: {
          created_at: string
          notes: string | null
          paused: boolean
          ramp_days: number
          sender_email: string
          starting_cap: number
          target_daily_cap: number
          updated_at: string
          warmup_start_date: string
        }
        Insert: {
          created_at?: string
          notes?: string | null
          paused?: boolean
          ramp_days?: number
          sender_email: string
          starting_cap?: number
          target_daily_cap?: number
          updated_at?: string
          warmup_start_date?: string
        }
        Update: {
          created_at?: string
          notes?: string | null
          paused?: boolean
          ramp_days?: number
          sender_email?: string
          starting_cap?: number
          target_daily_cap?: number
          updated_at?: string
          warmup_start_date?: string
        }
        Relationships: []
      }
      prospects: {
        Row: {
          assigned_sender: string | null
          auto_discovered: boolean
          channel_id: string | null
          channel_link: string | null
          channel_name: string | null
          channel_thumbnail: string | null
          client_name: string | null
          created_at: string
          data: Json
          email: string | null
          id: string
          is_banned: boolean
          last_fetched_at: string | null
          last_video_date: string | null
          last_video_title: string | null
          next_sync_at: string | null
          product_name: string | null
          sales: string | null
          search_text: string | null
          status: string | null
          subscribers_live: number | null
          sync_attempts: number | null
          sync_error: string | null
          sync_locked_until: string | null
          sync_priority: number | null
          sync_status: string | null
          total_views: number | null
          updated_at: string
          uploads_playlist: string | null
          video_count: number | null
        }
        Insert: {
          assigned_sender?: string | null
          auto_discovered?: boolean
          channel_id?: string | null
          channel_link?: string | null
          channel_name?: string | null
          channel_thumbnail?: string | null
          client_name?: string | null
          created_at?: string
          data?: Json
          email?: string | null
          id?: string
          is_banned?: boolean
          last_fetched_at?: string | null
          last_video_date?: string | null
          last_video_title?: string | null
          next_sync_at?: string | null
          product_name?: string | null
          sales?: string | null
          search_text?: string | null
          status?: string | null
          subscribers_live?: number | null
          sync_attempts?: number | null
          sync_error?: string | null
          sync_locked_until?: string | null
          sync_priority?: number | null
          sync_status?: string | null
          total_views?: number | null
          updated_at?: string
          uploads_playlist?: string | null
          video_count?: number | null
        }
        Update: {
          assigned_sender?: string | null
          auto_discovered?: boolean
          channel_id?: string | null
          channel_link?: string | null
          channel_name?: string | null
          channel_thumbnail?: string | null
          client_name?: string | null
          created_at?: string
          data?: Json
          email?: string | null
          id?: string
          is_banned?: boolean
          last_fetched_at?: string | null
          last_video_date?: string | null
          last_video_title?: string | null
          next_sync_at?: string | null
          product_name?: string | null
          sales?: string | null
          search_text?: string | null
          status?: string | null
          subscribers_live?: number | null
          sync_attempts?: number | null
          sync_error?: string | null
          sync_locked_until?: string | null
          sync_priority?: number | null
          sync_status?: string | null
          total_views?: number | null
          updated_at?: string
          uploads_playlist?: string | null
          video_count?: number | null
        }
        Relationships: []
      }
      prospects_conv_cache: {
        Row: {
          counts: Json
          id: string
          message_total: number
          replied: Json
          updated_at: string
        }
        Insert: {
          counts?: Json
          id: string
          message_total?: number
          replied?: Json
          updated_at?: string
        }
        Update: {
          counts?: Json
          id?: string
          message_total?: number
          replied?: Json
          updated_at?: string
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
          campaign_start_date: string | null
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
          campaign_start_date?: string | null
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
          campaign_start_date?: string | null
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
      thumbnail_history: {
        Row: {
          created_at: string
          id: string
          image_url: string
          message_id: string | null
          prompt: string
          session_id: string | null
          style_preset: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          message_id?: string | null
          prompt: string
          session_id?: string | null
          style_preset?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          message_id?: string | null
          prompt?: string
          session_id?: string | null
          style_preset?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thumbnail_history_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "thumbnail_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thumbnail_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "thumbnail_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      thumbnail_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          role: string
          session_id: string
          uploaded_image_url: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          role: string
          session_id: string
          uploaded_image_url?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          role?: string
          session_id?: string
          uploaded_image_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thumbnail_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "thumbnail_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      thumbnail_sessions: {
        Row: {
          created_at: string | null
          id: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_requests: {
        Row: {
          admin_response: string | null
          attachment_urls: string[] | null
          created_at: string
          id: string
          message: string
          request_type: string
          responded_by: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          attachment_urls?: string[] | null
          created_at?: string
          id?: string
          message: string
          request_type?: string
          responded_by?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          attachment_urls?: string[] | null
          created_at?: string
          id?: string
          message?: string
          request_type?: string
          responded_by?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      youtube_analytics_cache: {
        Row: {
          analytics_data: Json
          campaign_start_date: string | null
          channel_id: string
          channel_subscribers: number | null
          channel_title: string | null
          channel_videos: number | null
          channel_views: number | null
          created_at: string | null
          id: string
          last_fetched_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          analytics_data?: Json
          campaign_start_date?: string | null
          channel_id: string
          channel_subscribers?: number | null
          channel_title?: string | null
          channel_videos?: number | null
          channel_views?: number | null
          created_at?: string | null
          id?: string
          last_fetched_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          analytics_data?: Json
          campaign_start_date?: string | null
          channel_id?: string
          channel_subscribers?: number | null
          channel_title?: string | null
          channel_videos?: number | null
          channel_views?: number | null
          created_at?: string | null
          id?: string
          last_fetched_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      create_partner_account: {
        Args: {
          partner_email: string
          partner_name?: string
          partner_password: string
        }
        Returns: Json
      }
      generate_blog_post_slug: {
        Args: { creator_slug_val: string; post_title: string }
        Returns: string
      }
      generate_blog_slug: { Args: { blog_title: string }; Returns: string }
      generate_slug: { Args: { name: string }; Returns: string }
      get_blog_post_analytics: {
        Args: { p_end_date?: string; p_post_id: string; p_start_date?: string }
        Returns: {
          total_bookmarks: number
          total_cta_clicks: number
          total_shares: number
          total_video_plays: number
          total_views: number
          unique_visitors: number
        }[]
      }
      get_campaign_management_client: {
        Args: { _client_id: string }
        Returns: {
          channel_name: string
          channel_url: string
          created_at: string
          email: string
          full_name: string
          id: string
        }[]
      }
      get_campaign_management_users: {
        Args: never
        Returns: {
          campaign_count: number
          channel_name: string
          channel_url: string
          created_at: string
          email: string
          full_name: string
          id: string
        }[]
      }
      get_clients_for_partner: {
        Args: never
        Returns: {
          assigned_at: string
          channel_name: string
          channel_url: string
          email: string
          full_name: string
          id: string
        }[]
      }
      get_current_user_role: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_blog_view_count: {
        Args: { post_slug: string }
        Returns: undefined
      }
      is_partner_of_campaign: {
        Args: { _campaign_id: string; _partner_id: string }
        Returns: boolean
      }
      is_partner_of_client: {
        Args: { _client_id: string; _partner_id: string }
        Returns: boolean
      }
      is_swishview_staff: { Args: { _user_id?: string }; Returns: boolean }
      make_user_admin: { Args: { user_email: string }; Returns: undefined }
      respace_prospect_queue: {
        Args: { gap_seconds?: number; start_offset_seconds?: number }
        Returns: {
          count: number
          sender: string
        }[]
      }
      respace_prospect_queue_random: {
        Args: {
          max_gap_seconds?: number
          min_gap_seconds?: number
          start_offset_seconds?: number
        }
        Returns: {
          count: number
          sender: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      validate_alt_password: {
        Args: { entered_password: string; user_email: string }
        Returns: {
          is_valid: boolean
          user_data: Json
          user_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user" | "partner"
      payment_status: "pending" | "completed" | "failed" | "refunded"
      promotion_status:
        | "pending"
        | "active"
        | "completed"
        | "cancelled"
        | "draft"
      user_role: "user" | "admin" | "partner"
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
      app_role: ["admin", "user", "partner"],
      payment_status: ["pending", "completed", "failed", "refunded"],
      promotion_status: [
        "pending",
        "active",
        "completed",
        "cancelled",
        "draft",
      ],
      user_role: ["user", "admin", "partner"],
    },
  },
} as const
