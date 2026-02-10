/**
 * Resolution Confirmation Dialog
 * Calm, clear confirmation for resolving/ending alerts and sessions.
 * Reusable across Panic, Amber, and Look After Me.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type AlertVariant = "panic" | "amber" | "lam";

const COPY: Record<AlertVariant, { title: string; message: string; action: string }> = {
  panic: {
    title: "Resolve panic alert",
    message:
      "This will mark your panic alert as resolved and remove it from the live map. The alert will remain saved in history for record purposes.",
    action: "Mark as resolved",
  },
  amber: {
    title: "Mark amber alert as resolved",
    message:
      "This will remove the amber alert from the map. The alert will remain available in history.",
    action: "Mark as resolved",
  },
  lam: {
    title: "End Look After Me session",
    message:
      "This will stop live location sharing and remove the session from the map.",
    action: "End session",
  },
};

interface ResolutionConfirmDialogProps {
  open: boolean;
  variant: AlertVariant;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ResolutionConfirmDialog({
  open,
  variant,
  onConfirm,
  onCancel,
  loading,
}: ResolutionConfirmDialogProps) {
  const copy = COPY[variant];

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy.message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={loading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={loading}>
            {loading ? "Processing…" : copy.action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
