/**
 * Carte — la surface de regroupement par défaut.
 *
 * Une carte contient **une** idée : un exercice, un objectif, un bloc de retour.
 * Emporter des cartes dans une carte produit l'empilement de bordures et de
 * marges, illisible sur 360 px. Pour un simple espacement, utiliser l'échelle
 * d'espacement directement.
 */

import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';

import styles from './Carte.module.css';

export interface CarteProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  /**
   * Surface utilisée.
   *
   * `conteneur` pour un contenu principal, `elevee` pour un élément qui doit
   * se détacher du fond.
   */
  readonly variante?: 'conteneur' | 'elevee';
  /** Retire l'ombre. À réserver à l'intérieur d'une autre carte. */
  readonly sansOmbre?: boolean;
  /** Ajoute une bordure explicite, utile en mode économie de données. */
  readonly bordure?: boolean;
  readonly padding?: 'sm' | 'md' | 'lg';
}

export const Carte = forwardRef<HTMLDivElement, CarteProps>(function Carte(
  { children, variante = 'conteneur', sansOmbre = false, bordure = false, padding = 'md', className, ...reste },
  ref,
) {
  return (
    <div
      {...reste}
      ref={ref}
      className={[
        styles.carte,
        styles[variante],
        styles[`padding${padding}`],
        sansOmbre ? styles.sansOmbre : '',
        bordure ? styles.bordure : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
});