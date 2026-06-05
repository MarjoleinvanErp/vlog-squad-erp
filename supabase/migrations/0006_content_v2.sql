-- ================================================================
-- Speurtocht Erp - CONTENT v2 (Crazy 88 stijl voor 11-jarigen)
-- ================================================================
-- 12 locaties met 1 challenge elk
-- 43 anywhere quests in 5 moeilijkheidsgraden
--
-- Vervangt 0003_erp_content.sql volledig. Idempotent:
-- wist eerst bestaande locaties + tasks voor het seed event en
-- zet alles vers neer.
--
-- Als je een ANDER event_id gebruikt, zoek-en-vervang het UUID
-- hieronder voor jouw event-id (zie /admin/event).
--
-- Coords zijn best-guesses uit OSM Nominatim. Verifieer in
-- /admin/locations met de map-picker — radius is 50m default.
-- ================================================================

DELETE FROM tasks     WHERE event_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM locations WHERE event_id = '00000000-0000-0000-0000-000000000001';

-- ===== Locaties (12) =====
INSERT INTO locations (event_id, name, description, lat, lng, radius_meters, arrival_points, bonus_first, bonus_second, bonus_third, sort_order) VALUES
('00000000-0000-0000-0000-000000000001', 'Hertog Janplein',     'Centraal plein in Erp.',                     51.6010, 5.6054, 50, 10, 5, 3, 1, 1),
('00000000-0000-0000-0000-000000000001', 'Sint-Servatiuskerk',  'De kerk aan de Kerkstraat.',                 51.5984, 5.6086, 50, 10, 5, 3, 1, 2),
('00000000-0000-0000-0000-000000000001', 'Brink Erp',           'Hartje centrum.',                            51.6005, 5.6065, 50, 10, 5, 3, 1, 3),
('00000000-0000-0000-0000-000000000001', 'Bakker De Hoek',      'Voor lekkers tussendoor.',                   51.6008, 5.6068, 50, 10, 5, 3, 1, 4),
('00000000-0000-0000-0000-000000000001', 'Speeltuin Erp',       'Glijbaan en schommels.',                     51.6014, 5.6075, 50, 10, 5, 3, 1, 5),
('00000000-0000-0000-0000-000000000001', 'Molen Antonius',      'De molen van Erp.',                          51.6020, 5.6045, 50, 10, 5, 3, 1, 6),
('00000000-0000-0000-0000-000000000001', 'Cruijgenstraat',      'Woonbuurt-verkenning.',                      51.6009, 5.6091, 50, 10, 5, 3, 1, 7),
('00000000-0000-0000-0000-000000000001', 'Heesakker',           'Rustige rand van het dorp.',                 51.6015, 5.6131, 60, 10, 5, 3, 1, 8),
('00000000-0000-0000-0000-000000000001', 'Aa-park',             'Groen langs het water.',                     51.5998, 5.6030, 60, 10, 5, 3, 1, 9),
('00000000-0000-0000-0000-000000000001', 'Sportpark De Pijl',   'Voetbal en buitensport.',                    51.6035, 5.6080, 80, 10, 5, 3, 1, 10),
('00000000-0000-0000-0000-000000000001', 'Basisschool',         'Eigen school van de jarige.',                51.6020, 5.6105, 60, 10, 5, 3, 1, 11),
('00000000-0000-0000-0000-000000000001', 'Veghelsedijk 5',      'Eindpunt — feestadres.',                     51.6027, 5.5936, 40, 15, 5, 3, 1, 12);

