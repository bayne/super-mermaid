export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      diagrams: {
        Row: {
          id: string;
          title: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          title?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          diagram_id: string;
          role: string;
          content: string;
          user_name: string | null;
          user_color: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          diagram_id: string;
          role: string;
          content: string;
          user_name?: string | null;
          user_color?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          diagram_id?: string;
          role?: string;
          content?: string;
          user_name?: string | null;
          user_color?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_diagram: {
        Args: { p_id: string };
        Returns: {
          id: string;
          title: string;
          content: string;
          created_at: string;
          updated_at: string;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
