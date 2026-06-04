-- ================================================================
-- Speurtocht Erp - CONTENT (locaties + challenges)
-- ================================================================
-- Doelt op het seed test-event (id 00000000-0000-0000-0000-000000000001).
-- Als je een ANDER event gebruikt: zoek-en-vervang het UUID hieronder
-- voor jouw event-id (te vinden via: SELECT id, name FROM events;).
--
-- Idempotent: wist eerst bestaande locaties + tasks voor dit event
-- en zet daarna alles vers neer.
--
-- BELANGRIJK over coördinaten:
--   GPS-arrival werkt alleen als de coords overeenkomen met de
--   echte plek. De coords hieronder zijn best-guesses op basis
--   van OSM en mijn kennis. Verifieer in /admin/locations door
--   ze open te klikken en op de juiste plek op de kaart te tikken.
--   Radius = 50m default voor wat buffer bij GPS-onnauwkeurigheid.
-- ================================================================

DELETE FROM tasks       WHERE event_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM locations   WHERE event_id = '00000000-0000-0000-0000-000000000001';

-- ===== Locaties =====
INSERT INTO locations (event_id, name, description, lat, lng, radius_meters, arrival_points, bonus_first, bonus_second, bonus_third, sort_order) VALUES
('00000000-0000-0000-0000-000000000001', 'Hertog Janplein',  'Centraal plein. Squad-vergaderlocatie.',           51.6010, 5.6054, 50, 10, 5, 3, 1, 1),
('00000000-0000-0000-0000-000000000001', 'Kerk Erp',         'Sint-Servatius / Kerkstraat. Monument vibes.',     51.5984, 5.6086, 50, 10, 5, 3, 1, 2),
('00000000-0000-0000-0000-000000000001', 'Brink Erp',        'Hartje centrum. Bakker en winkeltjes hier.',       51.6005, 5.6065, 50, 10, 5, 3, 1, 3),
('00000000-0000-0000-0000-000000000001', 'Cruijgenstraat',   'Woonbuurt-tour. Verkenning.',                      51.6009, 5.6091, 50, 10, 5, 3, 1, 4),
('00000000-0000-0000-0000-000000000001', 'Heesakker',        'Rand van het dorp. Groen en rustig.',              51.6015, 5.6131, 60, 10, 5, 3, 1, 5);

-- ===== Location-bound challenges =====
INSERT INTO tasks (event_id, location_id, title, description, type, max_points, options, requires_approval, sort_order)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  l.id,
  v.title,
  v.description,
  v.task_type::task_type,
  v.max_points,
  v.options::jsonb,
  v.requires_approval,
  v.sort_order
FROM locations l
JOIN (VALUES
  -- Hertog Janplein
  ('Hertog Janplein',
   'Plein Dance Drop',
   E'10 seconden squad-choreo op een TikTok-trend. Iedereen in beeld.\n\nVideo of foto-burst — verras ons.',
   'photo', 20, NULL, true, 1),
  ('Hertog Janplein',
   'Plein Rating',
   E'Geef het Hertog Janplein een cijfer uit 10. Onderbouw met 2 zinnen waarom.\n\nWees eerlijk en grappig.',
   'text', 15, NULL, true, 2),

  -- Kerk Erp
  ('Kerk Erp',
   'Cathedral Aesthetic',
   E'Maak de meest aesthetic shot van de kerk die je kunt.\n\nSpeel met de hoek: heel laag, heel schuin, vanuit een raam? Hoe creatiever, hoe meer likes.',
   'photo', 20, NULL, true, 1),
  ('Kerk Erp',
   'Servatius Quiz',
   'Sint-Servatius is in de katholieke kerk vooral bekend als beschermheilige tegen wat?',
   'multiple_choice', 10,
   '{"choices":["Brand en rampen","Verkeer","Examens","Verveling"],"correct":0}',
   false, 2),

  -- Brink Erp
  ('Brink Erp',
   'Foodie Drop',
   E'Koop iets kleins bij de bakker of supermarkt. Film of fotografeer het als een foodie-vlogger.\n\nDenk: close-up, perfect licht, een bite-moment.',
   'photo', 15, NULL, true, 1),
  ('Brink Erp',
   'Best & Worst',
   E'Squad-statement: wat is de BESTE en WORST plek in Erp tot nu toe? Eén zin per. Geen names, no shame.',
   'text', 15, NULL, true, 2),

  -- Cruijgenstraat
  ('Cruijgenstraat',
   'Hond-Spotting',
   E'Foto met 3 verschillende honden onderweg. Vraag baasje eerst om toestemming!\n\nGeen honden? Maak er katten van — wij keuren beide.',
   'photo', 20, NULL, true, 1),
  ('Cruijgenstraat',
   'Huiskleur-tel',
   'Welke kleur baksteen zie je in deze straat het meest?',
   'multiple_choice', 10,
   '{"choices":["Rood","Geel","Bruin","Wit"],"correct":0}',
   false, 2),

  -- Heesakker
  ('Heesakker',
   'Nature Reel',
   E'Maak een 5-sec story-shot van het groenste plekje dat je hier vindt. Bloem, blad, boom — alles mag.\n\nBonus voor slow-pan.',
   'photo', 15, NULL, true, 1),
  ('Heesakker',
   '3 Zintuigen',
   E'Wat ruik je, hoor je, en zie je hier? Drie zinnen. Squad-stijl.',
   'text', 15, NULL, true, 2)
) AS v(loc_name, title, description, task_type, max_points, options, requires_approval, sort_order)
  ON v.loc_name = l.name
