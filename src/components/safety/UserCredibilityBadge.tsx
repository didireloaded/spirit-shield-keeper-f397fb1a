/**
 * User Credibility Badge
 * Shows a user's trust tier based on their credibility score
 */

import { Shield, AlertTriangle, User, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getCredibilityTier } from "@/lib/credibility";

interface UserCredibilityBadgeProps {
  score: number;
  compact?: boolean;
  showScore?: boolean;
}

export function UserCredibilityBadge({ score, compact = false, showScore = true }: UserCredibilityBadgeProps) {
  const tier = getCredibilityTier(score);

  const icons = {
    trusted: Shield,
    normal: User,
    suspicious: AlertTriangle,
    warning: AlertTriangle,
    banned: Ban,
  };

  const Icon = icons[tier.tier];

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Icon className={`w-4 h-4 ${tier.color}`} />
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-semibold">{tier.label}</p>
            <p className="text-xs">Credibility: {score}/100</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Badge variant="secondary" className={`gap-1 ${tier.color}`}>
      <Icon className="w-3 h-3" />
      <span>{tier.label}</span>
      {showScore && <span className="ml-1 opacity-70">({score})</span>}
    </Badge>
  );
}
