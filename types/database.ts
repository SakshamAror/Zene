export interface Database {
  public: {
    Tables: {
      meditation_sessions: {
        Row: {
          id: string;
          user_id: string;
          length: number;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          length: number;
          date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          length?: number;
          date?: string;
          created_at?: string;
        };
      };
      work_sessions: {
        Row: {
          id: string;
          user_id: string;
          length: number;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          length: number;
          date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          length?: number;
          date?: string;
          created_at?: string;
        };
      };
      journal_logs: {
        Row: {
          id: string;
          user_id: string;
          log: string;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          log: string;
          date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          log?: string;
          date?: string;
          created_at?: string;
        };
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          goal: string;
          completed: boolean;
          date_created: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          goal: string;
          completed?: boolean;
          date_created?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          goal?: string;
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
          category: string;
        };
        Insert: {
          id?: string;
          title: string;
          summary: string;
          category?: string;
        };
        Update: {
          id?: string;
          title?: string;
          summary?: string;
          category?: string;
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