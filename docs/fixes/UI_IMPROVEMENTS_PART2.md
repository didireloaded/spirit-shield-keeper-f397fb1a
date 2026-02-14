# UI/UX Improvements Part 2 - Additional Screens & Components

## 5. Authorities Page Improvements

**Current Issues:**
- Plain list of numbers
- No visual categorization
- Unclear which to call when
- No quick dial feature

**Improvements:**

```typescript
// src/pages/Authorities.tsx - Enhanced

import { Phone, Shield, Ambulance, Flame, Building, AlertTriangle } from "lucide-react";

export default function Authorities() {
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-destructive/10 to-transparent px-4 pt-8 pb-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-destructive/10 rounded-2xl">
              <Shield className="w-7 h-7 text-destructive" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Emergency Contacts</h1>
              <p className="text-sm text-muted-foreground">Quick dial for help</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-6">
        {/* Priority Services - Large Cards */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
            EMERGENCY SERVICES
          </h2>
          
          <div className="space-y-3">
            <EmergencyCard
              icon={<Shield className="w-8 h-8" />}
              service="Police"
              number="10111"
              description="Crime, theft, assault"
              color="bg-blue-600"
              gradient="from-blue-600 to-blue-500"
            />
            
            <EmergencyCard
              icon={<Ambulance className="w-8 h-8" />}
              service="Ambulance"
              number="10177"
              description="Medical emergency"
              color="bg-red-600"
              gradient="from-red-600 to-red-500"
            />
            
            <EmergencyCard
              icon={<Flame className="w-8 h-8" />}
              service="Fire Department"
              number="10111"
              description="Fire, gas leak"
              color="bg-orange-600"
              gradient="from-orange-600 to-orange-500"
            />
          </div>
        </section>

        {/* Other Services - Compact Cards */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
            OTHER SERVICES
          </h2>
          
          <div className="bg-card rounded-2xl shadow-sm border border-border/50 divide-y divide-border/50">
            <ServiceRow
              icon={<Building className="w-5 h-5" />}
              service="City of Windhoek"
              number="+264 61 290 2000"
              iconBg="bg-purple-50"
              iconColor="text-purple-600"
            />
            <ServiceRow
              icon={<AlertTriangle className="w-5 h-5" />}
              service="Poison Control"
              number="10177"
              iconBg="bg-yellow-50"
              iconColor="text-yellow-600"
            />
            <ServiceRow
              icon={<Phone className="w-5 h-5" />}
              service="LifeLine Namibia"
              number="+264 61 232 221"
              iconBg="bg-green-50"
              iconColor="text-green-600"
            />
          </div>
        </section>

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <div className="flex gap-3">
            <div className="pt-0.5">
              <Phone className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">
                Quick Tip
              </h3>
              <p className="text-sm text-blue-800">
                Tap any number to call immediately. Your location is automatically shared with emergency services.
              </p>
            </div>
          </div>
        </div>

        {/* Private Security Companies */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
            PRIVATE SECURITY
          </h2>
          
          <div className="bg-card rounded-2xl shadow-sm border border-border/50 divide-y divide-border/50">
            <ServiceRow
              icon={<Shield className="w-5 h-5" />}
              service="Windhoek Security"
              number="+264 81 123 4567"
              iconBg="bg-gray-50"
              iconColor="text-gray-600"
              badge="Armed Response"
            />
            <ServiceRow
              icon={<Shield className="w-5 h-5" />}
              service="City Security"
              number="+264 81 765 4321"
              iconBg="bg-gray-50"
              iconColor="text-gray-600"
              badge="24/7"
            />
          </div>
        </section>
      </div>

      <BottomNav />
    </div>
  );
}

// Large emergency card
function EmergencyCard({ icon, service, number, description, gradient }: any) {
  return (
    <a
      href={`tel:${number}`}
      className="block bg-card rounded-2xl shadow-lg border border-border/50 overflow-hidden hover:shadow-xl transition-all active:scale-98"
    >
      <div className={`bg-gradient-to-br ${gradient} p-6`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="text-white/90 mb-2">{icon}</div>
            <h3 className="text-2xl font-bold text-white mb-1">{service}</h3>
            <p className="text-white/80 text-sm mb-4">{description}</p>
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
              <Phone className="w-4 h-4 text-white" />
              <span className="text-white font-mono font-semibold">{number}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-muted/30 text-center">
        <span className="text-sm font-medium text-muted-foreground">
          Tap to call immediately
        </span>
      </div>
    </a>
  );
}

// Compact service row
function ServiceRow({ icon, service, number, iconBg, iconColor, badge }: any) {
  return (
    <a
      href={`tel:${number}`}
      className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors group"
    >
      <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center ${iconColor} group-hover:scale-105 transition-transform`}>
        {icon}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold">{service}</span>
          {badge && (
            <Badge variant="secondary" className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground font-mono">{number}</div>
      </div>
      
      <div className="p-2 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
        <Phone className="w-5 h-5 text-primary" />
      </div>
    </a>
  );
}
```

---

## 6. Look After Me Page Improvements

**Current Issues:**
- Destination input is basic
- No visual trip status
- Hard to see watchers who are tracking
- No ETA visualization

**Improvements:**

```typescript
// src/pages/LookAfterMe.tsx - Enhanced

