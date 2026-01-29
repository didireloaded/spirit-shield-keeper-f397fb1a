/**
 * Map Engine State Hook
 * Manages the state machine for map interactions
 * Prevents data fetching during user/programmatic moves
 */

import { useState, useCallback } from "react";

export type MapEngineState =
  | "INIT"
  | "LOADING_LOCATION"
  | "IDLE"
  | "MOVING_USER"
  | "MOVING_PROGRAMMATIC"
  | "ERROR";

export function useMapEngineState() {
  const [state, setState] = useState<MapEngineState>("INIT");

  const startUserMove = useCallback(() => {
    setState((prev) =>
      prev === "MOVING_PROGRAMMATIC" ? prev : "MOVING_USER"
    );
  }, []);

  const startProgrammaticMove = useCallback(() => {
    setState("MOVING_PROGRAMMATIC");
  }, []);

  const endMove = useCallback(() => {
    setState("IDLE");
  }, []);

  const setError = useCallback(() => {
    setState("ERROR");
  }, []);

  const setLoading = useCallback(() => {
    setState("LOADING_LOCATION");
  }, []);

  const setIdle = useCallback(() => {
    setState("IDLE");
  }, []);

  return {
    state,
    startUserMove,
    startProgrammaticMove,
    endMove,
    setError,
    setLoading,
    setIdle,
    isIdle: state === "IDLE",
    isMoving: state === "MOVING_USER" || state === "MOVING_PROGRAMMATIC",
    isLoading: state === "LOADING_LOCATION" || state === "INIT",
  };
}