-- ===== Location-bound tasks (12, één per locatie) =====
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
  ('Hertog Janplein',
   'Plein Dance Drop',
   E'Choreo op een TikTok-trend. Hele squad in beeld.\n\nMax 15 sec video.',
   'photo', 20, NULL, true, 1),

  ('Sint-Servatiuskerk',
   'Servatius Quiz',
   'Sint-Servatius is in de katholieke kerk vooral bekend als beschermheilige tegen wat?',
   'multiple_choice', 10,
   '{"choices":["Brand en rampen","Verkeer","Examens","Verveling"],"correct":0}',
   false, 1),

  ('Brink Erp',
   'Foodie Bite',
   E'Bite-moment van iets kleins dat je net bij bakker of winkel hebt gekocht. Foodie-style close-up.',
   'photo', 15, NULL, true, 1),

  ('Bakker De Hoek',
   'Bakery Aesthetic',
   E'Aesthetic close-up van je broodje, koekje of wat-dan-ook. Caption als food-vlogger.',
   'photo', 15, NULL, true, 1),

  ('Speeltuin Erp',
   'Glijbaan POV',
   E'POV-shot vanaf de glijbaan naar beneden. Foto of korte video (max 10 sec).',
   'photo', 15, NULL, true, 1),

  ('Molen Antonius',
   'Forced Perspective',
   E'Squad poseert alsof jullie de wieken van de molen vasthouden of duwen. Speel met afstand en hoek!',
   'photo', 15, NULL, true, 1),

  ('Cruijgenstraat',
   'Dog + Owner',
   E'Foto met 1 hond én baasje die je hier tegenkomt. Vraag eerst toestemming!\n\nKat mag ook.',
   'photo', 15, NULL, true, 1),

  ('Heesakker',
   '3 Zintuigen',
   E'Wat ruik, hoor en zie je hier? 3 zinnen, squad-stijl.',
   'text', 10, NULL, true, 1),

  ('Aa-park',
   'Water Reflection',
   E'De mooiste foto van een weerspiegeling in het water. Bonus voor squad in beeld.',
   'photo', 15, NULL, true, 1),

  ('Sportpark De Pijl',
   'Goal Celebration',
   E'Squad in epic goal-vier-pose voor het doel. Schreeuwen mag (en moet).',
   'photo', 15, NULL, true, 1),

  ('Basisschool',
   'Back to School',
   E'Squad-foto voor de school met "back to school"-vibe. Doe alsof je naar binnen rent.',
   'photo', 10, NULL, true, 1),

  ('Veghelsedijk 5',
   'Final Group Photo',
   E'Eindfoto van de squad bij het feestadres. Iedereen lacht, of doet expres niet — jullie keuze.',
   'photo', 20, NULL, true, 1)
) AS v(loc_name, title, description, task_type, max_points, options, requires_approval, sort_order)
  ON v.loc_name = l.name
WHERE l.event_id = '00000000-0000-0000-0000-000000000001';

-- ===== Anywhere quests (43) =====

-- Easy 10p (chill, squad-only)
INSERT INTO tasks (event_id, location_id, title, description, type, max_points, options, requires_approval, sort_order) VALUES
('00000000-0000-0000-0000-000000000001', NULL, 'Mirror Moment',     E'Vind een spiegelend oppervlak (auto, etalage, water, raam). Squad mirror-selfie.',                                  'photo', 10, NULL, true, 100),
('00000000-0000-0000-0000-000000000001', NULL, 'Sky Shot',          E'De mooiste lucht-foto die je vandaag schiet.',                                                                       'photo', 10, NULL, true, 101),
('00000000-0000-0000-0000-000000000001', NULL, 'Random Object',     E'Vind 1 raar of grappig object onderweg. Maak hier een minimalist still-life van.',                                   'photo', 10, NULL, true, 102),
('00000000-0000-0000-0000-000000000001', NULL, 'Color Burst',       E'Vind 1 ding in jullie squad-kleur (bloem, deur, bord, vlag). Aesthetic foto.',                                       'photo', 10, NULL, true, 103),
('00000000-0000-0000-0000-000000000001', NULL, 'Squad Sync',        E'Squad-foto waarin iedereen exact dezelfde gekke pose doet.',                                                         'photo', 10, NULL, true, 104),
('00000000-0000-0000-0000-000000000001', NULL, 'Day Rating',        E'Geef jullie dag tot nu toe een cijfer uit 10 + 1 zin uitleg.',                                                       'text',  10, NULL, true, 105),
('00000000-0000-0000-0000-000000000001', NULL, 'Inside Joke',       E'Verzin samen 1 inside joke voor deze squad. Schrijf op (max 20 woorden) — dit is jullie geheime motto.',             'text',  10, NULL, true, 106),
('00000000-0000-0000-0000-000000000001', NULL, 'Best & Worst Erp',  E'Beste en slechtste plek in Erp tot nu toe. 1 zin per. Wees eerlijk en grappig.',                                     'text',  10, NULL, true, 107),
('00000000-0000-0000-0000-000000000001', NULL, 'Caption Master',    E'Bedenk de meest virale TikTok-caption voor jullie dag. Max 1 zin. Max savage.',                                      'text',  10, NULL, true, 108),
('00000000-0000-0000-0000-000000000001', NULL, 'Find Blauws',       E'Vind iets felblauws onderweg. Aesthetic foto.',                                                                       'photo', 10, NULL, true, 109),
('00000000-0000-0000-0000-000000000001', NULL, 'Find Geels',        E'Vind iets felgeels onderweg. Aesthetic foto.',                                                                        'photo', 10, NULL, true, 110),
('00000000-0000-0000-0000-000000000001', NULL, 'Find Iets Ouds',    E'Vind iets dat er heel oud uitziet (deur, bord, fiets, hek). Foto.',                                                  'photo', 10, NULL, true, 111),
('00000000-0000-0000-0000-000000000001', NULL, 'Find Letter S',     E'Vind een letter S in een bord, straatnaam of teken. Foto.',                                                          'photo', 10, NULL, true, 112),
('00000000-0000-0000-0000-000000000001', NULL, 'Find Iets Nats',    E'Vind iets waar water bij komt kijken (fontein, poel, regenton, sloot). Foto.',                                       'photo', 10, NULL, true, 113),
('00000000-0000-0000-0000-000000000001', NULL, 'Squad on Bench',    E'Squad-foto op een bankje. Allemaal in beeld, allemaal anders zittend.',                                              'photo', 10, NULL, true, 114),
('00000000-0000-0000-0000-000000000001', NULL, 'Stay Still 10s',    E'Film 10 seconden waarin NIEMAND beweegt. Eén persoon filmt. Hoe stiller hoe beter.',                                  'photo', 10, NULL, true, 115),
('00000000-0000-0000-0000-000000000001', NULL, 'High Note',         E'Film 5 sec van 1 squadlid die zo hoog mogelijk zingt. De rest mag niet lachen.',                                      'photo', 10, NULL, true, 116),
('00000000-0000-0000-0000-000000000001', NULL, 'Wild Flower',       E'Vind 1 wilde bloem langs de weg (niet uit een tuin). Aesthetic close-up.',                                            'photo', 10, NULL, true, 117);

