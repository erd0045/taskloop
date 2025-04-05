export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      chats: {
        Row: {
          created_at: string
          id: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          chat_id: string | null
          content: string
          id: string
          read: boolean | null
          receiver_id: string
          sender_id: string
          timestamp: string
        }
        Insert: {
          chat_id?: string | null
          content: string
          id?: string
          read?: boolean | null
          receiver_id: string
          sender_id: string
          timestamp?: string
        }
        Update: {
          chat_id?: string | null
          content?: string
          id?: string
          read?: boolean | null
          receiver_id?: string
          sender_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          doer_rating: number | null
          full_name: string | null
          id: string
          requestor_rating: number | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          doer_rating?: number | null
          full_name?: string | null
          id: string
          requestor_rating?: number | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          doer_rating?: number | null
          full_name?: string | null
          id?: string
          requestor_rating?: number | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      task_applications: {
        Row: {
          applicant_id: string
          created_at: string
          id: string
          message: string
          status: string
          task_id: string
        }
        Insert: {
          applicant_id: string
          created_at?: string
          id?: string
          message: string
          status?: string
          task_id: string
        }
        Update: {
          applicant_id?: string
          created_at?: string
          id?: string
          message?: string
          status?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_applications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string
          creator_id: string
          creator_rating: number | null
          deadline: string | null
          description: string | null
          doer_id: string | null
          doer_rating: number | null
          doer_verification_code: string | null
          id: string
          is_doer_rated: boolean | null
          is_doer_verified: boolean | null
          is_requestor_rated: boolean | null
          is_requestor_verified: boolean | null
          location: string | null
          requestor_verification_code: string | null
          reward: number | null
          status: string | null
          task_type: string | null
          title: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          creator_rating?: number | null
          deadline?: string | null
          description?: string | null
          doer_id?: string | null
          doer_rating?: number | null
          doer_verification_code?: string | null
          id?: string
          is_doer_rated?: boolean | null
          is_doer_verified?: boolean | null
          is_requestor_rated?: boolean | null
          is_requestor_verified?: boolean | null
          location?: string | null
          requestor_verification_code?: string | null
          reward?: number | null
          status?: string | null
          task_type?: string | null
          title: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          creator_rating?: number | null
          deadline?: string | null
          description?: string | null
          doer_id?: string | null
          doer_rating?: number | null
          doer_verification_code?: string | null
          id?: string
          is_doer_rated?: boolean | null
          is_doer_verified?: boolean | null
          is_requestor_rated?: boolean | null
          is_requestor_verified?: boolean | null
          location?: string | null
          requestor_verification_code?: string | null
          reward?: number | null
          status?: string | null
          task_type?: string | null
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
