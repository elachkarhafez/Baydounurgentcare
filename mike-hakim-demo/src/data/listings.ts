import type { Listing, PropertyType } from "@/lib/types";
import { addDaysYmd, detroitYmd, detroitParts } from "@/lib/time";

/**
 * SAMPLE MLS LISTINGS: DEMO DATA.
 * Every address, price, status and description below is fictional. Cities and
 * ZIP codes are real so the search feels local; the street names are invented.
 * In production this module is replaced by an authorized IDX/MLS feed adapter
 * that returns the same `Listing` shape.
 */

type Base = {
  n: number; street: string; city: string; zip: string; price: number; beds: number; baths: number; sqft: number;
  lot: number; year: number; type: PropertyType; status?: Listing["status"]; days: number; cover: number;
  headline: string; hook: string; lux?: boolean; garage: string; open?: boolean; hoa?: number; featured?: boolean;
};

const CITY: Record<string, [number, number]> = {
  Dearborn: [42.3223, -83.1763], "Dearborn Heights": [42.337, -83.2733], Detroit: [42.3485, -83.0558], Canton: [42.3087, -83.4822],
  Livonia: [42.3784, -83.3527], Westland: [42.3242, -83.4002], Northville: [42.4311, -83.4833], Novi: [42.4806, -83.4755],
  Troy: [42.5964, -83.1498], Birmingham: [42.5467, -83.2113], "Royal Oak": [42.4895, -83.1446],
};

