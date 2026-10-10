/**
 * Journal local des tentatives — chantier 7.5.
 *
 * ## Où sont conservées les données, et pourquoi là
 *
 * L'API Relio ne conserve **rien** : c'est un choix assumé depuis le chantier 7
 * (« la durée de conservation des réponses n'est pas arbitrée : tant qu'elle ne
 * l'est pas, on n'écrit rien »), et `/api/v1/progression` et `/api/v1/suivi`
 * sont délibérément sans état.
 *
 * Ajouter un stockage serveur des réponses d'élèves — souvent mineurs — n'est
 * pas une décision technique que le chantier peut prendre à la place du
 * responsable du projet. La solution minimale compatible avec l'architecture
 * existante est donc **locale au navigateur** : ce que l'élève a tenté reste
 * sur son appareil, et ne part que vers l'API lorsqu'il demande un calcul de
 * suivi — comme le fait déjà `/api/v1/progression`.
 *
 * ## Ce que ce journal contient — et ne contient pas
 *
 * Uniquement des champs pédagogiques : l'exercice, l'ordre, la réponse saisie,
 * le statut, la catégorie d'erreur, le niveau d'aide, et si l'élève a réussi.
 *
 * **Aucun nom, aucun identifiant d'élève, aucune date de naissance, aucun
 * identifiant unique, aucun envoi vers un service tiers.** Rien ne permet de
 * suivre un élève à son insu : le journal n'a pas d'identité à rattacher.
 *
 * ## Effacement par l'élève
 *
 * `effacerJournal()` est exposé et appelé au bouton « Effacer mon historique ».
 * Une conservation que l'élève ne peut pas interrompre ne serait pas
 * acceptable pour des mineurs.
 */

/** Statut d'une réponse — vocabulaire fermé, aligné sur le serveur. */
export type StatutReponse = 'correcte' | 'partielle' | 'fausse' | 'indeterminee';

/** Niveau d'aide reçu avant la tentative. */
export type NiveauAide = 1 | 2 | 3;

/** Une tentative conservée localement. */
export interface Observation {
  readonly exerciceId: string;
  /** Rang de la tentative sur cet exercice, à partir de 1. */
  readonly rang: number;
  readonly reponse: string;
  readonly statut: StatutReponse;
  /** `null` = aucune erreur constatée (réponse juste). */
  readonly categorie: string | null;
  readonly niveauAide: NiveauAide | null;
  readonly reussiteApresAides: boolean;
}

/** Clef de stockage, versionnée pour pouvoir migrer sans casser. */
export const CLE_JOURNAL = 'relio.observations.v1';

/**
 * Nombre maximum de tentatives conservées.
 *
 * Douze exercices, quelques essais chacun : la marge est large. La borne
 * empêche une session très longue de faire grossir indéfiniment le stockage du
 * navigateur — et un élève qui recommence sans fin n'apporte rien de plus à son
 * suivi.
 */
export const TENTATIVES_MAX = 500;

/** Stockage injecté, pour rendre le module testable hors navigateur. */
export interface Stockage {
  getItem(cle: string): string | null;
  setItem(cle: string, valeur: string): void;
  removeItem(cle: string): void;
}

/**
 * Stockage réellement disponible.
 *
 * Le typage de `localStorage` peut manquer selon la configuration DOM, et son
 * accès **lève** en navigation privée sur certains navigateurs : le journal ne
 * doit jamais faire tomber l'écran d'exercice.
 */
function stockageParDefaut(): Stockage | null {
  try {
    if (typeof globalThis === 'undefined') return null;
    const candidat = (globalThis as { localStorage?: Storage }).localStorage;
    if (!candidat) return null;
    return candidat;
  } catch {
    return null;
  }
}

/**
 * Relit le journal.
 *
 * Une entrée illisible ou incomplète est **ignorée**, jamais devinée : mieux
 * vaut perdre une observation que d'inventer un statut que le moteur n'a jamais
 * émis.
 */
export function lireJournal(stockage: Stockage | null = stockageParDefaut()): Observation[] {
  if (stockage === null) return [];

  let brut: string | null;
  try {
    brut = stockage.getItem(CLE_JOURNAL);
  } catch {
    return [];
  }
  if (brut === null || brut === '') return [];

  let parse: unknown;
  try {
    parse = JSON.parse(brut);
  } catch {
    return [];
  }
  if (!Array.isArray(parse)) return [];

  const observations: Observation[] = [];
  for (const item of parse) {
    if (!estObservation(item)) continue;
    observations.push(item);
  }
  return observations;
}

