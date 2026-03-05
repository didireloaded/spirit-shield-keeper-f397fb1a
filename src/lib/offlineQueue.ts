/**
 * Offline Action Queue
 * Queues user actions when offline and processes them when connectivity returns.
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QueuedAction {
  id: string;
  type: "create_incident" | "create_post" | "verify_incident";
  payload: Record<string, unknown>;
  timestamp: number;
}

const QUEUE_KEY = "offline_queue";

export function queueOfflineAction(
  type: QueuedAction["type"],
  payload: Record<string, unknown>
): void {
  const queue = getOfflineQueue();
  queue.push({
    id: crypto.randomUUID(),
    type,
    payload,
    timestamp: Date.now(),
  });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  console.log(`[OfflineQueue] Queued ${type}`, payload);
}

export function getOfflineQueue(): QueuedAction[] {
  try {
    const stored = localStorage.getItem(QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export async function processOfflineQueue(): Promise<void> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  console.log(`[OfflineQueue] Processing ${queue.length} actions…`);
  const processed: string[] = [];

  for (const action of queue) {
    try {
      await processAction(action);
      processed.push(action.id);
    } catch (err) {
      console.error("[OfflineQueue] Failed:", action.type, err);
    }
  }

  const remaining = queue.filter((a) => !processed.includes(a.id));
  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));

  if (processed.length > 0) {
    toast.success(`Synced ${processed.length} offline action${processed.length > 1 ? "s" : ""}`);
  }
}

async function processAction(action: QueuedAction): Promise<void> {
  switch (action.type) {
    case "create_incident": {
      const { error } = await supabase.from("markers").insert(action.payload as any);
      if (error) throw error;
      break;
    }
    case "create_post": {
      const { error } = await supabase.from("community_posts").insert(action.payload as any);
      if (error) throw error;
      break;
    }
    case "verify_incident": {
      const { error } = await supabase.from("incident_verifications").insert(action.payload as any);
      if (error) throw error;
      break;
    }
  }
}
