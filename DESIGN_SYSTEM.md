# Design system Relio

Contrat visuel du produit. Tout écran ajouté se compare à cette page, il ne la
redéfinit pas.

- **Page de référence** : `/design-system` (interne, voir « Accès » plus bas)
- **Source des tokens** : `src/design/tokens.ts` (TypeScript) et
  `src/design/tokens.css` (variables CSS)
- **Composants** : `src/components/ds/`

---

## 1. Principes

Cinq règles, dans l'ordre d'importance.

1. **Mobile d'abord.** La largeur de référence est **360 px**. Tout ce qui n'est
   pas vérifié à 360 px n'est pas vérifié.
2. **Peu de données.** Police système, icônes SVG, aucune image bitmap, aucune
   animation coûteuse. Le CSS complet pèse **6,97 Ko gzip**, pour un budget de
   30 Ko.
3. **AA sans exception.** Le contraste est **calculé**, jamais estimé à l'œil.
4. **44 px au doigt.** Toute cible tactile, sans exception.
5. **Français simple et bienveillant.** Ton d'un élève à un autre, jamais
   d'infantilisation.

---

## 2. Tokens

### Couleurs

On utilise des **rôles**, jamais des teintes directement.

| Rôle | Clair | Sombre | Usage |
|---|---|---|---|
| `--relio-fond` | `#FAF7F2` | `#0B1020` | fond de page |
| `--relio-surface` | `#FFFFFF` | `#151B33` | cartes, champs |
| `--relio-surface-haute` | `#F4F1EC` | `#1E2647` | fond secondaire, pistes |
| `--relio-texte` | `#0F172A` | `#F1F5F9` | texte principal |
| `--relio-texte-secondaire` | `#63738A` | `#94A3B8` | texte secondaire |
| `--relio-bordure` | `#E2E8F0` | `#6A7290` | bordure décorative |
| `--relio-bordure-forte` | `#838A96` | `#9BA3BC` | bordure de formulaire |
| `--relio-primaire` | `#1E2A78` | `#2A3A96` | action principale |
| `--relio-accent` | `#F97316` | `#F97316` | accent, énergie |
| `--relio-succes` | `#16A34A` | `#16A34A` | réussite |
| `--relio-alerte` | `#DC2626` | `#F87171` | erreur |

#### Trois conflits que la palette de marque ne résout pas

Les couleurs imposées ne passent pas toutes l'AA. Ces trois décisions en
découlent, et elles sont **vérifiées par test** :

| Usage naïf | Mesure | Décision |
|---|---|---|
| texte blanc sur orange `#F97316` | 2,62:1 | **interdit** — l'orange porte de l'encre (6,37:1) |
| texte blanc sur vert `#16A34A` | 3,08:1 | **interdit** — le vert porte de l'encre (5,42:1) |
| texte secondaire `#64748B` sur fond sable | 4,45:1 | `--relio-muted-strong` (`#63738A`, 4,52:1) pour tout texte courant |

**La règle à retenir : un fond coloré porte de l'encre, sauf le rouge et
l'indigo.**

`--relio-bordure` est décorative : elle n'a pas à atteindre 3:1.
`--relio-bordure-forte` est celle des **champs de formulaire**, qui doivent être
repérables sur le fond, la surface et la surface haute.

### Typographie

