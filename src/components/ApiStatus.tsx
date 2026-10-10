'use client';

import { useCallback, useEffect, useState } from 'react';
import { verifierApi, type ApiState } from '@/lib/api';

/**
 * Affiche l'état réel de la connexion à l'API backend.
 *
 * Point de conception important : cet appel est déclenché **côté client**,
 * après le rendu. Le build Vercel n'effectue donc aucun appel réseau et
 * n'échoue jamais si l'API est indisponible.
 *
 * Le composant ne montre jamais « connecté » sans réponse réelle du serveur.
 */
export function ApiStatus({ baseUrl }: { baseUrl: string }) {
  const [etat, setEtat] = useState<ApiState>({ kind: 'verification' });

  const verifier = useCallback(async () => {
    setEtat({ kind: 'verification' });
    setEtat(await verifierApi(baseUrl));
  }, [baseUrl]);

  useEffect(() => {
    void verifier();
  }, [verifier]);

  const carte = (() => {
    switch (etat.kind) {
      case 'verification':
        return {
          classe: 'etat-api etat-api--attente',
          badge: { texte: 'Vérification', classe: 'badge--attente' },
          titre: 'Connexion à l’API en cours…',
          detail: 'Interrogation du service backend.',
        };

      case 'non-configure':
        return {
          classe: 'etat-api etat-api--attente',
          badge: { texte: 'Non configuré', classe: 'badge--attente' },
          titre: 'API non configurée',
          detail: etat.raison,
        };

      case 'joignable':
        return {
          classe: 'etat-api etat-api--succes',
          badge: { texte: 'Joignable', classe: 'badge--succes' },
          titre: `APIRelio ${etat.version} — statut « ${etat.statut} »`,
          detail:
            etat.statut === 'socle'
              ? 'Le backend répond. Cela ne signifie pas qu’une fonctionnalité pédagogique est disponible.'
              : 'Le backend répond.',
        };

      case 'desaccord':
        return {
          classe: 'etat-api etat-api--alerte',
          badge: { texte: 'Désynchronisé', classe: 'badge--alerte' },
          titre: 'Contrat désynchronisé',
          detail: etat.raison,
        };

      case 'indisponible':
      default:
        return {
          classe: 'etat-api etat-api--alerte',
          badge: { texte: 'Indisponible', classe: 'badge--alerte' },
          titre: 'API indisponible',
          detail: etat.raison,
        };
    }
  })();

  return (
    <div className={carte.classe}>
      <div className="carte">
        <div className="etat-api__ligne">
          <p className="etat-api__titre">{carte.titre}</p>
          <span className={`badge ${carte.badge.classe}`}>{carte.badge.texte}</span>
        </div>
        <p className="etat-api__detail">{carte.detail}</p>
        {baseUrl ? <p className="etat-api__url">{baseUrl}</p> : null}
        <div className="actions">
          <button
            type="button"
            className="bouton bouton--secondaire"
            onClick={() => void verifier()}
            disabled={etat.kind === 'verification'}
          >
            {etat.kind === 'verification' ? 'Vérification…' : 'Revérifier'}
          </button>
        </div>
      </div>
    </div>
  );
}