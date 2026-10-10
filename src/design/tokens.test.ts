/**
 * Design tokens — invariants non négociables du produit.
 *
 * Ces tests ne vérifient pas des valeurs figées, mais des **propriétés**. Une
 * modification de palette passe le tests tant qu'elle respecte l'accessibilité ;
 * elle échoue dès qu'elle la casse. C'est le seul moyen d'empêcher qu'une
 * retouche graphique dégrade la lisibilité sans que personne ne s'en aperçoive.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  contrasteArrondi,
  rapportContraste,
  SEUILS_AA,
  versRgb,
} from './contraste.js';
import {
  COULEURS_MARQUE,
  DUREES,
  ESPACEMENTS,
  GRAISSES,
  INTERLIGNAGES,
  PALETTE_CLAIRE,
  PALETTE_SOMBRE,
  POLICE,
  RAYONS,
  TAILLE_TACTILE_MIN,
  TAILLES_TEXTE,
  TOKENS,
} from './tokens.js';

const CSS = readFileSync(join(__dirname, 'tokens.css'), 'utf8');

/** Valeur déclarée d'une variable CSS dans le fichier de tokens. */
function valeurCss(nom: string): string | null {
  // On ne retient que la première déclaration : la règle `:root` est la
  // référence ; les modes sombre et économie redéfinissent plus loin.
  const motif = new RegExp(`${nom}\\s*:\\s*([^;]+);`);
  const trouve = motif.exec(CSS);
  return trouve?.[1]?.trim() ?? null;
}

