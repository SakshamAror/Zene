export interface Database {
  public: {
    Tables: {
      meditation_sessions: {
        Row: {
          id: string;
          user_id: string;
          duration: number;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          duration: number;
          date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          duration?: number;
          date?: string;
          created_at?: string;
        };
      };
      work_sessions: {
        Row: {
          id: string;
          user_id: string;
          duration: number;
          session_type: 'work' | 'break';
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          duration: number;
          session_type: 'work' | 'break';
          date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          duration?: number;
          session_type?: 'work' | 'break';
          date?: string;
          created_at?: string;
        };
      };
      journal_logs: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: string;
          date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          content?: string;
          date?: string;
          created_at?: string;
        };
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          completed: boolean;
          date_created: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          completed?: boolean;
          date_created?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          completed?: boolean;
          date_created?: string;
          created_at?: string;
        };
      };
      book_summaries: {
        Row: {
          id: string;
          title: string;
          summary: string;
        };
        Insert: {
          id?: string;
          title: string;
          summary: string;
        };
        Update: {
          id?: string;
          title?: string;
          summary?: string;
        };
      };
      user_book_status: {
        Row: {
          id: string;
          user_id: string;
          book_summary_id: string;
          is_favourite: boolean;
          read_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          book_summary_id: string;
          is_favourite?: boolean;
          read_at: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          book_summary_id?: string;
          is_favourite?: boolean;
          read_at?: string;
        };
      };
    };
  };
}