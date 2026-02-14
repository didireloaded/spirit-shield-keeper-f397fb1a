# UI/UX Improvements for Spirit Shield Keeper

## Overview
Comprehensive design improvements for all screens to create a modern, professional, and user-friendly safety app. Focus on: clean design, intuitive navigation, accessibility, mobile-first approach, and Namibian context.

---

## 🎨 Design System Improvements

### Color Palette Enhancement

```css
/* src/index.css - Update these variables */

:root {
  /* Primary colors - Safety theme */
  --primary: 217 91% 60%;        /* Blue - Trust, Safety */
  --primary-foreground: 0 0% 100%;
  
  /* Accent colors for alert types */
  --success: 142 76% 45%;        /* Green - Safe/Verified */
  --warning: 38 92% 50%;         /* Amber - Caution */
  --destructive: 0 84% 60%;      /* Red - Danger/Panic */
  
  /* Semantic colors */
  --info: 199 89% 48%;           /* Blue - Information */
  --verified: 158 64% 52%;       /* Teal - Verified badge */
  
  /* Neutral colors - Better contrast */
  --background: 0 0% 98%;
  --foreground: 222 47% 11%;
  --card: 0 0% 100%;
  --card-foreground: 222 47% 11%;
  --muted: 210 40% 96%;
  --muted-foreground: 215 16% 47%;
  --border: 214 32% 91%;
  
  /* Shadows for depth */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-md: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 20px 25px -5px rgb(0 0 0 / 0.1);
}

.dark {
  --background: 222 47% 11%;
  --foreground: 210 40% 98%;
  --card: 222 47% 14%;
  --card-foreground: 210 40% 98%;
  --muted: 217 33% 17%;
  --muted-foreground: 215 20% 65%;
  --border: 217 33% 17%;
}
```

### Typography System

```css
/* Better font hierarchy */
.text-display {
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.text-h1 {
  font-size: 1.875rem;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.01em;
}

.text-h2 {
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.4;
}

.text-h3 {
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.4;
}

.text-body {
  font-size: 1rem;
  line-height: 1.6;
}

.text-small {
  font-size: 0.875rem;
  line-height: 1.5;
}

.text-tiny {
  font-size: 0.75rem;
  line-height: 1.4;
}
```

### Spacing Scale

```css
/* Consistent spacing */
--spacing-xs: 0.25rem;   /* 4px */
--spacing-sm: 0.5rem;    /* 8px */
--spacing-md: 1rem;      /* 16px */
--spacing-lg: 1.5rem;    /* 24px */
--spacing-xl: 2rem;      /* 32px */
--spacing-2xl: 3rem;     /* 48px */
--spacing-3xl: 4rem;     /* 64px */
```

---

## 📱 Screen-by-Screen Improvements

### 1. Alerts Page (Homepage)

**Current Issues:**
- Stats cards look basic
- Panic buttons need more visual hierarchy
- Map legend is text-heavy
- No empty state

**Improvements:**

