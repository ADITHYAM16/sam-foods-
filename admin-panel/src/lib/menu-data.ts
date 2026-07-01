<<<<<<< HEAD
export type Category = "Briyani" | "Meals" | "Starters" | "Drinks" | "Desserts";
=======
export type Category = "Breakfast" | "Briyani" | "Meals" | "Starters" | "Desserts";
>>>>>>> 00a018a6c6bfc2b51ad8c29883f26fc69c76f74b

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
<<<<<<< HEAD
}

export const CATEGORIES: Category[] = ["Briyani", "Meals", "Starters", "Drinks", "Desserts"];

export const MENU: FoodItem[] = [
  {
    id: "b1",
    name: "SAM Special Veg Biryani",
    description: "Long-grain basmati, slow-dum veggies, saffron & secret SAM masala.",
    price: 289,
    rating: 4.8,
    category: "Briyani",
    veg: true,
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=900&q=80",
    badge: "Bestseller",
  },
  {
    id: "b2",
    name: "Paneer Dum Biryani",
    description: "Tender paneer, layered with fragrant rice & roasted spices.",
    price: 379,
    rating: 4.7,
    category: "Briyani",
    veg: true,
    image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "b3",
    name: "Veg Hyderabadi Biryani",
    description: "Garden vegetables, ghee rice, mint & fried onions.",
    price: 219,
    rating: 4.5,
    category: "Briyani",
    veg: true,
    image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "m1",
    name: "South Indian Thali",
    description: "Sambar, rasam, 3 curries, rice, papad, curd & sweet.",
    price: 199,
    rating: 4.6,
    category: "Meals",
    veg: true,
    image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "m2",
    name: "Paneer Combo Meal",
    description: "Steamed rice, paneer butter masala, roti, salad & dessert.",
    price: 259,
    rating: 4.5,
    category: "Meals",
    veg: true,
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "s1",
    name: "Crispy Veg 65",
    description: "Spicy fried veggie bites tossed with curry leaves.",
    price: 229,
    rating: 4.7,
    category: "Starters",
    veg: true,
    image: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=900&q=80",
    badge: "Spicy",
  },
  {
    id: "s2",
    name: "Paneer Tikka",
    description: "Charred paneer cubes marinated in yogurt & spices.",
    price: 209,
    rating: 4.6,
    category: "Starters",
    veg: true,
    image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "s3",
    name: "Gobi Manchurian",
    description: "Crispy cauliflower in a tangy Indo-Chinese sauce.",
    price: 179,
    rating: 4.4,
    category: "Starters",
    veg: true,
    image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "d1",
    name: "Masala Lemon Soda",
    description: "Fizzy lemon with rock salt & mint — refreshing kick.",
    price: 79,
    rating: 4.3,
    category: "Drinks",
    veg: true,
    image: "https://images.unsplash.com/photo-1437418747212-8d9709afab22?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "d2",
    name: "Mango Lassi",
    description: "Thick yogurt smoothie with sweet alphonso mango.",
    price: 99,
    rating: 4.7,
    category: "Drinks",
    veg: true,
    image: "https://images.unsplash.com/photo-1626202378011-f47220801c63?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "ds1",
    name: "Gulab Jamun (2 pcs)",
    description: "Warm milk dumplings soaked in cardamom syrup.",
    price: 89,
    rating: 4.8,
    category: "Desserts",
    veg: true,
    image: "https://images.unsplash.com/photo-1605197788044-5b4ad6b0f4f3?auto=format&fit=crop&w=900&q=80",
    badge: "Bestseller",
  },
  {
    id: "ds2",
    name: "Classic Rasmalai",
    description: "Soft cottage cheese discs in saffron-pistachio milk.",
    price: 119,
    rating: 4.6,
    category: "Desserts",
    veg: true,
    image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=900&q=80",
  },
];
=======
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
>>>>>>> 00a018a6c6bfc2b51ad8c29883f26fc69c76f74b
