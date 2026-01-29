/**
 * Selected Marker Hook
 * Manages the currently selected marker state
 * Supports preview (bottom sheet) and full detail modal states
 */

import { useState, useCallback } from "react";
import type { MapMarker } from "./useMapMarkers";

export type SelectionMode = "none" | "preview" | "detail";

interface SelectedMarkerState {
  marker: MapMarker | null;
  mode: SelectionMode;
}

export function useSelectedMarker() {
  const [state, setState] = useState<SelectedMarkerState>({
    marker: null,
    mode: "none",
  });

  const selectMarker = useCallback((marker: MapMarker, mode: SelectionMode = "preview") => {
    setState({ marker, mode });
  }, []);

  const showPreview = useCallback((marker: MapMarker) => {
    setState({ marker, mode: "preview" });
  }, []);

  const showDetail = useCallback((marker: MapMarker) => {
    setState({ marker, mode: "detail" });
  }, []);

  const promoteToDetail = useCallback(() => {
    setState((prev) => ({
      ...prev,
      mode: prev.marker ? "detail" : "none",
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setState({ marker: null, mode: "none" });
  }, []);

  const clearPreview = useCallback(() => {
    setState((prev) =>
      prev.mode === "preview" ? { marker: null, mode: "none" } : prev
    );
  }, []);

  return {
    selectedMarker: state.marker,
    selectionMode: state.mode,
    isPreviewOpen: state.mode === "preview",
    isDetailOpen: state.mode === "detail",
    hasSelection: state.marker !== null,
    selectMarker,
    showPreview,
    showDetail,
    promoteToDetail,
    clearSelection,
    clearPreview,
  };
}
