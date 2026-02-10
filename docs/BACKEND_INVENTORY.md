# SUPABASE BACKEND INVENTORY — SPIRIT SHIELD

> Complete backend blueprint. Every table, policy, index, edge function, bucket, and realtime config required for this safety application.

---

## TABLE OF CONTENTS

1. [SQL Tables](#1-sql-tables)
2. [Indexes & Constraints](#2-indexes--constraints)
3. [Row Level Security (RLS) Policies](#3-row-level-security-rls-policies)
4. [Realtime Configuration](#4-realtime-configuration)
5. [Edge Functions](#5-edge-functions)
6. [Storage Buckets](#6-storage-buckets)
7. [Auth & Roles](#7-auth--roles)
8. [Push Notification Backend](#8-push-notification-backend)
9. [Gap Analysis](#9-gap-analysis)

---

## 1. SQL TABLES

### Tables That EXIST (29 tables)

All tables below are confirmed present in the database via `types.ts`.

#### 1.1 `profiles`
```sql
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY,  -- matches auth.users.id
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  region TEXT,
  username TEXT,
  ghost_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
**Purpose:** User profile data. Created automatically on signup via `handle_new_user()` trigger on `auth.users`.

#### 1.2 `user_locations`
```sql
CREATE TABLE public.user_locations (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,  -- references profiles.id
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  is_moving BOOLEAN DEFAULT false,
  ghost_mode BOOLEAN DEFAULT false,
  location_name TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
**Purpose:** Real-time user presence on map. Updated via upsert from frontend geolocation watch. Ghost mode hides from other users.

#### 1.3 `panic_sessions`
```sql
CREATE TABLE public.panic_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  initial_lat DOUBLE PRECISION NOT NULL,
  initial_lng DOUBLE PRECISION NOT NULL,
  last_known_lat DOUBLE PRECISION NOT NULL,
  last_known_lng DOUBLE PRECISION NOT NULL,
  last_location_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  location_name TEXT,
  current_location_name TEXT,
  description TEXT,
  severity TEXT DEFAULT 'high',
  trigger_source TEXT DEFAULT 'manual',
  session_type TEXT DEFAULT 'panic',
  incident_type TEXT,
  device_info JSONB DEFAULT '{}',
  consent_given BOOLEAN NOT NULL DEFAULT true,
  threat_score INTEGER DEFAULT 0,
  escalated BOOLEAN DEFAULT false,
  is_moving BOOLEAN DEFAULT false,
  recording_status TEXT DEFAULT 'pending',
  responders_needed TEXT[],
  chat_room_id UUID REFERENCES chat_rooms(id),
  participants_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
**Purpose:** Core panic system. Each row = one panic event with live GPS tracking.

#### 1.4 `panic_location_logs`
```sql
CREATE TABLE public.panic_location_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  panic_session_id UUID NOT NULL REFERENCES panic_sessions(id),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  battery_level INTEGER,
  is_moving BOOLEAN DEFAULT false,
  location_name TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
**Purpose:** Movement trail breadcrumbs during active panic. Trigger `update_panic_location_from_log()` syncs latest position back to `panic_sessions`.

#### 1.5 `panic_audio_chunks`
```sql
CREATE TABLE public.panic_audio_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  panic_session_id UUID NOT NULL REFERENCES panic_sessions(id),
  chunk_index INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  chunk_start_time TIMESTAMPTZ NOT NULL,
  chunk_end_time TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER NOT NULL,
  file_size_bytes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
**Purpose:** Evidence audio recorded in 10-second chunks during panic, uploaded by `panic-worker.js` service worker.

#### 1.6 `panic_alerts`
```sql
CREATE TABLE public.panic_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  panic_session_id UUID NOT NULL REFERENCES panic_sessions(id),
  alert_type TEXT NOT NULL,  -- 'watcher', 'sms', 'email'
  recipient_id UUID,
  recipient_info TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
**Purpose:** Delivery log for every alert sent during a panic (SMS via Twilio, email via Resend, in-app push).

#### 1.7 `panic_alerts_broadcast`
```sql
CREATE TABLE public.panic_alerts_broadcast (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  panic_session_id UUID REFERENCES panic_sessions(id),
  user_id UUID NOT NULL,
  alert_type TEXT NOT NULL DEFAULT 'panic',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location_name TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
**Purpose:** Public broadcast record for map visibility. Separate from `panic_sessions` so RLS can allow community-wide SELECT.

#### 1.8 `alert_responders`
```sql
CREATE TABLE public.alert_responders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  panic_alert_id UUID REFERENCES panic_alerts_broadcast(id),
  responder_type TEXT NOT NULL DEFAULT 'police',
  status TEXT DEFAULT 'dispatched',
  unit_identifier TEXT,
  officer_name TEXT,
  badge_number TEXT,
  phone TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  eta_minutes INTEGER,
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
```
**Purpose:** Tracks responding units (police/ambulance) dispatched to a panic event.

#### 1.9 `alerts`
```sql
CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  type alert_type NOT NULL,  -- ENUM: panic, amber, robbery, assault, suspicious, accident, other
  status alert_status DEFAULT 'active',  -- ENUM: active, resolved, cancelled, escalated
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  description TEXT,
  audio_url TEXT,
  audio_started_at TIMESTAMPTZ,
  audio_duration_seconds INTEGER,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
**Purpose:** General-purpose alert table used for incident reports and amber alerts. `type` enum distinguishes them.

#### 1.10 `alert_events`
```sql
CREATE TABLE public.alert_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID NOT NULL REFERENCES alerts(id),
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
**Purpose:** Activity log / audit trail for status changes on alerts.

#### 1.11 `markers`
```sql
CREATE TABLE public.markers (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  type marker_type NOT NULL,  -- ENUM: robbery, accident, suspicious, assault, kidnapping, other
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  verified_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ DEFAULT (now() + '24:00:00'::interval),
  created_at TIMESTAMPTZ DEFAULT now()
);
```
**Purpose:** Map incident markers. Auto-expire after 24 hours. Community can verify and comment.

#### 1.12 `marker_comments`
```sql
CREATE TABLE public.marker_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  marker_id UUID NOT NULL REFERENCES markers(id),
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 1.13 `marker_reactions`
```sql
CREATE TABLE public.marker_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  marker_id UUID NOT NULL REFERENCES markers(id),
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL,  -- 'verified', etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
**Purpose:** Verification reactions on markers. Trigger `update_marker_verified_count()` keeps `markers.verified_count` in sync.

#### 1.14 `marker_status_history`
```sql
CREATE TABLE public.marker_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  marker_id UUID NOT NULL REFERENCES markers(id),
  user_id UUID NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 1.15 `incident_types`
```sql
CREATE TABLE public.incident_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  requires_recording BOOLEAN DEFAULT true,
  requires_photo BOOLEAN DEFAULT false,
  auto_notify_authorities BOOLEAN DEFAULT true,
  estimated_response_time INTEGER
);
```
**Purpose:** Lookup table for incident categories. Read-only for users.

#### 1.16 `safety_sessions` (Look After Me)
```sql
CREATE TABLE public.safety_sessions (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  destination TEXT NOT NULL,
  destination_lat DOUBLE PRECISION,
  destination_lng DOUBLE PRECISION,
  departure_time TIMESTAMPTZ NOT NULL,
  expected_arrival TIMESTAMPTZ NOT NULL,
  status session_status DEFAULT 'active',  -- ENUM: active, arrived, late, escalated, cancelled
  arrived_at TIMESTAMPTZ,
  outfit_description TEXT,
  outfit_photo_url TEXT,
  vehicle_name TEXT,
  license_plate TEXT,
  companion_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
**Purpose:** "Look After Me" trip tracking sessions. Watchers monitor the user's journey.

#### 1.17 `watchers`
```sql
CREATE TABLE public.watchers (
  id UUID NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL,    -- the person being watched
  watcher_id UUID NOT NULL, -- the person watching
  status watcher_status DEFAULT 'pending',  -- ENUM: pending, accepted, rejected
  created_at TIMESTAMPTZ DEFAULT now()
);
```
**Purpose:** Safety watcher relationships. Accepted watchers can view panic sessions and safety sessions.

#### 1.18 `chat_rooms`
```sql
CREATE TABLE public.chat_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  panic_session_id UUID REFERENCES panic_sessions(id),
  type TEXT DEFAULT 'amber',
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  participant_count INTEGER DEFAULT 0,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ
);
```
**Purpose:** Chat rooms for amber alert discussions and panic session coordination.

#### 1.19 `chat_messages`
```sql
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_room_id UUID NOT NULL REFERENCES chat_rooms(id),
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  sighting_latitude DOUBLE PRECISION,
  sighting_longitude DOUBLE PRECISION,
  sighting_photo_url TEXT,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```
**Purpose:** Messages within amber alert chat rooms. Supports sighting reports with location + photo.

#### 1.20 `community_posts`
```sql
CREATE TABLE public.community_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  location_label TEXT,
  visibility TEXT DEFAULT 'public',
  is_verified BOOLEAN DEFAULT false,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 1.21 `community_comments`
```sql
CREATE TABLE public.community_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES community_posts(id),
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 1.22 `community_reactions`
```sql
CREATE TABLE public.community_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES community_posts(id),
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 1.23 `community_reports`
```sql
CREATE TABLE public.community_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_id UUID NOT NULL,
  target_type TEXT NOT NULL,
  user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 1.24 `notifications`
```sql
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  actor_id UUID,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  entity_id UUID,
  entity_type TEXT,
  priority TEXT DEFAULT 'normal',
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
**Purpose:** Central in-app notification store. All notification types land here. Frontend subscribes via realtime.

#### 1.25 `notification_settings`
```sql
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  push_enabled BOOLEAN DEFAULT true,
  sound_enabled BOOLEAN DEFAULT true,
  vibration_enabled BOOLEAN DEFAULT true,
  panic_override BOOLEAN DEFAULT true,
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00:00',
  quiet_hours_end TIME DEFAULT '07:00:00',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
**Purpose:** Per-user notification preferences. Auto-created on signup via `create_notification_settings_for_user()` trigger.

#### 1.26 `push_subscriptions`
```sql
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
**Purpose:** Web Push API subscription storage. Used by `send-push-notification` edge function to fan out push events.

#### 1.27 `authority_contacts`
```sql
CREATE TABLE public.authority_contacts (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  type authority_type NOT NULL,  -- ENUM: police, fire, medical, helpline, ngo, security
  phone TEXT,
  email TEXT,
  address TEXT,
  region TEXT NOT NULL,
  description TEXT,
  operating_hours TEXT,
  is_emergency BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```
**Purpose:** Read-only directory of emergency contacts by region.

#### 1.28 `authority_notifications`
```sql
CREATE TABLE public.authority_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  panic_alert_id UUID REFERENCES panic_alerts_broadcast(id),
  authority_contact_id UUID REFERENCES authority_contacts(id),
  notification_type TEXT NOT NULL DEFAULT 'app',
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 1.29 Additional tables (conversations, messages, posts, etc.)

The following legacy/secondary tables also exist:

| Table | Purpose |
|-------|---------|
| `conversations` | DM conversation containers |
| `conversation_participants` | DM participants |
| `messages` | DM messages |
| `posts` | Legacy community posts (before `community_posts`) |
| `comments` | Legacy post comments |
| `post_likes` | Legacy post likes |
| `api_keys` | External API partner key storage |
| `api_usage_logs` | API usage tracking |
| `user_rate_limits` | Rate limiting records |

---

## 2. INDEXES & CONSTRAINTS

### Existing Enums

```sql
-- These enums exist in the database:
CREATE TYPE public.alert_status AS ENUM ('active', 'resolved', 'cancelled', 'escalated');
CREATE TYPE public.alert_type AS ENUM ('panic', 'amber', 'robbery', 'assault', 'suspicious', 'accident', 'other');
CREATE TYPE public.authority_type AS ENUM ('police', 'fire', 'medical', 'helpline', 'ngo', 'security');
CREATE TYPE public.marker_type AS ENUM ('robbery', 'accident', 'suspicious', 'assault', 'kidnapping', 'other');
CREATE TYPE public.session_status AS ENUM ('active', 'arrived', 'late', 'escalated', 'cancelled');
CREATE TYPE public.watcher_status AS ENUM ('pending', 'accepted', 'rejected');
```

### Recommended Indexes (add if missing)

```sql
-- user_locations: Fast lookup by user, geo queries
CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON user_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_coords ON user_locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_user_locations_ghost ON user_locations(ghost_mode) WHERE ghost_mode = false;

-- panic_sessions: Active session lookup
CREATE INDEX IF NOT EXISTS idx_panic_sessions_user_id ON panic_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_panic_sessions_status ON panic_sessions(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_panic_sessions_coords ON panic_sessions(last_known_lat, last_known_lng);

-- panic_location_logs: Session trail retrieval
CREATE INDEX IF NOT EXISTS idx_panic_location_logs_session ON panic_location_logs(panic_session_id, recorded_at);

-- alerts: Active alerts, type filtering, geo queries
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_coords ON alerts(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);

-- markers: Active markers, expiry, geo queries
CREATE INDEX IF NOT EXISTS idx_markers_status ON markers(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_markers_coords ON markers(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_markers_expires ON markers(expires_at);
CREATE INDEX IF NOT EXISTS idx_markers_user_id ON markers(user_id);

-- safety_sessions: Active sessions
CREATE INDEX IF NOT EXISTS idx_safety_sessions_user_id ON safety_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_safety_sessions_status ON safety_sessions(status) WHERE status = 'active';

-- notifications: User inbox
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_id, entity_type);

-- watchers: Relationship lookup
CREATE INDEX IF NOT EXISTS idx_watchers_user_id ON watchers(user_id, status);
CREATE INDEX IF NOT EXISTS idx_watchers_watcher_id ON watchers(watcher_id, status);

-- chat_messages: Room message feed
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(chat_room_id, created_at);

-- push_subscriptions: User's active subscriptions
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

-- community_posts: Feed ordering
CREATE INDEX IF NOT EXISTS idx_community_posts_created ON community_posts(created_at DESC) WHERE deleted_at IS NULL;

-- panic_alerts_broadcast: Active broadcasts
CREATE INDEX IF NOT EXISTS idx_panic_broadcast_status ON panic_alerts_broadcast(status) WHERE status = 'active';
```

### Unique Constraints

```sql
-- One location record per user (upsert pattern)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_locations_unique_user ON user_locations(user_id);

-- One notification settings row per user
-- Already enforced: notification_settings has UNIQUE on user_id

-- One reaction per user per marker
CREATE UNIQUE INDEX IF NOT EXISTS idx_marker_reactions_unique ON marker_reactions(marker_id, user_id);

-- One reaction per user per community post
CREATE UNIQUE INDEX IF NOT EXISTS idx_community_reactions_unique ON community_reactions(post_id, user_id);

-- One push subscription per endpoint
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
```

---

## 3. ROW LEVEL SECURITY (RLS) POLICIES

### Summary of ALL existing RLS policies

Every table listed below has RLS **enabled**. Policies use `RESTRICTIVE` mode (the `Permissive: No` markers in the schema mean these are RESTRICTIVE).

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `profiles` | *(not shown - likely permissive public read)* | — | — | — |
| `user_locations` | Own + non-ghost | Own (x2 duplicate policies) | Own (x2 duplicate policies) | ✗ |
| `panic_sessions` | Own + watchers | Own | Own | ✗ |
| `panic_location_logs` | Own + watchers | Own session | ✗ | ✗ |
| `panic_audio_chunks` | Own + watchers | Own session | ✗ | ✗ |
| `panic_alerts` | Own session + recipient | ✗ | ✗ | ✗ |
| `panic_alerts_broadcast` | Own only ⚠️ | Own | Own | ✗ |
| `alert_responders` | Own alerts | Authenticated | Authenticated | ✗ |
| `alerts` | All authenticated | Own | Own | ✗ |
| `alert_events` | All authenticated | Own alerts | ✗ | ✗ |
| `markers` | All authenticated | Own | ✗ ⚠️ | Own |
| `marker_comments` | All | Own | Own | Own |
| `marker_reactions` | All | Own | Own | Own |
| `marker_status_history` | All | Own marker | ✗ | ✗ |
| `incident_types` | Authenticated | ✗ | ✗ | ✗ |
| `safety_sessions` | Own + watchers | Own | Own | ✗ |
| `watchers` | *(implied)* | *(implied)* | *(implied)* | *(implied)* |
| `chat_rooms` | Active + authenticated | Authenticated | Own session | ✗ |
| `chat_messages` | Active rooms + authenticated | Own | ✗ | ✗ |
| `community_posts` | *(implied public)* | Own | *(implied)* | *(implied)* |
| `community_comments` | Non-deleted | Own | Own | ✗ |
| `community_reactions` | All | Own | ✗ | Own |
| `community_reports` | ✗ | Own | ✗ | ✗ |
| `notifications` | Own (x2 duplicates) | True (system) | Own (x2 duplicates) | Own (x2 duplicates) |
| `notification_settings` | Own | Own | Own | ✗ |
| `push_subscriptions` | Own | Own | Own | Own (ALL policy) |
| `authority_contacts` | All | ✗ | ✗ | ✗ |
| `authority_notifications` | Own alerts | ✗ | ✗ | ✗ |
| `conversations` | Own (via participants) | ✗ | ✗ | ✗ |
| `conversation_participants` | Own (via participants) | ✗ | ✗ | ✗ |
| `messages` | Own conversations | Own + in conversation | ✗ | ✗ |
| `posts` | All | Own | Own | Own |
| `comments` | All | Own | ✗ | Own |
| `post_likes` | All | Own | ✗ | Own |
| `api_keys` | False | False | False | False |
| `api_usage_logs` | False | False | False | False |
| `user_rate_limits` | Own | ✗ | ✗ | ✗ |

### ⚠️ RLS Issues Identified

1. **`panic_alerts_broadcast` SELECT is own-only** — This table is meant for community-wide map visibility. Nearby users should be able to see active broadcasts. Current policy only allows `auth.uid() = user_id`.

2. **`markers` has no UPDATE policy** — Marker owners cannot update status. The `marker_status_history` INSERT policy exists but the marker itself can't be updated.

3. **Duplicate policies on `user_locations`** — Two INSERT and two UPDATE policies exist (likely from iterative migrations). Should be consolidated.

4. **Duplicate policies on `notifications`** — Two SELECT, two UPDATE, and two DELETE policies exist.

5. **`panic_sessions` visibility** — Only own + watchers can see. For community map features (showing nearby panics), the `panic_alerts_broadcast` table handles this — but its SELECT is too restrictive (see #1).

### Recommended RLS Fixes

```sql
-- Fix 1: Allow all authenticated users to see active panic broadcasts
CREATE POLICY "All authenticated can view active panic broadcasts"
ON panic_alerts_broadcast FOR SELECT
USING (auth.uid() IS NOT NULL AND status = 'active');

-- Fix 2: Allow marker owners to update their markers
CREATE POLICY "Users can update their own markers"
ON markers FOR UPDATE
USING (auth.uid() = user_id);

-- Fix 3-4: Clean up duplicate policies (requires DROP then re-CREATE)
-- user_locations: drop one of the duplicate INSERT/UPDATE pairs
-- notifications: drop one of the duplicate SELECT/UPDATE/DELETE pairs
```

---

## 4. REALTIME CONFIGURATION

### Tables that MUST be in `supabase_realtime` publication

Based on the migration at `20260210172357`, the following tables are already added:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.panic_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.markers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.safety_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_posts;
```

### Full realtime requirements

| Table | Events Needed | Subscriber | Reason |
|-------|---------------|------------|--------|
| `panic_sessions` | INSERT, UPDATE | Dispatcher, Map | Live panic tracking, status changes |
| `panic_location_logs` | INSERT | Map layer | Movement trail updates |
| `panic_alerts_broadcast` | INSERT, UPDATE | Map, Community | Show/hide panic markers on map |
| `alerts` | INSERT, UPDATE | Dispatcher, Alerts page | New incidents, status changes |
| `markers` | INSERT, UPDATE, DELETE | Map | Map marker CRUD |
| `safety_sessions` | INSERT, UPDATE | Dispatcher, Watchers | Trip monitoring |
| `chat_messages` | INSERT | Chat UI | Live chat in amber rooms |
| `notifications` | INSERT | NotificationBell, Dispatcher | Real-time notification badge |
| `user_locations` | INSERT, UPDATE | Map, UserLocationsList | Live user dots on map |
| `community_posts` | INSERT | Community feed | New posts appear |
| `alert_responders` | INSERT, UPDATE | Panic detail view | Responder ETA updates |

### Tables that should be ADDED to realtime

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.panic_location_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.panic_alerts_broadcast;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alert_responders;
```

### Tables that should NOT be realtime

| Table | Reason |
|-------|--------|
| `panic_audio_chunks` | Upload metadata, not live data |
| `panic_alerts` | Delivery log, not user-facing |
| `api_keys` | Admin only |
| `api_usage_logs` | Analytics only |
| `user_rate_limits` | Internal |
| `incident_types` | Static lookup |
| `authority_contacts` | Static directory |
| `authority_notifications` | Backend tracking |
| `notification_settings` | User settings, read on load |
| `push_subscriptions` | Backend-only |
| `marker_status_history` | Audit log |

---

## 5. EDGE FUNCTIONS

### 5.1 `panic-session` ✅ EXISTS
- **Trigger:** HTTP POST from frontend
- **Purpose:** Full panic lifecycle — start, update location, end
- **Reads:** `panic_sessions`, `profiles`, `watchers`, `push_subscriptions`
- **Writes:** `panic_sessions`, `panic_location_logs`, `panic_alerts`, `panic_alerts_broadcast`, `notifications`
- **External calls:** Twilio SMS, Resend email
- **Also:** Broadcasts to nearby users via `user_locations` geo-filter (5km)

### 5.2 `send-push-notification` ✅ EXISTS
- **Trigger:** HTTP POST (from dispatcher or other functions)
- **Purpose:** Fan out notifications to nearby users with geo-filtering and dedup
- **Reads:** `user_locations`, `notifications`
- **Writes:** `notifications`
- **Note:** Web Push sending via VAPID is stubbed — currently only creates in-app notifications

### 5.3 `send-incident-notification` ✅ EXISTS
- **Trigger:** HTTP POST from frontend after marker creation
- **Purpose:** Notify users within 10km of a new incident marker
- **Reads:** `user_locations`, `push_subscriptions`
- **Writes:** `notifications`

### 5.4 `get-mapbox-token` ✅ EXISTS
- **Trigger:** HTTP GET from frontend on map load
- **Purpose:** Securely serve the Mapbox public token
- **Reads:** Nothing
- **Writes:** Nothing
- **Auth:** Requires valid user token

### 5.5 `open-emergency-api` ✅ EXISTS
- **Trigger:** HTTP from external partners (API key auth)
- **Purpose:** External SOS API — create, update, resolve, get status
- **Reads:** `api_keys`, `panic_sessions`
- **Writes:** `panic_sessions`, `panic_location_logs`, `api_usage_logs`
- **Auth:** API key (SHA-256 hash comparison)

### 5.6 Functions that DO NOT exist but SHOULD

| Function Name | Trigger | Purpose | Status |
|---------------|---------|---------|--------|
| `format-location` | HTTP | Convert lat/lng to human-readable place name via Mapbox Geocoding API | **MISSING** |
| `cleanup-expired-markers` | Scheduled (cron) | Delete markers past `expires_at` | **MISSING** |
| `escalate-late-sessions` | Scheduled (cron) | Check `safety_sessions` with `status='active'` past `expected_arrival`, set to `late`/`escalated` | **MISSING** |
| `send-web-push` | Called by `send-push-notification` | Actual VAPID-signed Web Push delivery | **MISSING** (VAPID keys not configured) |

---

## 6. STORAGE BUCKETS

### 6.1 `audio-evidence` ✅ EXISTS
- **Public:** No (private)
- **Purpose:** Panic session audio recording chunks
- **MIME types:** `audio/webm`, `audio/ogg`
- **Access:** Upload via `panic-worker.js` service worker using user's JWT. Read by session owner + watchers.
- **Retention:** Permanent (evidence)

### 6.2 `post-images` ✅ EXISTS
- **Public:** Yes
- **Purpose:** Community post images
- **MIME types:** `image/jpeg`, `image/png`, `image/webp`
- **Access:** Upload by authenticated users, read by all

### 6.3 `profile-photos` ✅ EXISTS
- **Public:** Yes
- **Purpose:** User avatar images
- **MIME types:** `image/jpeg`, `image/png`, `image/webp`
- **Access:** Upload by own user, read by all

### 6.4 `outfit-photos` ✅ EXISTS
- **Public:** No (private)
- **Purpose:** Look After Me outfit photos
- **MIME types:** `image/jpeg`, `image/png`
- **Access:** Upload by session owner, read by session owner + watchers

### 6.5 Bucket that DOES NOT exist but MAY be needed

| Bucket | Purpose | Status |
|--------|---------|--------|
| `sighting-photos` | Chat message sighting photos (amber alerts) | **MISSING** — currently `chat_messages.sighting_photo_url` exists but no dedicated bucket. May be using `post-images` or external URLs. |

---

## 7. AUTH & ROLES

### Auth Configuration
- **Provider:** Email/password (standard Supabase Auth)
- **Auto-confirm:** Likely disabled (email verification required)
- **Anonymous users:** Not used
- **JWT claims:** Standard Supabase JWT with `sub` = user UUID

### Role Model
The app uses a **flat role model** — there is no `role` column on `profiles`. All users are equal with the following distinctions:

| Concept | Implementation |
|---------|---------------|
| **Ownership** | `auth.uid() = user_id` checks in RLS |
| **Watcher relationship** | `watchers` table with `status = 'accepted'` |
| **Ghost mode** | `profiles.ghost_mode` + `user_locations.ghost_mode` |
| **Authority** | Not implemented as a user role — `authority_contacts` is a static directory |

### Auth Triggers (DB Functions)

| Function | Trigger | Purpose |
|----------|---------|---------|
| `handle_new_user()` | AFTER INSERT on `auth.users` | Creates `profiles` row |
| `create_notification_settings_for_user()` | AFTER INSERT on `profiles` | Creates `notification_settings` row |
| `notify_watchers_on_panic()` | AFTER INSERT on `panic_sessions` | Sends in-app notifications to accepted watchers |
| `notify_on_alert_update()` | AFTER UPDATE on `alerts` | Notifies alert owner on status change |
| `notify_on_community_comment()` | AFTER INSERT on `community_comments` | Notifies post owner |
| `notify_on_community_reaction()` | AFTER INSERT on `community_reactions` | Notifies post owner |
| `notify_on_watcher_request()` | AFTER INSERT/UPDATE on `watchers` | Notifies watcher of request/response |
| `update_panic_location_from_log()` | AFTER INSERT on `panic_location_logs` | Syncs latest position to `panic_sessions` |
| `update_marker_verified_count()` | AFTER INSERT/UPDATE/DELETE on `marker_reactions` | Keeps `markers.verified_count` in sync |
| `update_marker_comment_count()` | AFTER INSERT/DELETE on `marker_comments` | Keeps `markers.comment_count` in sync |
| `update_user_location_timestamp()` | BEFORE UPDATE on `user_locations` | Sets `updated_at = now()` |
| `update_updated_at_column()` | BEFORE UPDATE on various tables | Generic timestamp updater |
| `update_post_likes_count()` | AFTER INSERT/DELETE on `post_likes` | Legacy posts |
| `update_post_comments_count()` | AFTER INSERT/DELETE on `comments` | Legacy posts |
| `update_post_likes_count_community()` | AFTER INSERT/DELETE on `community_reactions` | Community posts |
| `update_post_comments_count_community()` | AFTER INSERT/DELETE on `community_comments` | Community posts |

**⚠️ NOTE:** The `<db-triggers>` section says "There are no triggers in the database" — but the functions above are clearly designed as triggers. This likely means triggers were defined but the metadata query didn't return them. **Verify triggers are actually attached to tables.**

---

## 8. PUSH NOTIFICATION BACKEND

### Architecture

```
Frontend                           Backend
┌─────────────┐                   ┌──────────────────────┐
│ Browser      │                   │ Supabase             │
│              │                   │                      │
│ notification-│  Web Push API     │ push_subscriptions   │
│ worker.js   ◄────────────────────┤ (endpoint, p256dh,   │
│              │                   │  auth, user_id)      │
│              │                   │                      │
│ useNotifica- │  Realtime sub     │ notifications table  │
│ tionDispatch-◄────────────────────┤ (INSERT events)     │
│ er.ts        │                   │                      │
│              │                   │ send-push-notif.     │
│              │  HTTP POST        │ edge function        │
│              ├──────────────────►│ (geo-filter, dedup,  │
│              │                   │  fan-out)            │
└─────────────┘                   └──────────────────────┘
```

### Current State

| Component | Status |
|-----------|--------|
| `push_subscriptions` table | ✅ Exists |
| `notification-worker.js` service worker | ✅ Exists — handles `push`, `notificationclick` events |
| `useNotificationDispatcher` hook | ✅ Exists — listens to realtime, dispatches via `new Notification()` |
| `send-push-notification` edge function | ✅ Exists — geo-filters, dedup, creates `notifications` rows |
| VAPID key generation | ❌ Missing — no `VAPID_PUBLIC_KEY` or `VAPID_PRIVATE_KEY` secrets |
| Server-side Web Push sending | ❌ Missing — edge function stubs this section |
| `useServiceWorkerPush` hook | ✅ Exists — registers service worker, stores subscription |

### What's Missing for Real Web Push

1. **VAPID keys** — Need `VAPID_PUBLIC_KEY` (public, can be in frontend) and `VAPID_PRIVATE_KEY` (secret, edge function only)
2. **`web-push` library in edge function** — The `send-push-notification` function needs to actually call the Web Push endpoint using the stored subscription + VAPID signature
3. **Subscription cleanup** — No mechanism to remove stale/expired push subscriptions

### Notification Flow (Current)

1. DB event (INSERT on `panic_sessions`, `alerts`, `markers`, etc.)
2. Realtime subscription fires in `useNotificationDispatcher`
3. Hook applies rules (dedup, geo-filter, priority, throttle)
4. Creates row in `notifications` table
5. If tab not visible + permission granted → `new Notification()` (local, not Web Push)
6. `notification-worker.js` handles click routing

### Notification Flow (Target with VAPID)

1. DB event triggers
2. Edge function `send-push-notification` called (by DB webhook or other function)
3. Edge function geo-filters recipients, dedup checks
4. Creates `notifications` rows (in-app)
5. Fetches `push_subscriptions` for target users
6. Sends VAPID-signed Web Push to each endpoint
7. `notification-worker.js` receives push event, shows native notification
8. Click routes to correct deep link

---

## 9. GAP ANALYSIS

### Critical Gaps

| # | Gap | Impact | Fix |
|---|-----|--------|-----|
| 1 | `panic_alerts_broadcast` SELECT policy too restrictive | Nearby users can't see panic markers on map | Add community-wide SELECT for active broadcasts |
| 2 | `markers` missing UPDATE policy | Marker owners can't change status | Add UPDATE policy |
| 3 | VAPID keys not configured | No real Web Push when app is closed | Generate VAPID keypair, add as secrets |
| 4 | No scheduled function for expired markers | Expired markers stay on map forever | Add cron edge function |
| 5 | No scheduled function for late safety sessions | Users not alerted when trip is overdue | Add cron edge function |
| 6 | `panic_location_logs` not in realtime publication | Map can't show live movement trail | Add to `supabase_realtime` |
| 7 | `panic_alerts_broadcast` not in realtime publication | Map can't show new panic broadcasts | Add to `supabase_realtime` |
| 8 | DB triggers may not be attached | Functions exist but triggers section is empty | Verify all trigger attachments |
| 9 | Duplicate RLS policies on `user_locations` and `notifications` | Confusing, potential security issues | Clean up duplicates |

### Non-Critical Gaps

| # | Gap | Impact |
|---|-----|--------|
| 10 | No `format-location` edge function | Location names must be resolved client-side |
| 11 | No `sighting-photos` storage bucket | Amber chat photo uploads may fail |
| 12 | No authority role in user model | No elevated access for authorities |
| 13 | `conversations`/`messages` tables can't be created by users (no INSERT policy) | DM feature is read-only |

---

*Generated: 2026-02-10*
*Source: Live database schema, types.ts, edge function source code, service worker source code*
