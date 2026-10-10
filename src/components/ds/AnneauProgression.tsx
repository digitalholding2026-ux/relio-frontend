/**
 * Anneau de progression — un cercle, pour un bilan qu'on veut regarder.
 *
 * ## Quand utiliser un anneau plutôt qu'une barre
 *
 * La barre dit « sur combien ». L'anneau dit « où en est-on dans un tour » :
 * il convient pour un bloc de leçons, pas pour un exercice. Sur un exercice,
 * l'anneau devient un score, ce que le projet s'interdit.
 *
 * ## Pourquoi du SVG et pas une image
 *
 * Un anneau est un tracé dont l'épaisseur et la couleur changent. Le faire en
 * CSSConic-gradient serait plus court, mais le dégradé conique n'est pas lisible
 * par les lecteurs d'écran et se dégrade mal sur d'anciens Android. Le SVG
 * donne en plus un contour net à toute taille.
 *
 * L'anneau est décoratif : `aria-hidden`, la valeur étant déjà portée par le
 * texte au centre.
 */

import type { CSSProperties } from 'react';

import styles from './AnneauProgression.module.css';
import type { TonProgression } from './BarreProgression';

export interface AnneauProgressionProps {
  readonly valeur: number;
  readonly taille?: number;
  readonly epaisseur?: number;
  readonly ton?: TonProgression;
  /** Texte au centre. Sans `label`, le pourcentage s'affiche. */
  readonly children?: string;
  /** Libellé lu par les lecteurs d'écran pour l'anneau. */
  readonly label?: string;
  readonly className?: string;
}

function borner(valeur: number): number {
  if (!Number.isFinite(valeur)) return 0;
  return Math.max(0, Math.min(100, Math.round(valeur)));
}

export function AnneauProgression({
  valeur,
  taille = 96,
  epaisseur = 8,
  ton = 'primaire',
  children,
  label,
  className,
}: AnneauProgressionProps) {
  const pourcentage = borner(valeur);
  const rayon = (taille - epaisseur) / 2;
  const circonference = 2 * Math.PI * rayon;
  const trace = (pourcentage / 100) * circonference;

  return (
    <div
      className={[styles.enveloppe, className ?? ''].filter(Boolean).join(' ')}
      style={{ width: taille, height: taille }}
      // Le pourcentage est déjà annoncé dans le texte central : annoncer deux
      // fois la même information fait répéter le lecteur d'écran pour rien.
      role={label === undefined ? undefined : 'img'}
      aria-label={label}
      aria-hidden={label === undefined ? true : undefined}
    >
      <svg width={taille} height={taille} viewBox={`0 0 ${taille} ${taille}`} focusable="false">
        <circle
          cx={taille / 2}
          cy={taille / 2}
          r={rayon}
          fill="none"
          stroke="currentColor"
          strokeWidth={epaisseur}
          className={styles.piste}
        />
        <circle
          cx={taille / 2}
          cy={taille / 2}
          r={rayon}
          fill="none"
          stroke="currentColor"
          strokeWidth={epaisseur}
          strokeLinecap="round"
          strokeDasharray={`${trace} ${circonference - trace}`}
          // L'arc démarre en haut, à midi, et non à droite : plus lisible.
          transform={`rotate(-90 ${taille / 2} ${taille / 2})`}
          className={[styles.trace, styles[ton]].join(' ')}
        />
      </svg>

      <span
        className={styles.centre}
        style={{ '--relio-part': `${pourcentage}%` } as CSSProperties}
      >
        {children ?? `${pourcentage} %`}
      </span>
    </div>
  );
}