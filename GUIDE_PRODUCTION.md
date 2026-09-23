# SYSLOG — Guide de Déploiement en Production

**Version :** 1.0.0  
**Date :** Juillet 2026  
**Préparé par :** Gesmalync — Serges Alain GNAZERE  
**Client :** ONG Espace Confiance  

---

## Résumé — Ce qui diffère entre développement et production

| Élément | Dev (poste local) | Production (serveur) |
|---|---|---|
| `NODE_ENV` | `development` | **`production`** |
| `JWT_SECRET` | faible (pour tests) | **64 caractères aléatoires** |
| `LICENSE_SECRET` | secret dev | **autre secret 64 caractères** |
| `DB_NAME` | `eclog` (dev) | **`syslog_prod` (prod)** |
| `DB_USER` | postgres | **utilisateur dédié `syslog_user`** |
| `DB_PASSWORD` | postgres | **mot de passe fort** |
| `FRONTEND_URL` | localhost:5173 | **https://votre-domaine.ci** |
| Démarrage backend | `npm run dev` (nodemon) | **PM2 process manager** |
| Frontend servi | Vite dev server | **Nginx + dossier dist/** |
| HTTPS / SSL | Non | **Oui (Let's Encrypt — gratuit)** |
| Licence | Clé dev | **Nouvelle clé prod** |

---

## Ce qui N'a PAS besoin de changer dans le code

| Fichier | Raison |
|---|---|
| `frontend/src/lib/api.ts` | `baseURL: '/api'` fonctionne via Nginx en production |
| `vite.config.ts` (proxy) | Le proxy Vite n'est utilisé qu'en dev, ignoré dans le build |
| Tous les composants React | Code identique dev / prod |
| Contrôleurs backend | Aucun chemin codé en dur |

---

## ÉTAPE 1 — Variables d'environnement (OBLIGATOIRE)

### Fichier `backend/.env` sur le serveur de production

Créer un **nouveau** fichier `.env` sur le serveur — ne jamais copier celui du poste de développement.

```
# Mode production
NODE_ENV=production

# Secrets — DIFFÉRENTS de la version dev
JWT_SECRET=<secret 64 caractères hexadécimaux>
LICENSE_SECRET=<autre secret 64 caractères hexadécimaux>

# Base de données production
DB_HOST=localhost
DB_PORT=5432
DB_NAME=syslog_prod
DB_USER=syslog_user
DB_PASSWORD=<mot de passe fort — min 20 caractères>

# URL du frontend (domaine réel avec HTTPS)
FRONTEND_URL=https://votre-domaine.ci

# Serveur
PORT=5000

# WhatsApp (si activé)
WA_ENABLED=false
WA_PHONE_ID=PHONE_NUMBER_ID_META
WA_TOKEN=ACCESS_TOKEN_META
WA_VERIFY_TOKEN=TOKEN_WEBHOOK_PERSONNALISE
```

### Générer des secrets sécurisés

Sur le serveur de production, exécuter :

```bash
node -e "require('crypto').randomBytes(64).toString('hex').then ? '' : console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Exécuter deux fois — une fois pour `JWT_SECRET`, une fois pour `LICENSE_SECRET`.

---

## ÉTAPE 2 — Base de données (OBLIGATOIRE)

### Créer un utilisateur PostgreSQL dédié

Ne jamais utiliser le superutilisateur `postgres` en production.

```sql
-- Exécuter dans psql en tant que superutilisateur
CREATE USER syslog_user WITH PASSWORD 'MotDePasseFort2026!';
CREATE DATABASE syslog_prod OWNER syslog_user;
GRANT ALL PRIVILEGES ON DATABASE syslog_prod TO syslog_user;
```

### Appliquer les migrations dans l'ordre

```bash
psql -U syslog_user -d syslog_prod -f migrations/create_services.sql
psql -U syslog_user -d syslog_prod -f migrations/create_audit_logs.sql
psql -U syslog_user -d syslog_prod -f migrations/add_retour_mission.sql
psql -U syslog_user -d syslog_prod -f migrations/create_licences.sql
psql -U syslog_user -d syslog_prod -f migrations/fix_service_nom.sql
```

### Insérer les données initiales (services, jours fériés, etc.)

```bash
# Créer le premier compte administrateur
node backend/src/migrations/seed.js
```

### Comptes utilisateurs actuellement présents dans la base

La base de production doit être documentée avec les comptes effectivement enregistrés. À la date actuelle, la table `users` contient les comptes suivants :

| Nom | Prénom | Email | Rôle | Statut |
|------|--------|-------|------|--------|
| ADMIN | System | ss.hf@ec-ci.org | Admin | Actif |
| GNAZERE | Ouraga Alain Serge | sgnazere@gmail.com | Admin | Actif |
| BOSSE | Zadou Marius | czo.hf@ec-ci.org | User | Actif |
| KRA | Kouakou Bertin | log.afd@ec-ci.org | Manager | Actif |
| THES | HIBORY JOSEPH | czn.hf@ec-ci.org | User | Actif |
| KEIPO | VALENTIN | cpg.hf@ec-ci.org | Manager | Actif |

> Les mots de passe sont stockés sous forme hachée (bcrypt). Ils ne doivent pas être lus directement dans la base; ils doivent être réinitialisés via l’interface admin ou via une commande SQL dédiée.

> **Important :** Changer immédiatement le mot de passe du compte admin après le premier démarrage.

---

## ÉTAPE 3 — Build du frontend (OBLIGATOIRE)

```bash
cd frontend
npm install
npm run build
```

Cela génère le dossier `frontend/dist/` contenant les fichiers statiques optimisés (HTML, CSS, JS minifiés).

---

## ÉTAPE 4 — Gestionnaire de processus PM2 (OBLIGATOIRE)

PM2 maintient le serveur Node.js en marche et le redémarre automatiquement en cas de crash ou de reboot.

```bash
# Installation globale
npm install -g pm2

# Démarrer le backend
cd backend
pm2 start src/server.js --name "syslog-api" --env production

# Configurer le démarrage automatique au reboot
pm2 startup
pm2 save

# Vérifier le statut
pm2 status
pm2 logs syslog-api
```

---

## ÉTAPE 5 — Reverse Proxy Nginx (OBLIGATOIRE)

Nginx remplit deux rôles :
1. Servir les fichiers statiques du frontend (`dist/`)
2. Relayer les appels `/api` vers le backend Node.js (port 5000)

### Configuration Nginx

```nginx
# Fichier : /etc/nginx/sites-available/syslog
server {
    listen 80;
    server_name votre-domaine.ci;

    # Frontend React (fichiers statiques buildés)
    root /var/www/syslog/frontend/dist;
    index index.html;

    # Application monopage — renvoyer index.html pour toutes les routes React
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API vers le backend Node.js (port 5000)
    location /api/ {
        proxy_pass         http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    # Webhook WhatsApp
    location /webhooks/ {
        proxy_pass http://localhost:5000;
    }

    # Téléchargement manuel (endpoint docs)
    location /api/docs/ {
        proxy_pass http://localhost:5000;
    }
}
```

### Activer la configuration

```bash
sudo ln -s /etc/nginx/sites-available/syslog /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## ÉTAPE 6 — HTTPS / SSL Let's Encrypt (FORTEMENT RECOMMANDÉ)

Let's Encrypt est un certificat SSL **gratuit** renouvelé automatiquement tous les 90 jours.

```bash
# Installation de Certbot
sudo apt install certbot python3-certbot-nginx

# Obtenir et installer le certificat (remplacer le domaine)
sudo certbot --nginx -d votre-domaine.ci

# Tester le renouvellement automatique
sudo certbot renew --dry-run
```

Certbot modifie automatiquement la configuration Nginx pour forcer HTTPS et ajouter la redirection HTTP → HTTPS.

---

## ÉTAPE 7 — Nouvelle licence production (OBLIGATOIRE)

Le `LICENSE_SECRET` étant différent en production, la clé dev n'est plus valide. Il faut générer une nouvelle clé pour la production.

### Option A — Via l'API (après démarrage)

```bash
# Générer une clé depuis le serveur
node -e "
  require('dotenv').config();
  const { generateKey } = require('./src/utils/licenseKey');
  console.log('Nouvelle clé :', generateKey());
"
```

### Option B — Via la page admin

1. Se connecter à l'application avec le compte admin
2. Aller dans **Menu → Licence**
3. Onglet **"Générer une licence"**
4. Remplir : Organisation, dates, limites
5. **Copier la clé immédiatement** (affichée une seule fois)
6. Onglet **"Activer une clé"** → coller et activer

---

## ÉTAPE 8 — Sauvegardes automatiques (RECOMMANDÉ)

```bash
# Créer le dossier de sauvegardes
sudo mkdir -p /backups/syslog

# Éditer le crontab
crontab -e
```

Ajouter ces lignes :

```bash
# Sauvegarde quotidienne à 2h du matin
0 2 * * * pg_dump -U syslog_user syslog_prod > /backups/syslog/syslog_$(date +\%Y\%m\%d).sql

# Supprimer les sauvegardes de plus de 30 jours
0 3 * * * find /backups/syslog -name "*.sql" -mtime +30 -delete
```

---

## ÉTAPE 9 — Sécurité complémentaire (RECOMMANDÉ)

### Pare-feu (UFW)

```bash
sudo ufw allow 22     # SSH
sudo ufw allow 80     # HTTP
sudo ufw allow 443    # HTTPS
sudo ufw deny 5000    # Bloquer l'accès direct au backend (passe par Nginx)
sudo ufw deny 5432    # Bloquer PostgreSQL de l'extérieur
sudo ufw enable
```

### Fichier `.gitignore`

S'assurer que `.env` et les fichiers sensibles ne sont jamais committé dans Git :

```
backend/.env
backend/.env.production
*.docx
node_modules/
dist/
```

### Réinitialiser le mot de passe admin directement dans PostgreSQL

Si aucun compte admin n’est plus accessible, on peut forcer un nouveau mot de passe en remplaçant le hash bcrypt dans la base.

Exemple de commande SQL pour remettre le mot de passe admin à `Admin1234!` :

```sql
UPDATE users
SET password = '$2a$12$u0Hk2s5vQW8c4Y7F1eZ0Y.znD2Jt4r4qQ0I4v9m7kR1QJ7qQk6S6O',
    date_modification = CURRENT_TIMESTAMP
WHERE email = 'ss.hf@ec-ci.org' AND role = 'admin';
```

Le hash ci-dessus correspond au mot de passe `Admin1234!` généré avec bcrypt. Il est recommandé de le remplacer ensuite par un mot de passe plus fort et de le changer depuis l’interface admin dès que possible.

Pour générer un hash bcrypt personnalisé sur un environnement Node.js local :

```bash
node -e "const bcrypt=require('bcryptjs'); bcrypt.hash('Admin1234!',12).then(h=>console.log(h)).catch(e=>{console.error(e); process.exit(1);});"
```

---

## Options d'hébergement recommandées

| Fournisseur | Offre | Coût/mois | Notes |
|---|---|---|---|
| **OVH** | VPS Starter | ~4 € | Serveurs en Europe, support FR |
| **Contabo** | Cloud VPS 1 | ~5 € | Très bon rapport qualité/prix |
| **DigitalOcean** | Droplet Basic | ~6 $ | Interface simple, bien documenté |
| **Serveur local ONG** | — | 0 € | Requiert IP fixe + onduleur + connexion stable |

**Configuration minimale recommandée :** 2 vCPU · 2 Go RAM · 20 Go SSD · Ubuntu 22.04 LTS

---

## Checklist finale avant mise en ligne

```
[ ] .env production créé avec nouveaux secrets
[ ] Utilisateur PostgreSQL dédié créé
[ ] Base de données syslog_prod créée et migrée
[ ] npm run build exécuté → dist/ généré
[ ] Backend démarré avec PM2
[ ] Nginx configuré et actif
[ ] HTTPS activé (Let's Encrypt)
[ ] Licence production générée et activée
[ ] Mot de passe admin changé
[ ] Sauvegarde automatique configurée
[ ] Pare-feu activé (port 5000 et 5432 bloqués)
[ ] Test de connexion depuis un autre appareil
[ ] Test de création de demande complète (bout en bout)
```

---

## Contact développeur

**Gesmalync — Serges Alain GNAZERE**  
IT | Sr Meal Officer | DBA  
*Pour toute assistance lors du déploiement*

---

*Gesmalync © 2026 — Document confidentiel — ONG Espace Confiance*
