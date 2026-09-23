# SYSLOG
## Système de Gestion Logistique
### Manuel Utilisateur Complet

---

**Version :** 1.0.0  
**Date :** Juillet 2026  
**Développeur :** Gesmalync  
**Client :** ONG Espace Confiance  

---

&nbsp;

&nbsp;

&nbsp;

&nbsp;

*Document confidentiel — Reproduction interdite sans autorisation*

---

<!-- PAGE 2 -->

## PRÉFACE

Le présent manuel a été rédigé par **Gesmalync**, entreprise spécialisée dans le développement de solutions numériques adaptées aux organisations à but non lucratif et aux structures humanitaires.

**Gesmalync** est représentée par :

> **Serges Alain GNAZERE**  
> IT | Sr Meal Officer | DBA  
> Développeur et architecte principal de SysLog

Ce document constitue le guide de référence de l'application **SysLog** déployée pour le compte de l'**ONG Espace Confiance**. Il s'adresse à l'ensemble des utilisateurs du système : administrateurs, managers et agents de terrain, quelle que soit leur familiarité avec les outils informatiques.

SysLog a été conçu pour répondre aux besoins spécifiques d'Espace Confiance en matière de gestion de la mobilité : suivi du parc automobile, planification des missions terrain, gestion des chauffeurs et traçabilité des déplacements. L'application vise à réduire les délais de traitement des demandes, à optimiser l'utilisation des ressources logistiques et à produire des rapports fiables pour la coordination et les bailleurs.

Ce manuel couvre l'intégralité des fonctionnalités disponibles dans la version 1.0.0. Les sections sont organisées par module fonctionnel, avec pour chaque fonctionnalité une description détaillée et des instructions pas à pas. Une ouverture est prévue en fin de document pour les évolutions fonctionnelles planifiées.

> **Contact développeur :**  
> Gesmalync — Serges Alain GNAZERE  
> Pour toute demande de support, modification ou évolution de l'application.

---

<!-- PAGE 3 -->

## SOMMAIRE

| Section | Titre | Page |
|---------|-------|------|
| **1** | **Présentation générale** | 4 |
| 1.1 | Description de l'application | 4 |
| 1.2 | Architecture technique | 4 |
| 1.3 | Rôles et droits d'accès | 5 |
| 1.4 | Prérequis d'utilisation | 5 |
| **2** | **Connexion et authentification** | 6 |
| 2.1 | Page de connexion | 6 |
| 2.2 | Sécurité de session | 6 |
| 2.3 | Changement de mot de passe | 6 |
| **3** | **Tableau de bord** | 7 |
| 3.1 | Vue Manager / Administrateur | 7 |
| 3.2 | Vue Utilisateur | 8 |
| **4** | **Demandes de sortie** | 9 |
| 4.1 | Créer une demande | 9 |
| 4.2 | Demandes multi-destinations | 10 |
| 4.3 | Valider une demande (Manager) | 10 |
| 4.4 | Refuser une demande | 11 |
| 4.5 | Clôturer une mission | 11 |
| 4.6 | Vues grille et liste | 12 |
| **5** | **Calendrier des sorties** | 13 |
| 5.1 | Navigation mensuelle | 13 |
| 5.2 | Détails au survol et au clic | 13 |
| **6** | **Gestion des employés** | 14 |
| 6.1 | Ajouter un employé | 14 |
| 6.2 | Modifier / désactiver | 14 |
| **7** | **Gestion du parc véhicules** | 15 |
| 7.1 | Ajouter un véhicule | 15 |
| 7.2 | Statuts des véhicules | 15 |
| 7.3 | Suivi du kilométrage | 16 |
| **8** | **Gestion des chauffeurs** | 17 |
| 8.1 | Ajouter un chauffeur | 17 |
| 8.2 | Catégories de permis | 17 |
| 8.3 | Alertes permis expiré | 17 |
| **9** | **Maintenance du parc** | 18 |
| 9.1 | Créer un dossier de maintenance | 18 |
| 9.2 | Clôturer une maintenance | 18 |
| 9.3 | Statuts de maintenance | 19 |
| **10** | **Rapports et statistiques** | 20 |
| **11** | **Accès et rôles utilisateurs** | 21 |
| 11.1 | Créer un compte | 21 |
| 11.2 | Modifier un compte | 21 |
| 11.3 | Réinitialiser un mot de passe | 22 |
| **12** | **Jours fériés** | 23 |
| **13** | **Notifications** | 24 |
| **14** | **Journal d'audit** | 25 |
| **15** | **Gestion de la licence** | 26 |
| 15.1 | Informations de licence | 26 |
| 15.2 | Sessions actives | 26 |
| 15.3 | Génération et activation | 27 |
| **16** | **Administration système** | 28 |
| **17** | **Glossaire** | 29 |
| **18** | **Perspectives d'évolution** | 30 |
| **19** | **Support et contacts** | 31 |

---

<!-- PAGE 4 -->

## 1. PRÉSENTATION GÉNÉRALE

### 1.1 Description de l'application

**SysLog** est une application web de gestion logistique développée sur mesure pour l'**ONG Espace Confiance**. Elle centralise la gestion de l'ensemble du cycle de vie d'une sortie de véhicule : de la demande initiale d'un agent jusqu'à la clôture de la mission avec relevé kilométrique, en passant par la validation managériale, l'affectation des ressources et le suivi en temps réel.

L'application répond aux problématiques suivantes rencontrées par Espace Confiance :

- **Dispersion des informations** : les demandes étaient gérées sur papier ou par messagerie, sans traçabilité centralisée.
- **Absence de visibilité** : les managers n'avaient pas de vue consolidée sur les missions en cours, les véhicules disponibles et les chauffeurs libres.
- **Sous-utilisation des ressources** : faute d'outil de regroupement, plusieurs véhicules partaient vers la même destination le même jour.
- **Reporting manuel** : les tableaux de bord bailleurs nécessitaient une consolidation manuelle longue et sujette aux erreurs.

SysLog adresse ces problématiques à travers une interface web accessible depuis tout navigateur moderne, sans installation requise sur les postes de travail.

### 1.2 Architecture technique

SysLog repose sur une architecture client-serveur moderne :

| Composant | Technologie | Rôle |
|-----------|-------------|------|
| **Frontend** | React 18 + TypeScript + Tailwind CSS | Interface utilisateur web |
| **Backend** | Node.js + Express.js | API REST sécurisée |
| **Base de données** | PostgreSQL 14+ | Stockage des données |
| **Authentification** | JWT (JSON Web Token) | Sessions sécurisées |
| **Audit** | Middleware automatique | Traçabilité de toutes les actions |

L'application fonctionne en architecture **locale** (déployée sur le réseau interne de l'organisation) ou peut être hébergée en ligne selon les besoins d'Espace Confiance.

**Ports par défaut :**
- Frontend : `http://localhost:5173`
- Backend API : `http://localhost:5000`

### 1.3 Rôles et droits d'accès

SysLog distingue trois niveaux d'accès :

