-- Tilføj 'light_fingering' til thickness_category enum så meget tynde garner
-- (Holst Coast, Filcolana Saga, Isager Trio 1, Kit Couture Cashmere) kan kategoriseres korrekt.
-- Indsættes mellem lace og fingering så enum-rækkefølgen følger den faktiske tykkelse.

ALTER TYPE thickness_category ADD VALUE IF NOT EXISTS 'light_fingering' BEFORE 'fingering';
