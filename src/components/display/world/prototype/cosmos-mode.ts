/** This route is permanently fictional. Query parameters cannot select live data. */
export function isCosmosPrototypePath(path: string) {
  return path === "/display/cosmos-prototype" || path === "/display/cosmos-prototype/";
}

export function isCosmosPrototype() {
  return typeof window !== "undefined" && isCosmosPrototypePath(window.location.pathname);
}

export const COSMOS_CENTER = [8, 26, -112] as const;