describe('tokens — le calcul de contraste est correct', () => {
  it('sait lire les deux formats hexadécimaux', () => {
    expect(versRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(versRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('refuse une couleur illisible plutôt que de la deviner', () => {
    expect(() => versRgb('bleu')).toThrow(/illisible/i);
    expect(() => versRgb('#12345')).toThrow(/illisible/i);
  });

  it('reproduit les ratios de référence de la spécification WCAG', () => {
    // Valeurs fameuses du texte WCAG : noir/blanc = 21:1, et 4,54:1 pour le
    // bleu foncé sur blanc.
    expect(rapportContraste('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(rapportContraste('#0000FF', '#FFFFFF')).toBeCloseTo(8.59, 1);
  });
});

describe('tokens — la palette respecte le niveau AA', () => {
  /**
   * Chaque paire dont le sens de lecture compte dans l'interface.
   *
   * La liste est écrite à la main, et non déduite : une liste générée
   * automatiquement ne vérifierait que les paires qu'elle choisit, ce qui ne
   * prouverait rien. Toute nouvelle paire doit être ajoutée ici.
   */
  const PAIRES_TEXTE: Array<{ nom: string; fond: string; texte: string; seuil: number }> = [
    { nom: 'texte courant sur fond', fond: PALETTE_CLAIRE.fond, texte: PALETTE_CLAIRE.texte, seuil: SEUILS_AA.texte },
    { nom: 'texte sur surface', fond: PALETTE_CLAIRE.surface, texte: PALETTE_CLAIRE.texte, seuil: SEUILS_AA.texte },
    { nom: 'texte secondaire', fond: PALETTE_CLAIRE.fond, texte: PALETTE_CLAIRE.texteSecondaire, seuil: SEUILS_AA.texte },
    { nom: 'texte secondaire sur surface', fond: PALETTE_CLAIRE.surface, texte: PALETTE_CLAIRE.texteSecondaire, seuil: SEUILS_AA.texte },
    { nom: 'primaire (bouton)', fond: PALETTE_CLAIRE.primaire, texte: PALETTE_CLAIRE.primaireSur, seuil: SEUILS_AA.texte },
    { nom: 'accent (bouton)', fond: PALETTE_CLAIRE.accent, texte: PALETTE_CLAIRE.accentSur, seuil: SEUILS_AA.texte },
    { nom: 'succes (pastille)', fond: PALETTE_CLAIRE.succes, texte: PALETTE_CLAIRE.succesSur, seuil: SEUILS_AA.texte },
    { nom: 'alerte (bouton)', fond: PALETTE_CLAIRE.alerte, texte: PALETTE_CLAIRE.alerteSur, seuil: SEUILS_AA.texte },
    { nom: 'encre sur accent doux', fond: PALETTE_CLAIRE.accentDoux, texte: PALETTE_CLAIRE.texte, seuil: SEUILS_AA.texte },
    { nom: 'encre sur succes doux', fond: PALETTE_CLAIRE.succesDoux, texte: PALETTE_CLAIRE.texte, seuil: SEUILS_AA.texte },
    { nom: 'encre sur primaire doux', fond: PALETTE_CLAIRE.primaireDoux, texte: PALETTE_CLAIRE.texte, seuil: SEUILS_AA.texte },
    { nom: 'encre sur fond d’alerte', fond: PALETTE_CLAIRE.alerteDoux, texte: PALETTE_CLAIRE.texte, seuil: SEUILS_AA.texte },
    { nom: 'sombre — encre sur fond d’alerte', fond: PALETTE_SOMBRE.alerteDoux, texte: PALETTE_SOMBRE.texte, seuil: SEUILS_AA.texte },

    { nom: 'sombre — texte sur fond', fond: PALETTE_SOMBRE.fond, texte: PALETTE_SOMBRE.texte, seuil: SEUILS_AA.texte },
    { nom: 'sombre — texte sur surface', fond: PALETTE_SOMBRE.surface, texte: PALETTE_SOMBRE.texte, seuil: SEUILS_AA.texte },
    { nom: 'sombre — texte secondaire', fond: PALETTE_SOMBRE.surface, texte: PALETTE_SOMBRE.texteSecondaire, seuil: SEUILS_AA.texte },
    { nom: 'sombre — primaire', fond: PALETTE_SOMBRE.primaire, texte: PALETTE_SOMBRE.primaireSur, seuil: SEUILS_AA.texte },
    { nom: 'sombre — accent', fond: PALETTE_SOMBRE.accent, texte: PALETTE_SOMBRE.accentSur, seuil: SEUILS_AA.texte },
    { nom: 'sombre — succes', fond: PALETTE_SOMBRE.succes, texte: PALETTE_SOMBRE.succesSur, seuil: SEUILS_AA.texte },
    { nom: 'sombre — alerte', fond: PALETTE_SOMBRE.alerte, texte: PALETTE_SOMBRE.alerteSur, seuil: SEUILS_AA.texte },
    { nom: 'sombre — encre sur accent doux', fond: PALETTE_SOMBRE.accentDoux, texte: PALETTE_SOMBRE.texte, seuil: SEUILS_AA.texte },
    { nom: 'sombre — encre sur primaire doux', fond: PALETTE_SOMBRE.primaireDoux, texte: PALETTE_SOMBRE.texte, seuil: SEUILS_AA.texte },
  ];

  for (const paire of PAIRES_TEXTE) {
    it(`${paire.nom} — ${contrasteArrondi(paire.fond, paire.texte)}:1, minimum ${paire.seuil}`, () => {
      expect(rapportContraste(paire.fond, paire.texte)).toBeGreaterThanOrEqual(paire.seuil);
    });
  }

  it('atteint 3:1 pour les bordures de formulaire, sur tous les fonds', () => {
    // Un champ de saisie peut se poser sur le fond, la surface ou la surface
    // haute : il faut être en mesure de le repérer dans les trois cas.
    for (const [nom, mode] of [['clair', PALETTE_CLAIRE], ['sombre', PALETTE_SOMBRE]] as const) {
      for (const [support, couleur] of [
        ['fond', mode.fond],
        ['surface', mode.surface],
        ['surface haute', mode.surfaceHaute],
      ] as const) {
        expect(
          rapportContraste(couleur, mode.bordureForte),
          `bordure de formulaire ${nom} sur ${support}`,
        ).toBeGreaterThanOrEqual(SEUILS_AA.interface);
      }
    }
  });

  it('rend l’anneau de focus visible sur fond comme sur surface', () => {
    for (const [nom, mode] of [['clair', PALETTE_CLAIRE], ['sombre', PALETTE_SOMBRE]] as const) {
      expect(rapportContraste(mode.fond, mode.focus), `focus ${nom} sur fond`).toBeGreaterThanOrEqual(
        SEUILS_AA.interface,
      );
      expect(rapportContraste(mode.surface, mode.focus), `focus ${nom} sur surface`).toBeGreaterThanOrEqual(
        SEUILS_AA.interface,
      );
    }
  });

  it('justifie les trois variantes accessibles de la palette de marque', () => {
    // Ces trois valeurs naissent d'un conflit mesuré. Si la marque change,
    // ces tests disent exactement ce qui reste vrai et ce qui ne l'est plus.
    expect(rapportContraste(COULEURS_MARQUE.sand, COULEURS_MARQUE.ink)).toBeGreaterThanOrEqual(7);
    expect(rapportContraste(COULEURS_MARQUE.sand, COULEURS_MARQUE.mutedStrong)).toBeGreaterThanOrEqual(
      SEUILS_AA.texte,
    );
    expect(rapportContraste(COULEURS_MARQUE.orange, COULEURS_MARQUE.ink)).toBeGreaterThanOrEqual(
      SEUILS_AA.texte,
    );
    expect(rapportContraste(COULEURS_MARQUE.green, COULEURS_MARQUE.ink)).toBeGreaterThanOrEqual(
      SEUILS_AA.texte,
    );
  });

  it('documente les deux combinaisons que la marque ne permet pas', () => {
    // Ce test ne peut pas échouer : il enregistre des mesures. Il sert de
    // garde-memory : si quelqu’un propose un jour « juste du texte blanc sur
    // l'orange », la raison écrite ici est déjà dans le dépôt.
    expect(rapportContraste(COULEURS_MARQUE.orange, '#FFFFFF')).toBeLessThan(SEUILS_AA.texte);
    expect(rapportContraste(COULEURS_MARQUE.green, '#FFFFFF')).toBeLessThan(SEUILS_AA.texte);
    expect(rapportContraste(COULEURS_MARQUE.sand, COULEURS_MARQUE.muted)).toBeLessThan(
      SEUILS_AA.texte,
    );
  });
});

describe('tokens — TypeScript et CSS ne peuvent pas diverger', () => {
  const ATTENDU: Array<[string, string]> = [
    ['--relio-fond', PALETTE_CLAIRE.fond],
    ['--relio-surface', PALETTE_CLAIRE.surface],
    ['--relio-surface-haute', PALETTE_CLAIRE.surfaceHaute],
    ['--relio-texte', PALETTE_CLAIRE.texte],
    ['--relio-texte-secondaire', PALETTE_CLAIRE.texteSecondaire],
    ['--relio-bordure', PALETTE_CLAIRE.bordure],
    ['--relio-bordure-forte', PALETTE_CLAIRE.bordureForte],
    ['--relio-primaire', PALETTE_CLAIRE.primaire],
    ['--relio-primaire-sur', PALETTE_CLAIRE.primaireSur],
    ['--relio-accent', PALETTE_CLAIRE.accent],
    ['--relio-accent-sur', PALETTE_CLAIRE.accentSur],
    ['--relio-succes', PALETTE_CLAIRE.succes],
    ['--relio-succes-sur', PALETTE_CLAIRE.succesSur],
    ['--relio-succes-doux', PALETTE_CLAIRE.succesDoux],
    ['--relio-alerte', PALETTE_CLAIRE.alerte],
    ['--relio-alerte-sur', PALETTE_CLAIRE.alerteSur],
    ['--relio-alerte-doux', PALETTE_CLAIRE.alerteDoux],
    ['--relio-accent-doux', PALETTE_CLAIRE.accentDoux],
    ['--relio-focus', PALETTE_CLAIRE.focus],
    ['--relio-primaire-doux', PALETTE_CLAIRE.primaireDoux],
    ['--relio-indigo', COULEURS_MARQUE.indigo],
    ['--relio-indigo-dark', COULEURS_MARQUE.indigoDark],
    ['--relio-orange', COULEURS_MARQUE.orange],
    ['--relio-orange-soft', COULEURS_MARQUE.orangeSoft],
    ['--relio-green', COULEURS_MARQUE.green],
    ['--relio-green-soft', COULEURS_MARQUE.greenSoft],
    ['--relio-red', COULEURS_MARQUE.red],
    ['--relio-sand', COULEURS_MARQUE.sand],
    ['--relio-ink', COULEURS_MARQUE.ink],
    ['--relio-muted', COULEURS_MARQUE.muted],
    ['--relio-border', COULEURS_MARQUE.border],
    ['--relio-tactile-min', `${TAILLE_TACTILE_MIN}px`],
  ];

  for (const [variable, valeur] of ATTENDU) {
    it(`${variable} vaut ${valeur} dans tokens.css`, () => {
      const declaree = valeurCss(variable);
      expect(declaree, `${variable} est absente de tokens.css`).not.toBeNull();
      expect(declaree?.toLowerCase()).toBe(valeur.toLowerCase());
    });
  }

  it('expose toute l’échelle d’espacement en CSS', () => {
    for (const [nom, valeur] of Object.entries(ESPACEMENTS)) {
      const declaree = valeurCss(`--relio-espace-${nom}`);
      expect(declaree, `--relio-espace-${nom} absente`).toBe(`${valeur}px`);
    }
  });

  it('expose toute l’échelle typographique en CSS', () => {
    for (const [nom, valeur] of Object.entries(TAILLES_TEXTE)) {
      expect(valeurCss(`--relio-taille-${nom}`)).toBe(`${valeur}px`);
    }
  });

  it('expose les rayons et les ombres en CSS', () => {
    for (const [nom, valeur] of Object.entries(RAYONS)) {
      expect(valeurCss(`--relio-rayon-${nom}`)).toBe(`${valeur}px`);
    }
    expect(valeurCss('--relio-ombre-sm')).toBe(TOKENS.ombres.sm);
    expect(valeurCss('--relio-ombre-md')).toBe(TOKENS.ombres.md);
    expect(valeurCss('--relio-ombre-lg')).toBe(TOKENS.ombres.lg);
  });

  it('expose les durées en CSS', () => {
    expect(valeurCss('--relio-duree-micro')).toBe(`${DUREES.micro}ms`);
    expect(valeurCss('--relio-duree-standard')).toBe(`${DUREES.standard}ms`);
    expect(valeurCss('--relio-duree-ecran')).toBe(`${DUREES.ecran}ms`);
  });
});

describe('tokens — échelles cohérentes', () => {
  it('part d’une base de 4 px', () => {
    for (const valeur of Object.values(ESPACEMENTS)) {
      expect(valeur % 4, `espace de ${valeur}px hors base 4`).toBe(0);
    }
  });

  it('fait croître les espacements', () => {
    const valeurs = Object.values(ESPACEMENTS);
    for (let i = 1; i < valeurs.length; i += 1) {
      expect(valeurs[i]!).toBeGreaterThan(valeurs[i - 1]!);
    }
  });

  it('fait croître les tailles de texte', () => {
    const valeurs = Object.values(TAILLES_TEXTE);
    for (let i = 1; i < valeurs.length; i += 1) {
      expect(valeurs[i]!).toBeGreaterThan(valeurs[i - 1]!);
    }
  });

  it('garantit 44 px de cible tactile', () => {
    expect(TAILLE_TACTILE_MIN).toBeGreaterThanOrEqual(44);
    expect(valeurCss('--relio-tactile-min')).toBe('44px');
  });

  it('n’utilise que des graisseurs de police réels', () => {
    for (const graisse of Object.values(GRAISSES)) {
      expect([400, 500, 600, 700]).toContain(graisse);
    }
  });

  it('garde un interligne de corps plus lisible que celui des titres', () => {
    expect(INTERLIGNAGES.corps).toBeGreaterThan(INTERLIGNAGES.titre);
  });

  it('ne charge aucune police externe', () => {
    // Une police distante coûte 100 à 300 Ko. Sur une connexion 3G, c'est
    // souvent le premier élément que l'élève attend.
    expect(POLICE).toContain('system-ui');
    expect(CSS).not.toMatch(/@import\s+url|fonts\.googleapis|@font-face/);
  });

  it('respecte la priorité aux trois durées annoncées', () => {
    expect(Object.values(DUREES)).toEqual([150, 250, 400]);
  });
});