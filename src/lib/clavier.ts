/**
 * Clavier mathématique — logique pure, sans React — chantier 7.5.
 *
 * ## Pourquoi ce module existe séparément du composant
 *
 * Toute l'intelligence du clavier est ici : insertion au curseur, retour
 * arrière, effacement, déplacement, création de fraction. Ce sont des
 * opérations sur une chaîne et un index — testables sans navigateur, sans
 * émulateur, et sans le piège classique d'un `input` dont le curseur « saute »
 * après une mise à jour d'état.
 *
 * ## Le symbole inséré est celui que le moteur comprend
 *
 * Le choix des caractères n'est pas esthétique : il est dicté par ce que
 * l'analyseur de correction sait réellement lire. Vérifié par sonde sur les
 * analyseurs de production :
 *
 * | Touche | Insère | Pourquoi |
 * |---|---|---|
 * | `−` | `−` (U+2212) | l'analyseur normalise le moins mathématique |
 * | `×` | `×` (U+00D7) | l'analyseur normalise la croix |
 * | `÷` | `/` | **`÷` est refusé** par la grammaire : la touche est étiquetée `÷` mais insère `/` |
 * | `x²` | `^2` | `²` est accepté et normalisé, mais `^2` est uniforme |
 * | `x³` | `^3` | **`³` est refusé** par la grammaire |
 * | `√` | `√` (U+221A) | accepté **uniquement** par l'analyseur de racines |
 *
 * Insérer `÷` ou `³` produirait une réponse refusée alors que l'élève a écrit
 * ce qu'il croit être juste : c'est le pire échec possible pour un clavier.
 *
 * ## Pas de racine dans une expression
 *
 * `√` n'a de sens que pour `typeReponse === 'racine'`. L'analyseur
 * d'expressions **refuse** `√`. La touche n'est donc affichée que là où elle
 * est correcte, plutôt que de laisser l'élève composer une réponse qui sera
 * rejetée.
 *
 * ## Représentation visible et représentation interne
 *
 * Il n'y a **qu'une seule** chaîne, celle que le moteur analyse. Aucune
 * couche AST parallèle n'est introduite : elle serait une seconde vérité à
 * maintenir en cohérence avec l'analyseur, sans queues. L'affichage lisible des
 * fractions et des racines est produit par `apercuLisible`, qui ne modifie
 * jamais la valeur envoyée à l'API.
 */

export type TypeReponse = 'rationnelle' | 'expression' | 'racine';

/** Position du curseur dans la saisie. */
export interface EtatSaisie {
  readonly valeur: string;
  /** Position du curseur, en nombre de caractères, de 0 à `valeur.length`. */
  readonly curseur: number;
}

/** Une touche du clavier. */
export interface Touche {
  readonly id: string;
  /** Texte visible sur la touche. */
  readonly libelle: string;
  /** Texte lu par un lecteur d'écran — jamais le glyphe seul. */
  readonly aria: string;
  /** Action de la touche. */
  readonly action: ToucheAction;
  /** Élargissement de la touche, en colonnes de la grille. */
  readonly largeur?: 1 | 2 | 3 | 4;
}

export type ToucheAction =
  /** Insère un littéral à la position du curseur. */
  | { type: 'inserer'; texte: string }
  /** Crée une fraction : numérateur et dénominateur distincts. */
  | { type: 'fraction' }
  /** Efface le caractère précédant le curseur. */
  | { type: 'retirer' }
  /** Vide toute la saisie. */
  | { type: 'effacer' }
  /** Déplace le curseur d'un cran. */
  | { type: 'deplacer'; pas: -1 | 1 }
  /** Valide la réponse. */
  | { type: 'valider' }
  /** Affiche ou masque le clavier. */
  | { type: 'fermer' }
  /** Bascule vers le clavier système. */
  | { type: 'systeme' };

/** Longueur maximale de saisie — borne défensive, alignée sur le serveur. */
export const SAISIE_MAX = 120;

// ---------------------------------------------------------------------------
// Opérations sur la saisie
// ---------------------------------------------------------------------------

/** Borne une position de curseur dans l'intervalle valide. */
function bornerCurseur(valeur: string, curseur: number): number {
  if (!Number.isFinite(curseur)) return valeur.length;
  return Math.max(0, Math.min(Math.trunc(curseur), valeur.length));
}

/** Saisie vide, curseur en début. */
export function saisieVide(): EtatSaisie {
  return { valeur: '', curseur: 0 };
}

/**
 * Insère du texte à la position du curseur et place le curseur **après** ce
 * qui vient d'être inséré.
 *
 * C'est ce qui permet de corriger au milieu d'une expression : insérer une
 * parenthèse au milieu de `2x+1` donne `2x+(1)`... non : `2x+` + `(` + `1`
 * avec le curseur juste après la parenthèse ouverte, prêt pour la saisie.
 */
