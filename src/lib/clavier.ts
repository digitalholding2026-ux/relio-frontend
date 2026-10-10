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
  /** Élargissement de la touche, de 1 à 3 colonnes. */
  readonly largeur?: 1 | 2 | 3;
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

/** Chiffres et point décimal, communs à tous les types. */
const CHIFFRES: Touche[] = [
  { id: '7', libelle: '7', aria: 'Sept', action: { type: 'inserer', texte: '7' } },
  { id: '8', libelle: '8', aria: 'Huit', action: { type: 'inserer', texte: '8' } },
  { id: '9', libelle: '9', aria: 'Neuf', action: { type: 'inserer', texte: '9' } },
  { id: '4', libelle: '4', aria: 'Quatre', action: { type: 'inserer', texte: '4' } },
  { id: '5', libelle: '5', aria: 'Cinq', action: { type: 'inserer', texte: '5' } },
  { id: '6', libelle: '6', aria: 'Six', action: { type: 'inserer', texte: '6' } },
  { id: '1', libelle: '1', aria: 'Un', action: { type: 'inserer', texte: '1' } },
  { id: '2', libelle: '2', aria: 'Deux', action: { type: 'inserer', texte: '2' } },
  { id: '3', libelle: '3', aria: 'Trois', action: { type: 'inserer', texte: '3' } },
  { id: '0', libelle: '0', aria: 'Zéro', action: { type: 'inserer', texte: '0' } },
  {
    id: 'virgule',
    libelle: ',',
    aria: 'Virgule décimale',
    action: { type: 'inserer', texte: '.' },
  },
];

/**
 * Touches communes à tous les exercices.
 *
 * `√` et la barre de fraction **n'y figurent pas** : leur présence dépend du
 * type de grandeur attendue, et les afficher ailleurs ferait composer une
 * réponse que le moteur refuse.
 */
const COMMUNES: Touche[] = [
  { id: 'moins', libelle: '−', aria: 'Moins', action: { type: 'inserer', texte: '−' } },
  { id: 'plus', libelle: '+', aria: 'Plus', action: { type: 'inserer', texte: '+' } },
];

/** Touches propres aux expressions algébriques. */
const ALGEBRE: Touche[] = [
  { id: 'x', libelle: 'x', aria: 'Lettre x', action: { type: 'inserer', texte: 'x' } },
  { id: 'croix', libelle: '×', aria: 'Multiplié par', action: { type: 'inserer', texte: '×' } },
  {
    id: 'division',
    libelle: '÷',
    aria: 'Divisé par',
    action: { type: 'inserer', texte: '/' },
  },
  {
    id: 'puissance2',
    libelle: 'x²',
    aria: 'Puissance deux',
    action: { type: 'inserer', texte: '^2' },
  },
  {
    id: 'puissance3',
    libelle: 'x³',
    aria: 'Puissance trois',
    action: { type: 'inserer', texte: '^3' },
  },
  {
    id: 'puissance',
    libelle: 'xⁿ',
    aria: 'Puissance, followed by the exponent',
    action: { type: 'inserer', texte: '^' },
  },
  {
    id: 'parOuvrante',
    libelle: '(',
    aria: 'Parenthèse ouvrante',
    action: { type: 'inserer', texte: '(' },
    largeur: 2,
  },
  {
    id: 'parFermante',
    libelle: ')',
    aria: 'Parenthèse fermante',
    action: { type: 'inserer', texte: ')' },
    largeur: 2,
  },
];

/** Touche racine : proposée uniquement pour `typeReponse === 'racine'`. */
const RACINE: Touche[] = [
  {
    id: 'racine',
    libelle: '√',
    aria: 'Racine carrée, followed by the number under it',
    action: { type: 'inserer', texte: '√' },
    largeur: 2,
  },
  {
    id: 'parOuvranteRacine',
    libelle: '(',
    aria: 'Parenthèse ouvrante',
    action: { type: 'inserer', texte: '(' },
  },
  {
    id: 'parFermanteRacine',
    libelle: ')',
    aria: 'Parenthèse fermante',
    action: { type: 'inserer', texte: ')' },
  },
];

/** Touche fraction : proposée uniquement pour `typeReponse === 'rationnelle'`. */
const FRACTION: Touche[] = [
  {
    id: 'fraction',
    libelle: '⅗',
    aria: 'Fraction, pour écrire un numérateur et un dénominateur',
    action: { type: 'fraction' },
    largeur: 2,
  },
];

/** Touche `=` : utile à l'élève, neutre pour l'analyseur. */
const EGAL: Touche = {
  id: 'egal',
  libelle: '=',
  aria: 'Égal',
  action: { type: 'inserer', texte: '=' },
};

/** Touches de contrôle, communes. */
const CONTROLE: Touche[] = [
  { id: 'gauche', libelle: '←', aria: 'Déplacer le curseur à gauche', action: { type: 'deplacer', pas: -1 } },
  { id: 'droite', libelle: '→', aria: 'Déplacer le curseur à droite', action: { type: 'deplacer', pas: 1 } },
  { id: 'retour', libelle: '⌫', aria: 'Effacer le dernier caractère', action: { type: 'retirer' }, largeur: 2 },
  { id: 'effacer', libelle: 'C', aria: 'Effacer toute la réponse', action: { type: 'effacer' } },
  { id: 'valider', libelle: 'Vérifier', aria: 'Vérifier ma réponse', action: { type: 'valider' }, largeur: 3 },
  { id: 'fermer', libelle: 'Masquer le clavier', aria: 'Masquer le clavier mathématique', action: { type: 'fermer' } },
  { id: 'systeme', libelle: 'Clavier système', aria: 'Utiliser le clavier du téléphone', action: { type: 'systeme' }, largeur: 3 },
];

/**
 * Range de touches correspondant au type de grandeur attendue.
 *
 * L'ordre est pensé pour le pouce : chiffres au centre, opérations autour,
 * validation en pleine largeur.
 */
export function touchesPour(type: TypeReponse): Touche[] {
  const base: Touche[] = [];

  if (type === 'expression') {
    base.push(...CHIFFRES.slice(0, 3), ...ALGEBRE.slice(0, 3));
    base.push(...CHIFFRES.slice(3, 6), ...ALGEBRE.slice(3, 5));
    base.push(...CHIFFRES.slice(6, 9), ALGEBRE[5]!, EGAL);
    base.push(...CHIFFRES.slice(9), ALGEBRE[6]!, ALGEBRE[7]!);
    base.push(...COMMUNES);
  } else if (type === 'racine') {
    base.push(...CHIFFRES.slice(0, 3), RACINE[0]!);
    base.push(...CHIFFRES.slice(3, 6), RACINE[1]!, RACINE[2]!);
    base.push(...CHIFFRES.slice(6, 9), EGAL);
    base.push(...CHIFFRES.slice(9));
    base.push(...COMMUNES);
  } else {
    base.push(...CHIFFRES.slice(0, 3), FRACTION[0]!);
    base.push(...CHIFFRES.slice(3, 6));
    base.push(...CHIFFRES.slice(6, 9), EGAL);
    base.push(...CHIFFRES.slice(9));
    base.push(...COMMUNES);
  }

  return [...base, ...CONTROLE];
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