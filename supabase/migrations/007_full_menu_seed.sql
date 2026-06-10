-- ══════════════════════════════════════════════════════════════
-- SAM Foods — Complete Menu Seed
-- Run this in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- First clear old seeded items (keeps any custom items admin added)
DELETE FROM public.menu_items WHERE id IN (
  'b1','b2','b3','m1','m2','s1','s2','s3','d1','d2','ds1','ds2'
);

-- Insert complete SAM Foods menu
INSERT INTO public.menu_items (id, name, description, price, rating, category, veg, image, badge, available) VALUES

-- ── BREAKFAST ──────────────────────────────────────────────────
('bf1',
 'Idli (2 pcs)',
 'Soft steamed rice cakes served with sambar & fresh coconut chutney.',
 25, 4.5, 'Breakfast', true,
 'https://images.unsplash.com/photo-1630409351217-bc4fa6422075?auto=format&fit=crop&w=900&q=80',
 NULL, true),

('bf2',
 'Kal Dosa',
 'Thick, soft stone-ground dosa with a slightly tangy fermented taste.',
 20, 4.3, 'Breakfast', true,
 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=900&q=80',
 NULL, true),

('bf3',
 'NYC Dosa',
 'Crispy golden dosa with a special house filling — a SAM favourite.',
 25, 4.5, 'Breakfast', true,
 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=900&q=80',
 'Popular', true),

('bf4',
 'Plain Dosa',
 'Classic thin crispy dosa, served with sambar and two chutneys.',
 40, 4.4, 'Breakfast', true,
 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=900&q=80',
 NULL, true),

('bf5',
 'Masala Dosa',
 'Crispy dosa stuffed with spiced potato masala, served with sambar & chutney.',
 50, 4.7, 'Breakfast', true,
 'https://images.unsplash.com/photo-1614777735417-4d92a84d5adf?auto=format&fit=crop&w=900&q=80',
 'Bestseller', true),

('bf6',
 'Podi Dosa',
 'Crispy dosa smeared with aromatic gunpowder podi and ghee.',
 50, 4.6, 'Breakfast', true,
 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=900&q=80',
 'Spicy', true),

('bf7',
 'Onion Uthappam',
 'Thick soft pancake topped with fresh onions, green chillies & coriander.',
 50, 4.5, 'Breakfast', true,
 'https://images.unsplash.com/photo-1630409351217-bc4fa6422075?auto=format&fit=crop&w=900&q=80',
 NULL, true),

('bf8',
 'All Roast',
 'Fully roasted crispy dosa with a golden crunch — served with chutneys.',
 60, 4.6, 'Breakfast', true,
 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=900&q=80',
 NULL, true),

('bf9',
 'Pongal',
 'Creamy rice and moong dal cooked with pepper, cumin, ghee & cashews.',
 50, 4.7, 'Breakfast', true,
 'https://images.unsplash.com/photo-1596560548464-f010549b84d7?auto=format&fit=crop&w=900&q=80',
 NULL, true),

('bf10',
 'Kitchadi',
 'Soft comforting rice & lentil porridge seasoned with mild spices.',
 50, 4.4, 'Breakfast', true,
 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=900&q=80',
 NULL, true),

('bf11',
 'Upma',
 'Savory semolina porridge tempered with mustard, curry leaves & vegetables.',
 50, 4.3, 'Breakfast', true,
 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80',
 NULL, true),

('bf12',
 'Keerai Dosa',
 'Healthy dosa made with fresh spinach batter — light, nutritious & delicious.',
 40, 4.4, 'Breakfast', true,
 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=900&q=80',
 'Healthy', true),

('bf13',
 'Rava Rotti',
 'Crispy semolina flatbread with onion, coconut & green chillies.',
 30, 4.3, 'Breakfast', true,
 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=900&q=80',
 NULL, true),

('bf14',
 'Mysore Masala Dosa',
 'Crispy dosa with spicy red chutney base & potato masala filling.',
 80, 4.8, 'Breakfast', true,
 'https://images.unsplash.com/photo-1614777735417-4d92a84d5adf?auto=format&fit=crop&w=900&q=80',
 'Must Try', true),

