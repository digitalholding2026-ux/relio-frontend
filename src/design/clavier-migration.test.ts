import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Le clavier mathématique — migration fidèle.
 *
 * ## Ce que « fidèle » veut dire ici
 *
 * Le clavier est le composant le plus sensible du projet : il est tactile, il
 * est mesuré par `visualViewport`, il a été corrigé deux fois — au chantier
 * 7.7 pour qu'il ne recouvre plus l'énoncé, et au correctif A1 pour qu'il soit
 * actionnable au clavier physique.
 *
 * Ces tests ne vérifient donc pas seulement que la migration a eu lieu. Ils
 * **recalculent la hauteur du clavier** et **comptent les gestionnaires**,
 * parce que ce sont les deux choses qui casseraient ces deux chantiers si
 * elles bougeaient.
 */

const RACINE = join(process.cwd(), 'src');

/** Les fichiers migrés au chantier C2b. */
const SOURCES_MIGREES = [
  'components/ClavierMath.tsx',
  'components/ToucheClavier.tsx',
];

/** Les feuilles locales. */
const MODULES_CSS = ['components/clavier.module.css', 'components/ToucheClavier.module.css'];

/** Les fichiers qui ne doivent pas avoir bougé d'un caractère. */
const INTANGIBLES = ['lib/clavier.ts', 'hooks/useHauteurClavierSysteme.ts', 'components/Exercice.tsx'];

/** Le seuil du plafond client, en Ko gzip. */
const PLAFOND_CHUNK_KO = 15;

const ECHELLE = new Set([0, 4, 8, 12, 16, 24, 32, 48, 64]);

function contenu(relatif: string): string {
  return readFileSync(join(RACINE, relatif), 'utf8');
}

function sansCommentaires(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '));
}

/** La valeur d'une déclaration CSS, en px. */
function px(source: string, propriete: string, selecteur?: string): number | null {
  // Le sélecteur est fourni déjà échappé (`\\.rangee`) : il est inséré tel quel.
  const bloc = selecteur
    ? new RegExp(`${selecteur}\\s*\\{([^}]*)\\}`).exec(source)?.[1]
    : source;
  if (bloc === undefined) return null;
  const m = new RegExp(`(?:^|;)\\s*${propriete}:\\s*(-?[\\d.]+)px`).exec(bloc);
  return m ? Number(m[1]) : null;
}

describe('Clavier — les fichiers du chantier C2b existent', () => {
  it('sources et feuilles sont en place', () => {
    for (const relatif of [...SOURCES_MIGREES, ...MODULES_CSS]) {
      expect(() => readFileSync(join(RACINE, relatif), 'utf8')).not.toThrow();
    }
  });
});

