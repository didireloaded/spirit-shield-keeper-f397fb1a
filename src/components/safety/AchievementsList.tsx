/**
 * Achievements Display Component
 * Shows earned achievements in profile
 */

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Star, Shield, Eye, Heart } from "lucide-react";
import { useAchievements } from "@/hooks/useAchievements";
import { formatDistanceToNow } from "date-fns";

const achievementIcons: Record<string, typeof Trophy> = {
  first_verification: Shield,
  ten_verifications: Eye,
  first_checkin: Heart,
  community_responder: Star,
};

export function AchievementsList() {
  const { achievements, loading, refetch } = useAchievements();

  useEffect(() => { refetch(); }, [refetch]);

  if (loading) return null;

  if (achievements.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h3 className="font-semibold text-sm">Achievements</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Help the community by verifying incidents and checking in to earn recognition.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Trophy className="w-4 h-4 text-amber-400" />
        <h3 className="font-semibold text-sm">Achievements ({achievements.length})</h3>
      </div>

      <div className="space-y-2">
        {achievements.map(achievement => {
          const Icon = achievementIcons[achievement.achievement_type] || Star;
          return (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="p-1.5 bg-amber-400/10 rounded-lg">
                <Icon className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{achievement.title}</p>
                <p className="text-xs text-muted-foreground">{achievement.description}</p>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(achievement.earned_at), { addSuffix: true })}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