export function inserer(etat: EtatSaisie, texte: string): EtatSaisie {
  if (texte === '') return etat;
  const curseur = bornerCurseur(etat.valeur, etat.curseur);
  const avant = etat.valeur.slice(0, curseur);
  const apres = etat.valeur.slice(curseur);
  const valeur = `${avant}${texte}${apres}`.slice(0, SAISIE_MAX);
  // Le curseur se place après ce qui a **réellement été inséré** : si la
  // longueur maximale a tronqué la saisie, on ne peut pas le placer après des
  // caractères qui n'existent pas.
  const longueurInseree = valeur.length - avant.length - apres.length;
  return { valeur, curseur: Math.min(curseur + longueurInseree, valeur.length) };
}

/**
 * Efface le caractère précédant le curseur.
 *
 * Sans sélection explicite dans l'état : le composant gère la sélection native
 * de l'`<input>`. Cette fonction travaille donc sur le curseur seul, ce qui
 * couvre le cas usuel « effacer ce que je viens d'écrire ».
 */
export function retirer(etat: EtatSaisie): EtatSaisie {
  const curseur = bornerCurseur(etat.valeur, etat.curseur);
  if (curseur === 0) return etat;
  return {
    valeur: etat.valeur.slice(0, curseur - 1) + etat.valeur.slice(curseur),
    curseur: curseur - 1,
  };
}

/** Vide la saisie et ramène le curseur au début. */
export function effacerTout(_etat: EtatSaisie): EtatSaisie {
  return saisieVide();
}

/** Déplace le curseur d'un cran, sans modifier la valeur. */
export function deplacer(etat: EtatSaisie, pas: -1 | 1): EtatSaisie {
  return { valeur: etat.valeur, curseur: bornerCurseur(etat.valeur, etat.curseur + pas) };
}

/**
 * Crée une fraction : insère la barre de division au curseur.
 *
 * ## Pourquoi une barre et non deux champs séparés
 *
 * Deux champs distincts imposeraient de reconstruire une chaîne à chaque
 * frappe et d'ajouter une grammaire parallèle à celle du moteur — une seconde
 * vérité à maintenir. Or l'analyseur de réponses rationnelles lit **déjà**
 * `7/6` comme un numérateur et un dénominateur : la barre de division produit
 * exactement la même information, sans rien inventer.
 *
 * L'affichage en fraction posée est Separé : `apercuLisible` le rend sans
 * toucher à la valeur envoyée.
 */
export function creerFraction(etat: EtatSaisie): EtatSaisie {
  return inserer(etat, '/');
}

// ---------------------------------------------------------------------------
// Jeu de touches
// ---------------------------------------------------------------------------

/**
 * Une ligne du clavier.
 *
 * ## Pourquoi des lignes et non une liste à plat
 *
 * Une liste à plat ne dit rien de l'agencement : il faut la reconstruire à la
 * main dans le composant, et l'ordre obtenue est un mélange de chiffres et
 * d'opérateurs. La disposition est ici **déclarée** : chaque ligne fait
 * quatre colonnes, les chiffres occupent la gauche, les opérateurs la droite.
 *
 * C'est la disposition d'une calculatrice de poche, familière à l'élève, et
 * non une grille où il faut chercher le `+` entre deux `7`.
 */

/** Nombre de colonnes de la grille. */
export const COLONNES = 4;

/** Un chiffre. */
function chiffre(n: number): Touche {
  const mots: Record<number, string> = {
    0: 'Zéro',
    1: 'Un',
    2: 'Deux',
    3: 'Trois',
    4: 'Quatre',
    5: 'Cinq',
    6: 'Six',
    7: 'Sept',
    8: 'Huit',
    9: 'Neuf',
  };
  const valeur = String(n);
  return {
    id: `chiffre-${valeur}`,
    libelle: valeur,
    aria: mots[n] ?? valeur,
    action: { type: 'inserer', texte: valeur },
  };
}

/** Un symbole nommé. */
function symbole(
  id: string,
  libelle: string,
  aria: string,
  texte: string,
  largeur: 1 | 2 | 3 = 1,
): Touche {
  return { id, libelle, aria, action: { type: 'inserer', texte }, largeur };
}

/** La virgule décimale. Insère un point : le seul décimal que l'analyseur lit. */
const VIRGULE = symbole('virgule', ',', 'Virgule décimale', '.');

/** Parenthèses, une par ligne du clavier où elles servent. */
const PARENTHESES: Touche[] = [
  symbole('parOuvrante', '(', 'Parenthèse ouvrante', '(', 2),
  symbole('parFermante', ')', 'Parenthèse fermante', ')', 2),
];

