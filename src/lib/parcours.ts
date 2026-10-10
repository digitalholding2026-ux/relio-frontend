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

export interface Correction {
  exerciceId: string;
  objectifId: string;
  mathemathiquementJuste: boolean;
  formeRespectee: boolean | null;
  statut: 'correcte' | 'partielle' | 'fausse' | 'indeterminee';
  signatureErreur: string;
  leconsCandidates: string[];
  explication: string;
  indice: number | null;
  lectureArbitree: boolean;
  pointsArbitrage: string[];
}

export interface ErreurSaisie {
  erreurSaisie: true;
  message: string;
  exerciceId: string;
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
    return { kind: 'indisponible', raison: 'Le service de exercices n’est pas configuré sur ce déploiement.' };
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
 * Le corps ne contient que l'identifiant de l'exercice et la saisie : aucun
 * nom, aucun identifiant d'élève, aucune donnée personnelle.
 */
export async function corrigerReponse(
  baseUrl: string,
  exerciceId: string,
  reponse: string,
  indiceDemande: number | null,
): Promise<Correction | ErreurSaisie> {
  const corps = await appeler<Correction | ErreurSaisie>(baseUrl, '/api/v1/corrections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ exerciceId, reponse, indiceDemande }),
  });
  return corps;
}