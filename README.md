# relio-frontend

Application frontend de **Relio** — préparation du BEPC (Mathématiques, 3e).

**Statut : socle technique. Aucune fonctionnalité pédagogique n'est implémentée.**

---

## ⚠️ Ce que cette application n'est PAS

Elle ne propose **ni diagnostic, ni exercices, ni tuteur IA, ni suivi de
progression**. La page d'accueil décrit un parcours **prévu**, et affiche
explicitement l'état « Bientôt » / « Prévu » / « Non planifié » sur chaque
fonctionnalité.

Aucun contenu d'épreuve officielle (sujets, corrigés, figures) n'est
reproduit. Aucune donnée réelle d'élève n'est collectée.

---

## Stack

| Élément | Choix | Raison |
|---|---|---|
| Framework | **Next.js 15** (App Router) | Déploiement natif Vercel, prévisualisations automatiques par Pull Request |
| Langage | **TypeScript** strict | Le socle manipule des réponses d'API discriminées ; une faute doit échouer au build |
| Rendu | CSS natif, aucun framework UI | Socle minimal : pas de dépendance inutile avant d'avoir un design validé |
| Client HTTP | `fetch`, côté navigateur | Aucun SDK d'API : le contrat est petit et documenté |

---

## Prérequis

- **Node.js 20 ou supérieur**
- npm

---

## Installation

```bash
npm install
cp .env.example .env.local
```

---

## Variables d'environnement

| Variable | Obligatoire | Défaut | Rôle |
|---|---|---|---|
| `API_BASE_URL` | Non | *(vide)* | URL de base du backend, sans barre finale |

Voir `.env.example`.

### ⚠️ Pourquoi `API_BASE_URL` et non `NEXT_PUBLIC_API_BASE_URL` ?

Dans Next.js, **seules les variables préfixées `NEXT_PUBLIC_` sont lisibles
dans le code navigateur** — et leur valeur est alors **compilée dans un bundle
public**.

Or le chantier impose le nom `API_BASE_URL`. La valeur est donc lue dans un
**composant serveur** (`src/app/page.tsx`), puis transmise au composant client
`ApiStatus` par prop.

| Conséquence | Effet |
|---|---|
| Build Vercel | ✅ Aucun appel réseau — le build ne peut pas échouer si l'API est down |
| Valeur dans le bundle | ✅ Absente — inutile d'exposer une URL d'API publiquement |
| Vérification de connexion | ✅ Made in navigateur, au clic, avec états réels |

### 🔴 `API_BASE_URL` est figée AU BUILD, pas au runtime

**Constat mesuré en production le 2026-10-10.** La page `/` est **prérendue
statiquement** (`○ (Static) prerendered as static content`). La valeur de
`API_BASE_URL` est donc évaluée **au moment de la construction**, puis figée
dans le HTML servi — on la retrouve sérialisée dans le payload RSC.

**Conséquence directe :**

> ⚠️ **Modifier `API_BASE_URL` dans les réglages Vercel n'a AUCUN effet tant
> qu'un nouveau déploiement n'a pas eu lieu.** Il faut *déclencher un
> redéploiement* après chaque changement.

**Risque associé.** Lors d'un basculement de backend (passage d'une URL à une
autre), l'application peut continuer à interroger l'ancien service tout en
affichant « Joignable » si ce dernier répond encore.

**Vérifier après tout changement :** ouvrir le site, section « Connexion au
service », et contrôler que l'URL affichée correspond bien à la nouvelle valeur.

*Si un basculement d'API devient une opération courante, le correctif consiste
à passer la page en rendu dynamique (`export const dynamic = 'force-dynamic'`).
Ce n'est pas nécessaire tant que l'URL est stable.*

**Ne mettez aucun secret dans cette application.** Une URL d'API n'est pas un
secret ; une clé de fournisseur d'IA, si. Elle appartient au backend.