const B: Base[] = [
  { n: 1, street: "4182 Larkmoor Ct", city: "Dearborn", zip: "48124", price: 415000, beds: 5, baths: 1.5, sqft: 1804, lot: 0.16, year: 1938, type: "Single Family", days: 6, cover: 2, headline: "Classic brick Tudor on a corner lot", hook: "Arched doorways, the original fireplace and a new quartz kitchen sit side by side here, and the detached brick garage has room for two cars and a workbench.", garage: "Detached 2-car, brick", featured: true, open: true },
  { n: 2, street: "7710 Calvert Row", city: "Dearborn", zip: "48126", price: 238500, beds: 3, baths: 1.5, sqft: 1343, lot: 0.14, year: 1956, type: "Single Family", days: 12, cover: 7, headline: "Brick tri-level with a huge garage", hook: "The detached garage is about 800 sq ft, insulated and wired, so it works as a shop as well as parking.", garage: "Detached 4-car, insulated" },
  { n: 3, street: "2219 Ashgrove Ave", city: "Dearborn", zip: "48128", price: 524900, beds: 4, baths: 2.5, sqft: 2410, lot: 0.22, year: 1962, type: "Single Family", days: 3, cover: 8, headline: "West Dearborn colonial near the parks", hook: "A real mudroom, a family room off the kitchen and a deep fenced yard make this one easy to live in.", garage: "Attached 2-car", featured: true },
  { n: 4, street: "5136 Tillman Pl", city: "Dearborn", zip: "48126", price: 289000, beds: 3, baths: 1, sqft: 1220, lot: 0.12, year: 1949, type: "Single Family", days: 21, cover: 1, headline: "Brick bungalow with a finished basement", hook: "Hardwood floors run through the main level and the basement adds a rec room and laundry.", garage: "Detached 1.5-car" },
  { n: 5, street: "903 Merriweather Dr", city: "Dearborn", zip: "48124", price: 349900, beds: 3, baths: 2, sqft: 1560, lot: 0.17, year: 1958, type: "Ranch", status: "Coming Soon", days: 0, cover: 15, headline: "Updated ranch with a two-car garage", hook: "Everything is on one floor, with a newer roof, furnace and central air already done.", garage: "Attached 2-car" },
  { n: 6, street: "28461 Wexford Ln", city: "Dearborn Heights", zip: "48127", price: 799000, beds: 4, baths: 3, sqft: 3352, lot: 0.41, year: 1999, type: "Single Family", days: 9, cover: 36, headline: "Quad-level with a backyard sport court", hook: "There's a heated attached garage, a whole-house generator and a private court out back.", garage: "Attached 2-car, heated", featured: true, lux: true },
  { n: 7, street: "6624 Fenmore St", city: "Dearborn Heights", zip: "48125", price: 264900, beds: 3, baths: 1, sqft: 1180, lot: 0.13, year: 1954, type: "Single Family", days: 15, cover: 23, headline: "Move-in ready brick ranch", hook: "New flooring, a refreshed bath and a backyard that's ready for summer.", garage: "Detached 2-car", open: true },
  { n: 8, street: "25190 Cobbler Way", city: "Dearborn Heights", zip: "48127", price: 584900, beds: 3, baths: 2.5, sqft: 3247, lot: 0.33, year: 1987, type: "Ranch", days: 27, cover: 30, headline: "Stone and brick ranch with vaulted ceilings", hook: "Skylights fill the great room, and the finished basement has a full bath and a second family room.", garage: "Attached 2.5-car" },
  { n: 9, street: "4419 Hollins Ct", city: "Dearborn Heights", zip: "48125", price: 318000, beds: 4, baths: 2, sqft: 1690, lot: 0.18, year: 1961, type: "Single Family", status: "Pending", days: 34, cover: 14, headline: "Four bedrooms near Crestwood schools", hook: "A newer kitchen and a big three-season room give this one more space than the square footage suggests.", garage: "Detached 2-car" },
  { n: 10, street: "1500 Rivard Commons, Unit 804", city: "Detroit", zip: "48207", price: 289000, beds: 2, baths: 2, sqft: 1105, lot: 0, year: 2008, type: "Condo", days: 18, cover: 20, headline: "Eighth-floor condo with river views", hook: "Floor-to-ceiling windows, an in-unit washer and dryer and a deeded parking space.", garage: "Deeded garage space", hoa: 410 },
  { n: 11, street: "2381 Seminole Arch", city: "Detroit", zip: "48214", price: 685000, beds: 5, baths: 3.5, sqft: 3980, lot: 0.29, year: 1916, type: "Single Family", days: 41, cover: 25, headline: "Indian Village estate with original woodwork", hook: "Leaded glass, a sweeping staircase and plaster crown moldings have all been kept and cared for.", garage: "Detached 3-car carriage house", lux: true, featured: true },
  { n: 12, street: "418 Canfield Mews", city: "Detroit", zip: "48201", price: 459000, beds: 3, baths: 2.5, sqft: 1890, lot: 0.04, year: 2019, type: "Townhouse", days: 7, cover: 24, headline: "Midtown townhouse with a rooftop deck", hook: "Walk to the museums and Wayne State, then come home to a private roof deck with skyline views.", garage: "Attached 1-car", hoa: 225, open: true },
  { n: 13, street: "17360 Pembrook Ave", city: "Detroit", zip: "48221", price: 335000, beds: 4, baths: 2.5, sqft: 2560, lot: 0.19, year: 1928, type: "Single Family", days: 23, cover: 38, headline: "University District colonial", hook: "Big rooms, a butler's pantry and a sunroom that gets light all day.", garage: "Detached 2-car" },
  { n: 14, street: "44780 Brandywine Ct", city: "Canton", zip: "48187", price: 489900, beds: 4, baths: 2.5, sqft: 2640, lot: 0.27, year: 2001, type: "Single Family", days: 5, cover: 5, headline: "Canton colonial on a quiet court", hook: "Open kitchen with an island, a first-floor office and a paver patio out back.", garage: "Attached 2.5-car", featured: true },
  { n: 15, street: "2045 Saltmeadow Dr", city: "Canton", zip: "48188", price: 412000, beds: 3, baths: 2.5, sqft: 1980, lot: 0.21, year: 1995, type: "Single Family", days: 16, cover: 26, headline: "Bright two-story near Heritage Park", hook: "Vaulted living room, a finished lower level and a fenced yard backing to trees.", garage: "Attached 2-car" },
  { n: 16, street: "6612 Halverson Way", city: "Canton", zip: "48187", price: 559000, beds: 4, baths: 3.5, sqft: 3120, lot: 0.31, year: 2012, type: "Single Family", status: "Coming Soon", days: 0, cover: 10, headline: "Newer build with a walkout lower level", hook: "Nine-foot ceilings, a big kitchen pantry and a walkout basement that's ready to finish.", garage: "Attached 3-car" },
  { n: 17, street: "15322 Bellmont St", city: "Livonia", zip: "48154", price: 344900, beds: 3, baths: 1.5, sqft: 1520, lot: 0.2, year: 1960, type: "Ranch", days: 11, cover: 29, headline: "Livonia ranch with a big backyard", hook: "A one-floor layout, updated windows and a yard with room for a garden and a play set.", garage: "Attached 2-car", open: true },
  { n: 18, street: "36740 Greyfield Ln", city: "Livonia", zip: "48152", price: 449000, beds: 4, baths: 2.5, sqft: 2280, lot: 0.25, year: 1978, type: "Single Family", days: 29, cover: 37, headline: "Colonial with a wraparound porch", hook: "The porch is the selling point, and inside there's a formal dining room and a cozy den.", garage: "Attached 2-car" },
  { n: 19, street: "8031 Norwick Ave", city: "Westland", zip: "48185", price: 224900, beds: 3, baths: 1, sqft: 1050, lot: 0.15, year: 1957, type: "Single Family", days: 8, cover: 6, headline: "Starter home with new everything", hook: "New roof, new furnace and a freshly painted interior, close to shopping and the freeway.", garage: "Detached 1-car" },
  { n: 20, street: "33914 Kendrick Ct", city: "Westland", zip: "48185", price: 279500, beds: 3, baths: 2, sqft: 1410, lot: 0.18, year: 1972, type: "Ranch", status: "Pending", days: 38, cover: 32, headline: "Ranch with a finished basement", hook: "An easy layout with a second living area downstairs and a deep two-car garage.", garage: "Attached 2-car" },
  { n: 21, street: "411 Linden Hollow", city: "Northville", zip: "48167", price: 1095000, beds: 5, baths: 4.5, sqft: 4480, lot: 0.62, year: 2015, type: "Single Family", days: 14, cover: 13, headline: "Contemporary near downtown Northville", hook: "Walls of glass, a chef's kitchen and a lower level with a wine room and theater.", garage: "Attached 3-car", lux: true, featured: true, open: true },
  { n: 22, street: "18865 Foxcroft Rd", city: "Northville", zip: "48168", price: 689000, beds: 4, baths: 3.5, sqft: 3260, lot: 0.4, year: 2004, type: "Single Family", days: 20, cover: 3, headline: "Cedar home on a wooded lot", hook: "Exposed beams, a stone fireplace and a deck that looks into the trees.", garage: "Attached 3-car" },
  { n: 23, street: "47250 Wynstone Dr", city: "Novi", zip: "48375", price: 629900, beds: 4, baths: 3.5, sqft: 3010, lot: 0.3, year: 2008, type: "Single Family", days: 10, cover: 34, headline: "Modern two-story in Novi schools", hook: "A clean modern exterior, an open main floor and a primary suite with a soaking tub.", garage: "Attached 3-car" },
  { n: 24, street: "26118 Ravenna Ln", city: "Novi", zip: "48377", price: 489000, beds: 3, baths: 2.5, sqft: 2100, lot: 0.08, year: 2016, type: "Townhouse", days: 4, cover: 27, headline: "End-unit townhouse with a two-car garage", hook: "Low-maintenance living with a private patio, quartz kitchen and first-floor primary.", garage: "Attached 2-car", hoa: 315 },
  { n: 25, street: "5850 Abernathy Ct", city: "Troy", zip: "48098", price: 849000, beds: 5, baths: 4, sqft: 3870, lot: 0.46, year: 2003, type: "Single Family", days: 13, cover: 17, headline: "Troy colonial with a heated pool", hook: "The backyard has a heated pool and a covered patio, and inside there's a two-story foyer and a library.", garage: "Attached 3-car side-entry", lux: true },
  { n: 26, street: "2276 Cranbrook Lane", city: "Troy", zip: "48084", price: 539000, beds: 4, baths: 2.5, sqft: 2490, lot: 0.28, year: 1984, type: "Single Family", days: 26, cover: 22, headline: "Updated colonial close to Somerset", hook: "A new kitchen, refinished hardwood and a family room with a brick fireplace.", garage: "Attached 2-car" },
  { n: 27, street: "740 Aspen Terrace", city: "Birmingham", zip: "48009", price: 2395000, beds: 5, baths: 5.5, sqft: 5200, lot: 0.35, year: 2021, type: "Single Family", days: 19, cover: 16, headline: "New-build modern walking distance to town", hook: "Wide-plank oak, a full outdoor kitchen and a pool, a few blocks from Birmingham's shops.", garage: "Attached 3-car, EV ready", lux: true, featured: true },
  { n: 28, street: "1189 Westchester Way", city: "Birmingham", zip: "48009", price: 1249000, beds: 4, baths: 3.5, sqft: 3400, lot: 0.24, year: 2010, type: "Single Family", status: "Coming Soon", days: 0, cover: 12, headline: "Architect-designed home in the Quarton area", hook: "Warm wood, big windows and a private courtyard designed for long Michigan summers.", garage: "Attached 2-car", lux: true },
  { n: 29, street: "1023 Wolverine Ave", city: "Royal Oak", zip: "48067", price: 399000, beds: 3, baths: 2, sqft: 1580, lot: 0.13, year: 1941, type: "Single Family", days: 2, cover: 31, headline: "Royal Oak bungalow near downtown", hook: "Walk to Main Street, then come home to a renovated kitchen and a yard with a firepit.", garage: "Detached 2-car", open: true },
  { n: 30, street: "3317 Harwood Blvd", city: "Royal Oak", zip: "48073", price: 549000, beds: 4, baths: 3, sqft: 2240, lot: 0.17, year: 2018, type: "Single Family", days: 17, cover: 4, headline: "Modern farmhouse with a dramatic roofline", hook: "Soaring ceilings in the living room, a big mudroom and an upstairs laundry.", garage: "Attached 2-car" },
];