-- Medium 15p (groep-video 10s)
INSERT INTO tasks (event_id, location_id, title, description, type, max_points, options, requires_approval, sort_order) VALUES
('00000000-0000-0000-0000-000000000001', NULL, 'Slow-mo Intro',     E'Iedereen loopt 1 voor 1 door beeld in slow-motion alsof het een vlog-intro is. 10 sec video.',                       'photo', 15, NULL, true, 120),
('00000000-0000-0000-0000-000000000001', NULL, 'Echo Check',        E'Vind een plek met echo (tunnel, brug, smalle straat). Film 10 sec terwijl je iets roept en het weerkaatst hoort.',  'photo', 15, NULL, true, 121),
('00000000-0000-0000-0000-000000000001', NULL, 'Vlog Intro',        E'Squad zegt "Hi vlog, dit is squad [jullie naam]!" synced in beeld. Max 10 sec.',                                     'photo', 15, NULL, true, 122),
('00000000-0000-0000-0000-000000000001', NULL, 'Synchronized Clap', E'Hele squad klapt tegelijk op exact hetzelfde moment. Eén take, geen edits. 10 sec.',                                'photo', 15, NULL, true, 123),
('00000000-0000-0000-0000-000000000001', NULL, 'Compliment Video',  E'Maak een 10s vlog waarin iedereen 1 squad-lid een leuk compliment geeft.',                                          'photo', 15, NULL, true, 124),
('00000000-0000-0000-0000-000000000001', NULL, 'Trio Walk',         E'3 squadleden lopen exact gelijk (zelfde voet eerst, zelfde tempo). Filmen van zijkant. 10 sec.',                    'photo', 15, NULL, true, 125),
('00000000-0000-0000-0000-000000000001', NULL, 'Backwards Walk',    E'Hele squad loopt achteruit zonder te vallen of botsen. Maximaal grappig. 10 sec.',                                  'photo', 15, NULL, true, 126),
('00000000-0000-0000-0000-000000000001', NULL, 'Funny Faces',       E'5 verschillende gekke gezichten van de squad, snel achter elkaar in 10 sec.',                                       'photo', 15, NULL, true, 127),
('00000000-0000-0000-0000-000000000001', NULL, 'Pet a Pet',         E'Vraag 1 baasje of je hun hond of kat mag aaien. Foto met dier + baasje.',                                            'photo', 15, NULL, true, 128);

