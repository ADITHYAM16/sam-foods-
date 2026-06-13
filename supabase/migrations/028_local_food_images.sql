-- Update all menu items to use local food images served from /food/
UPDATE public.menu_items SET image = '/food/IDLY.jpeg'                  WHERE id = 'bf1';
UPDATE public.menu_items SET image = '/food/kal dosa.jpeg'              WHERE id = 'bf2';
UPDATE public.menu_items SET image = '/food/NYC dosa.jpeg'              WHERE id = 'bf3';
UPDATE public.menu_items SET image = '/food/plain dosa.jpeg'            WHERE id = 'bf4';
UPDATE public.menu_items SET image = '/food/masala dosa.jpeg'           WHERE id = 'bf5';
UPDATE public.menu_items SET image = '/food/podi dosa.jpeg'             WHERE id = 'bf6';
UPDATE public.menu_items SET image = '/food/onion uththappam.jpeg'      WHERE id = 'bf7';
UPDATE public.menu_items SET image = '/food/plain dosa.jpeg'            WHERE id = 'bf8';
UPDATE public.menu_items SET image = '/food/pongal.jpeg'                WHERE id = 'bf9';
UPDATE public.menu_items SET image = '/food/kitchadi.jpeg'              WHERE id = 'bf10';
UPDATE public.menu_items SET image = '/food/upma.jpeg'                  WHERE id = 'bf11';
UPDATE public.menu_items SET image = '/food/keerai dosa.jpeg'           WHERE id = 'bf12';
UPDATE public.menu_items SET image = '/food/ravi rotti.jpeg'            WHERE id = 'bf13';
UPDATE public.menu_items SET image = '/food/mysore masala dosa.jpeg'    WHERE id = 'bf14';
UPDATE public.menu_items SET image = '/food/Thakkali dosa.jpeg'         WHERE id = 'bf15';
UPDATE public.menu_items SET image = '/food/medu vadai.jpeg'            WHERE id = 'sn1';
UPDATE public.menu_items SET image = '/food/kara vadai.jpeg'            WHERE id = 'sn2';
UPDATE public.menu_items SET image = '/food/full meal.jpeg'             WHERE id = 'ml1';
UPDATE public.menu_items SET image = '/food/half meals.jpeg'            WHERE id = 'ml2';
UPDATE public.menu_items SET image = '/food/mushroom biriyani.jpeg'     WHERE id = 'rb1';
UPDATE public.menu_items SET image = '/food/veg biryani.jpeg'           WHERE id = 'rb2';
UPDATE public.menu_items SET image = '/food/Ghee rice.jpeg'             WHERE id = 'rb3';
UPDATE public.menu_items SET image = '/food/tomato rice.jpeg'           WHERE id = 'rb4';
UPDATE public.menu_items SET image = '/food/curd rice.jpeg'             WHERE id = 'rb5';
UPDATE public.menu_items SET image = '/food/lemon rice.jpeg'            WHERE id = 'rb6';
UPDATE public.menu_items SET image = '/food/puli rice.jpeg'             WHERE id = 'rb7';
UPDATE public.menu_items SET image = '/food/kothu parotta.jpeg'         WHERE id = 'sp1';
UPDATE public.menu_items SET image = '/food/kesari.jpeg'                WHERE id = 'ds1';

-- Verify
SELECT id, name, image FROM public.menu_items ORDER BY category, id;