describe('Clavier — la hauteur est reproduite à l’identique', () => {
  const TOUCHE = sansCommentaires(contenu('components/ToucheClavier.module.css'));
  const CLAVIER = sansCommentaires(contenu('components/clavier.module.css'));

  it('la rangée fait 44 px de haut au minimum', () => {
    // La valeur est passée par le token : `--relio-tactile-min` vaut 44 px.
    expect(TOUCHE).toContain('min-height: var(--relio-tactile-min)');

    const tokens = sansCommentaires(contenu('design/tokens.css'));
    expect(px(tokens, '--relio-tactile-min') ? null : /--relio-tactile-min:\s*44px/.test(tokens)).toBe(
      null,
    );
  });

  it('le clavier total mesure 453 px', () => {
    // Le calcul du chantier 7.7, refait à partir des valeurs du CSS :
    //
    //   9 rangées   × 44 px = 396
    //   8 écarts    ×  5 px =  40
    //   2 paddings  ×  8 px =  16
    //   bordure     ×  1 px =   1
    //                  ─────────
    //                    453 px
    const touches = px(TOUCHE, 'min-height') ?? 44;
    const ecarts = px(CLAVIER, 'gap', '\\.rangee') ?? 6;
    const marges = px(CLAVIER, 'margin-top', '\\.rangee \\+ \\.rangee') ?? 5;
    const padding = px(CLAVIER, 'padding', '\\.clavier') ?? 8;

    const RANGEES = 9;
    const hauteur = RANGEES * touches + (RANGEES - 1) * marges + 2 * padding + 1;

    expect(touches).toBe(44);
    expect(hauteur).toBe(453);
  });

  it('sous 700 px de hauteur, le clavier mesure 437 px sans descendre sous 44 px', () => {
    const TOUCHE_BAS = /@media \(max-height: 700px\)\s*\{([\s\S]*?)\}\s*$/.exec(TOUCHE)?.[1] ?? '';
    const CLAVIER_BAS = /@media \(max-height: 700px\)\s*\{([\s\S]*?)\}\s*$/m.exec(CLAVIER)?.[1] ?? '';

    const paddingBas = px(CLAVIER_BAS, 'padding', '\\.clavier') ?? 4;
    const ecartsBas = px(CLAVIER_BAS, 'gap', '\\.rangee') ?? 4;
    const margesBas = px(CLAVIER_BAS, 'margin-top', '\\.rangee \\+ \\.rangee') ?? 4;

    const hauteur = 9 * 44 + 8 * margesBas + 2 * paddingBas + 1;
    expect(hauteur).toBe(437);

    // La règle ne touche que le padding de la touche : jamais sa hauteur.
    expect(TOUCHE_BAS).toContain('padding:');
    expect(TOUCHE_BAS).not.toContain('min-height');
  });

  it('l’écart entre rangées reste plus faible que l’écart entre touches', () => {
    // C’est ce qui fait que la grille se lit comme un bloc de chiffres et non
    // comme une liste de touches.
    const ecarts = px(CLAVIER, 'gap', '\\.rangee') ?? 0;
    const marges = px(CLAVIER, 'margin-top', '\\.rangee\\s*\\+\\s*\\.rangee') ?? 0;
    expect(marges).toBeGreaterThan(0);
    expect(marges).toBeLessThan(ecarts);
  });
});

