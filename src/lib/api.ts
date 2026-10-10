/**
 * Client de l'API Relio.
 *
 * Règle absolue : ce module ne fabrique JAMAIS une réponse serveur.
 * En cas d'échec réseau, il renvoie une erreur typée que l'interface affiche
 * telle quelle. Inventer un « connecté » pour faire croire que tout marche
 * rendrait le diagnostic de connexion faux.
 */

export type ApiState =
  | { kind: 'non-configure'; raison: string }
  | { kind: 'verification' }
  | { kind: 'joignable'; version: string; statut: string }
  | { kind: 'indisponible'; raison: string }
  | { kind: 'desaccord'; raison: string };

export interface ApiInfo {
  name: string;
  apiVersion: string;
  status: string;
  documentation?: string;
}

/** Délai maximal d'attente d'une réponse de l'API. */
export const API_TIMEOUT_MS = 5000;

/**
 * Interroge `GET /api/v1`.
 * @param baseUrl URL de base déjà normalisée, ou chaîne vide si non configurée.
 */
export async function verifierApi(baseUrl: string): Promise<ApiState> {
  if (!baseUrl) {
    return {
      kind: 'non-configure',
      raison: 'API_BASE_URL n’est pas définie sur ce déploiement.',
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const reponse = await fetch(`${baseUrl}/api/v1`, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      // Pas de cache : l'écran doit refléter l'état réel du service.
      cache: 'no-store',
    });

    if (reponse.status === 404) {
      return {
        kind: 'desaccord',
        raison:
          'L’API répond, mais la route /api/v1 est inconnue. Le contrat est désynchronisé.',
      };
    }

    if (!reponse.ok) {
      return {
        kind: 'indisponible',
        raison: `L’API a répondu ${reponse.status}. Le service est peut-être en maintenance.`,
      };
    }

    const donnees = (await reponse.json()) as Partial<ApiInfo>;

    if (typeof donnees.apiVersion !== 'string' || typeof donnees.status !== 'string') {
      return {
        kind: 'desaccord',
        raison: 'La réponse de l’API ne respecte pas le contrat attendu.',
      };
    }

    return {
      kind: 'joignable',
      version: donnees.apiVersion,
      statut: donnees.status,
    };
  } catch (erreur) {
    if (erreur instanceof Error && erreur.name === 'AbortError') {
      return {
        kind: 'indisponible',
        raison: `Aucune réponse de l’API après ${API_TIMEOUT_MS / 1000} secondes.`,
      };
    }

    // Panne réseau, CORS bloqué, URL invalide : le navigateur masque la cause
    // réelle. On ne peut donc pas être plus précis que « injoignable ».
    return {
      kind: 'indisponible',
      raison:
        'Impossible de joindre l’API. Vérifiez API_BASE_URL et la configuration CORS du backend.',
    };
  } finally {
    clearTimeout(timer);
  }
}