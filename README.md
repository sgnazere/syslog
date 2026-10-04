# SysLog — Système de gestion logistique

Application web de gestion des sorties terrain de l'ONG Espace Confiance : demandes de sortie (une ou plusieurs communes), validation avec affectation d'un véhicule et d'un chauffeur, clôture des missions avec kilométrage, parc automobile, chauffeurs, maintenance, notifications (application et WhatsApp), jours fériés, journal d'audit et licence.

**Stack** : React 18 + TypeScript + Vite · Node.js + Express · PostgreSQL

## Documentation

| Document | Public |
|---|---|
| [Documentation utilisateur](docs/DOCUMENTATION_UTILISATEUR.md) | Utilisateurs, managers, administrateurs |
| [Documentation technique](docs/DOCUMENTATION_TECHNIQUE.md) | Développeurs, administrateurs système : architecture, installation, API, base de données, sécurité, audit, déploiement, feuille de route |

## Démarrage rapide (développement)

```bash
# Backend
cd backend
npm install
cp .env.example .env            # renseigner DB_*, JWT_SECRET, LICENSE_SECRET
npm run migrate
npm run create-admin -- admin@exemple.ci Nom Prénom
npm run dev                     # http://localhost:5000

# Frontend
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

Détails, déploiement en production et dépannage : [documentation technique](docs/DOCUMENTATION_TECHNIQUE.md).

## Tests

```bash
cd backend && npm test                  # unitaires et HTTP
cd backend && INTEGRATION=1 npm test    # + scénario complet sur la base configurée
cd frontend && npm run typecheck && npm run build
```

---

Gesmalync © 2026 — Développé pour ONG Espace Confiance
