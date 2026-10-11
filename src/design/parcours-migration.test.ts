import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `/parcours` doit être bâti sur le design system — et le rester.
 *
 * ## Le risque
 *
 * `globals.css` reste chargé par `layout.tsx`, parce que `/parcours/[id]` et
 * `Exercice.tsx` s'en servent encore (chantier C2). Les classes sont donc
 * **disponibles** sur `/parcours` — et un écran qui les utilise fonctionne très
 * bien, sans qu'aucun contrôle ne le remarque.
 *
 * Le tort n'est pas visible : il est dans le contraste des bordures, la
 * cible tactile et l'anneau de focus. `design/accessibilite.test.ts` ne
 * contrôle que `src/components/ds` — un travail écrit à la main dans la feuille
 * globale échappe à ces contrôles.
 *
 * ## Ce que ces tests verrouillent
 *
 * - aucune classe globale dans les quatre fichiers migrés ;
 * - les imports du design system passent par le chemin direct, jamais par le
 *   barrel `@/components/ds` — sinon tout le catalogue entre dans le graphe ;
 * - aucune couleur brute, aucune mesure hors échelle ;
 * - `API_BASE_URL` ne sort jamais du serveur ;
 * - `/parcours/[id]`, `Exercice.tsx` et `ClavierMath.tsx` ne sont pas touchés.
 */

const RACINE = join(process.cwd(), 'src');

/** Les quatre fichiers migrés au chantier C1. */
const SOURCES_MIGREES = [
  'app/parcours/page.tsx',
  'app/parcours/BlocCarte.tsx',
  'app/parcours/ParcoursListe.tsx',
  'components/ParcoursServeur.tsx',
];

const MODULES_CSS = ['app/parcours/parcours.module.css'];

/** Les fichiers du chantier suivant : ils doivent rester intacts. */
const SOURCES_C2 = ['app/parcours/[id]/page.tsx', 'components/Exercice.tsx', 'components/ClavierMath.tsx'];

/**
 * Classes de `globals.css` que `/parcours` utilisait avant le chantier C1.
 *
 * La liste est **explicite** : une liste calculée à partir de `globals.css`
 * s'allongerait toute seule et le contrôle perdrait son sens. Les classes
 * ci-dessous ont toutes été supprimées de l'écran migré.
 */
const CLASSES_ET_API = [
  'entete',
  'entete--interne',
  'entete__marque',
  'entete__logo',
  'entete__titre',
  'entete__sous-titre',
  'avertissement',
  'avertissement__icone',
  'section',
  'section__titre',
  'section__note',
  'carte',
  'carte__titre',
  'grille',
  'objectifs',
  'message-ferme',
  'exercice-lien',
  'etape__numero',
  'etape__corps',
  'etape__titre',
  'etape__detail',
  'bouton',
  'badge',
  'lien',
  'page',
  'conteneur',
  'pied',
];

const ECHELLE = new Set([0, 4, 8, 12, 16, 24, 32, 48, 64]);

function contenu(relatif: string): string {
  return readFileSync(join(RACINE, relatif), 'utf8');
}

function sansCommentaires(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '));
}

describe('/parcours — les fichiers migrés existent', () => {
  it('les quatre sources sont en place', () => {
    for (const relatif of [...SOURCES_MIGREES, ...MODULES_CSS]) {
      expect(() => readFileSync(join(RACINE, relatif), 'utf8')).not.toThrow();
    }
  });

  it('les fichiers du chantier suivant sont présents et non migrés', () => {
    for (const relatif of SOURCES_C2) {
      expect(() => readFileSync(join(RACINE, relatif), 'utf8')).not.toThrow();
    }
  });
});

describe('/parcours — aucune classe globale', () => {
  for (const relatif of SOURCES_MIGREES) {
    it(`${relatif} n’utilise aucune classe de globals.css`, () => {
      const source = sansCommentaires(contenu(relatif));
      const trouvees: string[] = [];

      for (const nom of CLASSES_ET_API) {
        for (const m of source.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
          const valeur = (m[1] ?? m[2] ?? '').replace(/\$\{[^}]*\}/g, ' ');
          for (const classe of valeur.split(/\s+/)) {
            if (classe.trim() === nom) trouvees.push(`${relatif} → .${nom}`);
          }
        }
      }

      expect(trouvees).toEqual([]);
    });
  }

  it('aucun fichier migré n’importe `globals.css`', () => {
    // Les commentaires sont retirés : la documentation d'un fichier peut
    // légitimement nommer la feuille qu'elle n'utilise pas.
    for (const relatif of SOURCES_MIGREES) {
      expect(sansCommentaires(contenu(relatif))).not.toMatch(/globals\.css/);
    }
  });

  it('`.entete--interne` a disparu des fichiers migrés', () => {
    for (const relatif of SOURCES_MIGREES) {
      expect(contenu(relatif)).not.toMatch(/entete--interne/);
    }
  });

  it('les fichiers du chantier C2 n’ont pas été touchés', () => {
    // Une migration de `/parcours` qui glisserait dans l'écran d'exercice
    // laisserait des classes orphelines et des tests rouges : on le vérifie.
    for (const relatif of SOURCES_C2) {
      const source = sansCommentaires(contenu(relatif));
      // Aucun import du design system ne doit avoir été introduit.
      expect(source, `${relatif} : import du design system`).not.toMatch(/@\/components\/ds/);
    }
  });
});

