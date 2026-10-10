/**
 * Design tokens Relio — source de vérité unique.
 *
 * ## Deux représentations, une seule vérité
 *
 * Les tokens existent en **TypeScript** (`tokens.ts`) et en **variables CSS**
 * (`tokens.css`). Le CSS est consommé par la feuille de style, le TypeScript
 * par les composants qui doivent calculer une couleur en JavaScript — une
 * barre de progression, un anneau, une pastille.
 *
 * Les deux ne peuvent pas diverger : `tokens.test.ts` relit `tokens.css` et
 * compare chaque valeur à celle déclarée ici. Une dérive fait échouer les
 * tests, elle ne peut pas atteindre la production.
 *
 * ## Accessibilité : ce que la palette imposée ne permettait pas
 *
 * Les couleurs de marque sont reprises **telles quelles**. Mais trois
 * combinaisons ne passent pas le niveau AA, et ont donc donné naissance à des
 * variantes documentées :
 *
 * | Usage naïve | Ratio constaté | Décision |
 * |---|---|---|
 * | texte blanc sur orange `#F97316` | 2,62:1 | **interdit** — l'orange porte toujours de l'encre `#0F172A` (6,37:1) |
 * | texte blanc sur vert `#16A34A` | 3,08:1 | **interdit** — le vert porte de l'encre (5,42:1) |
 * | texte secondaire `#64748B` sur fond sable | 4,45:1 | slightly under AA → `--relio-muted-strong` (4,52:1) pour tout texte courant |
 *
 * ## Deux catégories de bordure, et pourquoi
 *
 * Une bordure décorative — celle d'une carte — n'a pas à être contrastée : elle
 * ne porte aucune information. Une bordure de **champ de formulaire**, elle,
 * délimite le contrôle qui reçoit la saisie : si on ne la voit pas, l'élève ne sait
 * pas où écrire. Elle doit donc atteindre 3:1 sur **tous** les fonds sur
 * lesquels un champ peut se poser.
 *
 * D'où deux tokens : `--relio-bordure` pour la décoration, `--relio-bordure-forte`
 * pour tout ce qui doit être identifié.
 *
 * Le rouge `#DC2626` est le seul accent qui tolère le texte blanc (4,83:1).
 * La règle qui en découle est simple et vérifiable : **un fond coloré porte
 * toujours de l'encre, sauf le rouge et l'indigo**.
 */

/** Rôles de couleur, déclinés par mode. */
export interface PaletteMode {
  readonly fond: string;
  readonly surface: string;
  readonly surfaceHaute: string;
  readonly texte: string;
  readonly texteSecondaire: string;
  readonly bordure: string;
  readonly bordureForte: string;
  readonly primaire: string;
  readonly primaireSur: string;
  readonly accent: string;
  readonly accentSur: string;
  readonly succes: string;
  readonly succesSur: string;
  readonly succesDoux: string;
  readonly alerte: string;
  readonly alerteSur: string;
  readonly alerteDoux: string;
  readonly accentDoux: string;
  readonly focus: string;
  readonly primaireDoux: string;
}

/**
 * Palette du mode clair.
 *
 * `primaire` est l'indigo de marque, volontairement sombre : sur un téléphone
 * held in daylight, un fond clair et un texte sombre sont plus comfyables
 * qu'un fond blanc.
 */
export const PALETTE_CLAIRE: PaletteMode = {
  fond: '#FAF7F2',
  surface: '#FFFFFF',
  surfaceHaute: '#F4F1EC',
  texte: '#0F172A',
  texteSecondaire: '#63738a',
  bordure: '#E2E8F0',
  bordureForte: '#838a96',
  primaire: '#1E2A78',
  primaireSur: '#FFFFFF',
  accent: '#F97316',
  accentSur: '#0F172A',
  succes: '#16A34A',
  succesSur: '#0F172A',
  succesDoux: '#DCFCE7',
  alerte: '#DC2626',
  alerteSur: '#FFFFFF',
  alerteDoux: '#FBE5E5',
  accentDoux: '#FED7AA',
  focus: '#1E2A78',
  primaireDoux: '#EDEEF4',
};

/**
 * Palette du mode sombre.
 *
 * L'indigo de marque (#1E2A78) sur un fond #0B1020 donnerait un bouton presque
 * invisible : il est légèrement éclairci — même teinte, même famille — pour
 * rester une action lisible.
 */
export const PALETTE_SOMBRE: PaletteMode = {
  fond: '#0B1020',
  surface: '#151B33',
  surfaceHaute: '#1E2647',
  texte: '#F1F5F9',
  texteSecondaire: '#94A3B8',
  bordure: '#6A7290',
  bordureForte: '#9BA3BC',
  primaire: '#2A3A96',
  primaireSur: '#FFFFFF',
  accent: '#F97316',
  accentSur: '#0F172A',
  succes: '#16A34A',
  succesSur: '#0F172A',
  succesDoux: '#12301F',
  alerte: '#F87171',
  alerteSur: '#0F172A',
  alerteDoux: '#411D30',
  accentDoux: '#3A2410',
  focus: '#8B93AE',
  primaireDoux: '#232A4D',
};

/**
 * Couleurs de marque, hors mode.
 *
 * Elles sont exposées séparément parce que la page `/design-system` doit les
 * montrer telles quelles, y compris celles qui ont donné naissance à une
 * variante accessible.
 */
