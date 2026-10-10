/**
 * Barre de progression — progression linéaire, une seule valeur.
 *
 * ## Règle pédagogique appliquée par défaut
 *
 * Relio n'affiche **jamais** de pourcentage de réussite sur un exercice. Cet
 * onglet de design system montre donc la barre dans ses états neutres ; son
 * usage réel est la progression d'**un parcours déjà commencé** (par exemple un
 * bloc de trois leçons), jamais un score.
 *
 * Un élève qui répond juste une fois sur dix n'a pas « 10 % de maîtrise ».
 *
 * ## Accessibilité
 *
 * La barre porte `role="progressbar"` avec ses trois attributs ARIA. Le
 * pourcentage est également rendu en texte visible quand `afficherValeur` est
 * actif : une information ne doit pas dépendre du seul sens visuel.
 */

import type { CSSProperties, HTMLAttributes } from 'react';

import styles from './BarreProgression.module.css';

export type TonProgression = 'primaire' | 'succes' | 'accent' | 'alerte';

export interface BarreProgressionProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Valeur entre 0 et 100. Les valeurs hors bornes sont ramenées. */
  readonly valeur: number;
  readonly label?: string;
  readonly ton?: TonProgression;
  /** Affiche le pourcentage à côté de la barre. */
  readonly afficherValeur?: boolean;
  /** Annonce le changement aux technologies d'assistance. */
  readonly live?: boolean;
}

function borner(valeur: number): number {
  if (!Number.isFinite(valeur)) return 0;
  return Math.max(0, Math.min(100, Math.round(valeur)));
}

export function BarreProgression({
  valeur,
  label,
  ton = 'primaire',
  afficherValeur = false,
  live = false,
  className,
  ...reste
}: BarreProgressionProps) {
  const pourcentage = borner(valeur);

  return (
    <div {...reste} className={[styles.enveloppe, className ?? ''].filter(Boolean).join(' ')}>
      {(label !== undefined || afficherValeur) && (
        <div className={styles.entete}>
          {label !== undefined && <span className={styles.label}>{label}</span>}
          {afficherValeur && (
            <span className={styles.valeur}>{pourcentage} %</span>
          )}
        </div>
      )}

      <div
        className={[styles.piste, styles[ton]].join(' ')}
        role="progressbar"
        aria-valuenow={pourcentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        aria-live={live ? 'polite' : undefined}
      >
        <div className={styles.remplissage} style={{ '--relio-part': `${pourcentage}%` } as CSSProperties} />
      </div>
    </div>
  );
}