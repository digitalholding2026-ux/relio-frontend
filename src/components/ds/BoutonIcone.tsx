/**
 * Bouton icône — un contrôle dont le sens tient dans l'image.
 *
 * ## La règle absolue : un libellé est obligatoire
 *
 * Une icône seule n'est pas auto-portante. Le composant **exige** un `label`
 * qui devient l'`aria-label`. Il n'existe pas de variante « sans libellé » :
 * c'est le seul moyen d'empêcher qu'un bouton-moins, un bouton-croix ou une
 * flèche de retour ne soient annoncés que par « bouton ».
 *
 * ## Taille
 *
 * 44 × 44 px au minimum, quelle que soit la taille de l'icône. Augmenter la
 * taille de l'icône n'augmente pas la zone tactile : c'est la zone qu'on
 * agrandit, pas le dessin.
 */

import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { Icone, type NomIcone } from './Icone';
import styles from './BoutonIcone.module.css';

export type TailleBoutonIcone = 'sm' | 'md' | 'lg';

export interface BoutonIconeProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> {
  readonly nom: NomIcone;
  /**
   * Ce que fait le bouton, en quelques mots.
   *
   * Obligatoire : il est lu par les lecteurs d'écran et devient l'infobulle.
   */
  readonly label: string;
  /** `léger` pour un bouton posé sur une surface, `plein` sur une couleur. */
  readonly variante?: 'leger' | 'plein' | 'discret';
  readonly taille?: TailleBoutonIcone;
  readonly children?: ReactNode;
}

export const BoutonIcone = forwardRef<HTMLButtonElement, BoutonIconeProps>(function BoutonIcone(
  { nom, label, variante = 'leger', taille = 'md', className, type = 'button', ...reste },
  ref,
) {
  return (
    <button {...reste} ref={ref} type={type} aria-label={label} title={label} className={[styles.bouton, styles[variante], styles[taille], className ?? ''].filter(Boolean).join(' ')}>
      <Icone nom={nom} />
    </button>
  );
});