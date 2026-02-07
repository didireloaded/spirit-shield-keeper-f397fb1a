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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      alert_events: {
        Row: {
          alert_id: string
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          alert_id: string
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          alert_id?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_events_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_responders: {
        Row: {
          badge_number: string | null
          created_at: string | null
          eta_minutes: number | null
          id: string
          last_updated: string | null
          latitude: number | null
          longitude: number | null
          officer_name: string | null
          panic_alert_id: string | null
          phone: string | null
          responder_type: string
          status: string | null
          unit_identifier: string | null
        }
        Insert: {
          badge_number?: string | null
          created_at?: string | null
          eta_minutes?: number | null
          id?: string
          last_updated?: string | null
          latitude?: number | null
          longitude?: number | null
          officer_name?: string | null
          panic_alert_id?: string | null
          phone?: string | null
          responder_type?: string
          status?: string | null
          unit_identifier?: string | null
        }
        Update: {
          badge_number?: string | null
          created_at?: string | null
          eta_minutes?: number | null
          id?: string
          last_updated?: string | null
          latitude?: number | null
          longitude?: number | null
          officer_name?: string | null
          panic_alert_id?: string | null
          phone?: string | null
          responder_type?: string
          status?: string | null
          unit_identifier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_responders_panic_alert_id_fkey"
            columns: ["panic_alert_id"]
            isOneToOne: false
            referencedRelation: "panic_alerts_broadcast"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          audio_duration_seconds: number | null
          audio_started_at: string | null
          audio_url: string | null
          created_at: string | null
          description: string | null
          id: string
          latitude: number
          longitude: number
          resolved_at: string | null
          status: Database["public"]["Enums"]["alert_status"] | null
          type: Database["public"]["Enums"]["alert_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          audio_duration_seconds?: number | null
          audio_started_at?: string | null
          audio_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          latitude: number
          longitude: number
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["alert_status"] | null
          type: Database["public"]["Enums"]["alert_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          audio_duration_seconds?: number | null
          audio_started_at?: string | null
          audio_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          latitude?: number
          longitude?: number
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["alert_status"] | null
          type?: Database["public"]["Enums"]["alert_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          allowed_origins: string[] | null
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          partner_name: string
          permissions: Json | null
          rate_limit: number | null
          updated_at: string
        }
        Insert: {
          allowed_origins?: string[] | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          partner_name: string
          permissions?: Json | null
          rate_limit?: number | null
          updated_at?: string
        }
        Update: {
          allowed_origins?: string[] | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          partner_name?: string
          permissions?: Json | null
          rate_limit?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      api_usage_logs: {
        Row: {
          action: string
          api_key_id: string | null
          created_at: string
          id: string
          ip_address: unknown
          metadata: Json | null
          resource_id: string | null
        }
        Insert: {
          action: string
          api_key_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource_id?: string | null
        }
        Update: {
          action?: string
          api_key_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      authority_contacts: {
        Row: {
          address: string | null
          created_at: string | null
          description: string | null
          email: string | null
          id: string
          is_emergency: boolean | null
          name: string
          operating_hours: string | null
          phone: string | null
          region: string
          type: Database["public"]["Enums"]["authority_type"]
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_emergency?: boolean | null
          name: string
          operating_hours?: string | null
          phone?: string | null
          region: string
          type: Database["public"]["Enums"]["authority_type"]
        }
        Update: {
          address?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_emergency?: boolean | null
          name?: string
          operating_hours?: string | null
          phone?: string | null
          region?: string
          type?: Database["public"]["Enums"]["authority_type"]
        }
        Relationships: []
      }
      authority_notifications: {
        Row: {
          authority_contact_id: string | null
          created_at: string | null
          delivered_at: string | null
          id: string
          notification_type: string
          panic_alert_id: string | null
          sent_at: string | null
          status: string | null
        }
        Insert: {
          authority_contact_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          notification_type?: string
          panic_alert_id?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          authority_contact_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          notification_type?: string
          panic_alert_id?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "authority_notifications_authority_contact_id_fkey"
            columns: ["authority_contact_id"]
            isOneToOne: false
            referencedRelation: "authority_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "authority_notifications_panic_alert_id_fkey"
            columns: ["panic_alert_id"]
            isOneToOne: false
            referencedRelation: "panic_alerts_broadcast"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_comments: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          comments_count: number
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          image_url: string | null
          is_verified: boolean
          likes_count: number
          location_label: string | null
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          comments_count?: number
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          is_verified?: boolean
          likes_count?: number
          location_label?: string | null
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          comments_count?: number
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          is_verified?: boolean
          likes_count?: number
          location_label?: string | null
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      community_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      marker_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          marker_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          marker_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          marker_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marker_comments_marker_id_fkey"
            columns: ["marker_id"]
            isOneToOne: false
            referencedRelation: "markers"
            referencedColumns: ["id"]
          },
        ]
      }
      marker_reactions: {
        Row: {
          created_at: string
          id: string
          marker_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          marker_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          marker_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marker_reactions_marker_id_fkey"
            columns: ["marker_id"]
            isOneToOne: false
            referencedRelation: "markers"
            referencedColumns: ["id"]
          },
        ]
      }
      marker_status_history: {
        Row: {
          created_at: string
          id: string
          marker_id: string
          new_status: string
          note: string | null
          old_status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          marker_id: string
          new_status: string
          note?: string | null
          old_status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          marker_id?: string
          new_status?: string
          note?: string | null
          old_status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marker_status_history_marker_id_fkey"
            columns: ["marker_id"]
            isOneToOne: false
            referencedRelation: "markers"
            referencedColumns: ["id"]
          },
        ]
      }
      markers: {
        Row: {
          comment_count: number | null
          created_at: string | null
          description: string | null
          expires_at: string | null
          id: string
          latitude: number
          longitude: number
          status: string | null
          type: Database["public"]["Enums"]["marker_type"]
          user_id: string
          verified_count: number | null
        }
        Insert: {
          comment_count?: number | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          latitude: number
          longitude: number
          status?: string | null
          type: Database["public"]["Enums"]["marker_type"]
          user_id: string
          verified_count?: number | null
        }
        Update: {
          comment_count?: number | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          latitude?: number
          longitude?: number
          status?: string | null
          type?: Database["public"]["Enums"]["marker_type"]
          user_id?: string
          verified_count?: number | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          created_at: string | null
          id: string
          panic_override: boolean | null
          push_enabled: boolean | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sound_enabled: boolean | null
          updated_at: string | null
          user_id: string
          vibration_enabled: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          panic_override?: boolean | null
          push_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sound_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
          vibration_enabled?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          panic_override?: boolean | null
          push_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sound_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
          vibration_enabled?: boolean | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          body: string
          created_at: string
          data: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          priority: string | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          body: string
          created_at?: string
          data?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          priority?: string | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string
          created_at?: string
          data?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          priority?: string | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      panic_alerts: {
        Row: {
          alert_type: string
          created_at: string
          delivery_status: string
          error_message: string | null
          id: string
          panic_session_id: string
          recipient_id: string | null
          recipient_info: string | null
          sent_at: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          delivery_status?: string
          error_message?: string | null
          id?: string
          panic_session_id: string
          recipient_id?: string | null
          recipient_info?: string | null
          sent_at?: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          delivery_status?: string
          error_message?: string | null
          id?: string
          panic_session_id?: string
          recipient_id?: string | null
          recipient_info?: string | null
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "panic_alerts_panic_session_id_fkey"
            columns: ["panic_session_id"]
            isOneToOne: false
            referencedRelation: "panic_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      panic_alerts_broadcast: {
        Row: {
          alert_type: string
          created_at: string | null
          id: string
          latitude: number
          location_name: string | null
          longitude: number
          panic_session_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_type?: string
          created_at?: string | null
          id?: string
          latitude: number
          location_name?: string | null
          longitude: number
          panic_session_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          id?: string
          latitude?: number
          location_name?: string | null
          longitude?: number
          panic_session_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "panic_alerts_broadcast_panic_session_id_fkey"
            columns: ["panic_session_id"]
            isOneToOne: false
            referencedRelation: "panic_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      panic_audio_chunks: {
        Row: {
          chunk_end_time: string
          chunk_index: number
          chunk_start_time: string
          created_at: string
          duration_seconds: number
          file_size_bytes: number | null
          file_url: string
          id: string
          panic_session_id: string
        }
        Insert: {
          chunk_end_time: string
          chunk_index: number
          chunk_start_time: string
          created_at?: string
          duration_seconds: number
          file_size_bytes?: number | null
          file_url: string
          id?: string
          panic_session_id: string
        }
        Update: {
          chunk_end_time?: string
          chunk_index?: number
          chunk_start_time?: string
          created_at?: string
          duration_seconds?: number
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          panic_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "panic_audio_chunks_panic_session_id_fkey"
            columns: ["panic_session_id"]
            isOneToOne: false
            referencedRelation: "panic_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      panic_location_logs: {
        Row: {
          accuracy: number | null
          created_at: string
          heading: number | null
          id: string
          lat: number
          lng: number
          panic_session_id: string
          recorded_at: string
          speed: number | null
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          heading?: number | null
          id?: string
          lat: number
          lng: number
          panic_session_id: string
          recorded_at?: string
          speed?: number | null
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          heading?: number | null
          id?: string
          lat?: number
          lng?: number
          panic_session_id?: string
          recorded_at?: string
          speed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "panic_location_logs_panic_session_id_fkey"
            columns: ["panic_session_id"]
            isOneToOne: false
            referencedRelation: "panic_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      panic_sessions: {
        Row: {
          consent_given: boolean
          created_at: string
          device_info: Json | null
          ended_at: string | null
          escalated: boolean | null
          id: string
          initial_lat: number
          initial_lng: number
          last_known_lat: number
          last_known_lng: number
          last_location_at: string
          started_at: string
          status: string
          threat_score: number | null
          trigger_source: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          consent_given?: boolean
          created_at?: string
          device_info?: Json | null
          ended_at?: string | null
          escalated?: boolean | null
          id?: string
          initial_lat: number
          initial_lng: number
          last_known_lat: number
          last_known_lng: number
          last_location_at?: string
          started_at?: string
          status?: string
          threat_score?: number | null
          trigger_source?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          consent_given?: boolean
          created_at?: string
          device_info?: Json | null
          ended_at?: string | null
          escalated?: boolean | null
          id?: string
          initial_lat?: number
          initial_lng?: number
          last_known_lat?: number
          last_known_lng?: number
          last_location_at?: string
          started_at?: string
          status?: string
          threat_score?: number | null
          trigger_source?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      post_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          comments_count: number | null
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          latitude: number | null
          likes_count: number | null
          location_name: string | null
          longitude: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comments_count?: number | null
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          likes_count?: number | null
          location_name?: string | null
          longitude?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comments_count?: number | null
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          likes_count?: number | null
          location_name?: string | null
          longitude?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          ghost_mode: boolean | null
          id: string
          phone: string | null
          region: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          ghost_mode?: boolean | null
          id: string
          phone?: string | null
          region?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          ghost_mode?: boolean | null
          id?: string
          phone?: string | null
          region?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      safety_sessions: {
        Row: {
          arrived_at: string | null
          companion_phone: string | null
          created_at: string | null
          departure_time: string
          destination: string
          destination_lat: number | null
          destination_lng: number | null
          expected_arrival: string
          id: string
          license_plate: string | null
          outfit_description: string | null
          outfit_photo_url: string | null
          status: Database["public"]["Enums"]["session_status"] | null
          updated_at: string | null
          user_id: string
          vehicle_name: string | null
        }
        Insert: {
          arrived_at?: string | null
          companion_phone?: string | null
          created_at?: string | null
          departure_time: string
          destination: string
          destination_lat?: number | null
          destination_lng?: number | null
          expected_arrival: string
          id?: string
          license_plate?: string | null
          outfit_description?: string | null
          outfit_photo_url?: string | null
          status?: Database["public"]["Enums"]["session_status"] | null
          updated_at?: string | null
          user_id: string
          vehicle_name?: string | null
        }
        Update: {
          arrived_at?: string | null
          companion_phone?: string | null
          created_at?: string | null
          departure_time?: string
          destination?: string
          destination_lat?: number | null
          destination_lng?: number | null
          expected_arrival?: string
          id?: string
          license_plate?: string | null
          outfit_description?: string | null
          outfit_photo_url?: string | null
          status?: Database["public"]["Enums"]["session_status"] | null
          updated_at?: string | null
          user_id?: string
          vehicle_name?: string | null
        }
        Relationships: []
      }
      user_locations: {
        Row: {
          accuracy: number | null
          ghost_mode: boolean | null
          heading: number | null
          id: string
          is_moving: boolean | null
          latitude: number
          location_name: string | null
          longitude: number
          speed: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          ghost_mode?: boolean | null
          heading?: number | null
          id?: string
          is_moving?: boolean | null
          latitude: number
          location_name?: string | null
          longitude: number
          speed?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accuracy?: number | null
          ghost_mode?: boolean | null
          heading?: number | null
          id?: string
          is_moving?: boolean | null
          latitude?: number
          location_name?: string | null
          longitude?: number
          speed?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_rate_limits: {
        Row: {
          action_type: string
          count: number | null
          created_at: string | null
          id: string
          user_id: string
          window_start: string | null
        }
        Insert: {
          action_type: string
          count?: number | null
          created_at?: string | null
          id?: string
          user_id: string
          window_start?: string | null
        }
        Update: {
          action_type?: string
          count?: number | null
          created_at?: string | null
          id?: string
          user_id?: string
          window_start?: string | null
        }
        Relationships: []
      }
      watchers: {
        Row: {
          created_at: string | null
          id: string
          status: Database["public"]["Enums"]["watcher_status"] | null
          user_id: string
          watcher_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["watcher_status"] | null
          user_id: string
          watcher_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["watcher_status"] | null
          user_id?: string
          watcher_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_rate_limit: {
        Args: {
          p_action_type: string
          p_max_count?: number
          p_user_id: string
          p_window_minutes?: number
        }
        Returns: boolean
      }
    }
    Enums: {
      alert_status: "active" | "resolved" | "cancelled" | "escalated"
      alert_type:
        | "panic"
        | "amber"
        | "robbery"
        | "assault"
        | "suspicious"
        | "accident"
        | "other"
      authority_type:
        | "police"
        | "fire"
        | "medical"
        | "helpline"
        | "ngo"
        | "security"
      marker_type:
        | "robbery"
        | "accident"
        | "suspicious"
        | "assault"
        | "kidnapping"
        | "other"
      session_status: "active" | "arrived" | "late" | "escalated" | "cancelled"
      watcher_status: "pending" | "accepted" | "rejected"
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
      alert_status: ["active", "resolved", "cancelled", "escalated"],
      alert_type: [
        "panic",
        "amber",
        "robbery",
        "assault",
        "suspicious",
        "accident",
        "other",
      ],
      authority_type: [
        "police",
        "fire",
        "medical",
        "helpline",
        "ngo",
        "security",
      ],
      marker_type: [
        "robbery",
        "accident",
        "suspicious",
        "assault",
        "kidnapping",
        "other",
      ],
      session_status: ["active", "arrived", "late", "escalated", "cancelled"],
      watcher_status: ["pending", "accepted", "rejected"],
    },
  },
} as const
