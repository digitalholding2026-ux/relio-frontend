# `frontend/` — Emplacement réservé

**Dossier vide par intention.** Rien n'y a été écrit, et c'est voulu.

Ce dossier accueillera l'application frontend de Relio **lorsque le chantier 2
sera lancé sur instruction du propriétaire**. Il ne contient aujourd'hui
**aucun code**.

---

## Ce qui viendra ici

- Interface utilisateur, navigation, composants
- Expérience mobile (l'élève sur téléphone est le cas principal)
- Mini-diagnostic, exercices, explications, progression
- Client HTTP vers le backend

## Ce qui ne viendra **jamais** ici

> 🔴 **Aucun contenu issu des sujets ou corrigés du BEPC.**

Les droits de reproduction ne sont pas établis. Vercel sert le frontend
**publiquement** : un `import` de JSON le compilerait dans un bundle public et
téléchargeable. Voir `docs/architecture-cible.md` § 7.

| Élément | Autorisé ici ? |
|---|---|
| `data/referentiel-maths-3e-cm-2025-2026.json` | ❌ Non — reste côté backend |
| `data/inventaire-questions-bepc-2025-2026.json` | ❌ **Non — jamais** |
| Les 4 PDF du BEPC | ❌ **Non — jamais** |
| Questions **originales** (mini-diagnostic) | ✅ Oui, via l'API |
| Intitulés de leçons, volumes horaires | ✅ Oui, via l'API |

## Secrets

Aucune clé ici. La seule variable d'environnement admise est
`NEXT_PUBLIC_API_URL` (une URL d'API n'est pas un secret). Toute clé d'API IA
appartient au backend.

---

## État

| Élément | Valeur |
|---|---|
| Code | Aucun |
| `package.json` | Absent |
| Framework | **Non décidé** — Next.js recommandé, Vite + React en alternative |
| Déploiement prévu | Vercel |

---

*Contexte : `docs/audit-migration-architecture.md`,
`docs/architecture-cible.md`, `docs/plan-migration-depots.md`.*