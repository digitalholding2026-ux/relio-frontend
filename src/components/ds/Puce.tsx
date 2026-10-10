/**
 * Puce — un élément sélectionnable parmi plusieurs.
 *
 * ## Puce ou bouton ?
 *
 * Une puce sert à **choisir** dans une liste : une matière, un filtre, un
 * niveau. Elle est un `button` avec `aria-pressed`, jamais une case à cocher —
 * sauf si plusieurs choix sont possibles en même temps, auquel cas c'est un
 * groupe de cases à cocher qui convient.
 *
 * Une puce seule n'est pas un bouton d'action : si l'élève ne peut pas la
 * sélectionner, c'est une pastille.
 */

import type { ButtonHTMLAttributes, ReactNode } from 'react';

import styles from './Puce.module.css';

export interface PuceProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  readonly children: ReactNode;
  /** État sélectionné. */
  readonly active?: boolean;
  /**
   * Retire l'effet « bouton pressé » et la rend non sélectionnable.
   *
   * Utile pour une puce informative au sein d'un groupe où une seule option
   * est obligatoire — elle ne peut alors pas être désactivée.
   */
  readonly fixe?: boolean;
}

export function Puce({ children, active = false, fixe = false, className, type = 'button', ...reste }: PuceProps) {
  return (
    <button
      {...reste}
      type={type}
      // `aria-pressed` décrit l'état au lecteur d'écran : « En cours, enfoncé »
      // là où la couleur ne dit rien à la personne qui ne distingue pas le
      // rouge du vert.
      aria-pressed={active}
      disabled={reste.disabled === true || fixe}
      className={[styles.puce, active ? styles.active : '', className ?? ''].filter(Boolean).join(' ')}
    >
      {children}
    </button>
  );
}