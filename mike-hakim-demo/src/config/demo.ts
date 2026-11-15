/**
 * Central demo configuration.
 *
 * DEMO_MODE must stay `true` until real providers are implemented, configured
 * with approved credentials and deliberately switched on. While it is true the
 * integration registry only ever returns the simulated adapters.
 */
export const DEMO_MODE = true as const;

export const TIMEZONE = "America/Detroit";

export const BRAND = {
  name: "Mike Hakim Real Estate",
  short: "Mike Hakim",
  agent: "Mike Hakim",
  instagram: "@mikehakimrealtor",
  instagramUrl: "https://www.instagram.com/mikehakimrealtor/",
  brokerageNote: "Mike works with eXp Realty and has IDX access through eXp and BoldTrail.",
  // Placeholder contact details for the demo. Replace before launch.
  phone: "(555) 010-0199",
  phoneHref: "tel:+15550100199",
  email: "hello@example.com",
  officeArea: "Dearborn, Michigan",
} as const;

export const STORAGE_KEY = "mh-demo";
export const STORAGE_VERSION = 3;

export const UPLOAD_LIMITS = {
  maxBytes: 10 * 1024 * 1024,
  types: {
    "application/pdf": "PDF",
    "image/jpeg": "JPG",
    "image/png": "PNG",
  } as Record<string, string>,
  extensions: ["pdf", "jpg", "jpeg", "png"],
};
