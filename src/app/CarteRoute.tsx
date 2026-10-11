/**
 * La carte principale de l'accueil — « Ta route cette semaine ».
 *
 * ## Un composant pur
 *
 * Ce fichier ne fait **aucun** appel réseau : il reçoit l'état déjà résolu et
 * le rend. C'est ce qui permet de tester les quatre états — bloc ouvert, aucun
 * bloc ouvert, API injoignable, chargement — sans stubber `fetch`, et sans
 * dupliquer la logique d'affichage entre le serveur et le test.
 *
 * Le fetch lui-même est fait par `CarteDepuisApi`, dans `app/page.tsx`.
 *
 * ## Le bouton « Continuer » est un lien
 *
 * Il mène à un exercice : c'est une navigation. Un `<button>` qui appelerait
 * `router.push` serait moins robuste — impossible à ouvrir dans un nouvel
 * onglet, ni à copier, ni à afficher l'adresse dans la barre d'état. Le style
 * vient du module CSS du composant `Bouton`, non recopié : mêmes tokens, même
 * feuille, et aucune seconde définition à maintenir.
 *
 * ## « Réessayer » est un formulaire, pas un handler
 *
 * Un formulaire `GET` vers la page elle-même recharge le rendu serveur, qui
 * interroge l'API de nouveau. Aucun JavaScript n'est nécessaire : si le script
 * n'a pas encore chargé, ou s'il est bloqué, le bouton fonctionne quand même.
 */

import Link from 'next/link';

import { BarreProgression } from '@/components/ds/BarreProgression';
import { Bouton } from '@/components/ds/Bouton';
import { Carte } from '@/components/ds/Carte';
import { EtatVide } from '@/components/ds/EtatVide';
import { Pastille } from '@/components/ds/Pastille';
import { Squelette } from '@/components/ds/Skeleton';
import stylesBouton from '@/components/ds/Bouton.module.css';
import type { BlocPublic, ParcoursEtat } from '@/lib/parcours';

import styles from './page.module.css';

/**
 * Minutes estimées pour un bloc, arrondies à cinq.
 *
 * **C'est une estimation, pas une mesure.** L'API ne renvoie aucune durée et le
 * temps passé par un élève n'est pas connu : personne ne peut honnêtement
 * afficher une durée exacte. Deux minutes par exercice, arrondies à cinq, est
 * une borne prudente affichée comme telle — l'élève qui va plus vite n'est pas
 * trompé, et l'élève qui va moins vite s'en aperçoit en avançant.
 */
export function dureeEstimeeMinutes(nbExercices: number): number {
  if (nbExercices <= 0) return 5;
  return Math.max(5, Math.round((nbExercices * 2) / 5) * 5);
}

function blocOuvert(blocs: readonly BlocPublic[]): BlocPublic | null {
  // Le premier bloc ouvert est la suite logique du parcours : les blocs sont
  // ordonnés par semaine d'ouverture, et un bloc plus avancé n'est pas ouvert
  // tant qu'un précédent ne l'est pas.
  return blocs.find((bloc) => bloc.disponible && bloc.exercices.length > 0) ?? null;
}

function prochainBloc(blocs: readonly BlocPublic[]): BlocPublic | null {
  const fermes = blocs.filter((bloc) => !bloc.disponible);
  return fermes.length > 0 ? fermes.reduce((a, b) => (a.semaineDebut <= b.semaineDebut ? a : b)) : null;
}

/** Ce que l'élève comprend de la carte, une fois les données lues. */
function resume(bloc: BlocPublic): string {
  const n = bloc.exercices.length;
  return n === 1 ? '1 exercice' : `${n} exercices`;
}

export function CarteRoute({ etat, semainesParAnnee }: { etat: ParcoursEtat; semainesParAnnee: number }) {
  if (etat.kind === 'indisponible') {
    return (
      <section className={styles.route} aria-labelledby="titre-route">
        <Carte variante="elevee" className={styles.carte}>
          <EtatVide
            icone="info"
            titre="Ton parcours arrive dans un instant"
            description="Le service n’a pas répondu. La page fonctionne ; seul le parcours est en attente."
          >
            <form action="/" method="get" className={styles.formulaire}>
              <Bouton type="submit" variante="secondary">
                Réessayer
              </Bouton>
            </form>
          </EtatVide>
        </Carte>
      </section>
    );
  }

  const { parcours } = etat;
  const { anneeScolaire } = parcours;
  const ouvert = blocOuvert(parcours.blocs);

  const semaine = anneeScolaire.semaine ?? 0;
  const position = Math.round((semaine / semainesParAnnee) * 100);

  const titreId = 'titre-route';

  if (ouvert === null) {
    const prochain = prochainBloc(parcours.blocs);
    return (
      <section className={styles.route} aria-labelledby={titreId}>
        <Carte variante="elevee" className={styles.carte}>
          <h2 className={styles.carteTitre} id={titreId}>
            Ta route cette semaine
          </h2>
          <EtatVide
            icone="info"
            titre="Aucun bloc n’est ouvert pour l’instant"
            description={
              prochain !== null
                ? `${prochain.titre} ouvre à la semaine ${prochain.semaineDebut}. Reviens à cette date.`
                : 'Reviens bientôt : la prochaine leçon est en préparation.'
            }
          >
            <BarreProgression
              valeur={position}
              label={semaine > 0 ? `Semaine ${semaine} sur ${semainesParAnnee}` : undefined}
              ton="primaire"
            />
          </EtatVide>
        </Carte>
      </section>
    );
  }

  return (
    <section className={styles.route} aria-labelledby={titreId}>
      <Carte variante="elevee" className={styles.carte}>
        <div className={styles.carteEntete}>
          <h2 className={styles.carteTitre} id={titreId}>
            Ta route cette semaine
          </h2>
          {/* La pastille porte son texte : une couleur seule n'est pas une
              information lisible par tout le monde. */}
          <Pastille ton="succes" compacte>
            Ouvert
          </Pastille>
        </div>

        <p className={styles.blocTitre}>{ouvert.titre}</p>

        <BarreProgression
          valeur={position}
          label={semaine > 0 ? `Semaine ${semaine} sur ${semainesParAnnee}` : undefined}
          ton="primaire"
        />

        <div className={styles.appel}>
          <Link
            href={`/parcours/${ouvert.exercices[0]!.id}`}
            className={[
              stylesBouton.bouton,
              stylesBouton.primary,
              stylesBouton.lg,
              stylesBouton.pleineLargeur,
            ].join(' ')}
          >
            Continuer
          </Link>
          <p className={styles.duree}>
            {dureeEstimeeMinutes(ouvert.exercices.length)} min environ · {resume(ouvert)}
          </p>
        </div>
      </Carte>
    </section>
  );
}

/** Repli pendant l'appel à l'API — même forme que la carte, donc aucun saut. */
export function CarteRouteEnAttente() {
  return (
    <section className={styles.route} aria-labelledby="titre-route-attente">
      <Carte variante="elevee" className={styles.carte}>
        <h2 className={styles.carteTitre} id="titre-route-attente">
          Ta route cette semaine
        </h2>
        <Squelette hauteur={24} className={styles.squeletteTitre} />
        <Squelette hauteur={16} />
        <Squelette hauteur={52} className={styles.squeletteAction} />
      </Carte>
    </section>
  );
}