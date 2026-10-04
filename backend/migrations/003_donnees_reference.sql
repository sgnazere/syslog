-- ============================================================
-- 003 — Données de référence (communes, districts, services)
-- N'insère que les valeurs absentes.
-- ============================================================

INSERT INTO communes (nom)
SELECT v.nom FROM (VALUES
  ('Abobo'), ('Adjamé'), ('Attécoubé'), ('Cocody'), ('Koumassi'), ('Marcory'),
  ('Plateau'), ('Port-Bouët'), ('Treichville'), ('Yopougon'), ('Anyama')
) AS v(nom)
WHERE NOT EXISTS (SELECT 1 FROM communes c WHERE c.nom = v.nom);

INSERT INTO districts (nom)
SELECT v.nom FROM (VALUES
  ('District Abobo-Est'), ('District Abobo-Ouest'), ('District Anyama'),
  ('District Yopougon-Est'), ('District Yopougon-Ouest-Songon'), ('District des Lacs')
) AS v(nom)
WHERE NOT EXISTS (SELECT 1 FROM districts d WHERE d.nom = v.nom);

INSERT INTO services (nom)
SELECT v.nom FROM (VALUES
  ('Ressources Humaines'), ('Informatique'), ('Information Stratégique'), ('Comptabilité'),
  ('Logistique'), ('Programme'), ('Audit-Contrôle'), ('Direction Exécutive'), ('Conseil Administration')
) AS v(nom)
WHERE NOT EXISTS (SELECT 1 FROM services s WHERE s.nom = v.nom);
