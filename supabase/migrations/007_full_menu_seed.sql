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
 '/food/IDLY.jpeg',
 NULL, true),

('bf2',
 'Kal Dosa',
 'Thick, soft stone-ground dosa with a slightly tangy fermented taste.',
 20, 4.3, 'Breakfast', true,
 '/food/kal dosa.jpeg',
 NULL, true),

('bf3',
 'NYC Dosa',
 'Crispy golden dosa with a special house filling — a SAM favourite.',
 25, 4.5, 'Breakfast', true,
 '/food/NYC dosa.jpeg',
 'Popular', true),

('bf4',
 'Plain Dosa',
 'Classic thin crispy dosa, served with sambar and two chutneys.',
 40, 4.4, 'Breakfast', true,
 '/food/plain dosa.jpeg',
 NULL, true),

('bf5',
 'Masala Dosa',
 'Crispy dosa stuffed with spiced potato masala, served with sambar & chutney.',
 50, 4.7, 'Breakfast', true,
 '/food/masala dosa.jpeg',
 'Bestseller', true),

('bf6',
 'Podi Dosa',
 'Crispy dosa smeared with aromatic gunpowder podi and ghee.',
 50, 4.6, 'Breakfast', true,
 '/food/podi dosa.jpeg',
 'Spicy', true),

('bf7',
 'Onion Uthappam',
 'Thick soft pancake topped with fresh onions, green chillies & coriander.',
 50, 4.5, 'Breakfast', true,
 '/food/onion uththappam.jpeg',
 NULL, true),

('bf8',
 'All Roast',
 'Fully roasted crispy dosa with a golden crunch — served with chutneys.',
 60, 4.6, 'Breakfast', true,
 '/food/plain dosa.jpeg',
 NULL, true),

('bf9',
 'Pongal',
 'Creamy rice and moong dal cooked with pepper, cumin, ghee & cashews.',
 50, 4.7, 'Breakfast', true,
 '/food/pongal.jpeg',
 NULL, true),

('bf10',
 'Kitchadi',
 'Soft comforting rice & lentil porridge seasoned with mild spices.',
 50, 4.4, 'Breakfast', true,
 '/food/kitchadi.jpeg',
 NULL, true),

('bf11',
 'Upma',
 'Savory semolina porridge tempered with mustard, curry leaves & vegetables.',
 50, 4.3, 'Breakfast', true,
 '/food/upma.jpeg',
 NULL, true),

('bf12',
 'Keerai Dosa',
 'Healthy dosa made with fresh spinach batter — light, nutritious & delicious.',
 40, 4.4, 'Breakfast', true,
 '/food/keerai dosa.jpeg',
 'Healthy', true),

('bf13',
 'Rava Rotti',
 'Crispy semolina flatbread with onion, coconut & green chillies.',
 30, 4.3, 'Breakfast', true,
 '/food/ravi rotti.jpeg',
 NULL, true),

('bf14',
 'Mysore Masala Dosa',
 'Crispy dosa with spicy red chutney base & potato masala filling.',
 80, 4.8, 'Breakfast', true,
 '/food/mysore masala dosa.jpeg',
 'Must Try', true),

('bf15',
 'Thakkali Dosa',
 'Tangy tomato-spiced dosa — a SAM special with a unique bold flavour.',
 50, 4.5, 'Breakfast', true,
 '/food/Thakkali dosa.jpeg',
 NULL, true),

-- ── STARTERS / SNACKS ──────────────────────────────────────────
('sn1',
 'Medu Vadai',
 'Crispy urad dal doughnut fritters with a fluffy center. Served with chutney.',
 6, 4.5, 'Starters', true,
 '/food/medu vadai.jpeg',
 NULL, true),

('sn2',
 'Kara Vadai',
 'Spicy crispy mixed lentil fritters packed with chillies & aromatics.',
 6, 4.4, 'Starters', true,
 '/food/kara vadai.jpeg',
 'Spicy', true),

-- ── MEALS ──────────────────────────────────────────────────────
('ml1',
 'Full Meal',
 'Full South Indian thali — rice, sambar, rasam, 3 curries, papad, curd & sweet.',
 80, 4.8, 'Meals', true,
 '/food/full meal.jpeg',
 'Bestseller', true),

('ml2',
 'Half Meal',
 'Lighter South Indian meal — rice, sambar, 2 curries, papad & curd.',
 70, 4.6, 'Meals', true,
 '/food/half meals.jpeg',
 NULL, true),

-- ── RICE & BIRYANI ─────────────────────────────────────────────
('rb1',
 'Mushroom Biryani',
 'Fragrant basmati rice cooked with tender mushrooms & whole spices.',
 60, 4.6, 'Briyani', true,
 '/food/mushroom biriyani.jpeg',
 NULL, true),

('rb2',
 'Veg Biryani',
 'Aromatic basmati rice with mixed vegetables, saffron & fried onions.',
 50, 4.5, 'Briyani', true,
 '/food/veg biryani.jpeg',
 NULL, true),

('rb3',
 'Ghee Rice',
 'Fragrant long-grain rice cooked in pure ghee with cashews & raisins.',
 50, 4.5, 'Briyani', true,
 '/food/Ghee rice.jpeg',
 NULL, true),

('rb4',
 'Tomato Rice',
 'Tangy rice cooked with ripe tomatoes, mustard & curry leaves.',
 50, 4.4, 'Briyani', true,
 '/food/tomato rice.jpeg',
 NULL, true),

('rb5',
 'Curd Rice',
 'Cooling yogurt rice tempered with mustard, ginger & pomegranate.',
 50, 4.5, 'Briyani', true,
 '/food/curd rice.jpeg',
 NULL, true),

('rb6',
 'Lemon Rice',
 'Zesty turmeric rice with lemon juice, peanuts & curry leaves.',
 50, 4.4, 'Briyani', true,
 '/food/lemon rice.jpeg',
 NULL, true),

('rb7',
 'Puli Rice (Tamarind Rice)',
 'Tangy tamarind rice with sesame, peanuts & dried chillies.',
 50, 4.4, 'Briyani', true,
 '/food/puli rice.jpeg',
 NULL, true),

-- ── SPECIAL ────────────────────────────────────────────────────
('sp1',
 'Kothu Parota',
 'Shredded flaky parota stir-fried with eggs, onion, tomato & spices.',
 80, 4.7, 'Starters', true,
 '/food/kothu parotta.jpeg',
 'Chef Special', true),

-- ── DESSERTS ───────────────────────────────────────────────────
('ds1',
 'Kesari',
 'Sweet semolina halwa with saffron, ghee, cashews & cardamom.',
 20, 4.6, 'Desserts', true,
 '/food/kesari.jpeg',
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
