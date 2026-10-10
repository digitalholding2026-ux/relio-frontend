'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ClavierMath } from '@/components/ClavierMath';
import {
  apercuLisible,
  saisieVide,
  type EtatSaisie,
  type TypeReponse,
} from '@/lib/clavier';
import {
  ajouterObservation,
  echecsConsecutifs,
  effacerJournal,
  lireJournal,
  totalTentatives,
} from '@/lib/observations';
import {
  chargerExercice,
  chargerSuivi,
  corrigerReponse,
  demanderIndice,
  type Correction,
  type ErreurSaisie,
  type ExercicePublic,
} from '@/lib/parcours';
import {
  LIBELLE_NIVEAU,
  LIBELLE_SUIVI,
  texteAffiche,
  type SuiviObjectif,
  type Tutorat,
} from '@/lib/tutorat';

/**
 * Écran d'exercice — saisie au clavier mobile et verdict sur trois axes.
 *
 * ## Chanier 7.5 — ce que l'écran fait désormais
 *
 * 1. **Tutorat progressif.** Le premier retour n'est plus le long message
 *    unique : le serveur renvoie une échelle de trois niveaux, choisie selon le
 *    verdict et le nombre d'échecs réellement essuyés. Cet écran se contente
 *    d'afficher `tutorat.message` — il ne décide jamais du niveau.
 * 2. **Clavier mathématique.** Ouverture au focus du champ, touches
 *    spécifiques, fermeture et réouverture, bascule vers le clavier système.
 * 3. **Mémoire locale.** Chaque tentative est consignée dans le navigateur de
 *    l'élève, puis renvoyée au serveur pour le suivi. Rien n'est stocké côté
 *    serveur, et l'élève peut effacer son historique.
 *
 * ## Garde-fous tenus dans ce composant
 *
 * - **aucun score, aucun pourcentage, aucun niveau** : jamais ;
 * - **jamais de « maîtrisé »** : le vocabulaire se limite à celui du serveur ;
 * - **la réponse attendue n'est jamais connue du client** ;
 * - une réponse **juste mais mal formée** est montrée comme telle, jamais
 *   présentée comme une erreur de mathématique ;
 * - **aucune donnée personnelle** n'est ni demandée, ni conservée, ni envoyée.
 */

type Verdict = Correction | ErreurSaisie;

function estErreurSaisie(verdict: Verdict): verdict is ErreurSaisie {
  return 'erreurSaisie' in verdict;
}

/**
 * Libellés de repli, par verdict.
 *
 * **Ils ne devraient jamais être utilisés** : le serveur fournit déjà
 * `libelle`, calculé par la même règle que le verdict. Ces valeurs servent si
 * l'API répond une version antérieure, sans le champ.
 */
const LIBELLE_REPLI: Record<Correction['verdict'], string> = {
  correct: 'Ta réponse est juste.',
  partiellement_correct: 'Ta réponse est partiellement correcte.',
  resultat_juste_consigne_non_respectee:
    'Ton résultat est juste, mais pas dans la forme demandée.',
  incorrect: 'Ce n’est pas encore juste.',
  a_determiner: 'Ta réponse est juste ; la forme demandée reste à vérifier.',
};

/**
 * Le libellé affiché vient du serveur. Il n'est amputé d'aucun mot : c'est le
 * retour pédagogique validé par l'enseignant.
 */
function libelleAffiche(correction: Correction): string {
  const fourni = correction.libelle?.trim();
  return fourni && fourni.length > 0 ? fourni : LIBELLE_REPLI[correction.verdict];
}