```typescript
// src/pages/Alerts.tsx - Enhanced version

import { AlertCircle, Shield, Clock, MapPin, Users, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function Alerts() {
  const { alerts, loading } = useAlerts();
  const activeAlerts = alerts.filter(a => a.status === "active");
  const last24h = alerts.filter(a => 
    new Date(a.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 pb-24">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-4 pt-8 pb-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Spirit Shield</h1>
              <p className="text-sm text-muted-foreground">Community Alerts</p>
            </div>
          </div>
          
          {/* Live status indicator */}
          <div className="flex items-center gap-2 mt-4">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-success" />
            </div>
            <span className="text-sm font-medium">Live updates active</span>
          </div>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 -mt-4">
        {/* Improved Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatsCard
            icon={<AlertCircle className="w-5 h-5" />}
            value={activeAlerts.length}
            label="Active"
            color="text-destructive"
            bgColor="bg-destructive/10"
            trend="+2 today"
          />
          <StatsCard
            icon={<Clock className="w-5 h-5" />}
            value={last24h.length}
            label="Last 24h"
            color="text-warning"
            bgColor="bg-warning/10"
          />
          <StatsCard
            icon={<Users className="w-5 h-5" />}
            value="512"
            label="Watching"
            color="text-success"
            bgColor="bg-success/10"
          />
        </div>

        {/* Emergency Actions - Redesigned */}
        <div className="bg-card rounded-2xl p-6 shadow-md border border-border/50 mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-4">
            EMERGENCY ACTIONS
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Panic Button - Premium style */}
            <button className="group relative overflow-hidden bg-gradient-to-br from-destructive to-destructive/80 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95">
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 text-white text-center">
                <div className="w-12 h-12 mx-auto mb-3 bg-white/20 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="text-xl font-bold mb-1">SOS</div>
                <div className="text-xs opacity-90">Emergency</div>
              </div>
            </button>

            {/* Amber Alert - Premium style */}
            <button className="group relative overflow-hidden bg-gradient-to-br from-warning to-warning/80 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95">
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 text-white text-center">
                <div className="w-12 h-12 mx-auto mb-3 bg-white/20 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <div className="text-xl font-bold mb-1">Amber</div>
                <div className="text-xs opacity-90">Missing Person</div>
              </div>
            </button>
          </div>
        </div>

        {/* Mini Map with better styling */}
        <div className="bg-card rounded-2xl overflow-hidden shadow-md border border-border/50 mb-6">
          <div className="p-4 bg-muted/50 border-b border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Nearby Incidents</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {markers.length} active
            </Badge>
          </div>
          
          <div className="relative h-64">
            <MiniMap markers={markers} userLocation={userLocation} />
            
            {/* Floating legend */}
            <div className="absolute bottom-3 left-3 right-3">
              <div className="bg-card/95 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-border/50">
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <LegendItem color="bg-red-500" label="Panic" />
                  <LegendItem color="bg-purple-500" label="Robbery" />
                  <LegendItem color="bg-orange-500" label="Accident" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Feed */}
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Live Feed</h2>
            <button className="text-sm text-primary font-medium hover:underline">
              View all
            </button>
          </div>

          {loading ? (
            <FeedSkeleton />
          ) : activeAlerts.length === 0 ? (
            <EmptyState />
          ) : (
            <LivePanicFeed />
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

// Helper Components
function StatsCard({ icon, value, label, color, bgColor, trend }: any) {
  return (
    <div className="bg-card rounded-xl p-4 shadow-sm border border-border/50">
      <div className={`w-8 h-8 ${bgColor} rounded-lg flex items-center justify-center mb-2`}>
        <div className={color}>{icon}</div>
      </div>
      <div className="text-2xl font-bold mb-0.5">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {trend && (
        <div className="flex items-center gap-1 mt-1">
          <TrendingUp className="w-3 h-3 text-success" />
          <span className="text-xs text-success">{trend}</span>
        </div>
      )}
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <span className="text-foreground/80">{label}</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-card rounded-2xl p-12 text-center border-2 border-dashed border-border">
      <div className="w-16 h-16 mx-auto mb-4 bg-success/10 rounded-full flex items-center justify-center">
        <Shield className="w-8 h-8 text-success" />
      </div>
      <h3 className="font-semibold text-lg mb-2">All Clear!</h3>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
        No active alerts in your area right now. Your community is safe.
      </p>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-card rounded-xl p-4 border border-border/50">
          <div className="flex gap-3">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

### 2. Map Page Improvements

**Current Issues:**
- Controls are scattered
- No clear visual hierarchy
- Hard to find report button
- Legend could be clearer

**Improvements:**

```typescript
// src/pages/Map.tsx - Enhanced mobile controls

export default function Map() {
  return (
    <div className="relative h-screen w-screen">
      {/* Full-screen map */}
      <MapboxMap {...mapProps} />

      {/* Floating Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none">
        <div className="max-w-2xl mx-auto pointer-events-auto">
          {/* Search bar with shadow */}
          <div className="bg-card/95 backdrop-blur-md rounded-2xl shadow-lg border border-border/50 overflow-hidden">
            <MapSearchBar />
          </div>
        </div>
      </div>

      {/* Right side controls stack */}
      <div className="absolute right-4 top-24 flex flex-col gap-3 pointer-events-none">
        {/* Location button */}
        <button className="pointer-events-auto w-12 h-12 bg-card/95 backdrop-blur-md rounded-xl shadow-lg border border-border/50 flex items-center justify-center hover:bg-accent transition-colors">
          <Crosshair className="w-5 h-5" />
        </button>

        {/* Layers button */}
        <button className="pointer-events-auto w-12 h-12 bg-card/95 backdrop-blur-md rounded-xl shadow-lg border border-border/50 flex items-center justify-center hover:bg-accent transition-colors">
          <Layers className="w-5 h-5" />
        </button>

        {/* Zoom controls */}
        <div className="pointer-events-auto bg-card/95 backdrop-blur-md rounded-xl shadow-lg border border-border/50 overflow-hidden">
          <button className="w-12 h-12 flex items-center justify-center hover:bg-accent transition-colors border-b border-border/50">
            <Plus className="w-5 h-5" />
          </button>
          <button className="w-12 h-12 flex items-center justify-center hover:bg-accent transition-colors">
            <Minus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bottom sheet with incidents */}
      <div className="absolute bottom-20 left-0 right-0 pointer-events-none">
        <div className="pointer-events-auto">
          <BottomSheet />
        </div>
      </div>

      {/* Floating Report Button - Prominent */}
      <button className="absolute bottom-32 right-4 w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
        <Plus className="w-7 h-7 text-white" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full border-2 border-white" />
      </button>

      <BottomNav />
    </div>
  );
}

