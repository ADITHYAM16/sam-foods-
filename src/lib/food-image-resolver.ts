// Auto-assigns a relevant Unsplash image based on food name keywords.
// Used when admin adds/edits a menu item without providing an image URL.

const IMAGE_MAP: { keywords: string[]; url: string }[] = [
  { keywords: ["idli", "idly"],                                           url: "/food/IDLY.jpeg" },
  { keywords: ["mysore masala", "mysore"],                                url: "/food/mysore masala dosa.jpeg" },
  { keywords: ["masala dosa"],                                            url: "/food/masala dosa.jpeg" },
  { keywords: ["kal dosa"],                                               url: "/food/kal dosa.jpeg" },
  { keywords: ["nyc dosa"],                                               url: "/food/NYC dosa.jpeg" },
  { keywords: ["plain dosa"],                                             url: "/food/plain dosa.jpeg" },
  { keywords: ["keerai"],                                                 url: "/food/keerai dosa.jpeg" },
  { keywords: ["thakkali"],                                               url: "/food/Thakkali dosa.jpeg" },
  { keywords: ["podi dosa"],                                              url: "/food/podi dosa.jpeg" },
  { keywords: ["dosa", "dosai", "roast"],                                 url: "/food/plain dosa.jpeg" },
  { keywords: ["uthappam", "uttapam", "onion"],                           url: "/food/onion uththappam.jpeg" },
  { keywords: ["pongal"],                                                 url: "/food/pongal.jpeg" },
  { keywords: ["upma"],                                                   url: "/food/upma.jpeg" },
  { keywords: ["kitchadi", "kichadi"],                                    url: "/food/kitchadi.jpeg" },
  { keywords: ["rava rotti", "ravi rotti", "rotti"],                      url: "/food/ravi rotti.jpeg" },
  { keywords: ["medu vadai", "medu"],                                     url: "/food/medu vadai.jpeg" },
  { keywords: ["kara vadai", "vadai", "vada"],                            url: "/food/kara vadai.jpeg" },
  { keywords: ["mushroom biryani", "mushroom biriyani"],                  url: "/food/mushroom biriyani.jpeg" },
  { keywords: ["veg biryani", "veg biriyani"],                            url: "/food/veg biryani.jpeg" },
  { keywords: ["biryani", "biriyani"],                                    url: "/food/mushroom biriyani.jpeg" },
  { keywords: ["ghee rice", "ghee"],                                      url: "/food/Ghee rice.jpeg" },
  { keywords: ["tomato rice"],                                            url: "/food/tomato rice.jpeg" },
  { keywords: ["curd rice"],                                              url: "/food/curd rice.jpeg" },
  { keywords: ["lemon rice"],                                             url: "/food/lemon rice.jpeg" },
  { keywords: ["puli rice", "tamarind rice"],                             url: "/food/puli rice.jpeg" },
  { keywords: ["rice"],                                                   url: "/food/Ghee rice.jpeg" },
  { keywords: ["full meal"],                                              url: "/food/full meal.jpeg" },
  { keywords: ["half meal"],                                              url: "/food/half meals.jpeg" },
  { keywords: ["thali", "meals"],                                         url: "/food/full meal.jpeg" },
  { keywords: ["parota", "parotta", "kothu", "kottu"],                    url: "/food/kothu parotta.jpeg" },
  { keywords: ["kesari", "halwa", "sweet", "dessert"],                    url: "/food/kesari.jpeg" },
];

const DEFAULT_IMAGE = "/food/full meal.jpeg";

// Default descriptions by category
const DEFAULT_DESCRIPTIONS: Record<string, string> = {
  Breakfast: "A freshly prepared South Indian breakfast dish served with sambar & chutney.",
  Briyani: "Aromatic rice dish cooked with fragrant spices and fresh ingredients.",
  Meals: "A complete South Indian meal served with rice, sambar, curries & accompaniments.",
  Starters: "A crispy, flavourful South Indian starter served fresh from the kitchen.",
  Desserts: "A classic South Indian sweet made with love and traditional ingredients.",
};

/**
 * Returns a matching Unsplash image URL for a food item based on its name.
 * If admin provided an image, returns it unchanged.
 * If no image provided, finds the best keyword match or uses a category default.
 */
export function resolveImage(name: string, image: string, category?: string): string {
  const trimmed = image?.trim() ?? "";
  // If it's a local path, use it directly
  if (trimmed && !trimmed.includes("unsplash.com")) return trimmed;

  const lower = name.toLowerCase();

  for (const entry of IMAGE_MAP) {
    if (entry.keywords.some(kw => lower.includes(kw))) {
      return entry.url;
    }
  }

  // Category-level fallback
  if (category) {
    const catEntry = IMAGE_MAP.find(e =>
      e.keywords.some(kw => category.toLowerCase().includes(kw))
    );
    if (catEntry) return catEntry.url;
  }

  return DEFAULT_IMAGE;
}

/**
 * Returns a default description if admin left description blank.
 */
export function resolveDescription(description: string, category?: string): string {
  if (description && description.trim()) return description.trim();
  return DEFAULT_DESCRIPTIONS[category ?? ""] ?? "A delicious SAM Foods special, freshly prepared for you.";
}
