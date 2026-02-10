/**
 * Centralized Real-Time Streams
 * Single import point for all data contract streams
 * 
 * DATA VISIBILITY MATRIX:
 * | Data Type        | Map | Community | Real-Time |
 * |------------------|-----|-----------|-----------|
 * | Panic Alert      | Yes | Yes       | Yes       |
 * | Incident Report  | Yes | Yes       | Yes       |
 * | Amber Alert      | No  | Yes       | Yes       |
 * | Look After Me    | Yes | No        | Yes       |
 * | User Presence    | Yes | No        | Yes       |
 */

export { useUserPresenceStream, type UserPresence } from "./useUserPresenceStream";
export { usePanicAlertStream, type PanicAlertData } from "./usePanicAlertStream";
export { useIncidentStream, type IncidentData } from "./useIncidentStream";
export { useLookAfterMeStream, type LookAfterMeSession } from "./useLookAfterMeStream";
export { useCommunityMessageStream, type CommunityMessage } from "./useCommunityMessageStream";
