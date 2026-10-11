/**
 * La liste des blocs — les quatre états de l'écran.
 *
 * ## Composant pur
 *
 * Comme `CarteRoute` sur l'accueil : aucune requête ici. `ParcoursServeur`
 * interroge l'API, ce composant reçoit l'état et le rend. Les quatre états
 * sont donc testables sans `fetch`, et l'écran et son test ne peuvent pas
 * diverger.
 *
 * ## Ce que cet écran ne montre pas
 *
 * Un bloc fermé ne montre ni exercice ni lien — voir `BlocCarte`. Un élève ne
 * doit pas pouvoir cliquer sur ce qu'il ne peut pas faire. Et quand aucun bloc
 * n'est ouvert, l'écran ne propose pas « Continuer » vers une page vide : il
 * dit **quand** la prochaine leçon arrive.
 */

import { Carte } from '@/components/ds/Carte';
import { EtatVide } from '@/components/ds/EtatVide';
import { Squelette } from '@/components/ds/Skeleton';
import { Bouton } from '@/components/ds/Bouton';
import type { BlocPublic, ParcoursEtat } from '@/lib/parcours';

import { BlocCarte } from './BlocCarte';
import styles from './parcours.module.css';

/** Le prochain bloc à ouvrir : le premier par semaine d'ouverture. */
function prochainBloc(blocs: readonly BlocPublic[]): BlocPublic | null {
  const fermes = blocs.filter((bloc) => !bloc.disponible);
  if (fermes.length === 0) return null;
  return fermes.reduce((a, b) => (a.semaineDebut <= b.semaineDebut ? a : b));
}

export function ParcoursListe({ etat }: { etat: ParcoursEtat }) {
  if (etat.kind === 'indisponible') {
    return (
      <section className={styles.liste} aria-labelledby="titre-liste">
        <h2 className={styles.titreListe} id="titre-liste">
          Tes blocs
        </h2>
        <Carte className={styles.carteEtat}>
          <EtatVide
            icone="info"
            titre="Tes exercices arrivent dans un instant"
            description="Le service n’a pas répondu. La page fonctionne ; seuls les exercices sont en attente."
          >
            <form action="/parcours" method="get" className={styles.formulaire}>
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
  const ouverts = parcours.blocs.filter((bloc) => bloc.disponible);

  return (
    <>
      <section className={styles.etatAnnee} aria-labelledby="titre-parcours-etat">
        <h2 className={styles.titreListe} id="titre-parcours-etat">
          Où en est le programme
        </h2>
        <p className={styles.noteAnnee}>{parcours.message}</p>
      </section>

      {ouverts.length === 0 ? (
        <section className={styles.liste} aria-labelledby="titre-liste">
          <h2 className={styles.titreListe} id="titre-liste">
            Tes blocs
          </h2>
          <Carte className={styles.carteEtat}>
            <EtatVide
              icone="info"
              titre="Aucun bloc n’est ouvert aujourd’hui"
              description={
                prochainBloc(parcours.blocs) !== null
                  ? `${prochainBloc(parcours.blocs)!.titre} ouvre à la semaine ${prochainBloc(parcours.blocs)!.semaineDebut}. Reviens à cette date.`
                  : 'Les leçons se débloquent au fil de l’année scolaire. Reviens plus tard dans l’année.'
              }
            />
          </Carte>
        </section>
      ) : (
        <section className={styles.liste} aria-labelledby="titre-liste">
          <h2 className={styles.titreListe} id="titre-liste">
            Tes blocs
          </h2>
          <div className={styles.blocs}>
            {parcours.blocs.map((bloc) => (
              <BlocCarte bloc={bloc} key={bloc.id} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

/** Repli de chargement — des cartes de la forme de celles qui arrivent. */
export function ParcoursListeEnAttente() {
  return (
    <section className={styles.liste} aria-labelledby="titre-liste-attente">
      <h2 className={styles.titreListe} id="titre-liste-attente">
        Tes blocs
      </h2>
      <div className={styles.blocs}>
        {[0, 1].map((index) => (
          <Carte className={styles.blocCarte} key={index}>
            <Squelette hauteur={24} largeur="60%" />
            <Squelette hauteur={14} largeur="40%" />
            <Squelette hauteur={56} />
            <Squelette hauteur={56} />
          </Carte>
        ))}
      </div>
    </section>
  );
}