export default function LookAfterMe() {
  const [tripActive, setTripActive] = useState(false);
  const [destination, setDestination] = useState("");
  const [selectedWatchers, setSelectedWatchers] = useState<string[]>([]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 to-transparent px-4 pt-8 pb-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Navigation className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Look After Me</h1>
              <p className="text-sm text-muted-foreground">
                Share your journey with trusted watchers
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-6">
        {!tripActive ? (
          /* Start Trip Form */
          <>
            {/* Destination Input */}
            <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/50 space-y-4">
              <div>
                <label className="text-sm font-semibold text-muted-foreground mb-2 block">
                  Where are you going?
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Enter destination..."
                    className="w-full pl-12 pr-4 py-4 bg-muted rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                
                {/* Recent destinations */}
                <div className="mt-3 space-y-2">
                  <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium">Home</div>
                      <div className="text-xs text-muted-foreground">123 Main St, Windhoek</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                  
                  <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium">Work</div>
                      <div className="text-xs text-muted-foreground">456 Office Park</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>

            {/* Select Watchers */}
            <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/50">
              <h3 className="font-semibold mb-4">Who should watch your trip?</h3>
              
              <div className="space-y-2">
                <WatcherCheckbox
                  name="Mom"
                  avatar="/avatars/mom.jpg"
                  checked={selectedWatchers.includes("mom")}
                  onChange={() => toggleWatcher("mom")}
                />
                <WatcherCheckbox
                  name="John"
                  avatar="/avatars/john.jpg"
                  checked={selectedWatchers.includes("john")}
                  onChange={() => toggleWatcher("john")}
                  badge="Online"
                />
                <WatcherCheckbox
                  name="Sarah"
                  avatar="/avatars/sarah.jpg"
                  checked={selectedWatchers.includes("sarah")}
                  onChange={() => toggleWatcher("sarah")}
                />
              </div>
              
              <button className="w-full mt-4 py-2 text-sm text-primary font-medium hover:bg-primary/10 rounded-lg transition-colors">
                + Add Watcher
              </button>
            </div>

            {/* Start Button */}
            <button
              onClick={() => setTripActive(true)}
              disabled={!destination || selectedWatchers.length === 0}
              className="w-full bg-gradient-to-r from-primary to-primary/80 text-white rounded-2xl py-4 font-bold text-lg shadow-lg hover:shadow-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              <div className="flex items-center justify-center gap-2">
                <Navigation className="w-6 h-6" />
                <span>Start Tracking</span>
              </div>
            </button>
          </>
        ) : (
          /* Active Trip View */
          <>
            {/* Trip Status Card */}
            <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-white" />
                </div>
                <span className="font-semibold">Trip in Progress</span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-white/80 text-sm mb-1">Destination</div>
                  <div className="text-xl font-bold">{destination}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-white/80 text-sm mb-1">ETA</div>
                    <div className="text-2xl font-bold">12 min</div>
                  </div>
                  <div>
                    <div className="text-white/80 text-sm mb-1">Distance</div>
                    <div className="text-2xl font-bold">3.2 km</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-sm text-white/80 mb-2">
                    <span>Progress</span>
                    <span>65%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div className="bg-white rounded-full h-2 w-[65%] transition-all duration-300" />
                  </div>
                </div>
              </div>
            </div>

            {/* Watchers Tracking */}
            <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Tracking Your Trip</h3>
                <Badge variant="secondary">{selectedWatchers.length} watchers</Badge>
              </div>

              <div className="space-y-3">
                <WatcherStatus
                  name="Mom"
                  avatar="/avatars/mom.jpg"
                  status="Watching"
                  lastSeen="Just now"
                />
                <WatcherStatus
                  name="John"
                  avatar="/avatars/john.jpg"
                  status="Watching"
                  lastSeen="2 min ago"
                />
              </div>
            </div>

            {/* Live Map */}
            <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border/50">
              <div className="h-64 relative">
                <LiveTripMap />
                
                {/* Floating compass */}
                <div className="absolute top-4 left-4">
                  <div className="bg-card/95 backdrop-blur-sm rounded-xl p-3 shadow-lg">
                    <Compass className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </div>
            </div>

            {/* End Trip Button */}
            <button
              onClick={() => setTripActive(false)}
              className="w-full bg-card border-2 border-destructive text-destructive rounded-2xl py-4 font-bold text-lg hover:bg-destructive hover:text-white transition-all active:scale-95"
            >
              <div className="flex items-center justify-center gap-2">
                <StopCircle className="w-6 h-6" />
                <span>End Trip</span>
              </div>
            </button>

            {/* Emergency button always visible */}
            <button className="w-full bg-destructive text-white rounded-2xl py-4 font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-95">
              <div className="flex items-center justify-center gap-2">
                <AlertTriangle className="w-6 h-6" />
                <span>Emergency SOS</span>
              </div>
            </button>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

// Helper Components
function WatcherCheckbox({ name, avatar, checked, onChange, badge }: any) {
  return (
    <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted cursor-pointer transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-5 h-5 rounded border-2 border-border checked:bg-primary checked:border-primary"
      />
      
      <Avatar className="w-10 h-10 border-2 border-border">
        <AvatarImage src={avatar} />
        <AvatarFallback>{name[0]}</AvatarFallback>
      </Avatar>
      
      <div className="flex-1">
        <div className="font-medium">{name}</div>
        {badge && (
          <div className="flex items-center gap-1 mt-0.5">
            <div className="w-2 h-2 bg-success rounded-full" />
            <span className="text-xs text-muted-foreground">{badge}</span>
          </div>
        )}
      </div>
    </label>
  );
}

function WatcherStatus({ name, avatar, status, lastSeen }: any) {
  return (
    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
      <Avatar className="w-10 h-10 border-2 border-success">
        <AvatarImage src={avatar} />
        <AvatarFallback>{name[0]}</AvatarFallback>
      </Avatar>
      
      <div className="flex-1">
        <div className="font-medium">{name}</div>
        <div className="text-xs text-muted-foreground">{lastSeen}</div>
      </div>
      
      <div className="flex items-center gap-1 text-success">
        <Eye className="w-4 h-4" />
        <span className="text-sm font-medium">{status}</span>
      </div>
    </div>
  );
}
```

---

## 7. Watchers Page Improvements

**Current Issues:**
- Basic list
- No status indicators
- Unclear how to add watchers
- No grouping or categories

**Improvements:**

```typescript
// src/pages/Watchers.tsx - Enhanced

export default function Watchers() {
  const [activeTab, setActiveTab] = useState<"watching-me" | "i-watch">("watching-me");

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 to-transparent px-4 pt-8 pb-6">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold mb-2">My Watchers</h1>
          <p className="text-sm text-muted-foreground">
            Trusted people keeping you safe
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-6">
        {/* Tabs */}
        <div className="bg-muted p-1 rounded-xl flex gap-1">
          <TabButton
            active={activeTab === "watching-me"}
            onClick={() => setActiveTab("watching-me")}
            label="Watching Me"
            count={8}
          />
          <TabButton
            active={activeTab === "i-watch"}
            onClick={() => setActiveTab("i-watch")}
            label="I Watch"
            count={5}
          />
        </div>

        {/* Add Watcher Button */}
        <button className="w-full bg-card rounded-2xl p-4 shadow-sm border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all group">
          <div className="flex items-center justify-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <span className="font-semibold text-primary">Add New Watcher</span>
          </div>
        </button>

        {/* Watchers List */}
        {activeTab === "watching-me" ? (
          <div className="space-y-3">
            <WatcherCard
              name="Mom"
              phone="+264 81 234 5678"
              avatar="/avatars/mom.jpg"
              status="active"
              relationship="Family"
              canTrack={true}
              canReceiveAlerts={true}
            />
            
            <WatcherCard
              name="John Doe"
              phone="+264 81 765 4321"
              avatar="/avatars/john.jpg"
              status="active"
              relationship="Friend"
              canTrack={true}
              canReceiveAlerts={true}
              lastSeen="2 hours ago"
            />
            
            <WatcherCard
              name="Sarah Smith"
              phone="+264 81 987 6543"
              avatar="/avatars/sarah.jpg"
              status="pending"
              relationship="Colleague"
              canTrack={false}
              canReceiveAlerts={false}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <WatcherCard
              name="Dad"
              phone="+264 81 111 2222"
              avatar="/avatars/dad.jpg"
              status="active"
              relationship="Family"
              reversed
            />
            
            <WatcherCard
              name="Alex Wilson"
              phone="+264 81 333 4444"
              avatar="/avatars/alex.jpg"
              status="active"
              relationship="Friend"
              reversed
            />
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function TabButton({ active, onClick, label, count }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
        active
          ? 'bg-card text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        <span>{label}</span>
        <Badge variant={active ? "default" : "secondary"} className="text-xs">
          {count}
        </Badge>
      </div>
    </button>
  );
}

function WatcherCard({
  name,
  phone,
  avatar,
  status,
  relationship,
  canTrack,
  canReceiveAlerts,
  lastSeen,
  reversed = false
}: any) {
  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
      {/* Main Content */}
      <div className="p-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="relative">
            <Avatar className="w-14 h-14 border-2 border-border">
              <AvatarImage src={avatar} />
              <AvatarFallback>{name[0]}</AvatarFallback>
            </Avatar>
            {status === "active" && (
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-success rounded-full border-2 border-card" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold">{name}</h3>
              <Badge variant="secondary" className="text-xs">
                {relationship}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">{phone}</div>
            {lastSeen && (
              <div className="text-xs text-muted-foreground mt-1">
                Active {lastSeen}
              </div>
            )}
          </div>

          {/* Menu button */}
          <button className="p-2 hover:bg-muted rounded-lg transition-colors">
            <MoreVertical className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Permissions */}
        {!reversed && status === "active" && (
          <div className="flex gap-2">
            <PermissionBadge
              icon={<MapPin className="w-3 h-3" />}
              label="Can track"
              enabled={canTrack}
            />
            <PermissionBadge
              icon={<Bell className="w-3 h-3" />}
              label="Gets alerts"
              enabled={canReceiveAlerts}
            />
          </div>
        )}

        {/* Pending status */}
        {status === "pending" && (
          <div className="flex gap-2">
            <button className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              Approve
            </button>
            <button className="flex-1 bg-muted text-muted-foreground py-2 rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors">
              Decline
            </button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {status === "active" && (
        <div className="border-t border-border/50 bg-muted/30 px-4 py-3 flex gap-2">
          <ActionButton icon={<MessageCircle className="w-4 h-4" />} label="Message" />
          <ActionButton icon={<Phone className="w-4 h-4" />} label="Call" />
          {!reversed && <ActionButton icon={<MapPin className="w-4 h-4" />} label="Share Location" />}
        </div>
      )}
    </div>
  );
}

function PermissionBadge({ icon, label, enabled }: any) {
  return (
    <div
      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
        enabled
          ? 'bg-success/10 text-success'
          : 'bg-muted text-muted-foreground'
      }`}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

function ActionButton({ icon, label }: any) {
  return (
    <button className="flex-1 flex items-center justify-center gap-1.5 py-2 hover:bg-muted rounded-lg transition-colors text-sm font-medium text-muted-foreground hover:text-foreground">
      {icon}
      <span>{label}</span>
    </button>
  );
}
```

---

## 8. Enhanced Components

### Better Alert/Incident Cards

```typescript
// src/components/EnhancedIncidentCard.tsx

export function EnhancedIncidentCard({ incident }: { incident: any }) {
  const getSeverityColor = (type: string) => {
    const colors: Record<string, any> = {
      panic: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", icon: "text-red-600" },
      theft: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", icon: "text-purple-600" },
      accident: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", icon: "text-orange-600" },
      suspicious: { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700", icon: "text-yellow-600" },
      default: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700", icon: "text-gray-600" },
    };
    return colors[type] || colors.default;
  };

  const getIcon = (type: string) => {
    const icons: Record<string, any> = {
      panic: AlertTriangle,
      theft: ShoppingBag,
      accident: Car,
      suspicious: Eye,
      fire: Flame,
    };
    const Icon = icons[type] || AlertCircle;
    return <Icon className="w-5 h-5" />;
  };

  const colors = getSeverityColor(incident.incident_type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden hover:shadow-md transition-all"
    >
      {/* Header with colored accent */}
      <div className={`${colors.bg} ${colors.border} border-b p-4`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 bg-white rounded-xl ${colors.icon}`}>
            {getIcon(incident.incident_type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`font-bold ${colors.text} capitalize`}>
                {incident.incident_type}
              </h3>
              {incident.verification_status === "verified" && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Verified
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{formatDistanceToNow(new Date(incident.created_at))} ago</span>
              <span>·</span>
              <MapPin className="w-3 h-3" />
              <span>1.2km away</span>
            </div>
          </div>

          <Badge className={`${colors.bg} ${colors.text} border-0`}>
            ACTIVE
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-foreground/80 line-clamp-2 mb-4">
          {incident.description}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>{incident.views || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{incident.confirmation_count} confirmed</span>
          </div>
        </div>

        {/* Reporter info */}
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl">
          <Avatar className="w-8 h-8 border-2 border-border">
            <AvatarImage src={incident.user?.avatar} />
            <AvatarFallback>{incident.user?.name?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">
              Reported by {incident.user?.name}
            </div>
            <div className="flex items-center gap-1">
              <CredibilityBadge score={incident.user?.credibility_score} compact />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-border/50 px-4 py-3 flex gap-2">
        <button className="flex-1 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors">
          View Details
        </button>
        <button className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors">
          <Share2 className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </motion.div>
  );
}
```

---

## Continue to Part 3 for:
- Animation improvements
- Loading states
- Empty states
- Toast notifications
- Bottom navigation enhancements
- Accessibility features
- Dark mode refinements
