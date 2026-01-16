// API Types
export type SetType = "mini_dev" | "dev" | "eval";

export interface Student {
  id: string;
  name: string;
  grade_level: number;
}

export interface StudentListResponse {
  students: Student[];
}

export interface Subject {
  id: string;
  name: string;
}

export interface SubjectListResponse {
  subjects: Subject[];
}

export interface Topic {
  id: string;
  subject_id: string;
  subject_name: string;
  name: string;
  grade_level: number;
}

export interface TopicListResponse {
  topics: Topic[];
}

export interface StartConversationRequest {
  student_id: string;
  topic_id: string;
}

export interface StartConversationResponse {
  conversation_id: string;
  student_id: string;
  topic_id: string;
  max_turns: number;
  conversations_remaining: number | null;
}

export interface InteractRequest {
  conversation_id: string;
  tutor_message: string;
}

export interface InteractResponse {
  conversation_id: string;
  interaction_id: string;
  student_response: string;
  turn_number: number;
  is_complete: boolean;
}

// Database Types
export interface Conversation {
  id: string;
  external_conversation_id: string;
  student_id: string;
  student_name: string;
  topic_id: string;
  topic_name: string;
  subject_name: string;
  set_type: SetType;
  status: "open" | "closed";
  messages_remaining: number;
  is_auto: boolean;
  is_running: boolean;
  system_prompt?: string;
  initial_message?: string;
  batch_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "tutor" | "student";
  content: string;
  created_at: string;
}

// Extended types with relations
export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

// Batch Types
export interface Batch {
  id: string;
  name: string;
  set_type: SetType;
  system_prompt: string;
  initial_message: string;
  status: "running" | "completed" | "failed";
  total_conversations: number;
  completed_conversations: number;
  created_at: string;
  updated_at: string;
}

// Leaderboard Types
export interface LeaderboardEntry {
  team_id: string;
  team_name: string;
  score: number;
  submission_count: number;
  last_updated: string;
}

export interface CombinedLeaderboardEntry {
  team_id: string;
  team_name: string;
  score: number;
  inference_rank: number;
  tutoring_rank: number;
  submission_count: number;
  last_updated: string;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  updated_at: string;
}

export interface CombinedLeaderboardResponse {
  entries: CombinedLeaderboardEntry[];
  updated_at: string;
}
