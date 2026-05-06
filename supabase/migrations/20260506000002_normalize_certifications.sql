-- Normalisér certifications-strenge i yarns.
-- Forskellige skrivemåder af samme certificering (Oeko-Tex 100, Oeko-Tex Standard 100,
-- (Class I), (Class 1)) samles til ét kanonisk navn så filtret fungerer fornuftigt.
-- DISTINCT i array-construct fjerner duplikater hvis et garn havde flere varianter.

UPDATE yarns
SET certifications = ARRAY(
  SELECT DISTINCT
    CASE
      WHEN c ILIKE 'oeko-tex%' THEN 'Oeko-Tex Standard 100'
      WHEN c = 'GOTS (bomuld)'  THEN 'GOTS'
      ELSE c
    END
  FROM unnest(certifications) AS c
)
WHERE certifications IS NOT NULL;