| Rôle | Désignation | Droits principaux |
|------|-------------|-------------------|
| **Admin** | Administrateur système | Accès complet à tous les modules |
| **Manager** | Responsable logistique | Validation des demandes, gestion du parc, rapports |
| **Utilisateur** | Agent de terrain | Création de demandes, consultation de son historique |

**Matrice détaillée des accès :**

| Fonctionnalité | Admin | Manager | Utilisateur |
|----------------|-------|---------|-------------|
| Tableau de bord complet | ✓ | ✓ | Partiel |
| Créer une demande | ✓ | ✓ | ✓ |
| Valider / refuser une demande | ✓ | ✓ | ✗ |
| Clôturer une mission | ✓ | ✓ | ✗ |
| Gérer le parc véhicules | ✓ | ✓ | ✗ |
| Gérer les chauffeurs | ✓ | ✓ | ✗ |
| Gérer la maintenance | ✓ | ✓ | ✗ |
| Gérer les employés | ✓ | ✓ | ✗ |
| Accès & Rôles (comptes) | ✓ | ✗ | ✗ |
| Jours fériés | ✓ | ✗ | ✗ |
| Journal d'audit | ✓ | ✗ | ✗ |
| Gestion de la licence | ✓ | ✗ | ✗ |
| Rapports statistiques | ✓ | ✓ | ✗ |

### 1.4 Prérequis d'utilisation

- **Navigateur** : Google Chrome, Mozilla Firefox, Microsoft Edge (versions récentes)
- **Réseau** : Connexion au réseau local ou Internet selon le mode de déploiement
- **Résolution** : Minimum 1024 × 768 (optimisé pour 1366 × 768 et plus)
- **Compte** : Identifiants fournis par l'administrateur système

---

<!-- PAGE 6 -->

## 2. CONNEXION ET AUTHENTIFICATION

### 2.1 Page de connexion

La page de connexion est la porte d'entrée de SysLog. Elle se présente en deux panneaux :

- **Panneau gauche** (fond bleu marine) : identité visuelle de SysLog avec la description des fonctionnalités principales et les informations de sécurité.
- **Panneau droit** : formulaire de connexion.

**Pour se connecter :**

1. Saisir l'**adresse e-mail** fournie par l'administrateur.
2. Saisir le **mot de passe** associé. Le bouton 👁 permet d'afficher/masquer le mot de passe.
3. Cliquer sur le bouton **Se connecter**.

En cas d'erreur (identifiants incorrects), un message d'erreur rouge s'affiche sous le formulaire. Le système limite les tentatives de connexion à **10 par tranche de 15 minutes** pour des raisons de sécurité.

> **Note :** Si vous avez oublié votre mot de passe, contactez l'administrateur système pour une réinitialisation.

### 2.2 Sécurité de session

Une fois connecté, une **session sécurisée** est établie pour une durée de **8 heures**. Passé ce délai, vous serez automatiquement déconnecté et devrez vous reconnecter.

La session s'appuie sur un jeton JWT (JSON Web Token) stocké localement dans votre navigateur. **Ne partagez jamais vos identifiants** et déconnectez-vous toujours en fin de journée via le bouton **Déconnexion** en bas du menu latéral.

> **Limite de connexions simultanées :** Selon la licence de l'organisation, un nombre maximum d'utilisateurs peuvent être connectés simultanément. Si cette limite est atteinte, un message vous en informera et vous invitez à réessayer ultérieurement.

### 2.3 Changement de mot de passe

Pour modifier votre mot de passe :