// Bottom Sheet Component
function BottomSheet() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ y: 400 }}
      animate={{ y: isExpanded ? 0 : 300 }}
      className="bg-card rounded-t-3xl shadow-2xl border-t border-border/50 max-h-[80vh] flex flex-col"
    >
      {/* Handle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full py-3 flex justify-center"
      >
        <div className="w-12 h-1 bg-border rounded-full" />
      </button>

      {/* Header */}
      <div className="px-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Nearby Incidents</h2>
          <Badge variant="destructive">3 active</Badge>
        </div>
        
        {/* Quick filters */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <FilterChip label="All" active />
          <FilterChip label="Theft" />
          <FilterChip label="Accident" />
          <FilterChip label="Suspicious" />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <IncidentList />
      </div>
    </motion.div>
  );
}

function FilterChip({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <button
      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      }`}
    >
      {label}
    </button>
  );
}
```

---

### 3. Community Page Improvements

**Current Issues:**
- Posts look plain
- No user avatars/credibility visible
- Hard to distinguish post types
- No engagement indicators

**Improvements:**

```typescript
// src/pages/Community.tsx - Enhanced

export default function Community() {
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header with gradient */}
      <div className="bg-gradient-to-br from-primary/10 to-transparent px-4 pt-8 pb-6 sticky top-0 z-10 backdrop-blur-md border-b border-border/50">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">Community</h1>
          <p className="text-sm text-muted-foreground">
            Connect with neighbors, share safety tips
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Create post card */}
        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/50">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={user.avatar} />
              <AvatarFallback>{user.name[0]}</AvatarFallback>
            </Avatar>
            <button className="flex-1 bg-muted rounded-full px-4 py-2.5 text-left text-sm text-muted-foreground hover:bg-muted/80 transition-colors">
              What's happening in your area?
            </button>
          </div>
        </div>

        {/* Posts feed */}
        {posts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      <BottomNav />
    </div>
  );
}

// Enhanced Post Card
function PostCard({ post }: { post: any }) {
  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <Avatar className="w-11 h-11 border-2 border-primary/20">
            <AvatarImage src={post.user.avatar} />
            <AvatarFallback>{post.user.name[0]}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{post.user.name}</span>
              {post.user.is_verified && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Verified
                </Badge>
              )}
              <CredibilityBadge score={post.user.credibility_score} />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <Clock className="w-3 h-3" />
              <span>{formatDistanceToNow(new Date(post.created_at))} ago</span>
              {post.location && (
                <>
                  <span>·</span>
                  <MapPin className="w-3 h-3" />
                  <span>{post.location}</span>
                </>
              )}
            </div>
          </div>

          {/* Menu button */}
          <button className="p-1 hover:bg-muted rounded-lg transition-colors">
            <MoreVertical className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        {post.title && (
          <h3 className="font-semibold text-lg mb-1">{post.title}</h3>
        )}
        <p className="text-foreground/90 whitespace-pre-wrap">{post.content}</p>
        
        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {post.tags.map((tag: string) => (
              <span key={tag} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Image */}
      {post.image_url && (
        <div className="relative">
          <img
            src={post.image_url}
            alt="Post image"
            className="w-full h-64 object-cover"
          />
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3 border-t border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <ActionButton
            icon={<ThumbsUp className="w-4 h-4" />}
            label={post.likes_count}
            active={post.user_has_liked}
          />
          <ActionButton
            icon={<MessageCircle className="w-4 h-4" />}
            label={post.comments_count}
          />
          <ActionButton
            icon={<Share2 className="w-4 h-4" />}
            label="Share"
          />
        </div>
        
        <button className="p-2 hover:bg-muted rounded-lg transition-colors">
          <Bookmark className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

function ActionButton({ icon, label, active = false }: any) {
  return (
    <button
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
        active
          ? 'bg-primary/10 text-primary'
          : 'hover:bg-muted text-muted-foreground'
      }`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
```

---

### 4. Profile Page Improvements

**Current Issues:**
- Looks basic
- No visual interest
- Stats presentation is flat

**Improvements:**

```typescript
// src/pages/Profile.tsx - Enhanced

export default function Profile() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero section with gradient */}
      <div className="bg-gradient-to-br from-primary via-primary/80 to-primary/60 px-4 pt-12 pb-24 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        {/* Settings button */}
        <button className="absolute top-4 right-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
          <Settings className="w-5 h-5 text-white" />
        </button>

        {/* Profile content */}
        <div className="relative z-10 max-w-lg mx-auto text-center text-white">
          <div className="relative inline-block mb-4">
            <Avatar className="w-24 h-24 border-4 border-white shadow-xl">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="text-2xl">{user.name[0]}</AvatarFallback>
            </Avatar>
            
            {/* Edit button */}
            <button className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg hover:scale-105 transition-transform">
              <Camera className="w-4 h-4 text-primary" />
            </button>
          </div>

          <h1 className="text-2xl font-bold mb-1">{user.name}</h1>
          <p className="text-white/80 mb-4">{user.email}</p>
          
          {/* Credibility badge - prominent */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full">
            <Shield className="w-4 h-4" />
            <span className="font-semibold">{user.credibility_score}/100</span>
            <span className="text-white/80">Credibility</span>
          </div>
        </div>
      </div>

      {/* Stats cards - overlapping hero */}
      <div className="max-w-lg mx-auto px-4 -mt-16 relative z-20 mb-6">
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={<FileText className="w-5 h-5" />}
            value="24"
            label="Reports"
            color="text-blue-600"
            bgColor="bg-blue-50"
          />
          <StatCard
            icon={<CheckCircle className="w-5 h-5" />}
            value="22"
            label="Verified"
            color="text-green-600"
            bgColor="bg-green-50"
          />
          <StatCard
            icon={<Users className="w-5 h-5" />}
            value="8"
            label="Watchers"
            color="text-purple-600"
            bgColor="bg-purple-50"
          />
        </div>
      </div>

      {/* Content sections */}
      <div className="max-w-lg mx-auto px-4 space-y-4">
        {/* Quick actions */}
        <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
          <div className="p-4 bg-muted/50 border-b border-border/50">
            <h2 className="font-semibold">Quick Actions</h2>
          </div>
          <div className="divide-y divide-border/50">
            <MenuItem
              icon={<Users className="w-5 h-5" />}
              title="My Watchers"
              subtitle="8 people watching your safety"
              badge="3 new"
            />
            <MenuItem
              icon={<MapPin className="w-5 h-5" />}
              title="Safety Zones"
              subtitle="Home, Work, School"
            />
            <MenuItem
              icon={<Bell className="w-5 h-5" />}
              title="Notifications"
              subtitle="Manage your alerts"
            />
          </div>
        </div>

        {/* Activity */}
        <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
          <div className="p-4 bg-muted/50 border-b border-border/50">
            <h2 className="font-semibold">Recent Activity</h2>
          </div>
          <div className="p-4 space-y-3">
            <ActivityItem
              icon={<FileText className="w-4 h-4 text-primary" />}
              title="Reported suspicious activity"
              time="2 hours ago"
              verified
            />
            <ActivityItem
              icon={<Users className="w-4 h-4 text-success" />}
              title="Added John as watcher"
              time="1 day ago"
            />
            <ActivityItem
              icon={<MapPin className="w-4 h-4 text-warning" />}
              title="Created safety zone: Home"
              time="3 days ago"
            />
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

function StatCard({ icon, value, label, color, bgColor }: any) {
  return (
    <div className="bg-card rounded-xl p-4 shadow-lg border border-border/50">
      <div className={`w-10 h-10 ${bgColor} rounded-xl flex items-center justify-center mb-3`}>
        <div className={color}>{icon}</div>
      </div>
      <div className="text-2xl font-bold mb-0.5">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function MenuItem({ icon, title, subtitle, badge }: any) {
  return (
    <button className="w-full px-4 py-4 flex items-center gap-3 hover:bg-muted/50 transition-colors">
      <div className="p-2 bg-primary/10 rounded-lg text-primary">
        {icon}
      </div>
      <div className="flex-1 text-left">
        <div className="font-medium">{title}</div>
        <div className="text-sm text-muted-foreground">{subtitle}</div>
      </div>
      {badge && (
        <Badge variant="destructive" className="text-xs">
          {badge}
        </Badge>
      )}
      <ChevronRight className="w-5 h-5 text-muted-foreground" />
    </button>
  );
}

function ActivityItem({ icon, title, time, verified = false }: any) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 bg-muted rounded-lg">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{title}</span>
          {verified && <ShieldCheck className="w-4 h-4 text-success" />}
        </div>
        <div className="text-xs text-muted-foreground">{time}</div>
      </div>
    </div>
  );
}
```

---

## 🎯 Continue in next file...

This is getting long. Should I create additional files for:
- Authorities page improvements
- Look After Me page improvements
- Component library enhancements
- Animation & transition improvements
- Accessibility improvements
- Dark mode refinements