export function Exercice({ baseUrl, exerciceId }: { baseUrl: string; exerciceId: string }) {
  const [exercice, setExercice] = useState<ExercicePublic | null>(null);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);
  const [saisie, setSaisie] = useState<EtatSaisie>(saisieVide);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [indices, setIndices] = useState<string[]>([]);

  // --- Clavier (chantier 7.5) ------------------------------------------------
  const [clavierOuvert, setClavierOuvert] = useState(false);
  const [clavierSysteme, setClavierSysteme] = useState(false);
  const champRef = useRef<HTMLInputElement | null>(null);

  // --- Suivi local (chantier 7.5) -------------------------------------------
  const [tentatives, setTentatives] = useState(0);
  const [suivi, setSuivi] = useState<SuiviObjectif | null>(null);

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

  // Restaure l'historique local de cet exercice à l'ouverture de l'écran.
  useEffect(() => {
    setTentatives(totalTentatives());
  }, [exerciceId]);

  const majTentatives = useCallback(() => {
    setTentatives(totalTentatives());
  }, []);

  async function envoyer() {
    if (saisie.valeur.trim() === '' || enCours) return;
    setEnCours(true);
    try {
      // Le nombre d'échecs déjà essuyés est lu **localement** : il ne circule
      // qu'au moment de corriger, et ne contient aucune donnée personnelle.
      const nbEchecs = echecsConsecutifs(exerciceId);
      const resultat = await corrigerReponse(baseUrl, exerciceId, saisie.valeur, indices.length, nbEchecs);
      setVerdict(resultat);

      // --- Journal local -----------------------------------------------------
      const juste = !estErreurSaisie(resultat) && resultat.statut === 'correcte';
      const categorie = estErreurSaisie(resultat)
        ? (resultat.categorieDifficulte ?? 'reponse_illisible')
        : (resultat.categorieDifficulte ?? null);

      ajouterObservation({
        exerciceId,
        reponse: saisie.valeur.slice(0, 200),
        statut: estErreurSaisie(resultat) ? 'indeterminee' : resultat.statut,
        categorie,
        // Le niveau d'aide réellement reçu est celui du serveur : le client ne
        // le devine pas.
        niveauAide: resultat.tutorat?.niveau ?? null,
        reussiteApresAides: juste,
      });
      majTentatives();

      // --- Suivi recalculé ----------------------------------------------------
      // Le journal local est renvoyé au serveur, qui l'agrège sans rien garder :
      // c'est le prolongement exact de `/api/v1/progression`.
      const suiviRecu = await chargerSuivi(baseUrl, lireJournal());
      if (suiviRecu) {
        const objectif = suiviRecu.objectifs.find(
          (o) => o.objectifId === (estErreurSaisie(resultat) ? '' : resultat.objectifId),
        );
        // On ne remplace l'affichage que si l'objectif est identifié : sinon le
        // suivi déjà affiché disparraitrait à chaque saisie illisible.
        if (objectif !== undefined) setSuivi(objectif);
      }
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

  /** Ouvre le clavier mathématique, ou le clavier système si choisi. */
  function activerSaisie() {
    if (!clavierSysteme) setClavierOuvert(true);
  }

  function basculerSysteme() {
    // Vers le clavier système : le clavier mathématique se referme, sinon les
    // deux se superposeraient à l'écran.
    if (clavierSysteme) {
      setClavierSysteme(false);
      setClavierOuvert(true);
    } else {
      setClavierSysteme(true);
      setClavierOuvert(false);
    }
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
  const tutorat: Tutorat | null = verdict?.tutorat ?? null;
  const apercu = apercuLisible(saisie.valeur);

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
          ref={champRef}
          className="exercice__saisie"
          type="text"
          // `none` supprime le clavier système Android sans empêcher la saisie
          // au clavier physique. L'élève peut revenir au clavier système avec
          // le bouton dédié.
          inputMode={clavierSysteme ? 'text' : 'none'}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          onFocus={activerSaisie}
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
          value={saisie.valeur}
          onChange={(evenement) => setSaisie({ valeur: evenement.target.value, curseur: evenement.target.selectionStart ?? evenement.target.value.length })}
        />
      </label>

      {apercu !== '' && (
        <p className="exercice__apercu" aria-live="polite">
          {apercu}
        </p>
      )}

      <div className="exercice__actions">
        <button
          className="bouton bouton--principal"
          type="button"
          onClick={() => void envoyer()}
          disabled={enCours || saisie.valeur.trim() === ''}
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
        {/* Le bouton n'apparaît que lorsque le clavier est fermé : la fermeture
            et la réouverture se font depuis le clavier lui-même, qui porte
            toujours ces deux actions. */}
        {!clavierSysteme && !clavierOuvert && (
          <button className="bouton" type="button" onClick={activerSaisie}>
            Clavier mathématique
          </button>
        )}
      </div>

      {clavierOuvert && !clavierSysteme && (
        <ClavierMath
          typeReponse={exercice.typeReponse as TypeReponse}
          onChange={setSaisie}
          onValider={() => void envoyer()}
          onFermer={() => setClavierOuvert(false)}
          onSysteme={basculerSysteme}
          champId="reponse"
          champRef={champRef}
        />
      )}

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
          {verdict.tutorat && (
            <span className="tutorat__action"> {verdict.tutorat.action}</span>
          )}
        </p>
      )}

      {correction !== null && (
        <section
          // La classe suit le **verdict** (décision D5) et non le statut
          // technique : « partiellement correct » et « résultat juste,
          // consigne non respectée » doivent se distinguer visuellement.
          className={`verdict verdict--${correction.verdict}`}
          role="status"
          aria-live="polite"
        >
          <p className="verdict__statut">{libelleAffiche(correction)}</p>

          {/* Chantier 7.5 : aide progressive. Le niveau affiché est celui que le
              serveur a choisi ; l'écran ne le calcule pas. */}
          {tutorat !== null && (
            <div className="tutorat">
              <p className="tutorat__niveau">
                {correction.statut === 'correcte'
                  ? 'Bilan'
                  : `${LIBELLE_NIVEAU[tutorat.niveau]} — aide ${tutorat.niveau} sur 3`}
              </p>
              <p className="tutorat__message">
                {texteAffiche(tutorat, correction.explication)}
              </p>
              {tutorat.niveau >= 2 && correction.statut !== 'correcte' && (
                <p className="tutorat__action">👉 {tutorat.action}</p>
              )}
              {tutorat.resume !== null && (
                <p className="tutorat__resume">
                  <strong>Méthode à retenir :</strong> {tutorat.resume}
                </p>
              )}
            </div>
          )}

          {tutorat === null && (
            <p className="verdict__detail">{correction.explication}</p>
          )}

          {correction.verdict === 'resultat_juste_consigne_non_respectee' && (
            <p className="verdict__detail">
              Le calcul est bon : c’est la façon d’écrire la réponse qui est à corriger.
            </p>
          )}
          {correction.achevement === 'inacheve' && (
            <p className="verdict__detail">
              Tu es sur la bonne voie : il reste une étape pour terminer.
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

      {/* --- Suivi local (chantier 7.5) ------------------------------------- */}
      {tentatives > 0 && (
        <section className="suivi" aria-label="Mon suivi">
          <p className="suivi__titre">
            {tentatives} tentative{tentatives > 1 ? 's' : ''} enregistrée
            {tentatives > 1 ? 's' : ''} sur cet appareil.
          </p>
          {suivi !== null && (
            <p className="suivi__niveau">{LIBELLE_SUIVI[suivi.niveau]}</p>
          )}
          <button
            className="bouton bouton--discret"
            type="button"
            onClick={() => {
              effacerJournal();
              setTentatives(0);
              setSuivi(null);
            }}
          >
            Effacer mon historique
          </button>
        </section>
      )}
    </article>
  );
}