// sample price reductions: listing n -> [amount, days ago]
const CUTS: Record<number, [number, number]> = { 2: [5000, 4], 9: [6700, 13], 13: [10000, 6], 18: [9000, 9], 22: [15000, 3], 26: [11000, 8] };

const pad2 = (n: number) => String(n).padStart(2, "0");
const LIV = 22, KIT = 2, BATH = 4, BED = 4;

const FEATURE_POOL = [
  "Hardwood floors", "Quartz countertops", "Stainless appliances", "Finished basement", "Central air", "Fenced yard",
  "Walk-in closet", "Gas fireplace", "Updated windows", "Main-floor laundry", "Covered patio", "Smart thermostat",
  "Sprinkler system", "Mudroom", "Home office", "Kitchen island", "Primary suite", "Newer roof",
];
const INTERIOR_POOL = [
  "Open-concept kitchen and living", "Recessed lighting", "Crown molding", "Built-in shelving", "Pantry", "Ceiling fans",
  "Tile backsplash", "Soaking tub in primary bath", "Double vanity", "Laundry with sink",
];
const EXTERIOR_POOL = [
  "Brick and siding exterior", "Paver patio", "Mature trees", "Landscaped front yard", "Concrete driveway", "Deck",
  "Shed", "Gutter guards", "Outdoor lighting", "Privacy fence",
];
const pick = (arr: string[], seed: number, n: number) => Array.from({ length: n }, (_, i) => arr[(seed * 7 + i * 5) % arr.length]).filter((v, i, a) => a.indexOf(v) === i);

