-- ================================================================
-- Speurtocht Erp — Vervang opdrachten met Crazy 88-set
-- ================================================================
-- Project: ztccdrzjlwhxseixpmjc
-- Apply via: Dashboard → SQL Editor (kopieer/plak deze hele file)
--
-- BELANGRIJK: Voer dit ALLEEN uit in het Supabase project
-- ztccdrzjlwhxseixpmjc. Check dashboard URL voordat je 'Run' klikt.
--
-- Verwijdert alle bestaande tasks (en hun submissions via cascade)
-- voor het actieve event en plaatst de Crazy 88-set terug.
--
-- Idempotent: meermalen runnen is veilig — bij elke run start je
-- met dezelfde 30 opdrachten.
-- ================================================================

do $$
declare
  v_event_id uuid;
  v_count int;
begin
  select count(*) into v_count from events where active = true;
  if v_count = 0 then
    raise exception 'Geen actief event gevonden — zet eerst een event op active=true';
  end if;
  if v_count > 1 then
    raise exception 'Meerdere actieve events; deze seed werkt alleen met één actief event';
  end if;
  select id into v_event_id from events where active = true;

  -- Cascades naar submissions (task_id REFERENCES tasks ... ON DELETE CASCADE).
  delete from tasks where event_id = v_event_id;

  insert into tasks (
    event_id, type, title, description, max_points,
    min_photos, max_photos, min_seconds, max_seconds,
    requires_approval, sort_order
  ) values
    -- ===== Speel-challenges (snel, op de plek) =====
    (v_event_id, 'video', 'Danschallenge',
     'Doe 20 seconden een gekke dans in slow motion.',
     10, null, null, 5, 20, true, 10),

    (v_event_id, 'photo', 'Complimentenrun',
     'Geef drie mensen in je team een origineel compliment — maak van elke persoon een foto terwijl ze de compliment krijgen.',
     10, 3, 3, null, null, true, 20),

    (v_event_id, 'photo', 'Emoji-gezicht',
     'Trek een gezicht dat lijkt op een emoji en laat anderen raden welke. Stuur een foto van het gezicht in.',
     10, 1, 1, null, null, true, 30),

    (v_event_id, 'video', 'Dierenimitatie',
     'Doe 10 seconden alsof je een kip bent. Klok-klok!',
     10, null, null, 5, 10, true, 40),

    (v_event_id, 'video', 'Tongbreker',
     'Zeg een tongbreker drie keer snel achter elkaar. Bijvoorbeeld: "De koetsier poetst de postkoets".',
     10, null, null, 3, 15, true, 50),

    (v_event_id, 'photo', 'Gekke selfie',
     'Maak een selfie met het gekste gezicht dat je kunt.',
     10, 1, 1, null, null, true, 60),

    (v_event_id, 'photo', 'Snoepstapel',
     'Stapel 5 snoepjes op elkaar zonder dat ze omvallen en maak een foto.',
     10, 1, 1, null, null, true, 70),

    (v_event_id, 'photo', 'Schaduwfiguur',
     'Maak met je handen een schaduwfiguur op de muur en fotografeer het.',
     10, 1, 1, null, null, true, 80),

    (v_event_id, 'text', 'Mini-mop',
     'Vertel een mop van maximaal één zin. Typ de mop hieronder.',
     10, null, null, null, null, true, 90),

    (v_event_id, 'video', 'Gekke loop',
     'Loop 10 meter alsof je op de maan loopt. Film het filmpje van opzij.',
     10, null, null, 5, 15, true, 100),

    (v_event_id, 'video', 'Spiegelspel',
     'Spiegel 10 seconden lang de bewegingen van iemand anders. Film jezelf én de ander in beeld.',
     10, null, null, 5, 15, true, 110),

    (v_event_id, 'photo', 'Schaduwfoto',
     'Maak een foto van jullie schaduw in een grappige vorm.',
     10, 1, 1, null, null, true, 120),

    -- ===== Speur-challenges (door Erp lopen) =====
    (v_event_id, 'photo', 'Straatnaambingo',
     'Vind een straatnaam met een dier erin (bijv. Leeuwerikstraat) en maak een foto van het straatnaambord.',
     10, 1, 1, null, null, true, 130),

    (v_event_id, 'video', 'Dorpsgeluid',
     'Neem een kort filmpje op van iets typisch dorps (fontein, kerkklok, markt). Zorg dat het geluid duidelijk te horen is.',
     10, null, null, 3, 15, true, 140),

    (v_event_id, 'text', 'Brugchallenge',
     'Tel hoeveel stappen het kost om een brug over te steken. Typ het aantal stappen in.',
     10, null, null, null, null, true, 150),

    (v_event_id, 'photo', 'Teamfoto bij kunst',
     'Maak een groepsfoto bij een standbeeld of kunstwerk.',
     10, 1, 1, null, null, true, 160),

    (v_event_id, 'photo', 'Brievenbusjacht',
     'Vind een brievenbus en maak een foto van de eerstvolgende ophaaltijd.',
     10, 1, 1, null, null, true, 170),

    (v_event_id, 'photo', 'Winkelzoeker',
     'Vind een winkel met een logo in de kleur groen en fotografeer het logo.',
     10, 1, 1, null, null, true, 180),

    (v_event_id, 'text', 'Dorpsquiz',
     'Beantwoord: hoeveel ramen tel je aan de voorkant van het Raadhuis? Typ het getal.',
     10, null, null, null, null, true, 190),

    (v_event_id, 'text', 'Trapchallenge',
     'Ren een trap op en af bij het Raadhuis en tel de treden. Typ het aantal treden.',
     10, null, null, null, null, true, 200),

    (v_event_id, 'photo', 'Dorpsdieren',
     'Spot drie verschillende dieren en maak van elk een foto.',
     10, 3, 3, null, null, true, 210),

    (v_event_id, 'photo', 'Huisnummerfoto',
     'Maak een foto van een bijzonder huisnummer (heel hoog, raar getal, mooi bordje).',
     10, 1, 1, null, null, true, 220),

    (v_event_id, 'text', 'Boomknuffel',
     'Vind de dikste boom die je tegenkomt en meet hem met armen om hem heen. Typ hoeveel armen het waren.',
     10, null, null, null, null, true, 230),

    (v_event_id, 'photo', 'Straatpuzzel',
     'Vind een straatnaam die eindigt op "weg" en fotografeer het bord.',
     10, 1, 1, null, null, true, 240),

    (v_event_id, 'photo', 'Kleurenspeur',
     'Vind iets dat glinstert en maak er een foto van.',
     10, 1, 1, null, null, true, 250),

    (v_event_id, 'photo', 'Kerkdeur-detail',
     'Zoek een bijzonder detail op of bij de kerkdeur en fotografeer het.',
     10, 1, 1, null, null, true, 260),

    (v_event_id, 'photo', 'Vogelscore',
     'Spot drie verschillende vogelsoorten en maak er foto''s van.',
     10, 3, 3, null, null, true, 270),

    (v_event_id, 'photo', 'Skatebaan-pose',
     'Doe een stoere skatepose op de skatebaan — maak er een foto van.',
     10, 1, 1, null, null, true, 280),

    (v_event_id, 'photo', 'Tuinquiz',
     'Vind een tuin met iets opvallends (kabouter, vlag, beeldje) en fotografeer het.',
     10, 1, 1, null, null, true, 290),

    (v_event_id, 'photo', 'Dorpssymbool Erp',
     'Vind iets dat typisch is voor Erp en maak er een foto van.',
     10, 1, 1, null, null, true, 300);

  raise notice 'Tasks vervangen voor event %', v_event_id;
end $$;
