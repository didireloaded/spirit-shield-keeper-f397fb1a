/**
 * Map Search Bar
 * Floating search input for location search
 * Blurred glass effect for modern look
 */

import { Search, X } from "lucide-react";
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";

interface MapSearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export function MapSearchBar({
  onSearch,
  placeholder = "Search location...",
  className = "",
}: MapSearchBarProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = useCallback(() => {
    setQuery("");
    onSearch?.("");
  }, [onSearch]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSearch?.(query);
    },
    [query, onSearch]
  );

  return (
    <motion.form
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className={`relative ${className}`}
    >
      <div
        className={`
          relative flex items-center
          bg-card/80 backdrop-blur-md
          border border-border/50
          rounded-xl shadow-lg
          transition-all duration-200
          ${isFocused ? "ring-2 ring-primary/30 border-primary/50" : ""}
        `}
      >
        <div className="pl-4 text-muted-foreground">
          <Search className="w-4 h-4" />
        </div>
        
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="
            flex-1 h-11 border-0 bg-transparent
            placeholder:text-muted-foreground/60
            focus-visible:ring-0 focus-visible:ring-offset-0
          "
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="pr-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.form>
  );
}

export default MapSearchBar;
