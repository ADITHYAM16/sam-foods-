// Auto-assigns a relevant Unsplash image based on food name keywords.
// Used when admin adds/edits a menu item without providing an image URL.

const IMAGE_MAP: { keywords: string[]; url: string }[] = [
  // Idli / Vada
  {
    keywords: ["idli", "idly"],
    url: "https://images.unsplash.com/photo-1630409351217-bc4fa6422075?auto=format&fit=crop&w=900&q=80",
  },
  // Dosa (generic)
  {
    keywords: ["dosa", "dosai", "kal dosa", "nyc dosa", "plain dosa", "keerai", "thakkali", "podi dosa", "roast"],
    url: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=900&q=80",
  },
  // Masala Dosa / Mysore Masala
  {
    keywords: ["masala dosa", "mysore masala", "mysore"],
    url: "https://images.unsplash.com/photo-1614777735417-4d92a84d5adf?auto=format&fit=crop&w=900&q=80",
  },
  // Uthappam / Onion
  {
    keywords: ["uthappam", "uttapam", "onion"],
    url: "https://images.unsplash.com/photo-1630409351217-bc4fa6422075?auto=format&fit=crop&w=900&q=80",
  },
  // Pongal
  {
    keywords: ["pongal"],
    url: "https://images.unsplash.com/photo-1596560548464-f010549b84d7?auto=format&fit=crop&w=900&q=80",
  },
  // Upma / Kitchadi / Semolina
  {
    keywords: ["upma", "kitchadi", "kichadi", "semolina", "rava rotti", "rotti"],
    url: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80",
  },
  // Vadai / Vada
  {
    keywords: ["vadai", "vada", "medu", "kara vadai"],
    url: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=900&q=80",
  },
  // Biryani / Mushroom biryani
  {
    keywords: ["biryani", "biriyani", "mushroom biryani", "veg biryani"],
    url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=900&q=80",
  },
  // Ghee Rice
  {
    keywords: ["ghee rice", "ghee"],
    url: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80",
  },
  // Rice varieties (tomato, curd, lemon, puli, tamarind)
  {
    keywords: ["tomato rice", "curd rice", "lemon rice", "puli rice", "tamarind rice", "rice"],
    url: "https://images.unsplash.com/photo-1596560548464-f010549b84d7?auto=format&fit=crop&w=900&q=80",
  },
  // Full Meal / Half Meal / Thali
  {
    keywords: ["full meal", "half meal", "thali", "meals"],
    url: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=900&q=80",
  },
  // Parota / Kothu
  {
    keywords: ["parota", "parotta", "kothu", "kottu"],
    url: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=900&q=80",
  },
  // Paneer
  {
    keywords: ["paneer"],
    url: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=900&q=80",
  },
  // Kesari / Halwa / Sweets
  {
    keywords: ["kesari", "halwa", "sweet", "dessert"],
    url: "https://images.unsplash.com/photo-1605197788044-5b4ad6b0f4f3?auto=format&fit=crop&w=900&q=80",
  },
  // Rasmalai / Gulab Jamun / Milk sweets
  {
    keywords: ["rasmalai", "gulab", "jamun", "milk"],
    url: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=900&q=80",
  },
  // Drinks / Lassi / Juice
  {
    keywords: ["lassi", "juice", "soda", "drink", "beverage", "water"],
    url: "https://images.unsplash.com/photo-1626202378011-f47220801c63?auto=format&fit=crop&w=900&q=80",
  },
  // Soup
  {
    keywords: ["soup", "rasam"],
    url: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80",
  },
  // Manchurian / Chinese / Fried
  {
    keywords: ["manchurian", "fried", "65", "starters"],
    url: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=900&q=80",
  },
];

// Default fallback image — generic South Indian food spread
const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=900&q=80";

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
  if (image && image.trim()) return image.trim();

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
