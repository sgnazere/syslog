# SysLog — Système de gestion logistique

## Stack technique
- **Backend** : Node.js + Express + PostgreSQL (pg)
- **Frontend** : React 18 + TypeScript + Vite + Tailwind CSS
- **Auth** : JWT + bcryptjs
- **RBAC** : 4 rôles — employee | manager | logistic | admin

## Démarrage rapide

### Prérequis
- Node.js 18+
- PostgreSQL 14+
- npm ou yarn

### 1. Cloner et installer
```bash
# Backend
cd backend && npm install
cp .env.example .env
# → Renseigner DB_* et JWT_SECRET dans .env

# Frontend
cd ../frontend && npm install
```

### 2. Base de données
```bash
# Créer la base de développement
psql -U postgres -c "CREATE DATABASE eclog;"

# Appliquer le schéma (si pas de DB existante)
psql -U postgres -d eclog -f backend/src/migrations/schema.sql

# Données initiales (utilisateurs + véhicules + jours fériés)
cd backend && npm run seed
```

### 3. Lancer
```bash
# Terminal 1 — Backend
cd backend && npm run dev     # http://localhost:5000

# Terminal 2 — Frontend
cd frontend && npm run dev    # http://localhost:5173
```

## Comptes actuellement présents dans la base
Les comptes ci-dessous reflètent l’état réel de la table `users` dans la base PostgreSQL. Les mots de passe ne sont pas lisibles directement dans la base car ils sont stockés hachés (bcrypt), mais ils peuvent être réinitialisés par un administrateur depuis l’interface ou via l’API.

| Nom | Prénom | Email | Rôle | Statut |
|------|--------|-------|------|--------|
| ADMIN | System | ss.hf@ec-ci.org | Admin | Actif |
| GNAZERE | Ouraga Alain Serge | sgnazere@gmail.com | Admin | Actif |
| BOSSE | Zadou Marius | czo.hf@ec-ci.org | Utilisateur | Actif |
| KRA | Kouakou Bertin | log.afd@ec-ci.org | Manager | Actif |
| THES | HIBORY JOSEPH | czn.hf@ec-ci.org | Utilisateur | Actif |
| KEIPO | VALENTIN | cpg.hf@ec-ci.org | Manager | Actif |

> Pour obtenir ou réinitialiser un mot de passe, utiliser la procédure d’administration prévue dans le module “Accès & Rôles” du projet.

## Structure du projet
```
syslog/
├── backend/
│   └── src/
│       ├── config/       → Connexion PostgreSQL
│       ├── controllers/  → Logique métier
│       ├── middlewares/  → Auth JWT, audit, validation
│       ├── routes/       → Endpoints API
│       ├── services/     → Services réutilisables
│       └── migrations/   → Schema SQL + seed
├── frontend/
│   └── src/
│       ├── components/   → Composants réutilisables
│       ├── contexts/     → AuthContext
│       ├── hooks/        → Custom hooks (React Query)
│       ├── lib/          → API client axios + constantes
│       ├── pages/        → Pages de l'application
│       └── types/        → Types TypeScript
└── README.md
```

## Routes API principales
| Méthode | Route | Rôle |
|---------|-------|------|
| POST | /api/auth/login | Public |
| GET  | /api/auth/me | Tous |
| GET  | /api/requests | Tous |
| POST | /api/requests | Employé+ |
| PATCH| /api/requests/:id/approve | Manager |
| PATCH| /api/requests/:id/reject  | Manager |
| PATCH| /api/requests/:id/assign  | Logistique |
| GET  | /api/users | Admin |
| POST | /api/users | Admin |
| GET  | /api/vehicles | Tous |
| GET  | /api/drivers  | Tous |
| GET  | /api/reports/summary | Manager+ |
| GET  | /api/audit | Admin |
