/**
 * Client du parcours pédagogique.
 *
 * Même règle que `api.ts` : ce module **ne fabrique jamais** de réponse. Si
 * l'API ne répond pas, l'interface affiche un état d'indisponibilité, elle
 * n'invente pas un parcours.
 *
 * Règle structurante : **la réponse attendue n'est jamais demandée au serveur**
 * et n'existe donc jamais dans le bundle. Le frontend ne contient aucun
 * contenu pédagogique.
 */

export type ParcoursEtat =
  | { kind: 'indisponible'; raison: string }
  | { kind: 'parcours'; parcours: Parcours };

export interface ExercicePublic {
  id: string;
  blocId: string;
  rang: number;
  objectifs: string[];
  enonce: string;
  consigne: string;
  typeReponse: 'rationnelle' | 'expression' | 'racine';
  formeDemandee: string | null;
  nbIndices: number;
  origine: 'originale';
}

export interface ObjectifPublic {
  id: string;
  libelle: string;
  prerequis: string[];
}

export interface BlocPublic {
  id: string;
  titre: string;
  leconId: string;
  volumeHoraireH: number;
  semaineDebut: number;
  disponible: boolean;
  semainesAvantOuverture: number | null;
  objectifs: ObjectifPublic[];
  exercices: ExercicePublic[];
}

export interface Parcours {
  version: string;
  anneeScolaire: {
    debut: string;
    semaine: number | null;
    dansAnneeScolaire: boolean;
    anneeTerminee: boolean;
  };
  message: string;
  blocs: BlocPublic[];
}

/**
 * Verdict pédagogique — décision D5, validée par l'enseignant.
 *
 * Les libellés **viennent du serveur** (`libelle`) : le frontend ne les
 * reconstruit pas. Une correspondance locale risquerait de diverger de la règle
 * appliquée, et le message vu par l'élève ne serait plus testable.
 */
export type Verdict =
  | 'correct'
  | 'partiellement_correct'
  | 'resultat_juste_consigne_non_respectee'
  | 'incorrect'
  | 'a_determiner';

export interface Correction {
  exerciceId: string;
  objectifId: string;
  mathemathiquementJuste: boolean;
  formeRespectee: boolean | null;
  /** Achèvement : `acheve`, `inacheve`, ou `null` si le moteur ne le sait pas. */
  achevement: 'acheve' | 'inacheve' | null;
  statut: 'correcte' | 'partielle' | 'fausse' | 'indeterminee';
  verdict: Verdict;
  /** Libellé exact à afficher, fourni par le serveur. */
  libelle: string;
  signatureErreur: string;
  leconsCandidates: string[];
  explication: string;
  indice: number | null;
  lectureArbitree: boolean;
  pointsArbitrage: string[];
  /**
   * Chantier 7.5 — échelle d'aide progressive.
   *
   * Facultative : une API antérieure ne la renvoie pas, et l'écran doit rester
   * utilisable en retomposant sur `explication`.
   */
  tutorat?: import('./tutorat').Tutorat;
  /**
   * Catégorie de difficulté constatée, ou `null` si aucune erreur.
   *
   * `erreur_non_identifiee` signifie « erreur constatée mais non qualifiée » :
   * ce n'est pas la même chose que `null`.
   */
  categorieDifficulte?: string | null;
}

export interface ErreurSaisie {
  erreurSaisie: true;
  message: string;
  exerciceId: string;
  categorieDifficulte?: string | null;
  tutorat?: import('./tutorat').Tutorat;
}

export const DELAI_MS = 8000;

async function appeler<T>(baseUrl: string, chemin: string, init?: RequestInit): Promise<T> {
  const controleur = new AbortController();
  const minuteur = setTimeout(() => controleur.abort(), DELAI_MS);
  try {
    const reponse = await fetch(`${baseUrl}${chemin}`, {
      ...init,
      signal: controleur.signal,
      headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
      cache: 'no-store',
    });
    if (!reponse.ok) {
      throw new Error(`HTTP ${reponse.status}`);
    }
    return (await reponse.json()) as T;
  } finally {
    clearTimeout(minuteur);
  }
}

/** Charge le parcours. Ne renvoie jamais de données inventées. */
export async function chargerParcours(baseUrl: string): Promise<ParcoursEtat> {
  if (!baseUrl) {
    return { kind: 'indisponible', raison: 'Le service d’exercices n’est pas configuré sur ce déploiement.' };
  }

  try {
    const parcours = await appeler<Parcours>(baseUrl, '/api/v1/parcours');
    if (!Array.isArray(parcours.blocs)) {
      return { kind: 'indisponible', raison: 'La réponse du service ne respecte pas le contrat attendu.' };
    }
    return { kind: 'parcours', parcours };
  } catch (erreur) {
    if (erreur instanceof Error && erreur.name === 'AbortError') {
      return { kind: 'indisponible', raison: 'Le service ne répond pas. Réessaie dans un instant.' };
    }
    return { kind: 'indisponible', raison: 'Impossible de joindre le service d’exercices.' };
  }
}

export async function chargerExercice(
  baseUrl: string,
  id: string,
): Promise<{ ok: true; exercice: ExercicePublic } | { ok: false; raison: string }> {
  try {
    const exercice = await appeler<ExercicePublic>(baseUrl, `/api/v1/exercices/${encodeURIComponent(id)}`);
    return { ok: true, exercice };
  } catch {
    return { ok: false, raison: 'Cet exercice n’est pas disponible pour le moment.' };
  }
}

export async function demanderIndice(
  baseUrl: string,
  id: string,
  palier: number,
): Promise<string | null> {
  try {
    const reponse = await appeler<{ texte: string }>(
      baseUrl,
      `/api/v1/exercices/${encodeURIComponent(id)}/indice/${palier}`,
    );
    return reponse.texte;
  } catch {
    return null;
  }
}

/**
 * Envoie une réponse et récupère le verdict.
 *
 * Le corps contient l'identifiant de l'exercice, la saisie et le **nombre
 * d'échecs déjà essuyés** sur cet exercice. Aucun nom, aucun identifiant
 * d'élève, aucune donnée personnelle : le nombre d'échecs ne sert qu'à choisir
 * le niveau d'aide.
 *
 * @param nbEchecs nombre d'échecs consécutifs déjà observés sur cet exercice
 */
export async function corrigerReponse(
  baseUrl: string,
  exerciceId: string,
  reponse: string,
  indiceDemande: number | null,
  nbEchecs = 0,
): Promise<Correction | ErreurSaisie> {
  const corps = await appeler<Correction | ErreurSaisie>(baseUrl, '/api/v1/corrections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ exerciceId, reponse, indiceDemande, nbEchecs }),
  });
  return corps;
}

/**
 * Calcule le suivi des difficultés à partir des observations locales.
 *
 * Le serveur ne conserve rien : il agrège ce que l'élève lui renvoie. C'est le
 * prolongement exact de `/api/v1/progression`.
 */
export async function chargerSuivi(
  baseUrl: string,
  observations: readonly import('./observations').Observation[],
): Promise<{ objectifs: import('./tutorat').SuiviObjectif[]; avertissement: string } | null> {
  try {
    return await appeler<{ objectifs: import('./tutorat').SuiviObjectif[]; avertissement: string }>(
      baseUrl,
      '/api/v1/suivi',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observations }),
      },
    );
  } catch {
    return null;
  }
}