Police système : `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.
Aucune police externe — elle coûterait 100 à 300 Ko sur une connexion 3G.

| Échelle | Valeurs |
|---|---|
| Tailles | 12 / 14 / 16 / 18 / 20 / 24 / 32 / 40 px |
| Graisses | 400 / 500 / 600 / 700 |
| Interlignage | 1,5 corps · 1,2 titres |

**Le corps est à 16 px minimum.** En dessous, iOS réduit la police et zoome la
page au focus.

### Espacements, rayons, ombres, durées

- Espacements : base 4 px — 0 / 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64.
- Rayons : 8 / 12 / 16 / 24 / plein.
- Ombres : **trois niveaux seulement** (sm, md, lg). Une ombre par densité
  d'information donne une hiérarchie lisible ; cinq donnent du flou.
- Durées : 150 ms (micro) / 250 ms (standard) / 400 ms (écran).

### Cible tactile

- `--relio-tactile-min` : **44 px**, plancher universel.
- `--relio-champ-min` : **48 px** pour les champs de saisie — le gabarit système
  sur Android est plus haut qu'un texte dessiné, et un champ se vise au doigt
  en visant large.

---

## 3. Composants

Import depuis `@/components/ds`.

| Composant | Variantes | Quand |
|---|---|---|
| `Bouton` | primary, secondary, ghost, danger × sm, md, lg × défaut, désactivé, chargement | action. **Une seule action principale par écran visible.** |
| `BoutonIcone` | léger, plein, discret | action dont le sens tient dans l'image. **`label` obligatoire.** |
| `Carte` | conteneur, élevée × sm, md, lg | surface de regroupement. **Une idée par carte.** |
| `Puce` | active / inactive | choisir dans une liste |
| `Pastille` | neutre, succès, alerte, accent, primaire | décrire un état |
| `BarreProgression` | 4 tons | progression linéaire. **Jamais un score d'exercice.** |
| `AnneauProgression` | 4 tons | progression circulaire. Même interdiction. |
| `Champ` / `ZoneTexte` | — | saisie, avec aide et erreur reliées |
| `Avatar` | sm, md, lg | initiale ; couleur déduite du nom |
| `Feuille` | fond cliquable ou non | boîte de dialogue mobile |
| `Notification` | info, succès, alerte | retour **après** une action |
| `Squelette` | ligne, bloc, rond | chargement. **Sans animation.** |
| `EtatVide` | — | rien à afficher, avec une action de sortie |
| `Icone` | 12 icônes SVG | décoration ou image nommée |

### Choisir entre puce, pastille et bouton

- **Puce** — je choisis parmi plusieurs : une matière, un filtre.
- **Pastille** — c'est un état : « Réussi », « À revoir ».
- **Bouton** — c'est une action.

### Puce ou case à cocher ?

Une puce est un `button` avec `aria-pressed`. Si **plusieurs** choix sont
possibles en même temps, un groupe de cases à cocher convient mieux.

### Notification ou feuille ?

Une notification **confirme ou prévient** ; elle ne demande rien. Si l'élève doit
choisir, c'est une feuille : une notification qui disparaît seule pendant qu'on
la lit est un piège.

---

## 4. Règles d'accessibilité

### Contraste

- AA : **4,5:1** pour un texte courant, **3:1** pour un grand texte et les
  éléments d'interface.
- Les combinaisons sont **calculées** par `src/design/contraste.ts`, la même
  formule que la spécification WCAG, et vérifiées par
  `src/design/tokens.test.ts`.
- La page `/design-system` affiche le ratio réel de chaque paire.

### Cible tactile

44 px minimum partout, sans exception. Vérifié **statically** dans
`src/design/accessibilite.test.ts` : `jsdom` n'applique pas de feuille de style,
un test de rendu ne mesurerait donc rien.

### Focus

- Anneau visible de 3 px sur tous les éléments interactifs, via la classe
  partagée `composes: focus`.
- `:focus-visible` uniquement : le focus au pointeur n'est pas montré.

### Lecteur d'écran

| Situation | Règle appliquée |
|---|---|
| Champ de saisie | `<label for>` + `aria-describedby` pour l'aide **et** l'erreur |
| Erreur | `role="alert"` : elle interrompt, car elle vient d'apparaître |
| Icône seule | `label` obligatoire sur `BoutonIcone` |
| Icône décorative | `aria-hidden`, sans titre |
| Progression | `role="progressbar"` + les trois valeurs, **et** le chiffre en texte |
| Feuille | `role="dialog"`, `aria-modal`, piège de focus, retour du focus à la fermeture |
| Notification | `role="status"` pour une information, `role="alert"` pour une erreur |
| Contenu réservé | `composes: visuellementCache` — masqué **visuellement**, présent dans l'arbre d'accessibilité |

### Mouvement

`prefers-reduced-motion: reduce` annule **toutes** les durées et **toutes** les
animations. C'est une demande explicite de l'utilisateur, pas une question de
goût. Vérifié par test : toute animation déclarée doit avoir son échappement.

---

## 5. Modes d'affichage

### Clair / sombre

- Le mode sombre est déclaré **deux fois** : par `prefers-color-scheme` pour qui
  n'a jamais choisi, et par `[data-theme="sombre"]` pour qui a choisi.
- L'attribut, plus spécifique, l'emporte : un élève ayant choisi le clair sur un
  téléphone réglé en sombre voit bien le clair.
- Le thème modifie aussi `<meta name="theme-color">`, sinon la barre d'adresse
  resterait claire sous une page sombre.

### Économie de données

`[data-economie="on"]` : les trois ombres deviennent `none` et toutes les durées
passent à 0. **Aucune information n'est retirée** — une bordure prend le relais
des ombres, avec la même valeur de contraste. L'interface reste aussi lisible,
elle coûte moins d'octets et moins de GPU.

C'est ce qui permet de proposer ce mode à un élève en données limitées sans lui
proposer un produit dégradé.

---

## 6. Budgets

| Budget | Seuil | Actuel |
|---|---|---|
| CSS de production | 30 Ko gzip | **6,97 Ko** (7 140 octets) |
| Police externe | 0 | 0 |
| Image bitmap | 0 | 0 |
| Dépendance UI lourde | 0 | 0 |

La valeur est celle retournée par `npm run verifier:poids` sur le build
courant, qui l'arrondit à une décimale et affiche `7.0 Ko`.

Le contrôle existe (`npm run verifier:poids`) et s'exécute manuellement. Il
n'est pas branché dans la CI. Un test ne conviendrait pas — il s'exécuterait
avant que les CSS Modules aient été fusionnés.

---

## 7. Accès à la page

`/design-system` est **fermée par défaut en production**.

- En développement et en prévisualisation : toujours accessible.
- En production : accessible uniquement si `DESIGN_SYSTEM_ENABLED=on` est posé
  dans l'environnement de déploiement.

**Pourquoi la page renvoyait 404 même avec la variable posée.** Elle était
prérendue en erreur au build. Poser `DESIGN_SYSTEM_ENABLED=on` ne suffisait pas
à la rendre accessible : la page devait être rendue dynamiquement. Ce point est
corrigé au chantier A, correctif 6 — `dynamic = 'force-dynamic'`. La fermeture
par défaut en production est conservée.

Le projet ne dispose d'aucun système d'authentification et il n'en est pas
introduit ici : une page interne n'est pas une raison de construire un contrôle
d'accès. Une variable d'environnement règle le problème sans secret ni session.

La page est par ailleurs marquée `noindex`.

---

## 8. Ajouter un composant

1. Le `.tsx` et son `.module.css` portent le **même nom**, en français.
2. Toute couleur vient d'un token — une couleur brute ne suit pas le mode sombre.
3. Toute cible tactile compose `cible` ou déclare un token.
4. Toute animation a son échappement `prefers-reduced-motion`.
5. Un test de rendu dans `src/components/ds/composants.test.tsx`.
6. Une section dans `PageDesignSystem.tsx`.
7. Une ligne dans le tableau § 3 ci-dessus.

---

## 9. Ce qui reste à faire

- **Adoption nulle à ce jour.** Aucun composant du design system n'est utilisé
  hors de `/design-system`. La seule page qui importe `src/components/ds/*` est
  son propre catalogue. La migration de l'application est un chantier à part
  entière.
- **Migration des écrans existants.** `Exercice.tsx`, `ClavierMath.tsx` et
  `globals.css` utilisent encore leurs propres classes. Ce chantier livre les
  fondations, pas la migration : elle doit se faire écran par écran, sans casser
  le parcours déjà vérifié en production.
- **Revue sur appareil.** Les contrastes sont calculés et exacts ; la taille
  réelle des cibles tactiles, le défilement et le rendu à 360 px **ne sont pas
  vérifiés** — ils demanderaient un téléphone.