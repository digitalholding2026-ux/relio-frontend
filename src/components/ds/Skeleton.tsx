/**
 * Squelette — l'espace réservé pendant le chargement.
 *
 * ## Pourquoi un squelette plutôt qu'un indicateur
 *
 * Un indicateur tourne et ne dit rien sur la forme de ce qui arrive. Un
 * squelette montre **la forme** du contenu, ce qui évite le saut de mise en
 * page à l'arrivée des données. Sur une connexion 3G, cette différence est
 * souvent la différence entre « ça charge » et « ça ne marche pas ».
 *
 * ## Pourquoi sans animation
 *
 * La pulsation habituelle est une animation infinie. Sur un appareil
 * d'entrée de gamme, elle maintient le processeur éveillé pendant tout le
 * chargement — c'est-à-dire pendant exactement le moment où il doit faire
 * autre chose. Ici, le squelette est statique.
 */

import type { CSSProperties, HTMLAttributes } from 'react';

import styles from './Skeleton.module.css';

export interface SqueletteProps extends HTMLAttributes<HTMLDivElement> {
  /** Largeur. `100%` par défaut : un squelette ne doit pas faire Sauter la page. */
  readonly largeur?: string | number;
  readonly hauteur?: string | number;
  /** Arrondis ronds, pour un squelette de pastille ou d'avatar. */
  readonly rond?: boolean;
  /** Nombre de lignes, pour un bloc de texte. */
  readonly lignes?: number;
}

export function Squelette({
  largeur = '100%',
  hauteur = 16,
  rond = false,
  lignes = 1,
  className,
  style,
  ...reste
}: SqueletteProps) {
  const styleBase = {
    '--relio-largeur': typeof largeur === 'number' ? `${largeur}px` : largeur,
    '--relio-hauteur': typeof hauteur === 'number' ? `${hauteur}px` : hauteur,
    ...style,
  } as CSSProperties;

  if (lignes > 1) {
    return (
      <div {...reste} className={[styles.bloc, className ?? ''].filter(Boolean).join(' ')} aria-hidden="true" style={styleBase}>
        {Array.from({ length: lignes }, (_, index) => (
          // La dernière ligne est plus courte : un bloc de texte réel ne finit
          // pas sur une ligne pleine, et le squelette doit le refléter.
          <div
            key={index}
            className={styles.ligne}
            style={index === lignes - 1 ? { width: '60%' } : undefined}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      {...reste}
      aria-hidden="true"
      className={[styles.ligne, rond ? styles.rond : '', className ?? ''].filter(Boolean).join(' ')}
      style={styleBase}
    />
  );
}