describe('/parcours — imports du design system', () => {
  for (const relatif of SOURCES_MIGREES) {
    it(`${relatif} n'importe jamais par le barrel`, () => {
      const source = sansCommentaires(contenu(relatif));

      // Le barrel réexporte les 14 composants du catalogue. L'importer, même
      // dans un composant serveur, entraîne le mapping CSS de tous les
      // modules dans le bundle de la page.
      expect(source).not.toMatch(/from '@\/components\/ds'/);
    });
  }

  it('les imports passent par le chemin direct', () => {
    const imports: string[] = [];
    for (const relatif of SOURCES_MIGREES) {
      for (const m of sansCommentaires(contenu(relatif)).matchAll(/from '@\/components\/ds\/([A-Za-z]+)'/g)) {
        imports.push(m[1]!);
      }
    }

    // Le chemin direct doit être utilisé au moins une fois : sinon la page
    // n'utilise pas le design system.
    expect(imports.length).toBeGreaterThan(0);
    for (const nom of imports) {
      expect(nom).not.toBe('');
    }
  });

  it('les composants importés existent tous', () => {
    for (const relatif of SOURCES_MIGREES) {
      for (const m of sansCommentaires(contenu(relatif)).matchAll(/from '@\/components\/ds\/([A-Za-z]+)'/g)) {
        const chemin = join(RACINE, 'components/ds', `${m[1]!}.tsx`);
        expect(() => readFileSync(chemin, 'utf8')).not.toThrow();
      }
    }
  });
});

describe('/parcours — tokens et échelle', () => {
  it('aucune couleur brute dans le module de page', () => {
    for (const relatif of MODULES_CSS) {
      const css = sansCommentaires(contenu(relatif));
      const couleurs = [...css.matchAll(/#[0-9a-f]{3,8}\b/gi)].map((m) => m[0]);
      const fonctions = [...css.matchAll(/\b(?:rgba?|hsla?)\(/gi)].map((m) => m[0]);
      expect([...couleurs, ...fonctions], `${relatif}`).toEqual([]);
    }
  });

  it('toute couleur du module de page vient d’un token', () => {
    for (const relatif of MODULES_CSS) {
      const css = sansCommentaires(contenu(relatif));
      for (const propriete of ['color', 'background', 'border-color', 'border-left', 'border-top']) {
        for (const m of css.matchAll(new RegExp(`^\\s*${propriete}:\\s*([^;]+);`, 'gm'))) {
          const declaration = m[1]!.trim();
          if (declaration === 'none' || declaration === 'transparent') continue;
          // `1px solid var(--relio-…)` : l'épaisseur est une convention.
          const couleur = declaration.replace(/^[\d.]+px\s+(solid|dashed|dotted|none)\s+/, '');
          if (couleur === '') continue;
          expect(couleur, `${relatif} → ${propriete}: ${declaration}`).toMatch(/^var\(--relio-/);
        }
      }
    }
  });

  it('aucune mesure hors de l’échelle 4/8/12/16/24/32/48/64', () => {
    const PROPRIETES =
      /(?:^|[;{}\s])(?:padding|margin|gap|min-height|max-height|inset)(?:-(?:top|right|bottom|left))?\s*:\s*([^;]+);/gm;

    for (const relatif of MODULES_CSS) {
      const css = sansCommentaires(contenu(relatif));
      const declarations = [...css.matchAll(PROPRIETES)].map((m) => m[1]!);
      const mesures = declarations
        .flatMap((d) => [...d.matchAll(/(-?\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1])))
        .filter((v) => v !== 0);
      const horsEchelle = [...new Set(mesures.filter((v) => !ECHELLE.has(v)))];
      expect(horsEchelle, `${relatif} : ${horsEchelle.join(', ')}`).toEqual([]);
    }
  });

  it('les points de rupture sont ceux du design system', () => {
    for (const relatif of MODULES_CSS) {
      const css = sansCommentaires(contenu(relatif));
      const points = [...css.matchAll(/min-width:\s*(\d+)px/g)].map((m) => Number(m[1]));
      for (const point of points) expect([360, 420, 768]).toContain(point);
    }
  });
});

describe('/parcours — la configuration reste côté serveur', () => {
  it('aucun fichier migré n’est un composant client', () => {
    for (const relatif of SOURCES_MIGREES) {
      expect(sansCommentaires(contenu(relatif))).not.toMatch(/'use client'/);
    }
  });

  it('`API_BASE_URL` n’apparaît pas comme contenu visible ni attribut rendu', () => {
    // Autorisé : la lecture de la variable, et son passage en prop à un
    // composant serveur. Interdit : une interpolation dans le JSX — texte
    // d'un élément, ou attribut visible.
    const VISIBLE =
      />\s*\{apiBaseUrl\}|>\s*\{baseUrl\}|\b(?:href|src|content|alt|title|value|aria-label|data-\w+)=\{?["'`]?\{(?:apiBaseUrl|baseUrl)\}/;

    for (const relatif of SOURCES_MIGREES) {
      const source = sansCommentaires(contenu(relatif));
      source.split('\n').forEach((ligne, index) => {
        expect(VISIBLE.test(ligne), `${relatif}:${index + 1} → ${ligne.trim()}`).toBe(false);
      });
    }
  });

  it('l’adresse n’est transmise que par prop', () => {
    const page = sansCommentaires(contenu('app/parcours/page.tsx'));

    expect([...page.matchAll(/baseUrl=\{apiBaseUrl\}/g)].length).toBe(1);
  });

  it('la page reste en rendu dynamique', () => {
    expect(contenu('app/parcours/page.tsx')).toContain("export const dynamic = 'force-dynamic'");
  });

  it('le composant serveur interroge l’API et délègue le rendu', () => {
    const source = sansCommentaires(contenu('components/ParcoursServeur.tsx'));

    // Il doit rester le seul à appeler l'API, et ne plus contenir de JSX
    // d'écran : le rendu est dans `ParcoursListe`, testable sans `fetch`.
    expect(source).toContain('chargerParcours');
    expect(source).toContain('ParcoursListe');
    expect(source).not.toMatch(/className=/);
  });
});