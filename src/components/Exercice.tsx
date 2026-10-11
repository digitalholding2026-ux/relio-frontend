'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ClavierMath } from '@/components/ClavierMath';
import { Carte } from '@/components/ds/Carte';
import { Champ } from '@/components/ds/Input';
import { EtatVide } from '@/components/ds/EtatVide';
import { Squelette } from '@/components/ds/Skeleton';
import { Bouton } from '@/components/ds/Bouton';
import { Verdict } from '@/app/parcours/[id]/Verdict';
import styles from '@/app/parcours/[id]/exercice.module.css';
import { useHauteurClavierSysteme } from '@/hooks/useHauteurClavierSysteme';
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
import { LIBELLE_SUIVI, type SuiviObjectif, type Tutorat } from '@/lib/tutorat';

/**
 * Écran d'exercice — saisie au clavier mobile et verdict sur trois axes.
 *
 * ## Chanier 7.5 — ce que l'écran fait désormais
 *
 * 1. **Tutorat progressif.** Le premier retour n'est plus le long message
 *    unique : le serveur renvoie une échelle de trois niveaux, choisie selon le
 *    verdict et le nombre d'échecs réellement essuyés. Cet écran se contente
 *    d'afficher `tutorat.message` — il ne décide jamais du niveau.
 * 2. **Clavier mathématique.** Ouverture automatique au toucher du champ, touches
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

  // Hauteur du clavier système : sans cette mesure, la page continue de croire
  // que l'écran fait 640 px de haut et le clavier mathématique passe dessous.
  const clavierSystemeVisible = useHauteurClavierSysteme();
  const composeurRef = useRef<HTMLDivElement | null>(null);

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

  /**
   * Ouvre le clavier mathématique dès que l'élève touche le champ.
   *
   * `onClick` et non `onFocus` : après avoir masqué le clavier, le champ reste
   * focalisé, et un second appui ne déclencherait donc plus `focus`. C'est
   * `click` qui permet de le rouvrir sans aucun bouton supplémentaire.
   */
  function activerSaisie() {
    if (clavierSysteme) return;
    setClavierOuvert(true);
    // Le champ et le bouton « Vérifier » doivent être visibles sans que l'élève
    // ait à chercher : on les amène dans la zone visible au prochain rendu.
    requestAnimationFrame(() => {
      composeurRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
    });
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
      <Carte>
        <EtatVide
          icone="info"
          titre="Cet exercice n’est pas disponible pour le moment"
          description="Le service n’a pas répondu. La page fonctionne ; seul l’exercice est en attente."
        >
          <form action="/parcours" method="get" className={styles.formulaire}>
            <Bouton type="submit" variante="secondary">
              Réessayer
            </Bouton>
          </form>
        </EtatVide>
      </Carte>
    );
  }

  if (exercice === null) {
    return (
      <Carte role="status">
        <Squelette hauteur={24} largeur="70%" />
        <Squelette hauteur={16} />
        <Squelette hauteur={52} />
      </Carte>
    );
  }

  const aidesRestantes = exercice.nbIndices - indices.length;
  const correction = verdict !== null && !estErreurSaisie(verdict) ? verdict : null;
  const tutorat: Tutorat | null = verdict?.tutorat ?? null;
  const apercu = apercuLisible(saisie.valeur);

  /*
   * `exercice--saisie` passe la page en colonne fixe : la zone du haut défile,
   * le composeur et le clavier restent en bas. Sans cela, le clavier — qui
   * mesure 453 px sur un écran de 640 — evictait l'énoncé hors de l'écran.
   */
  const enSaisie = clavierOuvert || clavierSystemeVisible.hauteur > 0;

  return (
    <article
      className={`${styles.exercice}${enSaisie ? ` ${styles.exerciceSaisie}` : ''}`}
      data-clavier-systeme={clavierSystemeVisible.hauteur}
    >
      {/* --- Zone défilante : ce qui se lit, pas ce qui se saisit --------- */}
      <div className={styles.exercice__zone}>
        <Carte variante="elevee" className={styles.enonceCarte}>
          <p className={styles.enonce}>{exercice.enonce}</p>
          <p className={styles.consigne}>{exercice.consigne}</p>
          {exercice.formeDemandee !== null && (
            <p className={styles.forme}>Réponse attendue : {exercice.formeDemandee}.</p>
          )}
        </Carte>

        {indices.length > 0 && (
          <Carte sansOmbre className={styles.indices} aria-label="Indices">
            {indices.map((texte, position) => (
              <p className={styles.indice} key={position}>
                <strong>Indice {position + 1}.</strong> {texte}
              </p>
            ))}
          </Carte>
        )}

        {/* Suivi local (chantier 7.5). Information de fin d'écran : elle vit
            dans la zone défilante, pas dans le composeur, pour ne pas réduire
            la place du champ pendant la saisie. */}
        {tentatives > 0 && (
          <Carte sansOmbre className={styles.suivi} aria-label="Mon suivi">
            <p className={styles.suiviTitre}>
              {tentatives} tentative{tentatives > 1 ? 's' : ''} enregistrée
              {tentatives > 1 ? 's' : ''} sur cet appareil.
            </p>
            {suivi !== null && <p className={styles.suiviNiveau}>{LIBELLE_SUIVI[suivi.niveau]}</p>}
            <Bouton
              variante="ghost"
              taille="sm"
              onClick={() => {
                effacerJournal();
                setTentatives(0);
                setSuivi(null);
              }}
            >
              Effacer mon historique
            </Bouton>
          </Carte>
        )}
      </div>

      {/* --- Composeur : ce qui reste visible pendant la saisie ----------- */}
      <div className={styles.exercice__composeur} ref={composeurRef}>
      {/* `Champ` relie le label, l'aide et l'erreur — l'ancien `<label>` posé à
          la main faisait la moitié du travail seulement. */}
      <Champ
        label="Ta réponse"
        aide={
          exercice.formeDemandee !== null
            ? `Réponse attendue : ${exercice.formeDemandee}.`
            : undefined
        }
        ref={champRef}
        type="text"
        // `none` supprime le clavier système Android sans empêcher la saisie
        // au clavier physique. L'élève peut revenir au clavier système avec
        // le bouton dédié.
        inputMode={clavierSysteme ? 'text' : 'none'}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        onFocus={activerSaisie}
        onClick={activerSaisie}
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

      {apercu !== '' && (
        <p className={styles.apercu} aria-live="polite">
          <span className={styles.apercuLibelle}>Tu écris :</span>
          {apercu}
        </p>
      )}

      <div className={styles.exercice__actions}>
        <Bouton
          variante="primary"
          taille="lg"
          pleineLargeur
          onClick={() => void envoyer()}
          disabled={enCours || saisie.valeur.trim() === ''}
        >
          {enCours ? 'Vérification…' : 'Vérifier'}
        </Bouton>
        {aidesRestantes > 0 && (
          <Bouton
            variante="secondary"
            taille="lg"
            onClick={() => void demanderAide()}
            disabled={enCours}
          >
            {aidesRestantes === 1 ? 'Un indice' : `Un indice (${aidesRestantes})`}
          </Bouton>
        )}
      </div>

      {/* Tant que l'élève est en clavier système, le clavier mathématique est
          hors d'atteinte : ce bouton est le seul moyen d'y revenir. Il ne sert
          donc jamais à *demander* l'affichage du clavier — c'est le champ qui
          s'en charge. */}
      {clavierSysteme && !clavierOuvert && (
        <Bouton variante="secondary" taille="lg" onClick={basculerSysteme}>
          Revenir au clavier mathématique
        </Bouton>
      )}

      {verdict !== null && estErreurSaisie(verdict) && (
        <Carte className={styles.saisieIllisible} role="status">
          <p className={styles.verdictStatut}>{verdict.message}</p>
          {verdict.tutorat && <p className={styles.verdictDetail}>{verdict.tutorat.action}</p>}
        </Carte>
      )}

      {correction !== null && (
        <div role="status" aria-live="polite">
          <Verdict correction={correction} tutorat={tutorat} />
        </div>
      )}

      </div>

      {/*
       * Le clavier est le dernier élément de la colonne : il occupe de la
       * place, il ne recouvre rien. C'est l'inverse d'un positionnement
       * absolu, qui aurait masqué le composeur.
       */}
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
    </article>
  );
}
