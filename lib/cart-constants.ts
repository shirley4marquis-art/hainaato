// Split out of app/cart-store.ts (which imports useSyncExternalStore and
// therefore can't be imported from server code like API routes) so both the
// client store and the server-side /api/cart route can share this value.
export const CART_MAX = 12;
