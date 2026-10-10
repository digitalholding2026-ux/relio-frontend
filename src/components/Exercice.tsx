'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  chargerExercice,
  corrigerReponse,
  demanderIndice,
  type Correction,
  type ErreurSaisie,
  type ExercicePublic,
} from '@/lib/parcours';

/**
 * Écran d'exercice — saisie au clavier mobile et verdict sur trois axes.
 *
 * Garde-fous tenus dans ce composant :
 *
 * - **aucun score, aucun pourcentage, aucun niveau** : jamais ;
 * - **jamais de « maîtrisé »** : le vocabulaire se limite aux statuts du
 *   serveur, qui sont déjà prudents ;
 * - **la réponse attendue n'est jamais connue du client** : elle n'est ni
 *   demandée ni stockée ici ;
 * - une réponse **juste mais mal formée** est montrée comme telle, jamais
 *   présentée comme une erreur de mathématique.
 */

type Verdict = Correction | ErreurSaisie;

function estErreurSaisie(verdict: Verdict): verdict is ErreurSaisie {
  return 'erreurSaisie' in verdict;
}

/** Libellés des statuts, dans les mots de l'élève. */
const LIBELLE_STATUT: Record<Correction['statut'], string> = {
  correcte: 'Ta réponse est juste.',
  partielle: 'Ta réponse est juste, mais pas dans la forme demandée.',
  fausse: 'Ce n’est pas encore juste.',
  indeterminee: 'Ta réponse est juste ; la forme demandée reste à vérifier.',
};

export function Exercice({ baseUrl, exerciceId }: { baseUrl: string; exerciceId: string }) {
  const [exercice, setExercice] = useState<ExercicePublic | null>(null);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);
  const [saisie, setSaisie] = useState('');
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [indices, setIndices] = useState<string[]>([]);

  useEffect(() => {
    let annule = false;
    void chargerExercice(baseUrl, exerciceId).then((resultat) => {
      if (annule) return;
      if (resultat.ok) {
        setExercice(resultat.exercice);
      } else {
        setErreurChargement(resultat.raison);
      }
    });
    return () => {
      annule = true;
    };
  }, [baseUrl, exerciceId]);

  async function envoyer() {
    if (saisie.trim() === '' || enCours) return;
    setEnCours(true);
    try {
      const resultat = await corrigerReponse(baseUrl, exerciceId, saisie, indices.length);
      setVerdict(resultat);
    } catch {
      setVerdict({
        erreurSaisie: true,
        message: 'Le service ne répond pas. Réessaie dans un instant.',
        exerciceId,
      });
    } finally {
      setEnCours(false);
    }
  }

  async function demanderAide() {
    const prochain = indices.length + 1;
    const texte = await demanderIndice(baseUrl, exerciceId, prochain);
    if (texte !== null) setIndices((actuels) => [...actuels, texte]);
  }

  if (erreurChargement !== null) {
    return (
      <div className="carte">
        <p role="status">{erreurChargement}</p>
        <Link className="lien" href="/parcours">
          Retour au parcours
        </Link>
      </div>
    );
  }

  if (exercice === null) {
    return (
      <div className="carte" role="status">
        <p>Chargement de l’exercice…</p>
      </div>
    );
  }

  const aidesRestantes = exercice.nbIndices - indices.length;
  const correction = verdict !== null && !estErreurSaisie(verdict) ? verdict : null;

  return (
    <article className="carte exercice">
      <p className="exercice__enonce">{exercice.enonce}</p>
      <p className="exercice__consigne">{exercice.consigne}</p>

      {exercice.formeDemandee !== null && (
        <p className="exercice__forme">Réponse attendue : {exercice.formeDemandee}.</p>
      )}

      <label className="exercice__champ" htmlFor="reponse">
        <span className="exercice__label">Ta réponse</span>
        <input
          id="reponse"
          className="exercice__saisie"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={
            // Exemples **structurels uniquement** : un exemple chiffré
            // pourrait coïncider avec la réponse attendue d'un exercice et
            // constituer un indice involontaire.
            exercice.typeReponse === 'racine'
              ? 'a√b'
              : exercice.typeReponse === 'expression'
                ? 'Ax + B'
                : 'a/b'
          }
          value={saisie}
          onChange={(evenement) => setSaisie(evenement.target.value)}
        />
      </label>

      <div className="exercice__actions">
        <button
          className="bouton bouton--principal"
          type="button"
          onClick={() => void envoyer()}
          disabled={enCours || saisie.trim() === ''}
        >
          {enCours ? 'Vérification…' : 'Vérifier'}
        </button>
        {aidesRestantes > 0 && (
          <button
            className="bouton"
            type="button"
            onClick={() => void demanderAide()}
            disabled={enCours}
          >
            {aidesRestantes === 1 ? 'Un indice' : `Un indice (${aidesRestantes})`}
          </button>
        )}
      </div>

      {indices.length > 0 && (
        <section className="indices" aria-label="Indices">
          {indices.map((texte, position) => (
            <p className="indice" key={position}>
              <strong>Indice {position + 1}.</strong> {texte}
            </p>
          ))}
        </section>
      )}

      {verdict !== null && estErreurSaisie(verdict) && (
        <p className="verdict verdict--alerte" role="status">
          {verdict.message}
        </p>
      )}

      {correction !== null && (
        <section
          className={`verdict verdict--${correction.statut}`}
          role="status"
          aria-live="polite"
        >
          <p className="verdict__statut">{LIBELLE_STATUT[correction.statut]}</p>
          <p className="verdict__detail">{correction.explication}</p>
          {correction.formeRespectee === false && (
            <p className="verdict__detail">
              Le calcul est bon : c’est la façon d’écrire la réponse qui est à corriger.
            </p>
          )}
          {correction.lectureArbitree === false && (
            // Point non arbitré : on ne présente jamais ce cas comme une
            // conclusion ferme.
            <p className="verdict__detail verdict__detail--discret">
              Ce point sera confirmé par ton enseignant.
            </p>
          )}
        </section>
      )}
    </article>
  );
}