-- Medium 20p (stranger-light of 15s)
INSERT INTO tasks (event_id, location_id, title, description, type, max_points, options, requires_approval, sort_order) VALUES
('00000000-0000-0000-0000-000000000001', NULL, 'High Five',         E'Vraag 1 voorbijganger om jullie squad een high five te geven. Iedereen in beeld. 10 sec video. Vraag toestemming!', 'photo', 20, NULL, true, 130),
('00000000-0000-0000-0000-000000000001', NULL, 'Mystery Interview', E'Vraag 1 vreemde "Wat is je favoriete plek in Erp?". Foto met diegene + schrijf het antwoord erbij in caption.',     'photo', 20, NULL, true, 131),
('00000000-0000-0000-0000-000000000001', NULL, 'Handtekening',      E'Vraag 1 voorbijganger om een handtekening op een papiertje. Foto van het papier + diegene erbij.',                  'photo', 20, NULL, true, 132),
('00000000-0000-0000-0000-000000000001', NULL, 'Buurman Quiz',      E'Vraag 1 bewoner: "Hoe lang woont u al in Erp?". Foto + antwoord erbij in caption.',                                  'photo', 20, NULL, true, 133),
('00000000-0000-0000-0000-000000000001', NULL, 'Tongue Twister',    E'Hele squad zegt samen "Lientje leerde Lotje lopen langs de lange Lindelaan" zonder fout. Film tot het lukt. 15 sec.','photo', 20, NULL, true, 134),
('00000000-0000-0000-0000-000000000001', NULL, 'News Reporter',     E'1 squadlid is reporter en interviewt een ander squadlid over hun top-Erp-tip. 15 sec video.',                       'photo', 20, NULL, true, 135),
('00000000-0000-0000-0000-000000000001', NULL, 'Karaoke',           E'Squad zingt samen een herkenbaar refrein van een nummer. 15 sec, full energy.',                                      'photo', 20, NULL, true, 136);

-- Hard 25p (durf)
INSERT INTO tasks (event_id, location_id, title, description, type, max_points, options, requires_approval, sort_order) VALUES
('00000000-0000-0000-0000-000000000001', NULL, 'Stranger Compliment', E'Geef 1 voorbijganger een lief compliment op camera. "Mooi shirt!" / "Wat een vrolijk haar!" — 15 sec video.',     'photo', 25, NULL, true, 140),
('00000000-0000-0000-0000-000000000001', NULL, 'Dance Battle',        E'2 squadleden doen een dance-battle. Rest is publiek (juicht en lacht). 15 sec video.',                            'photo', 25, NULL, true, 141),
('00000000-0000-0000-0000-000000000001', NULL, 'Dramatic Gasp',       E'Squad doet een dramatische TV-soap acteer-scene. Iemand "valt flauw". 10 sec video, vol drama.',                  'photo', 25, NULL, true, 142),
('00000000-0000-0000-0000-000000000001', NULL, 'Notitje Overhandigen',E'Schrijf "Hou je dag :)" op een papiertje. Overhandig het aan een vreemde. Foto van het moment.',                  'photo', 25, NULL, true, 143),
('00000000-0000-0000-0000-000000000001', NULL, 'Mega Squad Hug',      E'Vraag een vrijwilliger of de squad samen een groepsknuffel mag geven. Foto van de hug.',                          'photo', 25, NULL, true, 144);

-- Legendary 40p (the wild ones)
INSERT INTO tasks (event_id, location_id, title, description, type, max_points, options, requires_approval, sort_order) VALUES
('00000000-0000-0000-0000-000000000001', NULL, 'Mannequin Challenge',E'Hele squad bevroren in een pose, 1 lid filmt en loopt langs iedereen heen. Niemand mag bewegen. 15 sec.',           'photo', 40, NULL, true, 150),
('00000000-0000-0000-0000-000000000001', NULL, 'Trick Shot',         E'Gooi iets vanuit afstand in een doel (afvalbak, beker, kring op de grond). Film vanaf 1e poging tot het lukt. 15 sec.','photo', 40, NULL, true, 151),
('00000000-0000-0000-0000-000000000001', NULL, 'Squad Freeze',       E'Hele squad bevroren in standbeeld-pose ergens buiten. Wie kan het 30 sec volhouden zonder bewegen? Foto van het moment.','photo', 40, NULL, true, 152),
('00000000-0000-0000-0000-000000000001', NULL, 'Reverse Vlog',       E'Squad doet alles omgekeerd: lopen achterwaarts, eten van bord halen i.p.v. erop leggen, spreuken zeggen achterstevoren. 15 sec, geen edits.','photo', 40, NULL, true, 153);