WHERE l.event_id = '00000000-0000-0000-0000-000000000001';

-- ===== Anywhere quests (location_id NULL) =====
INSERT INTO tasks (event_id, location_id, title, description, type, max_points, options, requires_approval, sort_order) VALUES
('00000000-0000-0000-0000-000000000001', NULL,
 'High Five Collector',
 E'Krijg een high five van 5 verschillende voorbijgangers. Squad-selfie met die 5e als bewijs.',
 'photo', 25, NULL, true, 100),

('00000000-0000-0000-0000-000000000001', NULL,
 'Mirror Selfie',
 E'Vind een spiegelend oppervlak (etalage, auto, water, raam). Squad mirror-selfie. Hoe aesthetic je het kunt maken.',
 'photo', 15, NULL, true, 101),

('00000000-0000-0000-0000-000000000001', NULL,
 'Echo Check',
 E'Vind een plek met echo (tunneltje, onder brug, smalle straat). Filmpje van 5 sec waarin je squad iets roept en het hoort weerkaatsen.',
 'photo', 20, NULL, true, 102),

('00000000-0000-0000-0000-000000000001', NULL,
 'Local Hero Interview',
 E'Interview een onbekende: "Wat is jouw favoriete plek in Erp en waarom?"\n\nFilm of foto + zin antwoord noteren bij het posten.',
 'photo', 20, NULL, true, 103),

('00000000-0000-0000-0000-000000000001', NULL,
 'Color Hunt',
 E'Vind 4 dingen onderweg in de exacte kleur van je squad. Leg ze samen neer en maak een flatlay-foto.',
 'photo', 20, NULL, true, 104),

('00000000-0000-0000-0000-000000000001', NULL,
 'Tongue Twister',
 E'Hele squad zegt "Lientje leerde Lotje lopen langs de lange Lindelaan" zonder fout. Filmen tot het lukt.',
 'photo', 20, NULL, true, 105),

('00000000-0000-0000-0000-000000000001', NULL,
 'Bestie Sync',
 E'Squad-foto waarin iedereen exact dezelfde pose doet. Synced energy.',
 'photo', 15, NULL, true, 106),

('00000000-0000-0000-0000-000000000001', NULL,
 'Caption Master',
 E'Verzin de meest virale TikTok-caption voor je dag tot nu toe. Max 1 zin, max savage.',
 'text', 15, NULL, true, 107),

('00000000-0000-0000-0000-000000000001', NULL,
 'Squad Shoutout',
 E'Maak een 10-sec vlog waarin je iedereen in je squad één leuk compliment geeft. Inclusief jezelf.',
 'photo', 20, NULL, true, 108),

('00000000-0000-0000-0000-000000000001', NULL,
 'Mystery Snack Review',
 E'Squad koopt 1 snack ergens. Iedereen geeft een 5-sec review op camera. Soft launch food-vlogger style.',
 'photo', 25, NULL, true, 109);