/** Les quatre opérations, dans l'ordre de la colonne de droite. */
const OPERATIONS: Touche[] = [
  symbole('division', '÷', 'Divisé par', '/'),
  symbole('croix', '×', 'Multiplié par', '×'),
  symbole('moins', '−', 'Moins', '−'),
  symbole('plus', '+', 'Plus', '+'),
];

/** Touches de correction : elles agissent sur le curseur, elles n'insèrent rien. */
const CORRECTION_REEL: Touche[] = [
  { id: 'gauche', libelle: '←', aria: 'Déplacer le curseur à gauche', action: { type: 'deplacer', pas: -1 } },
  { id: 'droite', libelle: '→', aria: 'Déplacer le curseur à droite', action: { type: 'deplacer', pas: 1 } },
  { id: 'retour', libelle: '⌫', aria: 'Effacer le dernier caractère', action: { type: 'retirer' }, largeur: 1 },
  { id: 'effacer', libelle: 'C', aria: 'Effacer toute la réponse', action: { type: 'effacer' } },
];

/**
 * Touches de fraction, propres aux réponses rationnelles.
 *
 * La barre produit un numérateur et un dénominateur distincts, dans le format
 * que l'analyseur rationnel lit déjà (`n/d`).
 */
const FRACTION: Touche = {
  id: 'fraction',
  libelle: '⅗',
  aria: 'Fraction, pour écrire un numérateur et un dénominateur',
  action: { type: 'fraction' },
};

/** Racine carrée, propre aux réponses de type `racine`. */
const RACINE_CARREE: Touche = {
  id: 'racine',
  libelle: '√',
  aria: 'Racine carrée, followed by the number under it',
  action: { type: 'inserer', texte: '√' },
};

/** Puissances, propres aux expressions. */
const PUISSANCES: Touche[] = [
  symbole('puissance2', 'x²', 'Puissance deux', '^2'),
  symbole('puissance3', 'x³', 'Puissance trois', '^3'),
  symbole('puissance', 'xⁿ', 'Puissance, followed by the exponent', '^'),
];

/**
 * Le signe `=`, qui se comporte comme un caractère dans les dispositions
 * d'expression et de racine.
 */
const EGAL: Touche = symbole('egal', '=', 'Égal', '=');

/**
 * Le signe `=` en pleine largeur, pour les exercices de calcul fractionnaire :
 * y terminer le calcul est l'acte même de l'exercice, la touche mérite donc sa
 * propre rangée.
 */
const EGAL_PLEIN_LARGEUR: Touche = { ...EGAL, largeur: 4 };

/** Touches de service : validation, fermeture, clavier système. */
const SERVICE: Touche[] = [
  { id: 'valider', libelle: 'Vérifier', aria: 'Vérifier ma réponse', action: { type: 'valider' }, largeur: 4 },
  { id: 'fermer', libelle: 'Masquer', aria: 'Masquer le clavier mathématique', action: { type: 'fermer' }, largeur: 2 },
  { id: 'systeme', libelle: 'Clavier système', aria: 'Utiliser le clavier du téléphone', action: { type: 'systeme' }, largeur: 2 },
];

/** Une ligne du clavier. */
export interface RangeeClavier {
  readonly touches: readonly Touche[];
}

function rangee(...touches: Touche[]): RangeeClavier {
  return { touches };
}

/** Lignes communes : correction, masquage et clavier système, puis validation. */
const RANGEES_SERVICE: RangeeClavier[] = [
  rangee(...CORRECTION_REEL),
  rangee(SERVICE[1]!, SERVICE[2]!),
  rangee(SERVICE[0]!),
];

/**
 * Disposition d'un exercice de **calcul littéral**.
 *
 *     7 8 9 ÷
 *     4 5 6 ×
 *     1 2 3 −
 *     0 , x +
 *     x² x³ xⁿ =
 *     (        )        ← deux touches de deux colonnes
 *     ← → ⌫ C
 *     Masquer     Clavier système
 *     Vérifier
 *
 * Les chiffres occupent la partie gauche, les opérations la colonne de droite :
 * la main trouve `/` et `−` au même endroit à chaque ligne.
 */
const RANGEES_EXPRESSION: RangeeClavier[] = [
  rangee(chiffre(7), chiffre(8), chiffre(9), OPERATIONS[0]!),
  rangee(chiffre(4), chiffre(5), chiffre(6), OPERATIONS[1]!),
  rangee(chiffre(1), chiffre(2), chiffre(3), OPERATIONS[2]!),
  rangee(chiffre(0), VIRGULE, symbole('x', 'x', 'Lettre x', 'x'), OPERATIONS[3]!),
  rangee(PUISSANCES[0]!, PUISSANCES[1]!, PUISSANCES[2]!, EGAL),
  rangee(...PARENTHESES),
  ...RANGEES_SERVICE,
];

