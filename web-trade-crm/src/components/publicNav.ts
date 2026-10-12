import {
  chatbubbleOutline,
  documentTextOutline,
  flaskOutline,
  homeOutline,
} from "ionicons/icons";

/**
 * Shared config for the public (unauthenticated) nav surfaces: `PublicHeader`
 * (the responsive bar — inline links on desktop, hamburger on mobile) and
 * `PublicMenu` (the Ionic drawer the hamburger opens). Keep the item list here
 * so the two never drift.
 */
export interface PublicNavItem {
  title: string;
  /** Route to navigate to. Omit for items without a destination yet. */
  url?: string;
  /** Icon shown in the mobile drawer (the desktop header is text-only). */
  icon: string;
}

/** Nav items, in order. Items without a `url` render inert until they exist. */
export const publicNavItems: PublicNavItem[] = [
  { title: "Sprout CRM", url: "/", icon: homeOutline },
  { title: "beta", icon: flaskOutline },
  { title: "contact", icon: chatbubbleOutline },
  { title: "TOS & Privacy", icon: documentTextOutline },
];

// Demo mode is switched on from the `?demo=true` query string when AuthProvider
// mounts, so entering it needs a full page navigation (not a router push).
const DEMO_URL = "/manage-jobs?demo=true";

/** Enter the demo experience (full page load so demo mode initialises). */
export const goToDemo = () => {
  window.location.href = DEMO_URL;
};
