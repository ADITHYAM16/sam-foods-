export type Category = "Briyani" | "Meals" | "Starters" | "Drinks" | "Desserts";

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
