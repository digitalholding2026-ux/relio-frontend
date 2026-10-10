/**
 * Types du tutorat côté client — chantier 7.5.
 *
 * Le client **ne décide** rien : il reçoit `tutorat` et `categorieDifficulte`
 * du serveur, qui est seul juge du verdict D5 et du niveau d'aide. Ce module ne
 * contient donc que le contrat de transport et l'affichage, jamais la règle
 * pédagogique.
 *
 * `tutorat` est rendu **facultatif** dans `Correction` : une réponse d'une
 * version antérieure de l'API ne portera pas ce champ, et l'écran doit rester
 * utilisable — il retombera alors sur `explication`.
 */

import type { Verdict } from './parcours';

/** Niveau d'aide — palier du tutorat. */
export type NiveauAide = 1 | 2 | 3;

/** Provenance du texte d'aide. */
export type OrigineAide =
  | 'signature'
  | 'indice'
  | 'objectif'
  | 'forme'
  | 'bilan'
  | 'generique';

/** Échelle d'aide rendue par le serveur. */
export interface Tutorat {
  readonly niveau: NiveauAide;
  readonly message: string;
  readonly action: string;
  readonly origine: OrigineAide;
  /** Résumé de la méthode — présent une fois le travail compris. */
  readonly resume: string | null;
}

/**
 * Libellé de niveau affiché à l'élève.
 *
 * Volontairement modeste : « niveau 1 » décrit le degré d'aide reçue, jamais un
 * niveau de maîtrise. La nuance est portée par le texte lui-même.
 */
export const LIBELLE_NIVEAU: Readonly<Record<NiveauAide, string>> = {
  1: 'Première piste',
  2: 'Explication',
  3: 'Accompagnement',
};

/** Suivi d'un objectif, tel que renvoyé par `POST /api/v1/suivi`. */
export interface SuiviObjectif {
  readonly objectifId: string;
  readonly exercicesTraites: number;
  readonly tentatives: number;
  readonly reussisSansAide: number;
  readonly reussisApresUnIndice: number;
  readonly reussisApresPlusieursAides: number;
  readonly nonReussis: number;
  readonly niveau: 'donnee_insuffisante' | 'reussite_immediate' | 'a_confirmer' | 'difficulte';
  readonly difficultesRecurrentes: ReadonlyArray<{
    readonly categorie: string;
    readonly occurrences: number;
  }>;
}

/**
 * Libellé d'un niveau de suivi.
 *
 * Aucun de ces textes n'affirme une maîtrise. « À confirmer » dit exactement ce
 * qu'il sait : la réussite a eu lieu, mais après des aides.
 */
export const LIBELLE_SUIVI: Readonly<Record<SuiviObjectif['niveau'], string>> = {
  donnee_insuffisante: 'Tu n’as pas encore assez travaillé pour que je puisse dire.',
  reussite_immediate: 'Tu as réussi du premier coup plusieurs exercices.',
  a_confirmer: 'Tu as réussi avec de l’aide. Essaie seul la prochaine fois pour être sûr.',
  difficulte: 'C’est difficile pour toi en ce moment. Demande un indice.',
};

/**
 * Libellé lisible d'une catégorie de difficulté.
 *
 * Le serveur envoie une clé technique (`erreur_de_signe`). Elle ne doit jamais
 * être affichée telle quelle à un élève : elle est traduite ici.
 */
export const LIBELLE_CATEGORIE: Readonly<Record<string, string>> = {
  oubli_de_distribuer_un_facteur:
    'un facteur oublié dans la multiplication',
  erreur_de_signe: 'signe',
  reduction_incomplete: 'réduction incomplète',
  facteur_commun_non_identifie: 'nombre ou lettre commun non trouvé',
  simplification_de_racine_incomplete: 'racine pas finie',
  fraction_non_reduite: 'fraction pas simplifiée',
  reponse_illisible: 'réponse pas lisible',
  erreur_non_identifiee: 'difficulté que je n’ai pas su nommer',
};

/** Traduit une catégorie de difficulté, sans jamais montrer la clé brute. */
export function libelleCategorie(categorie: string | null | undefined): string {
  if (categorie === null || categorie === undefined) return '';
  return LIBELLE_CATEGORIE[categorie] ?? 'difficulté que je n’ai pas su nommer';
}

/** Décide du texte d'aide réellement affiché. */
export function texteAffiche(
  tutorat: Tutorat | null | undefined,
  explication: string,
): string {
  const fourni = tutorat?.message?.trim();
  if (fourni !== undefined && fourni.length > 0) return fourni;
  return explication;
}

export type { Verdict };