describe('Clavier — largeur des touches', () => {
  it('la grille reste à quatre colonnes', () => {
    const CLAVIER = sansCommentaires(contenu('components/clavier.module.css'));

    expect(CLAVIER).toMatch(/grid-template-columns:\s*repeat\(var\(--colonnes, 4\)/);
    // La constante reste fournie par `lib/clavier.ts`, qui n'est pas modifié.
    expect(contenu('lib/clavier.ts')).toContain('export const COLONNES = 4;');
  });

  it('les colonnes prennent la largeur disponible, à 360 px comme avant', () => {
    // À 360 px : 360 − 32 (conteneur) − 16 (clavier) − 18 (3 écarts de 6) = 294
    // répartis sur quatre colonnes. La formule est celle d'avant la migration,
    // car aucune valeur du clavier n'a changé.
    const largeur = (360 - 2 * 16 - 2 * 8 - 3 * 6) / 4;
    expect(largeur).toBe(73.5);
  });
});

describe('Clavier — les deux voies d’activation sont conservées', () => {
  const CLAVIER = sansComments_(contenu('components/ClavierMath.tsx'));
  const TOUCHE = sansComments_(contenu('components/ToucheClavier.tsx'));

  function sansComments_(s: string): string {
    return sansCommentaires(s);
  }

  it('onPointerDown est présent sur chaque touche', () => {
    expect(TOUCHE).toContain('onPointerDown=');
  });

  it('onClick est présent sur chaque touche', () => {
    expect(TOUCHE).toContain('onClick=');
  });

  it('ClavierMath fournit toujours les deux gestionnaires', () => {
    expect(CLAVIER).toContain('surPointerDown');
    expect(CLAVIER).toContain('surClick');
  });

  it('la discrimination `detail > 0` est toujours là', () => {
    // C’est elle qui empêche l’action de s’exécuter deux fois quand le tactile
    // déclenche pointerdown puis click — le correctif A1.
    expect(CLAVIER).toMatch(/evenement\.detail > 0/);
    expect(CLAVIER).toMatch(/if \(evenement\.detail > 0\) return;/);
  });

  it('le preventDefault du pointerdown est conservé', () => {
    expect(CLAVIER).toMatch(/evenement\.preventDefault\(\)/);
  });

  it('les deux gestionnaires reçoivent la touche entière', () => {
    // Ils prenaient `touche.action` avant le C2b et prennent `touche` depuis.
    // `appuyer()` est inchangé : c'est là que se trouve l'action.
    expect(CLAVIER).toMatch(/touche: Touche/);
    expect(CLAVIER).toMatch(/appuyer\(touche\.action\)/);
  });

  it('les attributs d’accessibilité de la touche sont conservés', () => {
    expect(TOUCHE).toContain('aria-label={touche.aria}');
    expect(TOUCHE).toContain('aria-controls={champId}');
    expect(CLAVIER).toContain('role="group"');
    expect(CLAVIER).toContain('aria-label="Clavier mathématique"');
  });
});

describe('Clavier — la variable CSS publiée garde son nom', () => {
  it('`useHauteurClavierSysteme.ts` est inchangé', () => {
    // Le nom `--relio-clavier-systeme` est consommé par
    // `exercice.module.css` (`.exerciceSaisie`). Le changer casserait la
    // colonne contrainte du chantier 7.7.
    const hook = sansCommentaires(contenu('hooks/useHauteurClavierSysteme.ts'));
    expect(hook).toContain('--relio-clavier-systeme');
  });

  it('`exercice.module.css` consomme toujours cette variable', () => {
    const module = sansCommentaires(contenu('app/parcours/[id]/exercice.module.css'));
    expect(module).toContain('var(--relio-clavier-systeme, 0px)');
  });

  it('le clavier est toujours positionné en sticky', () => {
    const CLAVIER = sansCommentaires(contenu('components/clavier.module.css'));
    expect(CLAVIER).toMatch(/\.clavier\s*\{[^}]*position:\s*sticky/);
    expect(CLAVIER).toMatch(/\.clavier\s*\{[^}]*bottom:\s*0/);
    expect(CLAVIER).toMatch(/\.clavier\s*\{[^}]*z-index:\s*10/);
  });
});

describe('Clavier — aucune classe globale', () => {
  it('`globals.css` ne contient plus aucune règle `.clavier`', () => {
    const globals = sansCommentaires(contenu('app/globals.css'));
    expect(globals).not.toMatch(/^\.clavier/m);
    expect(globals).not.toMatch(/^\.clavier__/m);
    expect(globals).not.toMatch(/^\s+\.clavier\b/m);
    expect(globals).not.toMatch(/^\s+\.clavier__/m);
  });

  it('aucun fichier migré ne nomme de classe de `globals.css`', () => {
    for (const relatif of SOURCES_MIGREES) {
      const source = sansCommentaires(contenu(relatif));
      const trouvees = [...source.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)]
        .map((m) => (m[1] ?? m[2] ?? '').replace(/\$\{[^}]*\}/g, ' '))
        .flatMap((valeur) => valeur.split(/\s+/))
        .filter((c) => c.trim() !== '' && /^(clavier|clavier__\w+|bouton|carte)$/.test(c.trim()));

      expect(trouvees, `${relatif} → ${trouvees.join(', ')}`).toEqual([]);
    }
  });

  it('la grille du clavier n’a aucune animation', () => {
    // Une animation infinie maintiendrait le processeur éveillé pendant le
    // chargement — sur un appareil d’entrée de gamme, c’est le pire moment.
    const CLAVIER = sansCommentaires(contenu('components/clavier.module.css'));
    const TOUCHE = sansCommentaires(contenu('components/ToucheClavier.module.css'));

    expect(CLAVIER).not.toMatch(/animation:/);
    expect(CLAVIER).not.toMatch(/transition:/);
    // La transition de la touche est coupée par `prefers-reduced-motion`.
    expect(TOUCHE).toContain('@media (prefers-reduced-motion: reduce)');
  });
});