---

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm test` | Tests automatisés (`node --test`, sans réseau) |
| `npm run build` | Build de production |
| `npm start` | Démarre le build de production |
| `npm run typecheck` | Vérification de types, sans build |

### Tests

13 tests couvrent `src/lib/api.ts` : état non configuré, contrat valide, 404,
erreur HTTP 500, réponse hors contrat, panne réseau, délai dépassé, présence du
signal d'annulation, absence de mise en cache.

Ils **remplacent `fetch` par un stub local** : aucune connexion sortante,
aucun contact avec la production, exécution déterministe.

> **Périmètre volontairement limité** : ce sont les tests de la *logique* de
> connexion. Le composant React `ApiStatus` et l'affichage mobile ne sont pas
> testés — cela nécessiterait un environnement de rendu (jsdom) et une
> abstraction supplémentaire. Non fait, et signalé comme tel.

---

## Dépendances et sécurité

`next@15.5.27` épingle `postcss` en `8.4.31`, version vulnérable
(`<= 8.5.22` — XSS et fuite de fichiers via `sourceMappingURL`).

`next@15.5.27` étant la **dernière** version 15.x, aucun patch correctif n'existe
sur cette branche. La mise à jour de `next@16` serait une **rupture majeure**.

**Correctif appliqué** — `package.json` :

```json
"overrides": { "postcss": "^8.5.29" }
```

**Justification de la version imposée.** `postcss` passe de `8.4.31` à `8.5.29` :
même major `8.x`, donc compatible au sens de SemVer. `8.5.29` est la dernière
version publiée et corrige les quatre avis de sécurité.

**Vérification de compatibilité effectuée :**

| Contrôle | Résultat |
|---|---|
| `npm audit` | ✅ **0 vulnérabilité** |
| `next` installé | `15.5.27` — **inchangé**, pas de rupture |
| `npm run typecheck` | ✅ OK |
| `npm run build` | ✅ OK |
| **CSS produit, comparaison byte-à-byte** | ✅ **identique** avant/après |
| `npm ci` depuis le lockfile | ✅ reproductible |

> Le CSS généré est byte-identique : l'override ne modifie pas le traitement CSS
> de ce projet. `postcss` s'exécute **à la construction**, dans le conteneur
> Vercel ; il **n'est pas livré au navigateur** (vérifié sur le bundle en
> production). Le risque pour les élèves était donc nul.

---

## Structure

```
src/
├── app/
│   ├── layout.tsx        Layout racine, métadonnées, viewport
│   ├── page.tsx          Page d'accueil (composant serveur)
│   └── globals.css       Styles — mobile-first, sans framework
├── components/
│   ├── ApiStatus.tsx     Vérification réelle de la connexion (client)
│   └── parcours.ts       Étapes du parcours prévu
└── lib/
    └── api.ts            Client API typé — ne fabrique jamais de réponse

next.config.ts            Configuration build et en-têtes de sécurité
```

**Page serveur + composant client.** `page.tsx` lit `API_BASE_URL` côté serveur
et rend le reste du contenu. Seul `ApiStatus` est client, car c'est le seul
élément qui parle au réseau. Cette séparation évite tout appel pendant le
build et garde la page instantly affichable.

---

## État de la connexion à l'API

`ApiStatus` interroge réellement `GET /api/v1` et affiche :

| Situation | Affichage |
|---|---|
| `200` conforme | « Joignable » + version + statut |
| `404` | « Désynchronisé » — le backend est en retard |
| `500` | « Indisponible » |
| Réseau / timeout / CORS | « Indisponible » + cause probable |

**Le composant ne montre jamais « connecté » sans réponse réelle du serveur.**

Le champ `status` vaut `socle` : une API joignable **ne signifie pas** qu'une
fonctionnalité pédagogique existe. L'interface le rappelle explicitement.

---

## Sécurité

| Mesure | État |
|---|---|
| Aucune clé, aucun jeton dans le dépôt | ✅ `.gitignore` exclut `.env`, `.env.local`, `*.pem`, `*.key` |
| Aucune variable `NEXT_PUBLIC_*` | ✅ Aucune n'est définie |
| `API_BASE_URL` absente du bundle | ✅ Lue côté serveur |
| En-têtes de sécurité | ✅ `nosniff`, `Referrer-Policy`, `X-Frame-Options` |
| `poweredByHeader` désactivé | ✅ |
| Contenu BEPC | ✅ Aucun importé, aucun référencé |
| Données d'élèves | ✅ Aucune collectée |
| Accessibilité | ✅ `lang="fr"`, `role="note"`, libellés `aria-labelledby`, `prefers-reduced-motion` |

---

## Déploiement sur Vercel

Le propriétaire réalise ces étapes (je n'ai pas accès à la plateforme).

1. Importer le dépôt `relio-frontend`.
2. **Framework** : Next.js (détecté automatiquement).
3. **Build Command** : `npm run build` · **Output** : géré par la plateforme.
4. **Install Command** : `npm install`.
5. Définir `API_BASE_URL` dans *Settings → Environment Variables* pour
   Production, Preview **et** Development.
6. Branche de production : `main`.

**⚠️ Le build ne contacte pas l'API.** Si l'URL est absente ou fausse, le site
se déploie normalement et affiche « API non configurée » ou « Indisponible ».

**Prévisualisations** : chaque Pull Request obtient une URL `*.vercel.app`.
Si `CORS_ORIGINS` du backend est strict, la vérification de connexion y échouera
— c'est attendu, et l'écran l'affichera comme tel.

---

*Contrat d'intégration : voir `docs/CONTRAT-API.md` dans le dépôt **relio-backend**.*