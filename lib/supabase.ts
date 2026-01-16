import { createClient } from "@supabase/supabase-js";
import type {
  Conversation,
  Message,
  Batch,
  Evaluation,
  SetType,
} from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Conversation helpers
export async function getConversations() {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data as Conversation[];
}

export async function getConversation(id: string) {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as Conversation;
}

export async function createConversation(
  conversation: Omit<Conversation, "id" | "created_at" | "updated_at">
) {
  const { data, error } = await supabase
    .from("conversations")
    .insert(conversation)
    .select()
    .single();

  if (error) throw error;
  return data as Conversation;
}

export async function updateConversation(
  id: string,
  updates: Partial<Conversation>
) {
  const { data, error } = await supabase
    .from("conversations")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Conversation;
}

// Message helpers
export async function getMessages(conversationId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as Message[];
}

export async function createMessage(
  message: Omit<Message, "id" | "created_at">
) {
  const { data, error } = await supabase
    .from("messages")
    .insert(message)
    .select()
    .single();

  if (error) throw error;
  return data as Message;
}

export async function createMessages(
  messages: Omit<Message, "id" | "created_at">[]
) {
  const { data, error } = await supabase
    .from("messages")
    .insert(messages)
    .select();

  if (error) throw error;
  return data as Message[];
}

// Batch helpers
export async function getBatches() {
  const { data, error } = await supabase
    .from("batches")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Batch[];
}

export async function getBatch(id: string) {
  const { data, error } = await supabase
    .from("batches")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as Batch;
}

export async function createBatch(
  batch: Omit<Batch, "id" | "created_at" | "updated_at">
) {
  const { data, error } = await supabase
    .from("batches")
    .insert(batch)
    .select()
    .single();

  if (error) throw error;
  return data as Batch;
}

export async function updateBatch(id: string, updates: Partial<Batch>) {
  const { data, error } = await supabase
    .from("batches")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Batch;
}

export async function getLatestBatchBySetType(setType: SetType) {
  const { data, error } = await supabase
    .from("batches")
    .select("*")
    .eq("set_type", setType)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
  return data as Batch | null;
}

// Evaluation helpers
export async function getEvaluations() {
  const { data, error } = await supabase
    .from("evaluations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Evaluation[];
}

export async function createEvaluation(
  evaluation: Omit<Evaluation, "id" | "created_at">
) {
  const { data, error } = await supabase
    .from("evaluations")
    .insert(evaluation)
    .select()
    .single();

  if (error) throw error;
  return data as Evaluation;
}
