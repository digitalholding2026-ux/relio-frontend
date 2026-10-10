/**
 * État vide — l'écran n'a rien à montrer, et ce n'est pas une panne.
 *
 * ## La distinction qui compte
 *
 * « Aucun résultat » et « une erreur est survenue » ne se ressemblent pas. Le
 * premier appelle une action de l'élève ; le second appelle une action de
 * l'application. Confondre les deux fait croire à l'élève qu'il a mal fait.
 *
 * Ce composant est **toujours** accompagné d'une action : un état vide sans
 * issue est un cul-de-sac. L'action est facultative dans l'API, mais aucun des
 * usages du design system ne l'omet.
 *
 * ## Illustration
 *
 * Pas d'image bitmap. L'illustration, si elle existe, est un SVG ou une icône :
 * c'est une contrainte de poids, et une illustration bitmap sur un écran de
 * téléphone clair mal choisie coûte plus que le contenu qu'elle décore.
 */

import type { ReactNode } from 'react';

import { Icone, type NomIcone } from './Icone';
import { Bouton } from './Bouton';
import styles from './EtatVide.module.css';

export interface EtatVideProps {
  /** Message principal : ce qui est arrivé, en une phrase. */
  readonly titre: string;
  /** Précision utile, facultative. */
  readonly description?: string;
  readonly icone?: NomIcone;
  /** Libellé de l'action de sortie. */
  readonly action?: string;
  readonly onAction?: () => void;
  /** Contenu additionnel sous l'action. */
  readonly children?: ReactNode;
}

export function EtatVide({ titre, description, icone = 'info', action, onAction, children }: EtatVideProps) {
  return (
    <div className={styles.etat}>
      {icone !== undefined && (
        <span className={styles.icone}>
          <Icone nom={icone} taille={28} />
        </span>
      )}

      <p className={styles.titre}>{titre}</p>

      {description !== undefined && <p className={styles.description}>{description}</p>}

      {action !== undefined && onAction !== undefined && (
        <Bouton variante="secondary" onClick={onAction}>
          {action}
        </Bouton>
      )}

      {children}
    </div>
  );
}