export const COULEURS_MARQUE = {
  indigo: '#1E2A78',
  indigoDark: '#131B52',
  orange: '#F97316',
  orangeSoft: '#FED7AA',
  green: '#16A34A',
  greenSoft: '#DCFCE7',
  red: '#DC2626',
  sand: '#FAF7F2',
  ink: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
  /** Variante accessible du texte secondaire, à 4,52:1 sur le fond sable. */
  mutedStrong: '#63738a',
} as const;

/**
 * Échelle d'espacement, en pixels.
 *
 * Base 4 px. Aucun composant n'utilise une valeur hors de cette échelle : une
 * valeur absente est un bug de conception, pas un détail.
 */
export const ESPACEMENTS = {
  '0': 0,
  '1': 4,
  '2': 8,
  '3': 12,
  '4': 16,
  '6': 24,
  '8': 32,
  '12': 48,
  '16': 64,
} as const;

/** Échelle typographique, en pixels. */
export const TAILLES_TEXTE = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
} as const;

/** Graisses. */
export const GRAISSES = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

/**
 * Interlignages.
 *
 * 1,5 pour le corps — la valeur qui reste lisible sur un écran de 360 px sans
 *devenir fatigante — et 1,2 pour les titres, qui doivent tenir en peu de lignes.
 */
export const INTERLIGNAGES = {
  corps: 1.5,
  titre: 1.2,
} as const;

/**
 * Famille de caractères.
 *
 * Police système uniquement : aucune police externe n'est téléchargée. Sur un
 * réseau 3G lent, une police de 200 Ko est un luxe que l'application ne peut
 * pas se permettre, et le rendu système est natif sur chaque appareil.
 */
export const POLICE = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/** Rayons d'arrondi, en pixels. `full` produit un cercle. */
export const RAYONS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

/**
 * Trois niveaux d'ombre, et trois seulement.
 *
 * Une ombre par densité d'information donne une hiérarchie lisible ; cinq
 * niveaux donnent du flou. Sur mode économie de données, les trois sont
 * remplacées par une bordure : une ombre coûte des octets et du GPU pour
 * information identique.
 */
export const OMBRES = {
  sm: '0 1px 2px rgba(15, 23, 42, 0.06)',
  md: '0 2px 6px rgba(15, 23, 42, 0.08)',
  lg: '0 8px 24px rgba(15, 23, 42, 0.1)',
} as const;

/** Durées d'animation, en millisecondes. */
export const DUREES = {
  micro: 150,
  standard: 250,
  ecran: 400,
} as const;

/**
 * Taille tactile minimale, en pixels.
 *
 * 44 px est le plancher retenu par les recommandations d'accessibilité mobile.
 * C'est une constante, pas une préférence : un contrôle plus petit échoue aux
 * critères d'acceptation.
 */
export const TAILLE_TACTILE_MIN = 44;

/**
 * Hauteur minimale d'un champ de saisie.
 *
 * Au-dessus du plancher tactile de 44 px : le gabarit système sur Android est
 * plus haut qu'un texte dessiné, et un champ se vise au doigt en visant large.
 */
export const TAILLE_CHAMP_MIN = 48;

/** Points de rupture, en pixels. */
export const RUPTURES = {
  /** Petit Android : la largeur de référence du produit. */
  sm: 360,
  /** Grand téléphone courant. */
  md: 420,
  /** Tablette. */
  lg: 768,
} as const;

/** Tous les tokens, utile aux tests et à la page de démonstration. */
export const TOKENS = {
  palette: { clair: PALETTE_CLAIRE, sombre: PALETTE_SOMBRE },
  couleurs: COULEURS_MARQUE,
  espacements: ESPACEMENTS,
  tailles: TAILLES_TEXTE,
  graisses: GRAISSES,
  interlignages: INTERLIGNAGES,
  police: POLICE,
  rayons: RAYONS,
  ombres: OMBRES,
  durees: DUREES,
  tactile: TAILLE_TACTILE_MIN,
  ruptures: RUPTURES,
} as const;

/** Les mêmes tokens, aplatis en paires `nom de variable CSS` → valeur. */
export function variablesCss(mode: PaletteMode): Record<string, string> {
  return {
    '--relio-fond': mode.fond,
    '--relio-surface': mode.surface,
    '--relio-surface-haute': mode.surfaceHaute,
    '--relio-texte': mode.texte,
    '--relio-texte-secondaire': mode.texteSecondaire,
    '--relio-bordure': mode.bordure,
    '--relio-bordure-forte': mode.bordureForte,
    '--relio-primaire': mode.primaire,
    '--relio-primaire-sur': mode.primaireSur,
    '--relio-accent': mode.accent,
    '--relio-accent-sur': mode.accentSur,
    '--relio-succes': mode.succes,
    '--relio-succes-sur': mode.succesSur,
    '--relio-succes-doux': mode.succesDoux,
    '--relio-alerte': mode.alerte,
    '--relio-alerte-sur': mode.alerteSur,
    '--relio-alerte-doux': mode.alerteDoux,
    '--relio-accent-doux': mode.accentDoux,
    '--relio-focus': mode.focus,
    '--relio-primaire-doux': mode.primaireDoux,
  };
}