'use client';

import type { MouseEvent, PointerEvent } from 'react';

import type { Touche } from '@/lib/clavier';

import styles from './ToucheClavier.module.css';

/**
 * Une touche du clavier mathématique.
 *
 * ## Pourquoi ce n'est pas le composant `Bouton` du design system
 *
 * `Bouton` impose `min-height: 48px`. Le clavier fait **9 rangées × 44 px**,
 * soit 453 px avec les écarts et la marge : passer à 48 px le ferait monter à
 * 485 px, et le chantier 7.7 a précisément corrigé le fait que le clavier
 * recouvrait l'énoncé. Utiliser `Bouton` ici dégraderait le comportement que
 * ce chantier s'interdit de toucher.
 *
 * La contrainte tactile est donc reprise à l'identique — `--relio-tactile-min`
 * vaut 44 px, exactement comme avant — avec les mêmes tokens et la même
 * bordure forte que `Bouton`.
 *
 * ## Les deux voies d'activation, conservées du correctif A1
 *
 * - `pointerdown` avec `preventDefault()` : sur Android, le `click` arrive
 *   après un délai pendant lequel le champ a perdu le focus — et le curseur
 *   avec. C'est ce qui rend la frappe réactive au doigt.
 * - `click` : c'est ce qui rend la touche actionnable au clavier physique, au
 *   commutateur d'accès et à toute technologie d'assistance.
 *
 * Un `click` issu d'un doigt porte `detail > 0` : il est ignoré, ce qui
 * empêche l'action de s'exécuter deux fois sans aucun état à raisonner.
 *
 * **Rien de tout cela n'est modifié par le chantier C2b.** Ce composant le
 * déplace, il ne le redéfinit pas.
 */

export interface ToucheClavierProps {
  readonly touche: Touche;
  readonly champId: string;
  readonly surPointerDown: (evenement: PointerEvent<HTMLButtonElement>, touche: Touche) => void;
  readonly surClick: (evenement: MouseEvent<HTMLButtonElement>, touche: Touche) => void;
}

export function ToucheClavier({ touche, champId, surPointerDown, surClick }: ToucheClavierProps) {
  return (
    <button
      type="button"
      className={`${styles.touche} ${styles[`ton${touche.id}`] ?? ''}`.trim()}
      style={touche.largeur ? { gridColumn: `span ${touche.largeur}` } : undefined}
      aria-label={touche.aria}
      aria-controls={champId}
      onPointerDown={(evenement) => surPointerDown(evenement, touche)}
      onClick={(evenement) => surClick(evenement, touche)}
    >
      {touche.libelle}
    </button>
  );
}