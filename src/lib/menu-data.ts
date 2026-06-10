export type Category = "Breakfast" | "Briyani" | "Meals" | "Starters" | "Desserts";

export interface FoodItem {
  id: string;
  name: string;
  description: string;
  price: number;
  rating: number;
  category: Category;
  veg: boolean;
  image: string;
  badge?: string;
  available?: boolean;
  sold_out?: boolean;
}

export const CATEGORIES: Category[] = ["Breakfast", "Briyani", "Meals", "Starters", "Desserts"];

// Static fallback — only used if DB is unreachable
// The real menu lives in Supabase public.menu_items
export const MENU: FoodItem[] = [
  {
    id: "bf1",
    name: "Idli (2 pcs)",
    description: "Soft steamed rice cakes served with sambar & fresh coconut chutney.",
    price: 25, rating: 4.5, category: "Breakfast", veg: true,
    image: "https://images.unsplash.com/photo-1630409351217-bc4fa6422075?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "bf5",
    name: "Masala Dosa",
    description: "Crispy dosa stuffed with spiced potato masala, served with sambar & chutney.",
    price: 50, rating: 4.7, category: "Breakfast", veg: true,
    image: "https://images.unsplash.com/photo-1614777735417-4d92a84d5adf?auto=format&fit=crop&w=900&q=80",
    badge: "Bestseller",
  },
  {
    id: "bf14",
    name: "Mysore Masala Dosa",
    description: "Crispy dosa with spicy red chutney base & potato masala filling.",
    price: 80, rating: 4.8, category: "Breakfast", veg: true,
    image: "https://images.unsplash.com/photo-1614777735417-4d92a84d5adf?auto=format&fit=crop&w=900&q=80",
    badge: "Must Try",
  },
  {
    id: "bf9",
    name: "Pongal",
    description: "Creamy rice and moong dal cooked with pepper, cumin, ghee & cashews.",
    price: 50, rating: 4.7, category: "Breakfast", veg: true,
    image: "https://images.unsplash.com/photo-1596560548464-f010549b84d7?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "sp1",
    name: "Kothu Parota",
    description: "Shredded flaky parota stir-fried with onion, tomato & spices.",
    price: 80, rating: 4.7, category: "Starters", veg: true,
    image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=900&q=80",
    badge: "Chef Special",
  },
  {
    id: "ml1",
    name: "Full Meal",
    description: "Full South Indian thali — rice, sambar, rasam, 3 curries, papad, curd & sweet.",
    price: 80, rating: 4.8, category: "Meals", veg: true,
    image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=900&q=80",
    badge: "Bestseller",
  },
  {
    id: "ml2",
    name: "Half Meal",
    description: "Lighter South Indian meal — rice, sambar, 2 curries, papad & curd.",
    price: 70, rating: 4.6, category: "Meals", veg: true,
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "rb1",
    name: "Mushroom Biryani",
    description: "Fragrant basmati rice cooked with tender mushrooms & whole spices.",
    price: 60, rating: 4.6, category: "Briyani", veg: true,
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "rb2",
    name: "Veg Biryani",
    description: "Aromatic basmati rice with mixed vegetables, saffron & fried onions.",
    price: 50, rating: 4.5, category: "Briyani", veg: true,
    image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "sn1",
    name: "Medu Vadai",
    description: "Crispy urad dal doughnut fritters with a fluffy center. Served with chutney.",
    price: 6, rating: 4.5, category: "Starters", veg: true,
    image: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "ds1",
    name: "Kesari",
    description: "Sweet semolina halwa with saffron, ghee, cashews & cardamom.",
    price: 20, rating: 4.6, category: "Desserts", veg: true,
    image: "https://images.unsplash.com/photo-1605197788044-5b4ad6b0f4f3?auto=format&fit=crop&w=900&q=80",
  },
];

export const REVIEWS = [
  { name: "Aarav S.", rating: 5, text: "The Masala Dosa is unreal. Hot, crispy, and packed with flavour every single time.", role: "Regular Customer" },
  { name: "Meera K.", rating: 5, text: "Booked SAM for my 50-person event — the catering team was a dream. 10/10.", role: "Event Host" },
  { name: "Rahul D.", rating: 4, text: "Delivery is fast and packaging is premium. Love the live tracker.", role: "Office Order" },
];
