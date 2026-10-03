-- Sample data for development: the works, categories, text and links the
-- public site shows today, so a fresh database starts as the site looks.
-- Generated from client/src/data (works.js, models.js, contact.js), which holds
-- only content that is already public. Real drafts, notes and consent answers
-- never go in this file; they stay in the git-ignored private/ folder.
--
-- No files yet: every work has no cover, .glb or YouTube link, so the admin
-- dashboard flags each one until they're added.
--
-- This starts with TRUNCATE. That is correct on your laptop and catastrophic
-- against the database your live demo depends on. Check which DATABASE_URL is
-- loaded before you run it. It leaves admins alone: those are the people who
-- can sign in, and are added by hand.

TRUNCATE TABLE activity_log, work_media, model_details, video_details, works, categories,
  site_text, social_links, experience, settings, media CASCADE;

INSERT INTO categories (name, slug, sort_order) VALUES
  ('3D', '3d', 0),
  ('Props', 'props', 1),
  ('Background', 'background', 2),
  ('Character', 'character', 3),
  ('2D art', '2d-art', 4),
  ('Animation', 'animation', 5);

INSERT INTO works (slug, kind, title, year, category_id, description, tags, featured, sort_order, status) VALUES
  ('diner-prop-set', 'model', 'Diner prop set', 2026, (SELECT id FROM categories WHERE slug = '3d'),
   'Twelve hero props built for a 1960s diner set, modular so the layout team could redress the room in an afternoon.',
   ARRAY['props', 'stylized', 'interior', 'prop modeling']::text[], true, 0, 'published'),
  ('vending-machine', 'model', 'Vending machine', 2024, (SELECT id FROM categories WHERE slug = '3d'),
   'A clay-style vending machine with swappable product shelves.',
   ARRAY['props', 'clay', 'prop modeling']::text[], false, 1, 'published'),
  ('market-stall', 'model', 'Market stall', 2025, (SELECT id FROM categories WHERE slug = '3d'),
   'A night-market food stall with a canvas awning, crates and hanging lights.',
   ARRAY['environment', 'night']::text[], false, 2, 'published'),
  ('desk-lamp-trio', 'model', 'Desk lamp trio', 2024, (SELECT id FROM categories WHERE slug = '3d'),
   'Three stylized desk lamps sharing one hinge rig, posed for a prop sheet.',
   ARRAY['props', 'stylized', 'prop modeling']::text[], false, 3, 'published'),
  ('ani-turnaround', 'artwork', 'Ani — turnaround', 2026, (SELECT id FROM categories WHERE slug = 'character'),
   'Front, side and back views of Ani, ready for modeling.',
   '{}'::text[], true, 4, 'published'),
  ('luinsomniac-short', 'video', 'Luinsomniac short', 2025, (SELECT id FROM categories WHERE slug = 'animation'),
   'A short animated piece, from storyboard to final render.',
   '{}'::text[], true, 5, 'published'),
  ('night-street', 'artwork', 'Night street', 2025, (SELECT id FROM categories WHERE slug = 'background'),
   'A painted night-time street background for animation.',
   '{}'::text[], true, 6, 'published'),
  ('encore', 'artwork', 'Encore', 2025, (SELECT id FROM categories WHERE slug = '2d-art'),
   'A stage illustration with a warm spotlight palette.',
   '{}'::text[], true, 7, 'published'),
  ('vending-props', 'artwork', 'Vending props', 2024, (SELECT id FROM categories WHERE slug = 'props'),
   'Clay-style vending machine props.',
   '{}'::text[], true, 8, 'published'),
  ('fugitech-set', 'artwork', 'Fugitech set', 2026, (SELECT id FROM categories WHERE slug = '3d'),
   'A sci-fi prop set modeled for a tech-lab environment.',
   '{}'::text[], false, 9, 'published'),
  ('marisol', 'artwork', 'Marisol', 2026, (SELECT id FROM categories WHERE slug = 'character'),
   'Character design sheet with expressions and costume notes.',
   '{}'::text[], false, 10, 'published'),
  ('forest-path', 'artwork', 'Forest path', 2025, (SELECT id FROM categories WHERE slug = 'background'),
   'A painted forest background with layered depth for parallax.',
   '{}'::text[], false, 11, 'published'),
  ('pubmat-series', 'artwork', 'Pubmat series', 2024, (SELECT id FROM categories WHERE slug = '2d-art'),
   'A poster series made for event announcements.',
   '{}'::text[], false, 12, 'published'),
  ('rooftop-night', 'artwork', 'Rooftop night', 2024, (SELECT id FROM categories WHERE slug = 'background'),
   'A colour key for a night-time rooftop scene.',
   '{}'::text[], false, 13, 'published'),
  ('lamp-trio', 'artwork', 'Lamp trio', 2024, (SELECT id FROM categories WHERE slug = 'props'),
   'Three stylized lamps, rendered as a single prop sheet.',
   '{}'::text[], false, 14, 'published');

INSERT INTO model_details (work_id, software, process_notes, poly_count, textured, external_url) VALUES
  ((SELECT id FROM works WHERE slug = 'diner-prop-set'), ARRAY['Blender', 'Photoshop']::text[],
   'Blocked out against the background painting first so the silhouettes matched. Shared one texture atlas across every prop to keep draw calls low.',
   184000, true, 'https://www.youtube.com/'),
  ((SELECT id FROM works WHERE slug = 'vending-machine'), ARRAY['Blender']::text[],
   '',
   72000, false, 'https://sketchfab.com/'),
  ((SELECT id FROM works WHERE slug = 'market-stall'), ARRAY['Blender', 'Substance Painter']::text[],
   'Lit with emissive bulbs only, to check the textures held up without fill light.',
   118000, true, NULL),
  ((SELECT id FROM works WHERE slug = 'desk-lamp-trio'), ARRAY['Blender']::text[],
   '',
   24000, true, NULL);

INSERT INTO video_details (work_id) VALUES
  ((SELECT id FROM works WHERE slug = 'luinsomniac-short'));

INSERT INTO site_text (key, value) VALUES
  ('home.hero.status', 'Open for commissions'),
  ('home.hero.intro', 'Multimedia artist working across prop modeling, background design, character creation and story-driven animation — from first thumbnail to final render.');

INSERT INTO social_links (platform, handle, url, visible, sort_order) VALUES
  ('instagram', 'luinsomniac_art', 'https://www.instagram.com/luinsomniac_art', true, 0),
  ('tiktok', '@luinsomniac_art', 'https://www.tiktok.com/@luinsomniac_art', true, 1),
  ('vgen', 'Luinsomniac_Art', 'https://vgen.co/Luinsomniac_Art', true, 2);

INSERT INTO experience (years, role, detail, sort_order) VALUES
  ('2025—now', 'Freelance 3D & 2D artist', 'Props, backgrounds, commissioned animation', 0),
  ('2024—2025', 'President, multimedia arts org', 'Ran events, branding and student productions', 1),
  ('2022—2026', 'BS Entertainment & Multimedia Computing', 'Specialization in animation', 2);

INSERT INTO settings (key, value, media_id) VALUES
  ('contact_email', 'luinsomniac@gmail.com', NULL),
  ('display_name', 'Luinsomniac Art', NULL),
  ('logo', NULL, NULL),
  ('icon', NULL, NULL),
  ('portrait', NULL, NULL),
  ('home_reel', NULL, NULL);
