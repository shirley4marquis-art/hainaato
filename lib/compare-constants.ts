// Split out of app/compare-store.ts (which imports useSyncExternalStore and
// therefore can't be imported from server code like API routes) so both the
// client store and the server-side /api/compare route can share this value.
export const COMPARE_MAX = 4;
