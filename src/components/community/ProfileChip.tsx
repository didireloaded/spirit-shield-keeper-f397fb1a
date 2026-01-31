/**
 * ProfileChip Component
 * Clickable identity unit for posts - shows avatar, name, and time
 * Never exposes raw IDs or data
 */

import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

interface ProfileChipProps {
  user: {
    id: string;
    full_name: string | null;
    avatar_url?: string | null;
  } | null;
  createdAt: string;
  isAnonymous?: boolean;
  size?: "sm" | "md";
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function timeAgo(date: string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function ProfileChip({ 
  user, 
  createdAt, 
  isAnonymous = false,
  size = "md" 
}: ProfileChipProps) {
  const navigate = useNavigate();

  const displayName = isAnonymous 
    ? "Anonymous" 
    : user?.full_name || "Community Member";
  const initials = isAnonymous ? "?" : getInitials(user?.full_name);
  const canNavigate = !isAnonymous && user?.id;

  const avatarSize = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const nameSize = size === "sm" ? "text-xs" : "text-sm";
  const timeSize = size === "sm" ? "text-[10px]" : "text-xs";

  const handleClick = () => {
    if (canNavigate) {
      navigate(`/profile/${user.id}`);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={!canNavigate}
      className="flex items-center gap-3 group focus:outline-none text-left"
    >
      <Avatar className={`${avatarSize} border-2 border-border`}>
        {!isAnonymous && user?.avatar_url ? (
          <AvatarImage src={user.avatar_url} alt={displayName} />
        ) : null}
        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className={`${nameSize} font-semibold text-foreground group-hover:text-primary transition-colors`}>
          {displayName}
        </span>
        <span className={`${timeSize} text-muted-foreground`}>
          {timeAgo(createdAt)}
        </span>
      </div>
    </button>
  );
}