('bf15',
 'Thakkali Dosa',
 'Tangy tomato-spiced dosa — a SAM special with a unique bold flavour.',
 50, 4.5, 'Breakfast', true,
 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=900&q=80',
 NULL, true),

-- ── STARTERS / SNACKS ──────────────────────────────────────────
('sn1',
 'Medu Vadai',
 'Crispy urad dal doughnut fritters with a fluffy center. Served with chutney.',
 6, 4.5, 'Starters', true,
 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=900&q=80',
 NULL, true),

('sn2',
 'Kara Vadai',
 'Spicy crispy mixed lentil fritters packed with chillies & aromatics.',
 6, 4.4, 'Starters', true,
 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=900&q=80',
 'Spicy', true),

-- ── MEALS ──────────────────────────────────────────────────────
('ml1',
 'Full Meal',
 'Full South Indian thali — rice, sambar, rasam, 3 curries, papad, curd & sweet.',
 80, 4.8, 'Meals', true,
 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=900&q=80',
 'Bestseller', true),

('ml2',
 'Half Meal',
 'Lighter South Indian meal — rice, sambar, 2 curries, papad & curd.',
 70, 4.6, 'Meals', true,
 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80',
 NULL, true),

-- ── RICE & BIRYANI ─────────────────────────────────────────────
('rb1',
 'Mushroom Biryani',
 'Fragrant basmati rice cooked with tender mushrooms & whole spices.',
 60, 4.6, 'Briyani', true,
 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=900&q=80',
 NULL, true),

('rb2',
 'Veg Biryani',
 'Aromatic basmati rice with mixed vegetables, saffron & fried onions.',
 50, 4.5, 'Briyani', true,
 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=900&q=80',
 NULL, true),

('rb3',
 'Ghee Rice',
 'Fragrant long-grain rice cooked in pure ghee with cashews & raisins.',
 50, 4.5, 'Briyani', true,
 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80',
 NULL, true),

('rb4',
 'Tomato Rice',
 'Tangy rice cooked with ripe tomatoes, mustard & curry leaves.',
 50, 4.4, 'Briyani', true,
 'https://images.unsplash.com/photo-1596560548464-f010549b84d7?auto=format&fit=crop&w=900&q=80',
 NULL, true),

('rb5',
 'Curd Rice',
 'Cooling yogurt rice tempered with mustard, ginger & pomegranate.',
 50, 4.5, 'Briyani', true,
 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80',
 NULL, true),

('rb6',
 'Lemon Rice',
 'Zesty turmeric rice with lemon juice, peanuts & curry leaves.',
 50, 4.4, 'Briyani', true,
 'https://images.unsplash.com/photo-1596560548464-f010549b84d7?auto=format&fit=crop&w=900&q=80',
 NULL, true),

('rb7',
 'Puli Rice (Tamarind Rice)',
 'Tangy tamarind rice with sesame, peanuts & dried chillies.',
 50, 4.4, 'Briyani', true,
 'https://images.unsplash.com/photo-1596560548464-f010549b84d7?auto=format&fit=crop&w=900&q=80',
 NULL, true),

-- ── SPECIAL ────────────────────────────────────────────────────
('sp1',
 'Kothu Parota',
 'Shredded flaky parota stir-fried with eggs, onion, tomato & spices.',
 80, 4.7, 'Starters', true,
 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=900&q=80',
 'Chef Special', true),

-- ── DESSERTS ───────────────────────────────────────────────────
('ds1',
 'Kesari',
 'Sweet semolina halwa with saffron, ghee, cashews & cardamom.',
 20, 4.6, 'Desserts', true,
 'https://images.unsplash.com/photo-1605197788044-5b4ad6b0f4f3?auto=format&fit=crop&w=900&q=80',
 NULL, true)

ON CONFLICT (id) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  price       = EXCLUDED.price,
  rating      = EXCLUDED.rating,
  category    = EXCLUDED.category,
  veg         = EXCLUDED.veg,
  image       = EXCLUDED.image,
  badge       = EXCLUDED.badge,
  available   = EXCLUDED.available;

-- Verify
SELECT id, name, price, category, available FROM public.menu_items ORDER BY category, price;
