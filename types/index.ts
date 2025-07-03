export interface MeditationSession {
  id?: number;
  user_id: string;
  length: number; // in seconds
  date: string; // ISO date string (YYYY-MM-DD)
}

export interface WorkSession {
  id?: number;
  user_id: string;
  length: number; // in seconds
  date: string; // ISO date string (YYYY-MM-DD)
}

export interface JournalLog {
  id?: number;
  user_id: string;
  log: string;
  date: string; // ISO date string (YYYY-MM-DD)
}

export interface Goal {
  id?: number;
  user_id: string;
  goal: string;
  completed: boolean;
  date_created: string; // ISO date string (YYYY-MM-DD)
}

// Frontend-only interfaces for display
export interface DisplayMeditationSession {
  date: string;
  duration: number;
  completed: boolean;
  startTime: number;
}

export interface DisplayGoal {
  id: string;
  text: string;
  completed: boolean;
  placeholder?: boolean;
}

export interface DisplayJournalEntry {
  date: string;
  content: string;
}

export interface DisplayWorkSession {
  date: string;
  duration: number;
  audioType: string;
}

// UserBookStatus for Learn page
export interface UserBookStatus {
  id: string;
  user_id: string;
  book_summary_id: string;
  is_favourite: boolean;
  read_at: string;
}

// BookSummary for Learn page
export interface BookSummary {
  id: string;
  title: string;
  summary: string;
  category?: string;
}