function nextWeekend(offsetWeeks = 0) {
  const today = detroitYmd();
  const wd = detroitParts(Date.now()).weekday; // Mon..Sun
  const idx = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
  const toSat = (6 - idx + 7) % 7 || 7;
  return addDaysYmd(today, toSat + offsetWeeks * 7);
}

function build(b: Base, i: number): Listing {
  const [clat, clng] = CITY[b.city];
  const jitter = (k: number) => (((b.n * 9301 + k * 49297) % 233280) / 233280 - 0.5) * 0.045;
  const photos = [
    `/photos/ext-${pad2(b.cover)}.webp`,
    `/photos/liv-${pad2((i % LIV) + 1)}.webp`,
    `/photos/kit-${pad2((i % KIT) + 1)}.webp`,
    `/photos/bed-${pad2((i % BED) + 1)}.webp`,
    `/photos/bath-${pad2((i % BATH) + 1)}.webp`,
    b.lux ? "/photos/det-01.webp" : `/photos/liv-${pad2(((i + 6) % LIV) + 1)}.webp`,
  ];
  const sat = nextWeekend(i % 2);
  const status = b.status ?? "Active";
  const yearsOld = 2026 - b.year;
  const description = [
    b.hook,
    `This ${b.type === "Condo" ? "condo" : b.type === "Townhouse" ? "townhouse" : "home"} has ${b.beds} bedrooms, ${b.baths} baths and about ${b.sqft.toLocaleString()} square feet${b.lot ? ` on a ${b.lot}-acre lot` : ""}.`,
    yearsOld > 60
      ? `Built in ${b.year}, it keeps the character of the era with the updates you actually want.`
      : `Built in ${b.year}, it has been well kept and is ready for its next owner.`,
    `You're in ${b.city}, with easy access to shopping, schools and the freeways.`,
  ].join(" ");
  return {
    id: `MH-${24000 + b.n}`,
    address: b.street,
    city: b.city,
    state: "MI",
    zip: b.zip,
    price: b.price,
    beds: b.beds,
    baths: b.baths,
    sqft: b.sqft,
    lotAcres: b.lot,
    yearBuilt: b.year,
    type: b.type,
    status,
    openHouse: b.open && status === "Active" ? { date: sat, start: i % 3 === 0 ? "12:00" : "13:00", end: i % 3 === 0 ? "14:00" : "15:00" } : undefined,
    daysListed: b.days,
    headline: b.headline,
    description,
    photos,
    lat: +(clat + jitter(1)).toFixed(5),
    lng: +(clng + jitter(2)).toFixed(5),
    features: pick(FEATURE_POOL, b.n, 6),
    interior: pick(INTERIOR_POOL, b.n + 3, 5),
    exterior: pick(EXTERIOR_POOL, b.n + 5, 4),
    garage: b.garage,
    heating: b.year < 1950 ? "Forced air, natural gas (updated)" : "Forced air, natural gas",
    cooling: b.type === "Condo" ? "Central air, in-unit" : "Central air",
    hoa: b.hoa,
    taxesYearly: Math.round(b.price * (b.city === "Detroit" ? 0.021 : 0.0165) / 10) * 10,
    featured: b.featured,
    priceCut: CUTS[b.n] ? { amount: CUTS[b.n][0], daysAgo: CUTS[b.n][1] } : undefined,
  };
}

export const LISTINGS: Listing[] = B.map(build);
export const LISTING_BY_ID = new Map(LISTINGS.map((l) => [l.id, l]));
export const getListing = (id: string) => LISTING_BY_ID.get(id);
export const FEATURED = LISTINGS.filter((l) => l.featured).slice(0, 6);
export const CITIES = Array.from(new Set(LISTINGS.map((l) => l.city))).sort();
export const PROPERTY_TYPES: Listing["type"][] = ["Single Family", "Ranch", "Condo", "Townhouse"];
export const TOUR_LISTING_ID = "MH-24001";
export const fullAddress = (l: Listing) => `${l.address}, ${l.city}, ${l.state} ${l.zip}`;
