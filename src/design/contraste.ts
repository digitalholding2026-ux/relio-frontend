/**
 * Calcul du contraste WCAG — utilitaire pur, sans dépendance.
 *
 * ## Pourquoi il vit dans le produit et pas seulement dans les tests
 *
 * Le critère d'acceptation « aucun contraste inférieur à AA » doit être
 * **vérifiable**, pas déclaratif. Cet utilitaire sert à trois choses :
 *
 * 1. le test automatisé qui passe la palette en revue ;
 * 2. la page `/design-system`, qui affiche le ratio réel de chaque paire ;
 * 3. le rapport de chantier, qui chiffre les résultats.
 *
 * Il implémente la formule de la spécification WCAG 2.1, pas une approximation :
 * luminance relative, puis `(L1 + 0.05) / (L2 + 0.05)`.
 */

/** Une couleur au format hexadécimal, `#RGB` ou `#RRGGBB`. */
export type CouleurHex = string;

interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/** Déchiffre une couleur hexadécimale. Lève sur une valeur illisible. */
export function versRgb(hex: CouleurHex): Rgb {
  const nettoye = hex.trim().replace('#', '');
  const complet =
    nettoye.length === 3
      ? nettoye
          .split('')
          .map((c) => c + c)
          .join('')
      : nettoye;

  if (!/^[0-9a-fA-F]{6}$/.test(complet)) {
    throw new Error(`Couleur illisible : « ${hex} ». Attendu : #RGB ou #RRGGBB.`);
  }

  return {
    r: Number.parseInt(complet.slice(0, 2), 16),
    g: Number.parseInt(complet.slice(2, 4), 16),
    b: Number.parseInt(complet.slice(4, 6), 16),
  };
}

/**
 * Luminance relative d'une couleur, entre 0 (noir) et 1 (blanc).
 *
 * Les composantes sont d'abord normalisées puis passes par la courbe
 * sRGB, comme l'exige la spécification : une moyenne naïve donnerait des
 * résultats faux et, en l'occurrence, trop optimistes.
 */
export function luminanceRelative(hex: CouleurHex): number {
  const { r, g, b } = versRgb(hex);
  const canal = (valeur: number): number => {
    const c = valeur / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

/** Rapport de contraste entre deux couleurs, de 1 à 21. */
export function rapportContraste(fond: CouleurHex, texte: CouleurHex): number {
  const a = luminanceRelative(fond);
  const b = luminanceRelative(texte);
  const clair = Math.max(a, b);
  const sombre = Math.min(a, b);
  return (clair + 0.05) / (sombre + 0.05);
}

/** Seuils WCAG 2.1 niveau AA. */
export const SEUILS_AA = {
  /** Texte courant : 4,5:1. */
  texte: 4.5,
  /** Grand texte (≥ 24 px, ou ≥ 18,66 px en gras) : 3:1. */
  grandTexte: 3,
  /** Composants d'interface et texte non textuel : 3:1. */
  interface: 3,
} as const;

/** Arrondi à deux décimales, pour un affichage lisible. */
export function contrasteArrondi(fond: CouleurHex, texte: CouleurHex): number {
  return Math.round(rapportContraste(fond, texte) * 100) / 100;
}