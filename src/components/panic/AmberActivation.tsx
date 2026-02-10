import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Users, Camera, Send, MapPin, X, Phone } from "lucide-react";
import { useAmberAlert } from "@/hooks/useAmberAlert";
import { useNavigate } from "react-router-dom";

interface IncidentType {
  id: string;
  category: string;
  name: string;
  icon: string;
  color: string;
}

interface Props {
  incident: IncidentType;
  onBack: () => void;
}

export function AmberActivation({ incident, onBack }: Props) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    description: "",
    outfit: "",
    vehicle: "",
    color: "",
    plate: "",
  });
  const [photo, setPhoto] = useState<File | null>(null);

  const {
    alert,
    isActive,
    chatRoom,
    participants,
    createAlert,
    endAlert,
  } = useAmberAlert(incident);

  const handleActivate = async () => {
    if (!formData.description) {
      return;
    }
    await createAlert({ ...formData, photo });
  };

  if (isActive && alert) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-4 w-full max-w-md"
      >
        {/* Active banner */}
        <div className="w-full bg-warning/10 border-2 border-warning/30 rounded-xl p-4">
          <p className="font-bold text-warning text-center mb-2">🚨 AMBER ALERT ACTIVE</p>
          <p className="text-sm text-center text-muted-foreground">{incident.name}</p>
        </div>

        {/* Chat link */}
        {chatRoom && (
          <button
            onClick={() => navigate(`/amber-chat/${chatRoom.id}`)}
            className="w-full p-4 bg-primary text-primary-foreground rounded-xl flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6" />
              <div className="text-left">
                <p className="font-bold">Join Community Chat</p>
                <p className="text-xs opacity-90">{participants} people helping</p>
              </div>
            </div>
            <span className="text-2xl">→</span>
          </button>
        )}

        {/* Details */}
        <div className="w-full bg-card rounded-xl p-4">
          <h3 className="font-semibold mb-3">Alert Details</h3>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>{formData.description}</p>
            {formData.outfit && <p><strong>Outfit:</strong> {formData.outfit}</p>}
            {formData.vehicle && <p><strong>Vehicle:</strong> {formData.vehicle} ({formData.color})</p>}
            {formData.plate && <p><strong>Plate:</strong> {formData.plate}</p>}
          </div>
        </div>

        <div className="w-full space-y-2">
          <a
            href="tel:10111"
            className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <Phone className="w-5 h-5" />
            Call Emergency Services
          </a>
          <button
            onClick={() => endAlert()}
            className="w-full py-3 bg-secondary rounded-xl font-medium"
          >
            Mark as Resolved
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-4 w-full max-w-md"
    >
      {/* Header */}
      <div className="bg-card rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{incident.icon}</div>
          <div>
            <p className="font-semibold">{incident.name}</p>
            <button onClick={onBack} className="text-xs text-primary hover:underline">Change</button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-card rounded-xl p-4 space-y-4">
        <h3 className="font-semibold">Alert Details</h3>

        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Description *</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe the person (age, height, features, etc.)"
            className="w-full px-4 py-3 bg-secondary rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-warning/50"
            rows={3}
            style={{ fontSize: "16px" }}
          />
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Outfit Description</label>
          <input
            type="text"
            value={formData.outfit}
            onChange={(e) => setFormData({ ...formData, outfit: e.target.value })}
            placeholder="Blue jeans, red hoodie, white sneakers"
            className="w-full px-4 py-3 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-warning/50"
            style={{ fontSize: "16px" }}
          />
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Vehicle Info (optional)</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={formData.vehicle}
              onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
              placeholder="Toyota Corolla"
              className="px-4 py-3 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-warning/50"
              style={{ fontSize: "16px" }}
            />
            <input
              type="text"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              placeholder="Silver"
              className="px-4 py-3 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-warning/50"
              style={{ fontSize: "16px" }}
            />
          </div>
          <input
            type="text"
            value={formData.plate}
            onChange={(e) => setFormData({ ...formData, plate: e.target.value })}
            placeholder="License plate"
            className="w-full px-4 py-3 bg-secondary rounded-xl mt-2 focus:outline-none focus:ring-2 focus:ring-warning/50"
            style={{ fontSize: "16px" }}
          />
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Photo (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files?.[0] || null)}
            className="hidden"
            id="amber-photo-upload"
          />
          <label
            htmlFor="amber-photo-upload"
            className="w-full py-4 bg-secondary rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-secondary/80 transition-colors"
          >
            <Camera className="w-5 h-5" />
            <span className="text-sm font-medium">
              {photo ? photo.name : "Upload Photo"}
            </span>
          </label>
        </div>
      </div>

      {/* Activate */}
      <button
        onClick={handleActivate}
        disabled={!formData.description}
        className="w-full py-4 bg-warning text-warning-foreground rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Send className="w-5 h-5" />
        Issue Amber Alert
      </button>

      <button
        onClick={onBack}
        className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Back
      </button>
    </motion.div>
  );
}
