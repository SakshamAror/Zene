export interface MeditationSession {
  id?: number | string;
  user_id: string;
  length: number; // in seconds
  timestamp: string; // ISO 8601 string with timezone
}

export interface WorkSession {
  id?: number | string;
  user_id: string;
  length: number; // in seconds
  timestamp: string; // ISO 8601 string with timezone
}

export interface JournalLog {
  id?: number | string;
  user_id: string;
  log: string;
  timestamp: string; // ISO 8601 string with timezone
}

export interface Goal {
  id?: number | string;
  user_id: string;
  goal: string;
  completed: boolean;
  timestamp: string; // ISO 8601 string with timezone
}

// Frontend-only interfaces for display
export interface DisplayMeditationSession {
  timestamp: string;
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
  timestamp: string;
  content: string;
}

export interface DisplayWorkSession {
  timestamp: string;
  duration: number;
  audioType: string;
}

// UserBookStatus for Learn page
export interface UserBookStatus {
  id: string;
  user_id: string;
  book_summary_id: string;
  is_favourite: boolean;
  timestamp: string;
}

// BookSummary for Learn page
export interface BookSummary {
  id: string;
  title: string;
  summary: string;
  category?: string;
}

// Voice message to future self
export interface VoiceMessage {
  id?: number | string;
  user_id: string;
  audio_path: string; // Path/key in the storage bucket
  /** @deprecated Use audio_path instead */
  audio_url?: string; // Deprecated: URL to the audio file
  reminder_date: string; // ISO 8601 string for when to show the reminder
  created_at: string; // ISO 8601 string when the message was created
  title?: string; // Optional title for the message
  played?: boolean; // Whether the user has played this message
}