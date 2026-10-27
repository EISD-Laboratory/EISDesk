
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "audit_logs": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"entity": string,"entity_id": string | null,"id": number,"new_data": Json | null,"old_data": Json | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"entity": string,"entity_id"?: string | null,"id"?: never,"new_data"?: Json | null,"old_data"?: Json | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"entity"?: string,"entity_id"?: string | null,"id"?: never,"new_data"?: Json | null,"old_data"?: Json | null
                  }
                  Relationships: [
                    
                  ]
                },"holidays": {
                  Row: {
                    "created_at": string,"date": string,"name": string,"source": string,"type": Database["public"]['Enums']["holiday_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"date": string,"name": string,"source"?: string,"type"?: Database["public"]['Enums']["holiday_type"]
                  }
                  Update: {
                    "created_at"?: string,"date"?: string,"name"?: string,"source"?: string,"type"?: Database["public"]['Enums']["holiday_type"]
                  }
                  Relationships: [
                    
                  ]
                },"lab_sessions": {
                  Row: {
                    "cancel_reason": string | null,"cancelled_at": string | null,"cancelled_by": string | null,"category": Database["public"]['Enums']["session_category"],"close_key_photo_path": string | null,"close_note": string | null,"close_room_photo_path": string | null,"closed_at": string | null,"closed_by": string | null,"created_at": string,"created_by": string,"current_pic": string,"description": string | null,"id": string,"merged_into": string | null,"open_photo_path": string | null,"opened_at": string | null,"opened_by": string | null,"overdue_notified_at": string | null,"photos_deleted_at": string | null,"planned_end": string,"planned_start": string,"status": Database["public"]['Enums']["session_status"],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cancel_reason"?: string | null,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"category"?: Database["public"]['Enums']["session_category"],"close_key_photo_path"?: string | null,"close_note"?: string | null,"close_room_photo_path"?: string | null,"closed_at"?: string | null,"closed_by"?: string | null,"created_at"?: string,"created_by": string,"current_pic": string,"description"?: string | null,"id"?: string,"merged_into"?: string | null,"open_photo_path"?: string | null,"opened_at"?: string | null,"opened_by"?: string | null,"overdue_notified_at"?: string | null,"photos_deleted_at"?: string | null,"planned_end": string,"planned_start": string,"status"?: Database["public"]['Enums']["session_status"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "cancel_reason"?: string | null,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"category"?: Database["public"]['Enums']["session_category"],"close_key_photo_path"?: string | null,"close_note"?: string | null,"close_room_photo_path"?: string | null,"closed_at"?: string | null,"closed_by"?: string | null,"created_at"?: string,"created_by"?: string,"current_pic"?: string,"description"?: string | null,"id"?: string,"merged_into"?: string | null,"open_photo_path"?: string | null,"opened_at"?: string | null,"opened_by"?: string | null,"overdue_notified_at"?: string | null,"photos_deleted_at"?: string | null,"planned_end"?: string,"planned_start"?: string,"status"?: Database["public"]['Enums']["session_status"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lab_sessions_cancelled_by_fkey"
      columns: ["cancelled_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lab_sessions_closed_by_fkey"
      columns: ["closed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lab_sessions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lab_sessions_current_pic_fkey"
      columns: ["current_pic"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lab_sessions_merged_into_fkey"
      columns: ["merged_into"]
isOneToOne: false
      referencedRelation: "lab_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lab_sessions_merged_into_fkey"
      columns: ["merged_into"]
isOneToOne: false
      referencedRelation: "public_schedule"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lab_sessions_opened_by_fkey"
      columns: ["opened_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"login_attempts": {
                  Row: {
                    "failed_count": number,"lock_count": number,"locked_until": string | null,"nim": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "failed_count"?: number,"lock_count"?: number,"locked_until"?: string | null,"nim": string,"updated_at"?: string
                  }
                  Update: {
                    "failed_count"?: number,"lock_count"?: number,"locked_until"?: string | null,"nim"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"notifications": {
                  Row: {
                    "created_at": string,"id": number,"message": string,"read_at": string | null,"session_id": string | null,"telegram_sent_at": string | null,"type": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: never,"message": string,"read_at"?: string | null,"session_id"?: string | null,"telegram_sent_at"?: string | null,"type": string,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: never,"message"?: string,"read_at"?: string | null,"session_id"?: string | null,"telegram_sent_at"?: string | null,"type"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "lab_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "public_schedule"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "auth_email": string,"code": string,"created_at": string,"full_name": string,"id": string,"is_active": boolean,"must_change_secret": boolean,"nim": string,"notify_session_open": boolean,"role": Database["public"]['Enums']["user_role"],"telegram_chat_id": number | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth_email": string,"code": string,"created_at"?: string,"full_name": string,"id": string,"is_active"?: boolean,"must_change_secret"?: boolean,"nim": string,"notify_session_open"?: boolean,"role"?: Database["public"]['Enums']["user_role"],"telegram_chat_id"?: number | null,"updated_at"?: string
                  }
                  Update: {
                    "auth_email"?: string,"code"?: string,"created_at"?: string,"full_name"?: string,"id"?: string,"is_active"?: boolean,"must_change_secret"?: boolean,"nim"?: string,"notify_session_open"?: boolean,"role"?: Database["public"]['Enums']["user_role"],"telegram_chat_id"?: number | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"session_participants": {
                  Row: {
                    "attended_at": string | null,"joined_at": string,"purpose": string | null,"session_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attended_at"?: string | null,"joined_at"?: string,"purpose"?: string | null,"session_id": string,"user_id": string
                  }
                  Update: {
                    "attended_at"?: string | null,"joined_at"?: string,"purpose"?: string | null,"session_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "session_participants_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "lab_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "session_participants_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "public_schedule"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "session_participants_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"session_pic_logs": {
                  Row: {
                    "created_at": string,"from_admin": string | null,"id": number,"session_id": string,"to_admin": string,"type": Database["public"]['Enums']["pic_log_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"from_admin"?: string | null,"id"?: never,"session_id": string,"to_admin": string,"type": Database["public"]['Enums']["pic_log_type"]
                  }
                  Update: {
                    "created_at"?: string,"from_admin"?: string | null,"id"?: never,"session_id"?: string,"to_admin"?: string,"type"?: Database["public"]['Enums']["pic_log_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "session_pic_logs_from_admin_fkey"
      columns: ["from_admin"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "session_pic_logs_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "lab_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "session_pic_logs_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "public_schedule"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "session_pic_logs_to_admin_fkey"
      columns: ["to_admin"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"settings": {
                  Row: {
                    "admin_telegram_chat_id": number | null,"close_hour": number,"id": boolean,"open_hour": number,"photo_retention_days": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_telegram_chat_id"?: number | null,"close_hour"?: number,"id"?: boolean,"open_hour"?: number,"photo_retention_days"?: number,"updated_at"?: string
                  }
                  Update: {
                    "admin_telegram_chat_id"?: number | null,"close_hour"?: number,"id"?: boolean,"open_hour"?: number,"photo_retention_days"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"telegram_link_tokens": {
                  Row: {
                    "expires_at": string,"token": string,"used_at": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "expires_at": string,"token": string,"used_at"?: string | null,"user_id": string
                  }
                  Update: {
                    "expires_at"?: string,"token"?: string,"used_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "telegram_link_tokens_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "public_schedule": {
                  Row: {
                    "category": Database["public"]['Enums']["session_category"],"id": string,"opened_at": string | null,"participant_count": number | null,"planned_end": string,"planned_start": string,"status": Database["public"]['Enums']["session_status"],"title": string
                  }
                  ComputedFields: never
                  Insert: {
                           "category"?: Database["public"]['Enums']["session_category"] | null,"id"?: string | null,"opened_at"?: string | null,"participant_count"?: never,"planned_end"?: string | null,"planned_start"?: string | null,"status"?: Database["public"]['Enums']["session_status"] | null,"title"?: string | null
                         }
                        Update: {
                           "category"?: Database["public"]['Enums']["session_category"] | null,"id"?: string | null,"opened_at"?: string | null,"participant_count"?: never,"planned_end"?: string | null,"planned_start"?: string | null,"status"?: Database["public"]['Enums']["session_status"] | null,"title"?: string | null
                         }
                        Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "admin_create_profile":
{ Args: { "p_auth_email": string,"p_code": string,"p_full_name": string,"p_id": string,"p_nim": string,"p_role": Database["public"]['Enums']["user_role"] }; Returns: undefined
                           },
"admin_require_secret_change":
{ Args: { "p_user": string }; Returns: undefined
                           },
"admin_set_active":
{ Args: { "p_active": boolean,"p_user": string }; Returns: undefined
                           },
"admin_set_role":
{ Args: { "p_role": Database["public"]['Enums']["user_role"],"p_user": string }; Returns: undefined
                           },
"admin_update_profile":
{ Args: { "p_code": string,"p_full_name": string,"p_user": string }; Returns: undefined
                           },
"cancel_session":
{ Args: { "p_reason": string,"p_session_id": string }; Returns: undefined
                           },
"close_session":
{ Args: { "p_key_photo_path": string,"p_note"?: string,"p_room_photo_path": string,"p_session_id": string }; Returns: undefined
                           },
"create_session":
{ Args: { "p_category": Database["public"]['Enums']["session_category"],"p_description"?: string,"p_end": string,"p_start": string,"p_title": string }; Returns: string
                           },
"create_telegram_link_token":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"extend_session":
{ Args: { "p_new_end": string,"p_session_id": string }; Returns: undefined
                           },
"get_my_profile":
{ Args: Record<PropertyKey, never>; Returns: {
              "auth_email": string,
"code": string,
"created_at": string,
"full_name": string,
"id": string,
"is_active": boolean,
"must_change_secret": boolean,
"nim": string,
"notify_session_open": boolean,
"role": Database["public"]['Enums']["user_role"],
"telegram_chat_id": number | null,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "profiles"
        isOneToOne: true
        isSetofReturn: false
      } },
"get_settings":
{ Args: Record<PropertyKey, never>; Returns: {
              "admin_telegram_chat_id": number | null,
"close_hour": number,
"id": boolean,
"open_hour": number,
"photo_retention_days": number,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "settings"
        isOneToOne: true
        isSetofReturn: false
      } },
"join_session":
{ Args: { "p_purpose"?: string,"p_session_id": string }; Returns: undefined
                           },
"leave_session":
{ Args: { "p_session_id": string }; Returns: undefined
                           },
"link_telegram":
{ Args: { "p_chat_id": number,"p_token": string }; Returns: string
                           },
"login_locked_until":
{ Args: { "p_nim": string }; Returns: string
                           },
"mark_notifications_read":
{ Args: { "p_ids"?: (number)[] }; Returns: undefined
                           },
"mark_secret_changed":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"open_session":
{ Args: { "p_opened_at"?: string,"p_photo_path": string,"p_session_id": string }; Returns: undefined
                           },
"open_session_now":
{ Args: { "p_category": Database["public"]['Enums']["session_category"],"p_description"?: string,"p_end": string,"p_photo_path": string,"p_title": string }; Returns: string
                           },
"record_login_attempt":
{ Args: { "p_nim": string,"p_success": boolean }; Returns: string
                           },
"set_notify_session_open":
{ Args: { "p_enabled": boolean }; Returns: undefined
                           },
"take_over_pic":
{ Args: { "p_session_id": string }; Returns: undefined
                           },
"transfer_pic":
{ Args: { "p_session_id": string,"p_to_admin": string }; Returns: undefined
                           },
"unlink_telegram":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"update_settings":
{ Args: { "p_admin_telegram_chat_id": number,"p_close_hour": number,"p_open_hour": number,"p_photo_retention_days": number }; Returns: undefined
                           }
          }
          Enums: {
            "holiday_type": "nasional"|"cuti_bersama"|"manual","pic_log_type": "transfer"|"take_over"|"merge","session_category": "belajar"|"radiv"|"rapat"|"kegiatan"|"lainnya","session_status": "scheduled"|"open"|"closed"|"cancelled"|"merged","user_role": "staff"|"admin"|"super_admin"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "holiday_type": ["nasional", "cuti_bersama", "manual"],"pic_log_type": ["transfer", "take_over", "merge"],"session_category": ["belajar", "radiv", "rapat", "kegiatan", "lainnya"],"session_status": ["scheduled", "open", "closed", "cancelled", "merged"],"user_role": ["staff", "admin", "super_admin"]
          }
        }
} as const
