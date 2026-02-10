/**
 * Panic Detail Sheet
 * Full panic session details shown in a bottom drawer.
 * Opened from panic map popup "View details" action.
 * Owner can resolve their own panic alert from here.
 */

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatDistanceToNow } from "date-fns";
import { Radio, MapPin, Mic, MessageCircle, Clock, User, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ResolutionConfirmDialog } from "@/components/ResolutionConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface PanicDetailSheetProps {
  open: boolean;
  onClose: () => void;
  onResolved?: () => void;
  panic: {
    id: string;
    user_id?: string;
    user_name?: string;
    avatar_url?: string | null;
    status: string;
    incident_type?: string | null;
    location_name?: string | null;
    created_at: string;
    ended_at?: string | null;
    chat_room_id?: string | null;
  } | null;
}

export function PanicDetailSheet({ open, onClose, onResolved, panic }: PanicDetailSheetProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resolving, setResolving] = useState(false);

  if (!panic) return null;

  const isLive = panic.status === "active";
  const isOwner = user?.id === panic.user_id;
  const timeAgo = formatDistanceToNow(new Date(panic.created_at), { addSuffix: true });

  const handleResolve = async () => {
    setResolving(true);
    try {
      const { error } = await supabase
        .from("panic_sessions")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", panic.id)
        .eq("user_id", user!.id);

      if (error) throw error;

      toast.success("Panic alert resolved. Your recording has been saved.");
      setConfirmOpen(false);
      onResolved?.();
      onClose();
    } catch {
      toast.error("Failed to resolve panic alert");
    } finally {
      setResolving(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="bottom" className="rounded-t-2xl bg-neutral-950 border-neutral-800 text-neutral-100 max-h-[70vh]">
          <SheetHeader className="pb-4 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              {isLive && <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>}
              <SheetTitle className="text-neutral-100 text-base">
                {panic.incident_type || "Panic Alert"}
              </SheetTitle>
              {isLive ? (
                <span className="ml-auto px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-semibold uppercase tracking-wider">
                  Live
                </span>
              ) : (
                <span className="ml-auto px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 text-[10px] font-semibold uppercase tracking-wider">
                  Resolved
                </span>
              )}
            </div>
          </SheetHeader>

          <div className="space-y-4 pt-4">
            {/* User */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-red-500/40 overflow-hidden bg-neutral-800 flex items-center justify-center">
                {panic.avatar_url ? (
                  <img src={panic.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-neutral-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-200">{panic.user_name || "User"}</p>
                <p className="text-xs text-neutral-500">Reported {timeAgo}</p>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-900 border border-neutral-800">
              <MapPin className="w-4 h-4 text-red-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-neutral-500">Last known location</p>
                <p className="text-sm text-neutral-200">{panic.location_name || "Tracking location"}</p>
              </div>
            </div>

            {/* Status row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                <div className="flex items-center gap-2 mb-1">
                  <Radio className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-[10px] uppercase text-neutral-500 tracking-wider">Status</span>
                </div>
                <p className="text-sm font-medium text-neutral-200">{isLive ? "Active" : "Resolved"}</p>
              </div>
              <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-3.5 h-3.5 text-neutral-500" />
                  <span className="text-[10px] uppercase text-neutral-500 tracking-wider">Duration</span>
                </div>
                <p className="text-sm font-medium text-neutral-200">{timeAgo.replace("ago", "").trim()}</p>
              </div>
            </div>

            {/* Recording indicator */}
            {isLive && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <Mic className="w-4 h-4 text-red-400" />
                <span className="text-xs text-red-300">Audio recording active</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              {panic.chat_room_id && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                  onClick={() => {
                    onClose();
                    navigate(`/chat?room=${panic.chat_room_id}`);
                  }}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Open conversation
                </Button>
              )}
              {isLive && isOwner && (
                <Button
                  size="sm"
                  className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700"
                  onClick={() => setConfirmOpen(true)}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark as resolved
                </Button>
              )}
              {!(isLive && isOwner) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                  onClick={onClose}
                >
                  Close
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ResolutionConfirmDialog
        open={confirmOpen}
        variant="panic"
        onConfirm={handleResolve}
        onCancel={() => setConfirmOpen(false)}
        loading={resolving}
      />
    </>
  );
}

export default PanicDetailSheet;
