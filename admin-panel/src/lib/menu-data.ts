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
    image: "/food/IDLY.jpeg",
  },
  {
    id: "bf5",
    name: "Masala Dosa",
    description: "Crispy dosa stuffed with spiced potato masala, served with sambar & chutney.",
    price: 50, rating: 4.7, category: "Breakfast", veg: true,
    image: "/food/masala dosa.jpeg",
    badge: "Bestseller",
  },
  {
    id: "bf14",
    name: "Mysore Masala Dosa",
    description: "Crispy dosa with spicy red chutney base & potato masala filling.",
    price: 80, rating: 4.8, category: "Breakfast", veg: true,
    image: "/food/mysore masala dosa.jpeg",
    badge: "Must Try",
  },
  {
    id: "bf9",
    name: "Pongal",
    description: "Creamy rice and moong dal cooked with pepper, cumin, ghee & cashews.",
    price: 50, rating: 4.7, category: "Breakfast", veg: true,
    image: "/food/pongal.jpeg",
  },
  {
    id: "sp1",
    name: "Kothu Parota",
    description: "Shredded flaky parota stir-fried with onion, tomato & spices.",
    price: 80, rating: 4.7, category: "Starters", veg: true,
    image: "/food/kothu parotta.jpeg",
    badge: "Chef Special",
  },
  {
    id: "ml1",
    name: "Full Meal",
    description: "Full South Indian thali — rice, sambar, rasam, 3 curries, papad, curd & sweet.",
    price: 80, rating: 4.8, category: "Meals", veg: true,
    image: "/food/full meal.jpeg",
    badge: "Bestseller",
  },
  {
    id: "ml2",
    name: "Half Meal",
    description: "Lighter South Indian meal — rice, sambar, 2 curries, papad & curd.",
    price: 70, rating: 4.6, category: "Meals", veg: true,
    image: "/food/half meals.jpeg",
  },
  {
    id: "rb1",
    name: "Mushroom Biryani",
    description: "Fragrant basmati rice cooked with tender mushrooms & whole spices.",
    price: 60, rating: 4.6, category: "Briyani", veg: true,
    image: "/food/mushroom biriyani.jpeg",
  },
  {
    id: "rb2",
    name: "Veg Biryani",
    description: "Aromatic basmati rice with mixed vegetables, saffron & fried onions.",
    price: 50, rating: 4.5, category: "Briyani", veg: true,
    image: "/food/veg biryani.jpeg",
  },
  {
    id: "sn1",
    name: "Medu Vadai",
    description: "Crispy urad dal doughnut fritters with a fluffy center. Served with chutney.",
    price: 6, rating: 4.5, category: "Starters", veg: true,
    image: "/food/medu vadai.jpeg",
  },
  {
    id: "ds1",
    name: "Kesari",
    description: "Sweet semolina halwa with saffron, ghee, cashews & cardamom.",
    price: 20, rating: 4.6, category: "Desserts", veg: true,
    image: "/food/kesari.jpeg",
  },
];

export const REVIEWS = [
  { name: "Aarav S.", rating: 5, text: "The Masala Dosa is unreal. Hot, crispy, and packed with flavour every single time.", role: "Regular Customer" },
  { name: "Meera K.", rating: 5, text: "Booked SAM for my 50-person event — the catering team was a dream. 10/10.", role: "Event Host" },
  { name: "Rahul D.", rating: 4, text: "Delivery is fast and packaging is premium. Love the live tracker.", role: "Office Order" },
];
