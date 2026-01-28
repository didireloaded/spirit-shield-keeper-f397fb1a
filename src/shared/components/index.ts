/**
 * Shared Components Barrel Export
 */

// Feedback components
export { LoadingSpinner, PageLoading, InlineLoading } from "./feedback/LoadingSpinner";
export { 
  SkeletonCard, 
  SkeletonAlertCard, 
  SkeletonPostCard, 
  SkeletonListItem, 
  SkeletonStatsCard,
  SkeletonMap,
  SkeletonGrid,
} from "./feedback/SkeletonCard";
export { 
  ErrorMessage, 
  NetworkError, 
  PermissionError, 
  NotFoundError 
} from "./feedback/ErrorMessage";

// Data display components
export { TimeAgo, TimeAgoCompact } from "./data-display/TimeAgo";
export { DistanceBadge, calculateDistance } from "./data-display/DistanceBadge";
export { StatusBadge, StatusDot } from "./data-display/StatusBadge";
