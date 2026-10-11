/**
 * Le panneau de tutorat — l'aide progressive en trois niveaux.
 *
 * ## Ce que ce composant ne décide pas
 *
 * Rien. Le niveau d'aide est choisi par le serveur (`tutorat.niveau`), le texte
 * vient du serveur (`tutorat.message`), l'action vient du serveur
 * (`tutorat.action`), la méthode à retenir aussi (`tutorat.resume`). Le client
 * se contente de choisir la **présentation**.
 *
 * Recalculer le niveau ici — « l'élève a échoué deux fois, donc niveau 2 » —
 * serait introduire une seconde règle pédagogique qui divergerait de celle
 * validée par l'enseignant.
 *
 * ## Un panneau replié tant qu'il est court, déplié quand il porte une méthode
 *
 * L'écran d'exercice est déjà chargé : énoncé, champ, clavier. Le panneau ne
 * s'ouvre que lorsqu'il a quelque chose de plus à dire que le verdict — une
 * méthode à retenir, ou un accompagnement de niveau 3. Sinon il tient sur une
 * ligne. C'est la seule adaptation faite ici, et elle porte sur la mise en
 * forme, pas sur le contenu.
 *
 * ## Aucun identifiant technique n'est affiché
 *
 * Ni `OO-L1-1`, ni `erreur_de_signe`, ni « N1 ». Le serveur envoie des clés
 * techniques ; l'écran ne les montre jamais. C'est une règle du projet, pas une
 * préférence de style — un élève de 3e n'a rien à faire de l'identifiant d'un
 * objectif du référentiel.
 */

import { Carte } from '@/components/ds/Carte';
import { Icone } from '@/components/ds/Icone';
import { Pastille } from '@/components/ds/Pastille';
import { LIBELLE_NIVEAU, type NiveauAide } from '@/lib/tutorat';

import styles from './exercice.module.css';

export interface TutoratProps {
  readonly niveau: NiveauAide;
  readonly message: string;
  readonly action: string;
  readonly resume: string | null;
  /** Vrai quand la réponse est juste : le panneau devient un bilan. */
  readonly bilan: boolean;
}

export function PanneauTutorat({ niveau, message, action, resume, bilan }: TutoratProps) {
  // Un bilan n'est pas une aide : il n'affiche ni palier, ni action.
  if (bilan) {
    return (
      <div className={styles.tutorat}>
        {resume !== null ? (
          <p className={styles.tutoratResume}>
            <strong>Méthode à retenir :</strong> {resume}
          </p>
        ) : (
          <p className={styles.tutoratMessage}>{message}</p>
        )}
      </div>
    );
  }

  // Le panneau prend de la place : on l'ouvre dès qu'il porte une méthode à
  // retenir, ou dès que l'accompagnement est au dernier niveau.
  const deplie = resume !== null || niveau >= 3;

  return (
    <Carte variante="conteneur" sansOmbre className={styles.tutoratCarte}>
      <div className={styles.tutoratEntete}>
        <Pastille ton={niveau === 1 ? 'neutre' : 'primaire'} compacte>
          {LIBELLE_NIVEAU[niveau]}
        </Pastille>
        <span className={styles.tutoratPalier}>
          aide {niveau} sur 3
        </span>
      </div>

      <p className={styles.tutoratMessage}>{message}</p>

      {niveau >= 2 ? (
        <p className={styles.tutoratAction}>
          <Icone nom="cible" taille={16} className={styles.tutoratActionIcone} aria-hidden="true" />
          {action}
        </p>
      ) : null}

      {deplie && resume !== null ? (
        <p className={styles.tutoratResume}>
          <strong>Méthode à retenir :</strong> {resume}
        </p>
      ) : null}
    </Carte>
  );
}