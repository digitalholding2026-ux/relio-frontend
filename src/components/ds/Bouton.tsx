/**
 * Bouton — le composant le plus utilisé du design system.
 *
 * ## Choisir une variante
 *
 * | Variante | Quand l'utiliser |
 * |---|---|
 * | `primary` | l'action principale de l'écran. **Une seule par écran visible** : deux boutons primaires obligent à choisir |
 * | `secondary` | une action importante mais concurrente d'une autre |
 * | `ghost` | une action discrète, répétée, ou rangée dans une barre d'outils |
 * | `danger` | une action destructive ou irréversible |
 *
 * ## Choisir une taille
 *
 * `sm` pour un contrôle dans une liste dense, `md` par défaut, `lg` pour
 * l'action principale d'un parcours sur téléphone.
 *
 * Les trois font au moins 44 px de haut : `sm` atteint 44 px par la hauteur
 * minimale, pas par la taille du texte. C'est la contrainte qui compte au doigt.
 */

import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { Icone, type NomIcone } from './Icone';
import styles from './Bouton.module.css';

export type VarianteBouton = 'primary' | 'secondary' | 'ghost' | 'danger';
export type TailleBouton = 'sm' | 'md' | 'lg';

export interface BoutonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  readonly variante?: VarianteBouton;
  readonly taille?: TailleBouton;
  /** Étiquette visible. Un bouton sans étiquette visible doit avoir un `aria-label`. */
  readonly children: ReactNode;
  /** Icône à gauche du texte. */
  readonly icone?: NomIcone;
  /**
   * Affiche un état de chargement : le libellé est conservé pour que la mise en
   * page ne saute pas, et l'icône d'attente est annoncée à l'écran.
   */
  readonly chargement?: boolean;
  /** Étend le bouton sur toute la largeur du conteneur. */
  readonly pleineLargeur?: boolean;
}

export const Bouton = forwardRef<HTMLButtonElement, BoutonProps>(function Bouton(
  {
    variante = 'primary',
    taille = 'md',
    children,
    icone,
    chargement = false,
    pleineLargeur = false,
    className,
    disabled,
    type = 'button',
    ...reste
  },
  ref,
) {
  // Un bouton en chargement ne doit pas être actionnable : sans cela, un élève
  // peut envoyer deux corrections en Double pendant que la première est en vol.
  const inactif = disabled === true || chargement;

  const classes = [
    styles.bouton,
    styles[variante],
    styles[taille],
    pleineLargeur ? styles.pleineLargeur : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      {...reste}
      ref={ref}
      type={type}
      className={classes}
      disabled={inactif}
      // `aria-busy` indique aux technologies d'assistance que le contrôle est
      // occupé, sans le rendre muet : le libellé reste lisible.
      aria-busy={chargement || undefined}
    >
      {chargement ? (
        <>
          <Icone nom="rafraichir" className={styles.rotor} aria-hidden="true" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {icone !== undefined && <Icone nom={icone} aria-hidden="true" />}
          <span>{children}</span>
        </>
      )}
    </button>
  );
});