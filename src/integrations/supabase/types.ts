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
      dream_collection_items: {
        Row: {
          added_at: string
          collection_id: string
          dream_id: string
          id: string
        }
        Insert: {
          added_at?: string
          collection_id: string
          dream_id: string
          id?: string
        }
        Update: {
          added_at?: string
          collection_id?: string
          dream_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dream_collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "dream_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dream_collection_items_dream_id_fkey"
            columns: ["dream_id"]
            isOneToOne: false
            referencedRelation: "dreams"
            referencedColumns: ["id"]
          },
        ]
      }
      dream_collections: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dream_drafts: {
        Row: {
          content: string | null
          created_at: string
          dream_date: string | null
          dream_time: string | null
          id: string
          mood: string | null
          tags: string[] | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          dream_date?: string | null
          dream_time?: string | null
          id?: string
          mood?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          dream_date?: string | null
          dream_time?: string | null
          id?: string
          mood?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dream_knowledge_base: {
        Row: {
          category: string
          context: string | null
          created_at: string | null
          id: string
          interpretation: string
          source: string | null
          symbol: string
        }
        Insert: {
          category: string
          context?: string | null
          created_at?: string | null
          id?: string
          interpretation: string
          source?: string | null
          symbol: string
        }
        Update: {
          category?: string
          context?: string | null
          created_at?: string | null
          id?: string
          interpretation?: string
          source?: string | null
          symbol?: string
        }
        Relationships: []
      }
      dream_shares: {
        Row: {
          created_at: string
          dream_id: string
          id: string
          message: string | null
          professional_id: string | null
          shared_with_user_id: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dream_id: string
          id?: string
          message?: string | null
          professional_id?: string | null
          shared_with_user_id?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dream_id?: string
          id?: string
          message?: string | null
          professional_id?: string | null
          shared_with_user_id?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dream_shares_dream_id_fkey"
            columns: ["dream_id"]
            isOneToOne: false
            referencedRelation: "dreams"
            referencedColumns: ["id"]
          },
        ]
      }
      dreams: {
        Row: {
          auto_style: boolean | null
          content: string
          created_at: string | null
          dream_date: string
          id: string
          image_style: string | null
          image_url: string | null
          interpretation: string | null
          interpretation_summary: string | null
          is_private: boolean | null
          mood: string | null
          no_recall: boolean | null
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
          visibility: string | null
        }
        Insert: {
          auto_style?: boolean | null
          content: string
          created_at?: string | null
          dream_date: string
          id?: string
          image_style?: string | null
          image_url?: string | null
          interpretation?: string | null
          interpretation_summary?: string | null
          is_private?: boolean | null
          mood?: string | null
          no_recall?: boolean | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
          visibility?: string | null
        }
        Update: {
          auto_style?: boolean | null
          content?: string
          created_at?: string | null
          dream_date?: string
          id?: string
          image_style?: string | null
          image_url?: string | null
          interpretation?: string | null
          interpretation_summary?: string | null
          is_private?: boolean | null
          mood?: string | null
          no_recall?: boolean | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
          visibility?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          last_notification_sent: string | null
          preferred_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_notification_sent?: string | null
          preferred_time?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_notification_sent?: string | null
          preferred_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      professional_comments: {
        Row: {
          content: string
          created_at: string
          dream_id: string
          id: string
          professional_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          dream_id: string
          id?: string
          professional_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          dream_id?: string
          id?: string
          professional_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_comments_dream_id_fkey"
            columns: ["dream_id"]
            isOneToOne: false
            referencedRelation: "dreams"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_profiles: {
        Row: {
          bio: string | null
          created_at: string
          id: string
          license_number: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          specialization: string
          status: string
          updated_at: string
          user_id: string
          years_of_experience: number | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          id?: string
          license_number?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialization: string
          status?: string
          updated_at?: string
          user_id: string
          years_of_experience?: number | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          id?: string
          license_number?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialization?: string
          status?: string
          updated_at?: string
          user_id?: string
          years_of_experience?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string | null
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          birth_latitude: number | null
          birth_longitude: number | null
          birth_place_name: string | null
          birth_time: string | null
          birth_timezone: string | null
          created_at: string | null
          gender: string | null
          id: string
          natal_chart_data: Json | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          account_type?: string | null
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          birth_latitude?: number | null
          birth_longitude?: number | null
          birth_place_name?: string | null
          birth_time?: string | null
          birth_timezone?: string | null
          created_at?: string | null
          gender?: string | null
          id: string
          natal_chart_data?: Json | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          account_type?: string | null
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          birth_latitude?: number | null
          birth_longitude?: number | null
          birth_place_name?: string | null
          birth_time?: string | null
          birth_timezone?: string | null
          created_at?: string | null
          gender?: string | null
          id?: string
          natal_chart_data?: Json | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      streaks: {
        Row: {
          created_at: string | null
          current_streak: number
          id: string
          last_dream_date: string | null
          longest_streak: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_streak?: number
          id?: string
          last_dream_date?: string | null
          longest_streak?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_streak?: number
          id?: string
          last_dream_date?: string | null
          longest_streak?: number
          updated_at?: string | null
          user_id?: string
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
      voice_notes: {
        Row: {
          audio_url: string
          created_at: string
          dream_id: string
          duration: number | null
          id: string
          transcription: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_url: string
          created_at?: string
          dream_id: string
          duration?: number | null
          id?: string
          transcription?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_url?: string
          created_at?: string
          dream_id?: string
          duration?: number | null
          id?: string
          transcription?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_notes_dream_id_fkey"
            columns: ["dream_id"]
            isOneToOne: false
            referencedRelation: "dreams"
            referencedColumns: ["id"]
          },
        ]
      }
      wonderpush_devices: {
        Row: {
          created_at: string
          device_model: string | null
          device_platform: string | null
          id: string
          installation_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_model?: string | null
          device_platform?: string | null
          id?: string
          installation_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_model?: string | null
          device_platform?: string | null
          id?: string
          installation_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      update_user_streak: {
        Args: { p_dream_date: string; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "user" | "professional" | "admin" | "super_admin"
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
      app_role: ["user", "professional", "admin", "super_admin"],
    },
  },
} as const
