/**
 * Jeu d'icônes Relio — SVG en ligne, sans dépendance.
 *
 * ## Pourquoi des icônes maison plutôt qu'une bibliothèque
 *
 * Trois raisons, dans l'ordre d'importance :
 *
 * 1. **Poids.** Une bibliothèque d'icônes pèserait plusieurs dizaines de kilo-
 *    octets, y compris en n'utilisant que quatre dessins. Ici, seules les
 *    icônes réellement employées sont dans le bundle.
 * 2. **Cohérence.** Un trait de 2 px sur une grille de 24 px, c'est la règle
 *    que ces fichiers appliquent uniformément.
 * 3. **Dépendance.** Aucune bibliothèque à mettre à jour, aucun risque
 *    d'approvisionnement sur un déploiement hors ligne.
 *
 * Les tracés sont écrits dans un format unique — une chaîne `d` par icône —
 * ce qui les rend faciles à relire et à remplacer.
 */

import type { SVGProps } from 'react';

/** Noms des icônes disponibles. L'union ferme empêche d'inventer un nom. */
export type NomIcone =
  | 'check'
  | 'alerte'
  | 'info'
  | 'croix'
  | 'chevron'
  | 'lumiere'
  | 'lune'
  | 'rafraichir'
  | 'indice'
  | 'cible'
  | 'temps'
  | 'donnees';

const TRACES: Record<NomIcone, string> = {
  check: 'M4 12.5 9.5 18 20 6.5',
  alerte: 'M12 8v5M12 16.5v.5M10.3 3.9 2.6 17.4A2 2 0 0 0 4.3 20.4h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  info: 'M12 11v6M12 7.5v.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  croix: 'M6 6l12 12M18 6 6 18',
  chevron: 'm9 6 6 6-6 6',
  lumiere: 'M12 3v2M12 19v2M5 12H3M21 12h-2M6.3 6.3 4.9 4.9M19.1 19.1l-1.4-1.4M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  lune: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z',
  rafraichir: 'M20 11a8 8 0 1 0-.6 4M20 5v6h-6',
  indice: 'M9 18h6M10 21h4M12 3a6 6 0 0 1 4 10.5c-.6.6-1 1.4-1 2.5H9c0-1.1-.4-1.9-1-2.5A6 6 0 0 1 12 3Z',
  cible: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM21 4v5h-5M3 4v5h5M21 20v-5h-5M3 20v-5h5',
  temps: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  donnees: 'M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3ZM4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
};

export interface IconeProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  readonly nom: NomIcone;
  /**
   * Description lue par les lecteurs d'écran.
   *
   * Absente, l'icône est marquée comme décorative et masquée : c'est le
   * comportement par défaut, car une icône seule n'apporte presque jamais une
   * information que le texte voisin ne porte pas déjà.
   */
  readonly titre?: string;
  readonly taille?: number;
}

/**
 * Une icône de la marque.
 *
 * Le trait est vectoriel : aucune image bitmap n'est utilisée dans l'interface,
 * conformément à la contrainte de faible consommation de données.
 */
export function Icone({ nom, titre, taille = 20, ...reste }: IconeProps) {
  return (
    <svg
      className="icone"
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      // Une icône sans titre est décorative : elle disparaît du parcours de
      // lecture au lieu d'y injecter un nom de fichier comme « graphic ».
      aria-hidden={titre === undefined ? true : undefined}
      role={titre === undefined ? undefined : 'img'}
      focusable="false"
      {...reste}
    >
      {titre !== undefined && <title>{titre}</title>}
      <path d={TRACES[nom]} />
    </svg>
  );
}