/** Contrôle de forme d'une entrée relue depuis le stockage. */
function estObservation(valeur: unknown): valeur is Observation {
  if (typeof valeur !== 'object' || valeur === null) return false;
  const o = valeur as Record<string, unknown>;

  if (typeof o.exerciceId !== 'string' || o.exerciceId === '') return false;
  if (typeof o.rang !== 'number' || !Number.isInteger(o.rang) || o.rang < 1) return false;
  if (typeof o.reponse !== 'string') return false;
  if (typeof o.statut !== 'string') return false;
  if (!['correcte', 'partielle', 'fausse', 'indeterminee'].includes(o.statut)) return false;
  if (o.categorie !== null && typeof o.categorie !== 'string') return false;
  if (o.niveauAide !== null && ![1, 2, 3].includes(o.niveauAide as number)) return false;
  if (typeof o.reussiteApresAides !== 'boolean') return false;

  return true;
}

/**
 * Ajoute une tentative et réécrit le journal.
 *
 * La valeur de retour est la tentative **normalisée** : le rang y est calculé
 * à partir de ce qui est déjà enregistré, ce qui évite qu'une reconnexion
 * produise deux tentatives portant le même rang.
 */
export function ajouterObservation(
  observation: Omit<Observation, 'rang'>,
  stockage: Stockage | null = stockageParDefaut(),
): Observation {
  const existantes = lireJournal(stockage);

  const memeExercice = existantes.filter((o) => o.exerciceId === observation.exerciceId);

  // Une réussite est mémorisée définitivement : si l'élève abandonne puis
  // revient, le suivi doit refléter qu'il a su faire cet exercice.
  const dejaReussi = observation.reussiteApresAides || memeExercice.some((o) => o.reussiteApresAides);

  const complete: Observation = {
    ...observation,
    reussiteApresAides: dejaReussi,
    rang: memeExercice.length + 1,
  };

  const journal = [...existantes, complete].slice(-TENTATIVES_MAX);
  ecrireJournal(journal, stockage);
  return complete;
}

/** Écris le journal. Un stockage indisponible n'est pas une erreur. */
function ecrireJournal(journal: readonly Observation[], stockage: Stockage | null): void {
  if (stockage === null) return;
  try {
    stockage.setItem(CLE_JOURNAL, JSON.stringify(journal));
  } catch {
    // Quota atteint ou navigation privée : la saisie de l'élève prime sur son
    // historique. L'écran doit continuer à fonctionner.
  }
}

/** Efface tout l'historique. */
export function effacerJournal(stockage: Stockage | null = stockageParDefaut()): void {
  if (stockage === null) return;
  try {
    stockage.removeItem(CLE_JOURNAL);
  } catch {
    // Rien à faire : le journal est déjà inaccessible.
  }
}

/** Nombre de tentatives enregistrées sur un exercice. */
export function nombreTentatives(
  exerciceId: string,
  stockage: Stockage | null = stockageParDefaut(),
): number {
  return lireJournal(stockage).filter((o) => o.exerciceId === exerciceId).length;
}

/**
 * Nombre d'échecs déjà essuyés sur un exercice.
 *
 * C'est le contexte transmis au serveur pour choisir le niveau d'aide. Il ne
 * compte **que** les tentatives fausses : une réponse juste ou partielle n'est
 * pas un échec, et le compter ferait monter le niveau d'aide à tort.
 *
 * Une réussite interrompt la série : après être arrivé à la réponse, l'élève a
 * compris l'étape, et repartir de plus haut n'aide personne.
 */
export function echecsConsecutifs(
  exerciceId: string,
  stockage: Stockage | null = stockageParDefaut(),
): number {
  const tentatives = lireJournal(stockage)
    .filter((o) => o.exerciceId === exerciceId)
    .sort((a, b) => a.rang - b.rang);

  let echecs = 0;
  for (let i = tentatives.length - 1; i >= 0; i -= 1) {
    const tentative = tentatives[i];
    if (!tentative || tentative.statut === 'fausse' || tentative.statut === 'indeterminee') {
      echecs += 1;
    } else {
      break;
    }
  }
  return echecs;
}

/** Nombre total de tentatives conservées — affiché à l'élève. */
export function totalTentatives(stockage: Stockage | null = stockageParDefaut()): number {
  return lireJournal(stockage).length;
}