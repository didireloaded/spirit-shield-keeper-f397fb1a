/**
 * Verification Buttons
 * Lets users confirm or dispute an incident
 */

import { useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { verifyIncident } from "@/lib/credibility";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface VerificationButtonsProps {
  incidentId: string;
  incidentType?: "marker" | "incident_report";
  onVerified?: () => void;
}

export function VerificationButtons({
  incidentId,
  incidentType = "marker",
  onVerified,
}: VerificationButtonsProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState<"confirm" | "deny" | null>(null);

  const handleVerify = async (type: "confirm" | "deny") => {
    if (!user) {
      toast.error("Please log in to verify incidents");
      return;
    }

    setLoading(true);
    try {
      const result = await verifyIncident(incidentId, user.id, type, incidentType);

      if (result.success) {
        setVerified(type);
        if (result.autoVerified) {
          toast.success("Incident automatically verified!");
        } else {
          toast.success(
            `Thank you for ${type === "confirm" ? "confirming" : "disputing"} this incident`
          );
        }
        onVerified?.();
      }
    } catch {
      toast.error("Failed to verify incident");
    } finally {
      setLoading(false);
    }
  };

  if (verified) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {verified === "confirm" ? (
          <>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span>You confirmed this incident</span>
          </>
        ) : (
          <>
            <XCircle className="w-4 h-4 text-destructive" />
            <span>You disputed this incident</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        className="flex-1"
        onClick={() => handleVerify("confirm")}
        disabled={loading}
      >
        <CheckCircle className="w-4 h-4 mr-1" />
        Confirm
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="flex-1"
        onClick={() => handleVerify("deny")}
        disabled={loading}
      >
        <XCircle className="w-4 h-4 mr-1" />
        Dispute
      </Button>
    </div>
  );
}
