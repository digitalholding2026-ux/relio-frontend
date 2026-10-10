/**
 * Avatar — une personne, un rang, un niveau.
 *
 * ## Aucune photo par défaut
 *
 * Relio ne collecte pas d'image de profil. L'initiale est donc le cas normal,
 * pas un pis-aller : elle marche hors connexion, pèse zéro octet, et ne crée
 * aucune attente de chargement sur un réseau lent.
 *
 * ## Couleur
 *
 * La teinte est **déterministe** et calculée à partir du nom : le même nom
 * donne toujours la même couleur. C'est important pour un élève qui reconnaît
 * sa pastille d'un exercice à l'autre.
 */

import styles from './Avatar.module.css';

export interface AvatarProps {
  /** Nom affiché. L'initiale en est tirée. */
  readonly nom: string;
  readonly taille?: 'sm' | 'md' | 'lg';
  readonly className?: string;
}

/** Palette de teintes, toutes vérifiées à l'AA avec du texte blanc. */
const TEINTES = ['#1E2A78', '#155E75', '#065F46', '#7C2D12', '#5B21B6', '#9F1239'] as const;

/** Somme des codes des caractères : stable, et une même lettre donne la même teinte. */
function indiceTeinte(nom: string): number {
  let total = 0;
  for (let i = 0; i < nom.length; i += 1) {
    total = (total + nom.charCodeAt(i) * (i + 1)) % 997;
  }
  return total;
}

/** Première lettre/graphème du nom, en majuscule. */
function initiale(nom: string): string {
  const propre = nom.trim();
  if (propre === '') return '?';
  return [...propre][0]!.toUpperCase();
}

export function Avatar({ nom, taille = 'md', className }: AvatarProps) {
  const teinte = TEINTES[indiceTeinte(nom)] ?? TEINTES[0];
  const lettre = initiale(nom);

  return (
    <span
      className={[styles.avatar, styles[taille], className ?? ''].filter(Boolean).join(' ')}
      style={{ background: teinte }}
      // L'initiale n'apporte rien que le nom ne dise pas : l'avatar est
      // décoratif, le nom reste à côté, en texte.
      aria-hidden="true"
    >
      {lettre}
    </span>
  );
}