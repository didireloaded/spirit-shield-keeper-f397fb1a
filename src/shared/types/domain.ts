/**
 * Shared Domain Types
 * Core business entities used across features
 */

import type { Database } from "@/integrations/supabase/types";

// ============= Alert Types =============
export type AlertType = Database["public"]["Enums"]["alert_type"];
export type AlertStatus = Database["public"]["Enums"]["alert_status"];
export type MarkerType = Database["public"]["Enums"]["marker_type"];
export type WatcherStatus = Database["public"]["Enums"]["watcher_status"];
export type SessionStatus = Database["public"]["Enums"]["session_status"];
export type AuthorityType = Database["public"]["Enums"]["authority_type"];

// ============= User & Profile =============
export interface UserProfile {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  region: string | null;
  ghostMode: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

// ============= Alert =============
export interface Alert {
  id: string;
  userId: string;
  type: AlertType;
  status: AlertStatus | null;
  latitude: number;
  longitude: number;
  description: string | null;
  audioUrl: string | null;
  audioStartedAt: string | null;
  audioDurationSeconds: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  resolvedAt: string | null;
}

// ============= Marker / Incident =============
export interface Marker {
  id: string;
  userId: string;
  type: MarkerType;
  latitude: number;
  longitude: number;
  description: string | null;
  status: string | null;
  verifiedCount: number | null;
  commentCount: number | null;
  expiresAt: string | null;
  createdAt: string | null;
}

export interface Incident {
  id: string;
  latitude: number;
  longitude: number;
  type: string;
  status?: string;
  description?: string | null;
  verified?: boolean;
  confidenceScore?: number;
  createdAt?: string;
}

// ============= Watcher =============
export interface Watcher {
  id: string;
  userId: string;
  watcherId: string;
  status: WatcherStatus | null;
  createdAt: string | null;
}

export interface WatcherWithProfile extends Watcher {
  profile: UserProfile | null;
}

// ============= Safety Session =============
export interface SafetySession {
  id: string;
  userId: string;
  destination: string;
  destinationLat: number | null;
  destinationLng: number | null;
  departureTime: string;
  expectedArrival: string;
  status: SessionStatus | null;
  arrivedAt: string | null;
  outfitDescription: string | null;
  outfitPhotoUrl: string | null;
  vehicleName: string | null;
  licensePlate: string | null;
  companionPhone: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// ============= Panic Session =============
export interface PanicSession {
  id: string;
  userId: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  initialLat: number;
  initialLng: number;
  lastKnownLat: number;
  lastKnownLng: number;
  lastLocationAt: string;
  triggerSource: string | null;
  threatScore: number | null;
  escalated: boolean | null;
  deviceInfo: Record<string, unknown> | null;
  consentGiven: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============= Notification =============
export interface Notification {
  id: string;
  userId: string;
  actorId: string | null;
  type: string;
  title: string;
  body: string;
  entityId: string | null;
  entityType: string | null;
  priority: string | null;
  data: Record<string, unknown> | null;
  read: boolean | null;
  createdAt: string;
}

// ============= Community Post =============
export interface CommunityPost {
  id: string;
  userId: string;
  content: string;
  imageUrl: string | null;
  locationLabel: string | null;
  visibility: string;
  isVerified: boolean;
  likesCount: number;
  commentsCount: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============= Authority Contact =============
export interface AuthorityContact {
  id: string;
  name: string;
  type: AuthorityType;
  phone: string | null;
  email: string | null;
  address: string | null;
  region: string;
  description: string | null;
  operatingHours: string | null;
  isEmergency: boolean | null;
  createdAt: string | null;
}

// ============= Location Types =============
export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

export interface UserLocation extends GeoLocation {
  userId: string;
  updatedAt: string | null;
}

// ============= Route Data =============
export interface RouteData {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  destinationName?: string;
  status?: string;
}

// ============= Watcher Location for Map =============
export interface WatcherLocation {
  id: string;
  name: string;
  avatarUrl?: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
}

// ============= Responder for Map =============
export interface Responder {
  id: string;
  latitude: number;
  longitude: number;
  role: "police" | "ambulance" | "authority";
  status?: "en_route" | "on_scene" | "available";
  name?: string;
  eta?: string;
}