1. Naviguer vers les paramètres de votre compte (accessible via l'icône utilisateur).
2. Saisir le **mot de passe actuel**.
3. Saisir le **nouveau mot de passe** (minimum 6 caractères, recommandé 10+ caractères incluant majuscules, chiffres et caractères spéciaux).
4. Confirmer le nouveau mot de passe.
5. Valider.

---

<!-- PAGE 7 -->

## 3. TABLEAU DE BORD

Le tableau de bord est la première page affichée après connexion. Son contenu varie selon le rôle de l'utilisateur connecté.

### 3.1 Vue Manager / Administrateur

La vue logistique offre une vision complète et temps réel de l'activité :

#### Cartes de statistiques (ligne supérieure)

| Carte | Description |
|-------|-------------|
| **Demandes en attente** | Nombre de trajets en attente de validation (1 trajet = 1 groupe, même si multi-destinations) |
| **Validées non affectées** | Demandes validées mais sans véhicule ou chauffeur assigné |
| **Sorties aujourd'hui** | Nombre de missions actives (en attente ou validées) pour la journée |
| **Sorties cette semaine** | Missions actives sur la semaine calendaire en cours |

#### Alerte de regroupement

Une bannière orange apparaît automatiquement lorsque **plusieurs employés différents** demandent à se rendre vers la même destination le même jour. Cela permet au manager de regrouper les missions dans un seul véhicule et d'optimiser les ressources.

Exemple d'alerte :
> *📍 Abobo — Vendredi 19 juin · 2 personnes (3 au total) — Kofi, Ama*

#### Section : Demandes en attente de validation

Liste des trajets en attente, affichés de façon groupée. Un trajet vers plusieurs destinations (ex. : Abobo et Adjamé) apparaît **en une seule ligne** avec des tags de communes colorés, et non en deux lignes séparées.

Chaque ligne affiche :
- Nom de l'initiateur + nombre de personnes (si passagers)
- Destination(s) sous forme de tags
- Date et heure de départ prévues
- Statut (badge coloré)

#### Section : Validées — affectation requise

Demandes déjà validées mais en attente d'affectation d'un véhicule ou d'un chauffeur. Ces demandes doivent être traitées en priorité pour ne pas bloquer les missions.

#### Section : Planning de la semaine

Vue chronologique des missions actives de la semaine, triée par date.

#### Colonne droite : Parc et ressources

- **Parc véhicules** : jauges de disponibilité (Disponibles / En mission / Maintenance-Hors service) avec pourcentages.
- **Chauffeurs** : nombre disponibles vs en mission.
- **Top communes** : les 5 destinations les plus demandées sur les 30 derniers jours.
- **Vue d'ensemble** (admin uniquement) : total des demandes, validées + terminées, missions accomplies, taux d'approbation.

### 3.2 Vue Utilisateur (agent de terrain)

La vue utilisateur est simplifiée et centrée sur les missions personnelles :

#### Cartes de statistiques

| Carte | Description |
|-------|-------------|
| **Mes demandes** | Nombre total de demandes soumises |
| **En attente** | Demandes en cours de validation |
| **Validées** | Demandes approuvées et missions accomplies |
| **Refusées** | Demandes non accordées |

#### Section : Mes prochaines sorties

Liste des missions à venir (non refusées, non terminées, à partir d'aujourd'hui) avec : destination(s), date, horaire, statut. Les missions déjà accomplies n'apparaissent pas dans cette liste.

---

<!-- PAGE 9 -->

## 4. DEMANDES DE SORTIE

Ce module est le cœur de SysLog. Il centralise toutes les demandes de déplacement de l'organisation.

### 4.1 Créer une demande

**Qui peut créer :** Admin, Manager, Utilisateur.

**Comment accéder :**
- Menu latéral > **Demandes de sortie**
- Cliquer sur le bouton **Nouvelle demande** (en haut à droite)

**Formulaire de création — champs :**

| Champ | Obligatoire | Description |
|-------|-------------|-------------|
| Employé initiateur | ✓ | L'agent qui demande le déplacement |
| Passagers / Staff accompagnant | — | Autres employés qui rejoignent la mission (multi-sélection) |
| Objectif de la mission | ✓ | Description de l'objet du déplacement |
| Communes de destination | ✓ | Lieu(x) visités (multi-sélection, voir §4.2) |
| Date de déplacement | ✓ | Ne peut pas être antérieure à aujourd'hui |
| Heure de départ | ✓ | Heure prévue de départ |
| Heure de retour | ✓ | Heure prévue de retour (doit être après le départ) |

**Sélection des passagers :**
Le champ "Passagers" propose un menu déroulant avancé avec :
- Recherche par nom, poste ou projet
- Sélection multiple avec badges
- Bouton "Tout sélectionner" / "Tout effacer"
- Compteur en temps réel : *Total mission : 3 personnes (initiateur + 2 passagers)*

**Récapitulatif automatique :**
Dès que les champs principaux sont remplis, un récapitulatif bleu s'affiche en bas du formulaire pour confirmer visuellement les informations avant soumission.

**Soumission :**
- Si **1 destination** : le bouton indique *"Soumettre la demande"*
- Si **plusieurs destinations** : le bouton indique *"Soumettre les 2 demandes"* (chaque destination génère un enregistrement distinct mais ils sont traités ensemble)

> **Note importante :** La date de déplacement ne peut pas être antérieure à la date du jour. Il n'est pas possible de créer des demandes rétroactives.

### 4.2 Demandes multi-destinations

SysLog permet de soumettre en une seule action une demande couvrant **plusieurs communes** (ex. : Abobo ET Adjamé lors du même déplacement).

**Fonctionnement :**
- Sélectionner plusieurs communes dans le champ "Communes de destination"
- Un enregistrement est créé par commune en base de données
- À l'affichage (tableau de bord, page demandes, calendrier), ces enregistrements sont **regroupés en une seule ligne** pour ne pas encombrer l'interface
- Le manager traite le groupe en **une seule action** (validation groupée)

**Affichage des destinations multiples :**
Les communes sont affichées sous forme de **tags bleus** côte à côte :
> 📍 `Abobo` `Adjamé`

### 4.3 Valider une demande (Manager / Admin)

**Qui peut valider :** Manager, Admin.

Les demandes en statut **"En attente"** affichent un bouton **"Traiter cette demande"** (ou "Traiter (2)" si multi-destinations) sur chaque carte.

**Processus de validation :**

1. Cliquer sur **"Traiter cette demande"**
2. La modale de validation s'ouvre, affichant :
   - Récapitulatif complet (initiateur, passagers, destinations, date, horaire, objectif)
   - Sélection du **véhicule** parmi les disponibles (optionnel — peut être assigné plus tard)
   - Sélection du **chauffeur** parmi les disponibles (optionnel)

**Contrôle de capacité :**
Si un véhicule sélectionné est insuffisant en places pour le nombre total de personnes (initiateur + passagers), un avertissement rouge s'affiche et la validation est bloquée pour ce véhicule.

Exemple :
> ⚠ Ce véhicule (5 places) est insuffisant pour 7 personnes.

3. Cliquer sur **"✓ Valider"** (ou "✓ Valider (2)" pour multi-destinations)

**Effets de la validation :**
- Le statut de la/des demande(s) passe à **"Validée"** (badge vert)
- Le véhicule sélectionné passe en statut **"En mission"**
- Le chauffeur sélectionné passe en statut **"En mission"**
- Le manager et l'initiateur reçoivent une notification

> **Validation sans véhicule :** Il est possible de valider une demande sans affecter immédiatement un véhicule ou un chauffeur. La demande apparaîtra alors dans la section "Validées non affectées" du tableau de bord pour un traitement ultérieur.

### 4.4 Refuser une demande

**Qui peut refuser :** Manager, Admin.

1. Cliquer sur **"Traiter cette demande"**
2. Dans la modale, cliquer sur le bouton **"Refuser"** (rouge)
3. Saisir le **motif du refus** (obligatoire)
4. Confirmer en cliquant sur **"Confirmer le refus"**

**Important :** Il est également possible de refuser une demande déjà validée (si un changement de situation intervient). Dans ce cas, le véhicule et le chauffeur sont **automatiquement libérés** (remis en statut "Disponible") et retirés de la demande.

### 4.5 Clôturer une mission

La clôture est l'étape finale d'une mission. Elle matérialise le retour du véhicule et la fin de la sortie.

**Conditions :** La demande doit être en statut **"Validée"**.

**Processus de clôture :**

1. Sur la carte de la demande validée, cliquer sur **"✓ Clôturer la mission"**
2. La modale de clôture affiche :
   - Récapitulatif de la mission (date, horaire prévu, véhicule, chauffeur)
   - Formulaire de **relevé kilométrique**

**Champs de kilométrage :**

| Champ | Description | Exemple |
|-------|-------------|---------|
| **Km départ** | Compteur kilométrique avant la mission | 45 000 |
| **Km retour** | Compteur kilométrique après la mission | 45 320 |
| **Distance calculée** | Automatique : km retour − km départ | **320 km** |

> **Validation kilométrique :** Le kilométrage de retour doit obligatoirement être supérieur ou égal au kilométrage de départ. En cas d'incohérence, la clôture est bloquée.

3. Cliquer sur **"✓ Clôturer la mission"**

**Effets de la clôture :**
- Le statut de la demande passe à **"Terminée"** (badge gris)
- Le **kilométrage** du véhicule est mis à jour avec la valeur de retour
- Le véhicule repasse en statut **"Disponible"**
- Le chauffeur repasse en statut **"Disponible"**
- La distance parcourue est enregistrée dans l'historique

> **Note :** Si le kilométrage de retour n'est pas disponible immédiatement, les champs peuvent être laissés vides — la clôture s'effectuera sans mise à jour kilométrique. Il est néanmoins fortement recommandé de renseigner ces valeurs pour le suivi du parc.

### 4.6 Vues grille et liste

La page "Demandes de sortie" propose deux modes d'affichage, accessibles via les boutons **⊞** (grille) et **≡** (liste) en haut à droite de la barre de filtres.

**Vue grille :** Cartes visuelles, recommandée pour la consultation quotidienne. Chaque carte affiche l'ensemble des informations essentielles et les boutons d'action.

**Vue liste (tableau) :** Affichage tabulaire compact, idéal pour la comparaison de plusieurs demandes ou l'export visuel. Les colonnes incluent : Initiateur, Passagers, Destinations, Date, Horaire, Objectif, Affectation, Statut, Action.

**Filtres disponibles :**

| Filtre | Options |
|--------|---------|
| Statut | Tous / En attente / Validées / Refusées |
| Date de début | Sélecteur de date |
| Date de fin | Sélecteur de date |

Le bouton **"Réinitialiser"** efface tous les filtres actifs.

**Statuts des demandes :**

| Statut | Couleur | Signification |
|--------|---------|---------------|
| En attente | 🟡 Ambre | Demande soumise, en attente de traitement par un manager |
| Validée | 🟢 Vert | Demande approuvée, véhicule/chauffeur assignés ou à assigner |
| Refusée | 🔴 Rouge | Demande non accordée (motif disponible) |
| Terminée | ⚫ Gris | Mission accomplie, kilométrage enregistré |

---

<!-- PAGE 13 -->

## 5. CALENDRIER DES SORTIES

Le calendrier offre une vue mensuelle de toutes les missions planifiées, avec un accès rapide aux détails.

### 5.1 Navigation mensuelle

**Accès :** Menu latéral > **Calendrier**

La page affiche un calendrier mensuel (semaine du lundi au dimanche). En haut à droite, trois boutons permettent la navigation :
- **←** : Mois précédent
- **Aujourd'hui** : Revenir au mois courant
- **→** : Mois suivant

Le titre indique le mois et l'année affichés, ainsi que le récapitulatif des sorties du mois :
> *Juillet 2026 — 3 validées · 2 en attente*

Les demandes **refusées** ne sont pas affichées sur le calendrier (elles n'ont pas vocation à être planifiées).

**Légende :**
- 🟢 Puce verte : Sortie validée
- 🟡 Puce orange : Sortie en attente

**La case du jour courant** est mise en évidence avec un fond bleu et le numéro en cercle bleu.

### 5.2 Détails au survol et au clic

**Au survol (passage de la souris) :**
Une infobulle apparaît immédiatement avec :
- Avatar et nom de l'initiateur + son poste/projet
- Badge de statut
- Destination(s)
- Horaire + nombre de personnes
- Prénoms des passagers (jusqu'à 3, puis "+N")
- Objectif de la mission (2 lignes max)
- Mention *"Cliquez pour voir tous les détails"*

**Au clic sur une mission :**
Un modal complet s'ouvre affichant :
- Nom de l'initiateur + poste/projet + avatar
- Badge de statut
- Date complète et horaire
- Toutes les destinations sous forme de tags
- Liste complète des participants (initiateur en badge bleu primaire, passagers en badges bleus)
- Objectif complet de la mission
- Véhicule et chauffeur assignés (si applicable)

Le modal se ferme par clic sur le fond, sur le bouton ✕ ou via la touche **Échap**.

**Si plus de 3 missions sur un même jour :**
Les 3 premières sont affichées. Un lien "+N autres" permet d'ouvrir le détail de la mission suivante.

**Récapitulatif du mois (sous le calendrier) :**
Quatre cartes statistiques :
- Sorties ce mois
- Validées
- En attente
- Destinations distinctes

---

<!-- PAGE 14 -->

## 6. GESTION DES EMPLOYÉS

**Accès :** Menu latéral > **Employés** (Admin et Manager uniquement)

Ce module recense l'ensemble des employés d'Espace Confiance. Les informations de ce module alimentent automatiquement la liste des initiateurs et des passagers lors de la création de demandes de sortie.

### 6.1 Ajouter un employé

Cliquer sur **"Nouvel employé"** en haut à droite. Le formulaire est organisé en deux sections :

**Section Identité :**
| Champ | Obl. | Description |
|-------|------|-------------|
| Nom | ✓ | Nom de famille (saisi en majuscules automatiquement) |
| Prénoms | ✓ | Prénoms |
| Téléphone | — | Numéro de contact |
| Email | — | Adresse électronique professionnelle |
| Date de naissance | — | |
| N° urgence | — | Contact à prévenir en cas d'urgence |

**Section Professionnel :**
| Champ | Obl. | Description |
|-------|------|-------------|
| Poste | — | Intitulé du poste occupé |
| Projet | — | Projet auquel l'employé est rattaché |
| Service | — | Service de rattachement (liste déroulante) |
| Type de contrat | — | CDI, CDD, Intérim, Stage, Prestataire |
| Date d'embauche | — | |
| N° sécurité sociale | — | |

**Statut :**
Le champ "Statut" (Actif / Inactif) n'apparaît qu'en **modification** — un employé nouvellement créé est actif par défaut.

### 6.2 Modifier et désactiver

**Modifier :** Cliquer sur le bouton **"Modifier"** de la carte ou de la ligne de l'employé concerné. Tous les champs sont modifiables.

**Désactiver :** Lors de la modification, changer le statut de "Actif" à "Inactif". Un employé inactif n'apparaît plus dans les listes de sélection lors de la création de demandes.

**Supprimer :** Le bouton **"Supprimer"** ouvre un modal de confirmation. La suppression est irréversible. Un employé lié à des demandes de sortie existantes ne peut pas être supprimé (contrainte d'intégrité).

**Filtres disponibles :**
- Recherche textuelle (nom, poste, projet, service, téléphone)
- Filtre par statut (Tous / Actifs / Inactifs)

**Vues :** Grille (cartes avec avatar) ou Liste (tableau).

---

<!-- PAGE 15 -->

## 7. GESTION DU PARC VÉHICULES

**Accès :** Menu latéral > **Véhicules** (Admin et Manager uniquement)

Ce module recense l'ensemble des véhicules de l'organisation et permet leur suivi en temps réel.

### 7.1 Ajouter un véhicule

Cliquer sur **"Nouveau véhicule"**. Le formulaire contient :

| Champ | Obl. | Description |
|-------|------|-------------|
| Immatriculation | ✓ | Numéro de plaque (saisi en majuscules) |
| Type de véhicule | ✓ | SUV, Pick-up, Minibus, etc. |
| Marque | ✓ | Ex. : Toyota |
| Modèle | ✓ | Ex. : Hilux |
| Capacité | ✓ | Nombre de places (chauffeur inclus ou non, selon la convention de l'organisation) |
| Énergie | — | Diesel ou Essence |
| Kilométrage | — | Kilométrage actuel au compteur |
| Année de mise en service | — | Entre 1980 et l'année en cours |
| Statut | — | Voir §7.2 |

### 7.2 Statuts des véhicules

| Statut | Couleur | Signification |
|--------|---------|---------------|
| **Disponible** | 🟢 Vert | Le véhicule peut être affecté à une mission |
| **En mission** | 🔵 Bleu | Le véhicule est actuellement affecté à une sortie validée |
| **En maintenance** | 🟡 Ambre | Le véhicule est en cours de maintenance (voir §9) |
| **Hors service** | 🔴 Rouge | Le véhicule est immobilisé définitivement ou temporairement |

**Transitions automatiques de statut :**
- Lors de la **validation** d'une demande avec affectation : Disponible → **En mission**
- Lors de la **clôture** d'une mission : En mission → **Disponible** (kilométrage mis à jour)
- Lors de la **création** d'un dossier de maintenance : → **En maintenance**
- Lors de la **clôture** d'une maintenance : En maintenance → **Disponible** ou **Hors service** (choix du manager)
- Lors du **refus** d'une demande validée : En mission → **Disponible**

**Modification manuelle :** Il est également possible de modifier le statut manuellement via le formulaire d'édition du véhicule. Cette option doit être utilisée avec précaution et uniquement par un administrateur ou manager autorisé.

### 7.3 Suivi du kilométrage

Le kilométrage de chaque véhicule est mis à jour automatiquement lors de la **clôture d'une mission** (relevé kilométrique de retour).

La carte de chaque véhicule affiche le kilométrage actuel en bas :
> Kilométrage : **45 320 km**

L'historique des kilométrages est implicitement tracé dans le journal d'audit.

**Filtres :** Recherche par immatriculation, marque, modèle + filtre par statut.

**Vues :** Grille (cartes) ou Liste (tableau).

**Suppression :** Accessible uniquement aux administrateurs. Un véhicule lié à des demandes actives ou des dossiers de maintenance en cours ne peut pas être supprimé.

---

<!-- PAGE 17 -->

## 8. GESTION DES CHAUFFEURS

**Accès :** Menu latéral > **Chauffeurs** (Admin et Manager uniquement)

### 8.1 Ajouter un chauffeur

Cliquer sur **"Nouveau chauffeur"**. Le formulaire contient :

| Champ | Obl. | Description |
|-------|------|-------------|
| Nom | ✓ | Nom de famille (majuscules) |
| Prénoms | ✓ | |
| Numéro de permis | ✓ | Numéro officiel du permis de conduire |
| Catégorie de permis | ✓ | Voir §8.2 |
| Date d'expiration | ✓ | Date d'expiration du permis |
| Statut | — | Disponible / En mission / Indisponible |
| Téléphone | — | |
| Email | — | |

### 8.2 Catégories de permis

SysLog prend en charge les catégories de permis suivantes, conformément à la nomenclature en vigueur :

| Catégorie | Véhicules couverts |
|-----------|-------------------|
| **A** | Motocycles et tricycles motorisés |
| **B** | Véhicules de tourisme (max 9 personnes) |
| **C** | Camions et poids lourds |
| **D** | Bus et autocars |
| **E** | Remorques et semi-remorques |
| **F** | Véhicules agricoles et engins spéciaux |
| **Toutes catégories** | Permis couvrant l'ensemble des véhicules |

Le manager doit s'assurer que la catégorie du permis du chauffeur affecté est compatible avec le type de véhicule sélectionné pour la mission.

### 8.3 Alertes permis expiré

SysLog détecte automatiquement les permis expirés et affiche un **avertissement ambre** lors de la saisie de la date d'expiration :
> ⚠ Permis expiré — vérifiez avant toute affectation.

De plus, le tableau de bord des chauffeurs affiche un compteur "Permis expirés" en rouge parmi les statistiques.

**Lors de la sélection d'un chauffeur pour une mission**, les chauffeurs à permis expiré restent visibles dans la liste mais leur date d'expiration est affichée en rouge pour alerter le manager.

**Statuts des chauffeurs :**

| Statut | Couleur | Signification |
|--------|---------|---------------|
| Disponible | 🟢 Vert | Peut être affecté à une mission |
| En mission | 🔵 Bleu | Actuellement en déplacement |
| Indisponible | ⚫ Gris | Absent, congé ou autre indisponibilité |

**Filtres :** Recherche par nom, numéro de permis, téléphone + filtre par statut.

---

<!-- PAGE 18 -->

## 9. MAINTENANCE DU PARC

**Accès :** Menu latéral > **Maintenance** (Admin et Manager uniquement)

Ce module permet de gérer les interventions de maintenance sur le parc automobile : vidanges, révisions, réparations, contrôles techniques et autres interventions.

### 9.1 Créer un dossier de maintenance

Cliquer sur **"Nouveau dossier"** :

| Champ | Obl. | Description |
|-------|------|-------------|
| Véhicule | ✓ | Sélection parmi le parc (liste déroulante) |
| Type d'intervention | ✓ | **Multi-sélection** — voir liste ci-dessous |
| Date de début | ✓ | |
| Date de fin prévue | — | Date prévisionnelle de retour du véhicule |
| Coût estimé (FCFA) | — | Budget prévisionnel |
| Description / Observations | — | Détails de l'intervention, pièces à remplacer, etc. |
| Statut | — | Planifiée / En cours / Terminée |

**Types d'intervention disponibles (multi-sélection) :**
- Vidange
- Révision
- Réparation
- Contrôle technique
- Changement pneus
- Batterie
- Autre

Il est possible de cocher **plusieurs types** simultanément pour une même intervention. Exemple : *Vidange + Changement pneus*. Les types sélectionnés s'affichent sous forme de tags sur la carte du dossier.

> **⚠ Important :** La création d'un dossier de maintenance place automatiquement le véhicule concerné en statut **"En maintenance"**, le retirant ainsi de la liste des véhicules disponibles pour les missions.

### 9.2 Clôturer une maintenance

Lorsque l'intervention est terminée, cliquer sur **"✓ Clôturer"** sur la carte du dossier.

La modale de clôture permet de :
1. Saisir le **coût final** de l'intervention (en FCFA)
2. Ajouter des **notes de clôture** (travaux effectués, pièces remplacées)
3. Choisir le **statut de retour du véhicule** :
   - **Disponible** : le véhicule est opérationnel et peut reprendre du service
   - **Hors service** : le véhicule ne peut pas reprendre du service (réparation impossible, amortissement)

### 9.3 Statuts de maintenance

| Statut | Couleur | Signification |
|--------|---------|---------------|
| **Planifiée** | 🟡 Ambre | Maintenance programmée, pas encore commencée |
| **En cours** | 🔵 Bleu | Intervention en cours chez le garagiste ou en interne |
| **Terminée** | ⚫ Gris | Intervention terminée, véhicule libéré |

**Modification :** Tous les champs d'un dossier peuvent être modifiés avant clôture. Un dossier en cours ne peut pas être supprimé — il doit être clôturé d'abord.

**Filtre par statut :** La liste des dossiers peut être filtrée par statut (Tous / En cours / Planifiées / Terminées) pour faciliter le suivi.

**Statistiques affichées :**
- Total des dossiers
- En cours
- Planifiées
- Terminées

---

<!-- PAGE 20 -->

## 10. RAPPORTS ET STATISTIQUES

**Accès :** Menu latéral > **Rapports** (Admin et Manager uniquement)

Ce module fournit des tableaux de bord analytiques permettant aux managers et aux administrateurs de produire des synthèses d'activité pour le reporting interne ou les bailleurs.

Les rapports disponibles incluent :

- **Répartition des demandes par statut** (En attente / Validées / Refusées / Terminées)
- **Demandes par commune** : identification des destinations les plus fréquentées
- **Utilisation du parc** : taux d'occupation par véhicule
- **Activité des chauffeurs** : nombre de missions par chauffeur
- **Évolution mensuelle** : courbes de demandes sur les derniers mois

Les graphiques sont interactifs (survol pour détails) et générés en temps réel à partir des données de la base.

> **Export :** Des fonctionnalités d'export (Excel) sont disponibles pour certains rapports, permettant d'alimenter les tableaux de bord bailleurs.

---

<!-- PAGE 21 -->

## 11. ACCÈS ET RÔLES UTILISATEURS

**Accès :** Menu latéral > **Accès & Rôles** (Admin uniquement)

Ce module permet à l'administrateur de gérer les comptes utilisateurs de SysLog : création, modification, activation/désactivation et réinitialisation des mots de passe.

### Comptes actuellement présents dans la base

Les comptes ci-dessous reflètent l’état réel de la table des utilisateurs dans la base PostgreSQL du système actuel. Les mots de passe sont stockés sous forme hachée et ne sont donc pas consultables directement depuis la base.

| Nom | Prénom | Email | Rôle | Statut |
|------|--------|-------|------|--------|
| ADMIN | System | ss.hf@ec-ci.org | Administrateur | Actif |
| GNAZERE | Ouraga Alain Serge | sgnazere@gmail.com | Administrateur | Actif |
| BOSSE | Zadou Marius | czo.hf@ec-ci.org | Utilisateur | Actif |
| KRA | Kouakou Bertin | log.afd@ec-ci.org | Manager | Actif |
| THES | HIBORY JOSEPH | czn.hf@ec-ci.org | Utilisateur | Actif |
| KEIPO | VALENTIN | cpg.hf@ec-ci.org | Manager | Actif |

> Les comptes de démonstration figurant dans les anciennes versions du manuel ne correspondent pas forcément à l’état actuel de la base. La liste ci-dessus constitue la référence opérationnelle de l’environnement actuel.

### 11.1 Créer un compte utilisateur

Cliquer sur **"Créer un compte"** :

| Champ | Obl. | Description |
|-------|------|-------------|
| Employé lié | — | Lie le compte à un employé existant (pré-remplit nom, prénom, email) |
| Prénom | ✓ | |
| Nom | ✓ | Saisi automatiquement en majuscules |
| Adresse e-mail | ✓ | Servira d'identifiant de connexion |
| Rôle | ✓ | Utilisateur / Manager / Administrateur |
| Mot de passe | ✓ | Minimum 6 caractères (mode création uniquement) |

**Rôles et leurs implications :**

- **Utilisateur** : Accès limité à ses propres demandes, calendrier et notifications. Idéal pour les agents de terrain.
- **Manager** : Validation des demandes, gestion du parc, des chauffeurs, des employés, rapports. Idéal pour les coordinateurs logistiques.
- **Administrateur** : Accès complet incluant la gestion des comptes, l'audit, les jours fériés et la licence. Réservé au personnel SI ou à la direction.

> **Limite de comptes :** Le nombre de comptes actifs est limité par la licence de l'organisation (200 utilisateurs dans la configuration actuelle).

**Bannière informationnelle :**
Si des employés n'ont pas encore de compte, une bannière bleue s'affiche en haut de la page avec le nombre d'employés sans accès et un lien direct vers la création de compte.

### 11.2 Modifier un compte

Cliquer sur **"Modifier"** sur la carte ou la ligne du compte concerné.

Les informations modifiables sont :
- Prénom, Nom, Email
- Rôle (changement possible à tout moment)
- Statut (Actif / Inactif)
- Lien avec un employé

**Désactiver un compte :**
Changer le statut à "Inactif" via le bouton **"Désactiver"** (rouge) sur la ligne ou la carte. Un compte inactif ne peut plus se connecter mais ses données et son historique sont conservés.

**Réactiver un compte :**
Cliquer sur le bouton **"Activer"** (vert) sur un compte inactif.

### 11.3 Réinitialiser un mot de passe

En cas d'oubli ou de compromission, l'administrateur peut réinitialiser le mot de passe d'un utilisateur sans connaître l'ancien.

1. Cliquer sur le bouton **"🔑 MDP"** sur la carte/ligne de l'utilisateur
2. Saisir le **nouveau mot de passe** (minimum 6 caractères)
3. Confirmer le nouveau mot de passe
4. Un **indicateur de force** s'affiche (Trop court / Faible / Moyen / Fort)
5. Cliquer sur **"Réinitialiser"**

Le mot de passe est immédiatement mis à jour. L'utilisateur peut se connecter avec le nouveau mot de passe et est encouragé à le modifier lors de sa prochaine connexion.

**Filtres disponibles :**
- Recherche textuelle (nom, prénom, email)
- Filtre par rôle (Tous / Utilisateur / Manager / Administrateur)
- Filtre par statut (Tous / Actifs / Inactifs)

**Vues :** Liste (par défaut) ou Grille.

---

<!-- PAGE 23 -->

## 12. JOURS FÉRIÉS

**Accès :** Menu latéral > **Jours fériés** (Admin uniquement)

Ce module permet de gérer le calendrier des jours fériés de l'organisation (jours fériés nationaux, fêtes religieuses, jours de fermeture institutionnelle).

**Fonctionnalités :**
- Ajouter un jour férié avec son nom et sa date
- Supprimer un jour férié existant
- Option "Récurrent" : le jour férié se répète chaque année à la même date (ex. : 1er janvier)

Les jours fériés sont visibles dans le calendrier des sorties pour informer les planificateurs des jours potentiellement indisponibles.

---

<!-- PAGE 24 -->

## 13. NOTIFICATIONS

**Accès :** Menu latéral > **Notifications** (tous les rôles) ou icône 🔔 dans la barre supérieure

Le système de notifications informe automatiquement les utilisateurs des événements les concernant.

**Types de notifications :**

| Type | Icône | Déclencheur |
|------|-------|-------------|
| **Succès** | ✓ Vert | Demande validée, mission clôturée |
| **Information** | ℹ Bleu | Nouveau commentaire, mise à jour |
| **Avertissement** | ⚠ Orange | Licence proche de l'expiration, permis expiré |
| **Erreur** | ✕ Rouge | Demande refusée |

**Indicateur visuel :**
Un **point rouge** s'affiche sur l'icône 🔔 dans la barre supérieure lorsque des notifications non lues sont présentes. Le chiffre de notifications non lues est également affiché dans le menu latéral sur l'entrée "Notifications".

**Sur la page Notifications :**
- Les notifications non lues apparaissent en **haut de la liste**, mises en évidence
- Bouton **"Marquer comme lu"** sur chaque notification individuelle
- Bouton **"Tout marquer comme lu"** pour traiter toutes les notifications en une fois
- Les notifications lues sont affichées en dessous, en style atténué

**Date relative :** Les notifications affichent une date relative (ex. : "Il y a 5 min", "Il y a 2h", "Il y a 3 jours") pour une lecture rapide.

---

<!-- PAGE 25 -->

## 14. JOURNAL D'AUDIT

**Accès :** Menu latéral > **Audit logs** (Admin uniquement)

Le journal d'audit enregistre automatiquement **toutes les actions effectuées** dans SysLog par l'ensemble des utilisateurs. Il constitue une trace horodatée et inaltérable de toutes les modifications apportées aux données.

**Informations enregistrées pour chaque action :**

| Donnée | Description |
|--------|-------------|
| Utilisateur | Nom, email et rôle de l'auteur de l'action |
| Action | Type d'opération (Création, Modification, Suppression, Validation, etc.) |
| Entité | Objet concerné (Demande, Véhicule, Employé, Utilisateur...) |
| ID entité | Identifiant unique de l'enregistrement modifié |
| Adresse IP | IP depuis laquelle l'action a été réalisée |
| Date et heure | Horodatage précis (date + heure) |
| Données | Corps de la requête (informations envoyées) |

**Types d'actions tracées :**

| Libellé | Action |
|---------|--------|
| Création | Ajout d'un nouvel enregistrement |
| Modification | Mise à jour d'un enregistrement existant |
| Suppression | Suppression définitive d'un enregistrement |
| Validation | Validation d'une demande de sortie |
| Refus | Refus d'une demande |
| Activation | Activation/désactivation d'un compte |
| Réinit. MDP | Réinitialisation de mot de passe |
| Connexion | Connexion au système |

**Filtres disponibles :**
- Par **utilisateur** (liste déroulante des utilisateurs actifs)
- Par **type d'action** (liste déroulante des actions)
- Par **entité** (Demande, Véhicule, Employé, etc.)
- Par **plage de dates** (Du... Au...)

**Pagination :** 50 événements par page avec navigation (Précédent / numéros de page / Suivant).

**Détail d'un événement :**
Un clic sur n'importe quelle ligne ouvre un **modal de détail** affichant :
- Informations complètes de l'utilisateur (avatar, nom, email, rôle)
- Badge d'action coloré
- Entité et ID concernés
- Adresse IP
- **Corps de la requête en JSON** (données exactes envoyées) — utile pour audits et investigations

---

<!-- PAGE 26 -->

## 15. GESTION DE LA LICENCE

**Accès :** Menu latéral > **Licence** (Admin uniquement) ou lien dans la bannière d'avertissement

Ce module permet à l'administrateur de consulter et gérer la licence d'utilisation de SysLog.

### 15.1 Informations de licence

L'onglet **"Informations"** affiche :

- **Clé de licence** : Affichée de façon masquée (ex. : `SL-A3F8****-****F0A-8B2C4D6E`)
- **Organisation** : Nom de la structure titulaire de la licence (ONG Espace Confiance)
- **Période de validité** : Date de début → Date d'expiration
- **Jours restants** : Compte à rebours jusqu'à l'expiration
- **Statut** : Active / Expirée / Suspendue (badge coloré)

**Jauges d'utilisation :**
- **Utilisateurs actifs** : Nombre de comptes actifs vs. maximum autorisé par la licence (ex. : 3 / 200)
- **Connexions simultanées** : Nombre de sessions ouvertes vs. maximum autorisé (ex. : 2 / 100)

Les jauges passent au **rouge** lorsque l'utilisation dépasse 80% de la limite.

**Alertes automatiques :**
- **< 30 jours** avant expiration : Bannière orange en haut de toutes les pages
- **< 7 jours** avant expiration : Bannière rouge en haut de toutes les pages
- **Licence expirée** : Bannière rouge + accès aux modules restreint

### 15.2 Sessions actives

L'onglet **"Sessions actives"** affiche la liste de tous les utilisateurs actuellement connectés :

| Information | Description |
|-------------|-------------|
| Nom et email | Identité de l'utilisateur |
| Rôle | Admin, Manager ou Utilisateur |
| Adresse IP | Depuis quelle adresse l'utilisateur est connecté |
| Dernière activité | Horodatage de la dernière requête |
| Expiration | Heure à laquelle la session expirera automatiquement |

**Déconnexion forcée :**
Le bouton **"Déconnecter"** (rouge) sur chaque ligne permet à l'administrateur de forcer la fermeture de la session d'un utilisateur sans avoir besoin de son mot de passe. Utile en cas de départ d'un employé ou de suspicion de compromission.

### 15.3 Génération et activation de licence

**Activer une clé (onglet "Activer une clé") :**
Si une nouvelle clé de licence a été fournie par Gesmalync :
1. Saisir la clé au format `SL-XXXXXXXX-XXXXXXXX-XXXXXXXX`
2. Cliquer sur **"✓ Activer la licence"**
3. SysLog vérifie la validité cryptographique de la clé et l'active si correcte

**Générer une licence (onglet "Générer une licence") :**
Cet onglet est réservé à l'usage de Gesmalync lors des déploiements ou renouvellements. Il permet de créer une nouvelle licence avec les paramètres souhaités.

> **⚠ Sécurité :** La clé complète générée n'est affichée **qu'une seule fois** immédiatement après la génération. Elle doit être copiée et conservée en lieu sûr avant de fermer la fenêtre.

**Format des clés de licence :**
`SL-XXXXXXXX-XXXXXXXX-XXXXXXXX`

La signature cryptographique (HMAC-SHA256) intégrée dans la clé garantit qu'elle ne peut pas être falsifiée sans accès au secret de l'instance.

---

<!-- PAGE 28 -->

## 16. ADMINISTRATION SYSTÈME

Cette section s'adresse exclusivement aux **administrateurs système** et au personnel technique de Gesmalync.

### Démarrage des serveurs

Le système SysLog nécessite deux serveurs actifs simultanément :

**Backend (API) :**
```
cd c:\xampp\htdocs\Syslog\backend
npm run dev
```
Démarrage sur : `http://localhost:5000`

**Frontend (Interface) :**
```
cd c:\xampp\htdocs\Syslog\frontend
npm run dev
```
Démarrage sur : `http://localhost:5173`

### Variables d'environnement

Le fichier `backend/.env` contient les paramètres de configuration :

| Variable | Description |
|----------|-------------|
| `DB_HOST` | Adresse du serveur PostgreSQL |
| `DB_PORT` | Port PostgreSQL (défaut : 5432) |
| `DB_NAME` | Nom de la base de données |
| `DB_USER` | Utilisateur PostgreSQL |
| `DB_PASSWORD` | Mot de passe PostgreSQL |
| `JWT_SECRET` | Clé secrète pour les tokens d'authentification (min. 32 chars) |
| `JWT_EXPIRES_IN` | Durée de validité des sessions (défaut : 8h) |
| `PORT` | Port du serveur backend (défaut : 5000) |
| `LICENSE_SECRET` | Clé secrète pour la génération/validation des licences |

> **Sécurité critique :** Les valeurs de `JWT_SECRET` et `LICENSE_SECRET` doivent être changées en production et ne jamais être partagées.

### Migrations de base de données

Les fichiers SQL de migration se trouvent dans `backend/src/migrations/`. Pour appliquer une migration :

```bash
psql -U postgres -d eclog -f nom_du_fichier.sql
```

Liste des migrations à appliquer dans l'ordre :
1. `schema_passagers.sql`
2. `create_services.sql`
3. `create_audit_logs.sql`
4. `add_retour_mission.sql`
5. `create_licences.sql`

> La base de développement standard du projet est `eclog`. En production, le nom peut être différent selon la configuration (`syslog_prod` par exemple).

### Sauvegarde de la base de données

Il est recommandé d'effectuer des sauvegardes quotidiennes :

```bash
pg_dump -U postgres eclog > backup_eclog_$(date +%Y%m%d).sql
```

### Health check

L'endpoint `GET http://localhost:5000/health` retourne le statut du serveur et peut être utilisé pour des vérifications automatisées.

---

<!-- PAGE 29 -->

## 17. GLOSSAIRE

| Terme | Définition |
|-------|-----------|
| **Affectation** | Attribution d'un véhicule et d'un chauffeur à une demande de sortie validée |
| **Audit** | Journal automatique de toutes les actions effectuées dans le système |
| **Backend** | Serveur applicatif traitant les données (invisible pour l'utilisateur) |
| **Chauffeur** | Personnel de conduite enregistré dans SysLog |
| **Clôture de mission** | Étape finale d'une sortie, avec saisie du kilométrage de retour |
| **Commune** | Destination géographique d'une sortie de véhicule |
| **Demande de sortie** | Requête formelle d'un agent pour l'utilisation d'un véhicule |
| **Employé** | Personne physique membre du personnel d'Espace Confiance |
| **Frontend** | Interface web accessible depuis le navigateur |
| **Groupe de demandes** | Ensemble de demandes liées (même trajet, plusieurs destinations) |
| **HMAC** | Hash-based Message Authentication Code — mécanisme cryptographique utilisé pour les licences |
| **Hors service** | Statut d'un véhicule immobilisé définitivement ou sur longue durée |
| **Initiateur** | L'employé à l'origine d'une demande de sortie |
| **JWT** | JSON Web Token — jeton sécurisé utilisé pour les sessions d'authentification |
| **Kilométrage** | Distance cumulée au compteur d'un véhicule |
| **Licence** | Contrat d'utilisation de SysLog limitant le nombre d'utilisateurs et de connexions |
| **Maintenance** | Intervention technique sur un véhicule (vidange, réparation, etc.) |
| **Manager** | Utilisateur avec droits de validation et de gestion logistique |
| **Multi-destinations** | Demande couvrant plusieurs communes lors du même déplacement |
| **ONG** | Organisation Non Gouvernementale |
| **Passager** | Employé accompagnant l'initiateur dans une sortie |
| **Permis** | Autorisation légale de conduire un type de véhicule |
| **PostgreSQL** | Système de gestion de base de données relationnelle utilisé par SysLog |
| **Regroupement** | Suggestion de mutualiser des sorties différentes vers la même destination |
| **Rôle** | Niveau d'accès d'un utilisateur (Admin / Manager / Utilisateur) |
| **Session** | Période de connexion active d'un utilisateur |
| **Statut** | État courant d'une demande, d'un véhicule ou d'un chauffeur |
| **Token** | Jeton d'authentification généré à la connexion |
| **Vue grille** | Affichage en cartes visuelles |
| **Vue liste** | Affichage en tableau |

---

<!-- PAGE 30 -->

## 18. PERSPECTIVES D'ÉVOLUTION

SysLog a été conçu avec une architecture modulaire permettant des évolutions futures sans remise en cause de l'existant. Les pistes d'amélioration identifiées lors du déploiement initial de la version 1.0.0 sont les suivantes :

### 18.1 Évolutions fonctionnelles envisagées

**Module Agenda des chauffeurs**
Gestion des disponibilités individuelles des chauffeurs (congés, absences programmées, indisponibilités récurrentes) avec intégration dans le calendrier général.

**Notifications par SMS ou WhatsApp**
Extension du système de notifications vers des canaux externes (SMS via API, WhatsApp Business) pour informer les chauffeurs et les agents terrain sans nécessiter une connexion à l'application.

**Application mobile**
Développement d'une application mobile (iOS / Android) permettant aux agents terrain de soumettre des demandes et de consulter leur planning directement depuis leur téléphone, même en mobilité limitée.

**Signature électronique des bons de mission**
Génération de bons de mission imprimables ou PDF avec signature électronique de validation, pour les besoins de reporting bailleurs.

**Gestion des carburants**
Module dédié au suivi des consommations de carburant par véhicule : bons de carburant, relevés aux pompes, calcul de consommation au 100 km.

**Géolocalisation**
Intégration d'une carte interactive pour visualiser les destinations sur une carte de Côte d'Ivoire et estimer les distances.

**Archivage automatique**
Archivage automatique des demandes terminées de plus de 12 mois, avec accès à l'archive en lecture seule pour l'historique.

**Tableau de bord bailleur**
Module de reporting dédié aux formats attendus par les principaux bailleurs (USAID, UE, OIM, etc.) avec export automatisé aux formats PDF et Excel.

**Multi-organisation**
Extension de l'architecture pour gérer plusieurs sites ou sous-organisations d'Espace Confiance avec des données segmentées et des accès distincts.

### 18.2 Améliorations techniques prévues

- **Performance** : Mise en cache avancée des rapports et requêtes fréquentes
- **Export PDF** : Génération de rapports en format PDF directement depuis l'application
- **API publique** : Exposition d'une API documentée pour l'intégration avec d'autres outils de gestion utilisés par Espace Confiance
- **Authentification SSO** : Intégration avec un système d'authentification unique (Active Directory ou Google Workspace)
- **Mode hors-ligne** : Fonctionnement partiel de l'interface sans connexion réseau, avec synchronisation automatique au retour

### 18.3 Processus de demande de modification

Toute demande de modification, d'évolution ou de correction doit être adressée à Gesmalync via les coordonnées de contact indiquées à la section 19.

Les demandes seront :
1. Enregistrées et classifiées (bug, évolution mineure, évolution majeure)
2. Estimées en termes de charge et délai
3. Planifiées dans une prochaine version de l'application
4. Documentées dans la prochaine version de ce manuel

---

<!-- PAGE 31 -->

## 19. SUPPORT ET CONTACTS

### Développeur de l'application

**Gesmalync**  
Développement de solutions numériques pour les ONG et organisations humanitaires

**Représentant principal :**

> **Serges Alain GNAZERE**  
> IT | Senior Meal Officer | DBA  
> Architecte et développeur principal de SysLog

*Pour toute demande de support technique, correction de bugs, formation complémentaire ou évolution fonctionnelle, contactez Gesmalync en mentionnant :*
- Le nom de votre organisation : ONG Espace Confiance
- La version de l'application (v1.0.0)
- La description précise du problème ou de la demande
- Des captures d'écran si nécessaire

---

### Organisation cliente

**ONG Espace Confiance**

*Référent interne SysLog :*  
L'administrateur système désigné par la direction d'Espace Confiance est le premier point de contact pour les utilisateurs internes (problèmes de connexion, demandes de création de compte, questions fonctionnelles).

---

### Signalement de problèmes

En cas d'anomalie constatée dans l'application :

1. **Notez précisément** : ce que vous faisiez, ce qui s'est passé, le message d'erreur éventuel
2. **Capturez l'écran** si possible
3. **Consultez l'administrateur système** de votre organisation
4. **Transmettez le rapport** à Gesmalync si l'anomalie persiste

---

*Fin du manuel utilisateur SysLog v1.0.0*

---

**Gesmalync © 2026 — Tous droits réservés**  
*Développé pour ONG Espace Confiance*  
*Document confidentiel — Ne pas diffuser sans autorisation*
