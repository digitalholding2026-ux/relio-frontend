/**
 * Pastille — un statut court et coloré.
 *
 * ## Usage
 *
 * Une pastille décrit **un état**, pas une action : « Réussi », « À revoir »,
 * « En cours ». Pour une action, c'est un bouton ; pour une matière sélectionnée,
 * c'est une puce.
 *
 * Le libellé textuel est obligatoire. Une pastille colorée seule n'est pas
 * comprise par une personne daltonienne, et la couleur seule n'est de toute
 * façon pas une information fiable.
 */

import type { HTMLAttributes, ReactNode } from 'react';

import styles from './Pastille.module.css';

export type TonPastille = 'neutre' | 'succes' | 'alerte' | 'accent' | 'primaire';

export interface PastilleProps extends HTMLAttributes<HTMLSpanElement> {
  /** Couleur du fond. */
  readonly ton?: TonPastille;
  readonly children: ReactNode;
  /** Version compacte, pour un tableau ou une liste dense. */
  readonly compacte?: boolean;
}

export function Pastille({ ton = 'neutre', children, compacte = false, className, ...reste }: PastilleProps) {
  return (
    <span {...reste} className={[styles.pastille, styles[ton], compacte ? styles.compacte : '', className ?? ''].filter(Boolean).join(' ')}>
      {children}
    </span>
  );
}