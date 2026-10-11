/**
 * Une carte de bloc — « Calcul littéral », « Racines carrées ».
 *
 * ## Composant pur
 *
 * Aucune requête, aucune dépendance à l'environnement : le bloc est reçu tout
 * prêt. C'est ce qui permet de tester un bloc ouvert et un bloc fermé sans
 * stubber `fetch`, et sans que le test et l'écran puissent diverger.
 *
 * ## Un bloc fermé n'expose rien
 *
 * Pas de liste d'exercices, pas de lien. Un élève ne doit pas voir ce qu'il ne
 * peut pas encore faire : afficher « Exercice 3 » sous « disponible dans six
 * semaines » l'inviterait à chercher un écran qui n'existe pas. À la place, la
 * pastille dit **quand** le bloc ouvre, ce qui est l'information réellement
 * utile.
 *
 * ## Les liens d'exercice sont des liens
 *
 * Chaque exercice mène à une page : c'est une navigation. Le style vient de
 * `Bouton.module.css` — la feuille du composant `Bouton` du design system —
 * et non d'une classe locale, pour qu'un bouton et un lien d'exercice ne
 * puissent pas diverger. Le module local n'ajoute que ce que la feuille du
 * design system ne prévoit pas : un bloc de texte sur plusieurs lignes,
 * aligné à gauche.
 */

import Link from 'next/link';

import { Carte } from '@/components/ds/Carte';
import { Pastille } from '@/components/ds/Pastille';
import stylesBouton from '@/components/ds/Bouton.module.css';
import type { BlocPublic } from '@/lib/parcours';

import styles from './parcours.module.css';

const classesLien = [
  stylesBouton.bouton,
  stylesBouton.secondary,
  stylesBouton.pleineLargeur,
  styles.lienExercice,
].join(' ');

export function BlocCarte({ bloc }: { bloc: BlocPublic }) {
  const ouvert = bloc.disponible && bloc.exercices.length > 0;
  const titreId = `titre-${bloc.id}`;

  return (
    <section className={styles.bloc} aria-labelledby={titreId}>
      <Carte variante={ouvert ? 'elevee' : 'conteneur'} className={styles.blocCarte}>
        <div className={styles.blocEntete}>
          <h2 className={styles.blocTitre} id={titreId}>
            {bloc.titre}
          </h2>
          {/* La pastille porte son texte : « Ouvert » ou « Ouvre à la
              semaine 10 ». Une couleur seule ne dit rien à une personne
              daltonienne, et ne dit rien du tout à un lecteur d'écran. */}
          <Pastille ton={ouvert ? 'succes' : 'neutre'} compacte>
            {ouvert ? 'Ouvert' : `Ouvre à la semaine ${bloc.semaineDebut}`}
          </Pastille>
        </div>

        <p className={styles.blocNote}>
          {bloc.volumeHoraireH} h de programme
          {ouvert ? ' — ouverte' : ` — à partir de la semaine ${bloc.semaineDebut}`}
        </p>

        {bloc.objectifs.length > 0 ? (
          <ul className={styles.objectifs}>
            {bloc.objectifs.map((objectif) => (
              <li key={objectif.id}>{objectif.libelle}</li>
            ))}
          </ul>
        ) : null}

        {/* Un bloc ouvert sans exercice n'affiche aucune liste : une liste vide
            ressemblerait à un contenu manquant. */}
        {ouvert ? (
          <ul className={styles.exercices}>
            {bloc.exercices.map((exercice) => (
              <li key={exercice.id}>
                <Link className={classesLien} href={`/parcours/${exercice.id}`}>
                  <span className={styles.rang} aria-hidden="true">
                    {exercice.rang}
                  </span>
                  <span className={styles.exerciceTexte}>
                    <span className={styles.exerciceTitre}>Exercice {exercice.rang}</span>
                    <span className={styles.exerciceDetail}>{exercice.consigne}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.ferme} role="status">
            {bloc.semainesAvantOuverture !== null
              ? `Disponible à partir de la semaine ${bloc.semaineDebut}.`
              : 'Ce bloc n’est pas encore ouvert.'}
          </p>
        )}
      </Carte>
    </section>
  );
}