/**
 * Disposition d'un exercice de **racines carrées**.
 *
 * La racine prend la place de la division dans la colonne de droite : c'est
 * l'opération principale de ces exercices, et elle doit être atteinte aussi
 * vite qu'un chiffre.
 */
const RANGEES_RACINE: RangeeClavier[] = [
  rangee(chiffre(7), chiffre(8), chiffre(9), RACINE_CARREE),
  rangee(chiffre(4), chiffre(5), chiffre(6), OPERATIONS[1]!),
  rangee(chiffre(1), chiffre(2), chiffre(3), OPERATIONS[0]!),
  rangee(chiffre(0), VIRGULE, OPERATIONS[2]!, OPERATIONS[3]!),
  rangee(...PARENTHESES),
  rangee(EGAL_PLEIN_LARGEUR),
  ...RANGEES_SERVICE,
];

/**
 * Disposition d'un exercice de **calcul fractionnaire**.
 *
 * La barre de fraction occupe la colonne des opérations : c'est l'opération
 * que l'élève cherche, plus que la multiplication.
 */
const RANGEES_RATIONNELLE: RangeeClavier[] = [
  rangee(chiffre(7), chiffre(8), chiffre(9), FRACTION),
  rangee(chiffre(4), chiffre(5), chiffre(6), OPERATIONS[1]!),
  rangee(chiffre(1), chiffre(2), chiffre(3), OPERATIONS[0]!),
  rangee(chiffre(0), VIRGULE, OPERATIONS[2]!, OPERATIONS[3]!),
  rangee(EGAL_PLEIN_LARGEUR),
  ...RANGEES_SERVICE,
];

/**
 * Disposition complète du clavier pour un type de grandeur.
 *
 * Chaque ligne occupe **exactement** `COLONNES` colonnes, la somme des
 * `largeur` de ses touches. Cette invariant est vérifiée par les tests : une
 * ligne débordant de la grille produirait une touche hors écran sur un téléphone.
 */
export function rangeesPour(type: TypeReponse): RangeeClavier[] {
  if (type === 'expression') return RANGEES_EXPRESSION;
  if (type === 'racine') return RANGEES_RACINE;
  return RANGEES_RATIONNELLE;
}

/**
 * Toutes les touches, à plat.
 *
 * Utile aux tests et à toute recherche par identifiant. Le rendu, lui, se fait
 * par rangées : l'ordre à plat n'a pas de sens visuel.
 */
export function touchesPour(type: TypeReponse): Touche[] {
  return rangeesPour(type).flatMap((r) => [...r.touches]);
}

/**
 * Largeur totale occupée par une rangée, en colonnes.
 *
 * Exposée pour que le composant et les tests partagent la même règle de mise en
 * page, sans la dupliquer.
 */
export function largeurRangee(r: RangeeClavier): number {
  return r.touches.reduce((total, t) => total + (t.largeur ?? 1), 0);
}
// ---------------------------------------------------------------------------
// Aperçu lisible
// ---------------------------------------------------------------------------

/**
 * Description lisible d'une saisie, pour l'affichage sous le champ.
 *
 * Elle **ne modifie jamais** la valeur : c'est une aide à la lecture, pas une
 * transformation. Une fraction est présentée comme un couple numérateur /
 * dénominateur, une racine comme le nombre qui se trouve dessous.
 */
export function apercuLisible(valeur: string): string {
  const texte = valeur.trim();
  if (texte === '') return '';

  const fraction = texte.match(/^(-?\d+)\/(\d+)$/);
  if (fraction) {
    return `Fraction : ${fraction[1]} sur ${fraction[2]}.`;
  }

  const racine = texte.match(/^(-?\d*)√(\d+)$/);
  if (racine) {
    const coefficient = racine[1] === '' || racine[1] === undefined ? '1' : racine[1];
    return `Racine : ${coefficient} fois la racine de ${racine[2]}.`;
  }

  const puissance = texte.match(/^(.+?)\^(\d+)$/);
  if (puissance) {
    return `Puissance ${puissance[2]} de ${puissance[1]}.`;
  }

  // Une saisie qui n'appartient pas à l'alphabet mathématique n'est pas
  // reformulée : la décrire reviendrait à confirmer une saisie que le moteur
  // refusera. On n'affiche alors rien, et le verdict dira « réponse illisible ».
  if (!/^[0-9a-zA-Z\s+\-*/^()=.,]+$/.test(texte)) return '';

  return texte;
}