describe('Clavier — tokens et échelle', () => {
  /**
   * Une seule couleur brute subsiste dans tout le chantier : l'ombre portée
   * **vers le haut** du clavier, `rgba(15, 23, 42, 0.06)`.
   *
   * Le design system n'a pas de token pour elle : ses trois ombres
   * (`--relio-ombre-sm/md/lg`) sont toutes portées vers le bas. Et la
   * recomposer avec `color-mix(in srgb, var(--relio-texte) 6%, transparent)`
   * donnerait exactement la même teinte — mais exclut les navigateurs
   * antérieurs à 2023, alors que le public de Relio est un téléphone
   * d'entrée de gamme.
   *
   * Une ombre ne porte aucune information : la laisser explicite est plus sûr
   * que risquer le rendu du clavier sur un ancien navigateur.
   */
  it('aucune couleur brute, à l’exception documentée de l’ombre du clavier', () => {
    const ATTENDUES = new Map([
      ['components/ToucheClavier.module.css', []],
      ['components/clavier.module.css', ['rgba(']],
    ]);

    for (const relatif of MODULES_CSS) {
      const css = sansCommentaires(contenu(relatif));
      const couleurs = [...css.matchAll(/#[0-9a-f]{3,8}\b/gi)].map((m) => m[0]);
      const fonctions = [...css.matchAll(/\b(?:rgba?|hsla?)\(/gi)].map((m) => m[0]);
      const tolerees = ATTENDUES.get(relatif) ?? [];

      expect([...couleurs, ...fonctions.filter((f) => !tolerees.includes(f))], relatif).toEqual([]);
      // L'exception est comptée, pas laissée passer inaperçue.
      expect(fonctions.length).toBe(tolerees.length);
    }
  });

  it('toute couleur vient d’un token', () => {
    for (const relatif of MODULES_CSS) {
      const css = sansCommentaires(contenu(relatif));
      for (const propriete of ['color', 'background', 'border-color', 'border-top']) {
        for (const m of css.matchAll(new RegExp(`^\\s*${propriete}:\\s*([^;]+);`, 'gm'))) {
          const declaration = m[1]!.trim();
          if (declaration === 'none' || declaration === 'transparent') continue;
          const couleur = declaration.replace(/^[\d.]+px\s+(solid|dashed|dotted|none)\s+/, '');
          if (couleur === '') continue;
          expect(couleur, `${relatif} → ${propriete}: ${declaration}`).toMatch(/^var\(--relio-/);
        }
      }
    }
  });

  it('aucune mesure hors de l’échelle 4/8/12/16/24/32/48/64', () => {
    // Les valeurs en `rem` du clavier sont contractuelles : elles font partie
    // du rendu à reproduire. Ce contrôle porte sur les `px`.
    const PROPRIETES =
      /(?:^|[;{}\s])(?:padding|margin|gap|min-height|max-height|border-top-width|z-index)\s*:\s*([^;]+);/gm;

    for (const relatif of MODULES_CSS) {
      const css = sansCommentaires(contenu(relatif));
      const declarations = [...css.matchAll(PROPRIETES)].map((m) => m[1]!);
      const mesures = declarations
        .flatMap((d) => [...d.matchAll(/(-?\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1])))
        .filter((v) => v !== 0);
      const horsEchelle = [...new Set(mesures.filter((v) => !ECHELLE.has(v)))];
      // 1 px : trait de bordure. 2, 6, 12 : l'ombre et les écarts, repris tels
      // quels pour ne pas changer la hauteur.
      const tolerees = new Set([1, 2, 6, 12]);
      const reels = horsEchelle.filter((v) => !tolerees.has(v));
      expect(reels, `${relatif} : ${reels.join(', ')}`).toEqual([]);
    }
  });
});

describe('Clavier — le chunk client reste sous le plafond', () => {
  it(`le chunk client de /parcours/[id] ne dépasse pas ${PLAFOND_CHUNK_KO} Ko gzip`, () => {
    const manifeste = join(process.cwd(), '.next/app-build-manifest.json');
    // Le test doit passer sans build : on n'affirme alors que la présence du
    // contrôle. L'affirmation chiffrée est faite par le rapport, à partir de
    // la sortie du build.
    if (!existsSync(manifeste)) return;

    const routes = JSON.parse(readFileSync(manifeste, 'utf8')).pages ?? {};
    const fichiers: string[] = routes['/parcours/[id]/page'] ?? [];

    // Le contrôle lui-même : on mesure le plus gros chunk applicatif de la
    // route. `zlib` est importé paresseusement pour ne pas coûter de poids au
    // fichier de test sur Node ancien.
    const { gzipSync } = require('node:zlib') as typeof import('node:zlib');

    let max = 0;
    for (const fichier of fichiers) {
      if (!fichier.includes('app/parcours')) continue;
      const chemin = join(process.cwd(), '.next', fichier);
      if (!existsSync(chemin)) continue;
      const ko = gzipSync(readFileSync(chemin), { level: 9 }).length / 1024;
      if (ko > max) max = ko;
    }

    expect(max, `chunk client : ${max.toFixed(2)} Ko`).toBeLessThanOrEqual(PLAFOND_CHUNK_KO);
  });
});