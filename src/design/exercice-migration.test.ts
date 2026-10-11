import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `Exercice.tsx` doit être bâti sur le design system — et le rester.
 *
 * ## Le risque particulier de cet écran
 *
 * C'est le seul écran **client** de l'application : tout ce qu'il importe
 * part dans le bundle du navigateur. Une classe de `globals.css` y fonctionne
 * parfaitement et n'est contrôlée par rien — `design/accessibilite.test.ts` ne
 * regarde que `src/components/ds`.
 *
 * ## Ce que ces tests verrouillent
 *
 * - aucune classe globale dans les fichiers migrés ;
 * - les imports du design system passent par le chemin direct ;
 * - aucune couleur brute, aucune mesure hors échelle ;
 * - **`ClavierMath.tsx` n'a reçu aucun import du design system** : le clavier
 *   est le chantier C2b, et son style reste dans `globals.css` ;
 * - la **logique est intacte** : les six `useState`, les quatre appels d'API,
 *   le journal local.
 */

const RACINE = join(process.cwd(), 'src');

/** Les fichiers migrés au chantier C2a. */
const SOURCES_MIGREES = [
  'components/Exercice.tsx',
  'app/parcours/[id]/page.tsx',
  'app/parcours/[id]/Verdict.tsx',
  'app/parcours/[id]/Tutorat.tsx',
];

const MODULES_CSS = ['app/parcours/[id]/exercice.module.css'];

/** Le clavier — migré au chantier C2b, dans ses propres fichiers. */
const CLAVIER = 'components/ClavierMath.tsx';

/**
 * Classes de `globals.css` que l'écran utilisait avant le chantier C2a.
 *
 * Liste **explicite** : une liste calculée à partir de `globals.css`
 * s'allongerait toute seule et le contrôle perdrait son sens.
 */
const CLASSES_ET_API = [
  'entete',
  'entete--interne',
  'entete__marque',
  'entete__logo',
  'entete__titre',
  'entete__sous-titre',
  'page',
  'conteneur',
  'carte',
  'carte__titre',
  'pied',
  'lien',
  'bouton',
  'bouton--principal',
  'bouton--discret',
  'exercice',
  'exercice__zone',
  'exercice__composeur',
  'exercice__champ',
  'exercice__label',
  'exercice__saisie',
  'exercice__apercu',
  'exercice__actions',
  'exercice__enonce',
  'exercice__consigne',
  'exercice__forme',
  'verdict',
  'verdict__statut',
  'verdict__detail',
  'verdict__detail--discret',
  'tutorat',
  'tutorat__niveau',
  'tutorat__message',
  'tutorat__action',
  'tutorat__resume',
  'indices',
  'indice',
  'suivi',
  'suivi__titre',
  'suivi__niveau',
  'avertissement',
];

/** Classes qui restent légitimes sur cet écran : le clavier n'est pas migré. */
const CLASSES_CLAVIER_AUTORISEES = ['clavier', 'clavier__rangee', 'clavier__touche'];

const ECHELLE = new Set([0, 4, 8, 12, 16, 24, 32, 48, 64]);

function contenu(relatif: string): string {
  return readFileSync(join(RACINE, relatif), 'utf8');
}

function sansCommentaires(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '));
}

/** Les valeurs de `className`, littérales ou par gabarit. */
function valeursClassName(source: string): string[] {
  const trouvees: string[] = [];
  for (const m of source.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{\[([\s\S]*?)\]\})/g)) {
    const valeur = (m[1] ?? m[2] ?? m[3] ?? '').replace(/\$\{[^}]*\}/g, ' ');
    trouvees.push(...valeur.split(/\s+/));
  }
  return trouvees;
}

describe('/parcours/[id] — les fichiers migrés existent', () => {
  it('les quatre sources et le module CSS sont en place', () => {
    for (const relatif of [...SOURCES_MIGREES, ...MODULES_CSS, CLAVIER]) {
      expect(() => readFileSync(join(RACINE, relatif), 'utf8')).not.toThrow();
    }
  });
});

describe('/parcours/[id] — aucune classe globale', () => {
  for (const relatif of SOURCES_MIGREES) {
    it(`${relatif} n’utilise aucune classe de globals.css`, () => {
      const trouvees: string[] = [];

      for (const classe of valeursClassName(sansCommentaires(contenu(relatif)))) {
        const nom = classe.trim();
        if (nom === '') continue;
        if (CLASSES_ET_API.includes(nom)) trouvees.push(`${relatif} → .${nom}`);
      }

      expect(trouvees).toEqual([]);
    });
  }

  it('aucun fichier migré n’importe `globals.css`', () => {
    for (const relatif of SOURCES_MIGREES) {
      expect(sansCommentaires(contenu(relatif))).not.toMatch(/globals\.css/);
    }
  });

  it('`Exercice.tsx` ne nomme plus aucune classe du clavier', () => {
    // Le clavier est migré dans ses propres fichiers : l'écran d'exercice ne
    // fait plus que monter `<ClavierMath>`.
    const source = sansCommentaires(contenu('components/Exercice.tsx'));
    const globales = valeursClassName(source).filter((c) => CLASSES_CLAVIER_AUTORISEES.includes(c.trim()));

    expect(globales).toEqual([]);
  });

  it('`.exercice--saisie` est passée en module local', () => {
    // Le comportement du chantier 7.7 est conservé, mais la classe est passée
    // dans le module : elle cible désormais `:global(.clavier)`.
    for (const relatif of SOURCES_MIGREES) {
      expect(sansCommentaires(contenu(relatif))).not.toMatch(/['"`]exercice--saisie/);
    }
    expect(contenu('app/parcours/[id]/exercice.module.css')).toMatch(
      /\.exerciceSaisie\s*\{[^}]*100dvh/,
    );
  });
});

describe('/parcours/[id] — imports du design system', () => {
  for (const relatif of SOURCES_MIGREES) {
    it(`${relatif} n'importe jamais par le barrel`, () => {
      expect(sansCommentaires(contenu(relatif))).not.toMatch(/from '@\/components\/ds'/);
    });
  }

  it('les composants importés existent tous', () => {
    for (const relatif of SOURCES_MIGREES) {
      for (const m of sansCommentaires(contenu(relatif)).matchAll(/from '@\/components\/ds\/([A-Za-z]+)'/g)) {
        expect(
          () => readFileSync(join(RACINE, 'components/ds', `${m[1]!}.tsx`), 'utf8'),
          `${relatif} → ${m[1]}`,
        ).not.toThrow();
      }
    }
  });

  it('ClavierMath.tsx n’utilise plus aucune classe de globals.css (C2b)', () => {
    // C2b a migré le clavier : son habillage vient désormais de modules locaux.
    // Ce test verrouille qu'il n'est pas revenu en arrière.
    const source = sansCommentaires(contenu(CLAVIER));
    const globales = valeursClassName(source).filter((c) => CLASSES_ET_API.includes(c.trim()));

    expect(globales, 'ClavierMath est revenu à globals.css').toEqual([]);
    expect(source).not.toMatch(/globals\.css/);
  });
});

describe('/parcours/[id] — tokens et échelle', () => {
  it('aucune couleur brute dans le module local', () => {
    for (const relatif of MODULES_CSS) {
      const css = sansCommentaires(contenu(relatif));
      const couleurs = [...css.matchAll(/#[0-9a-f]{3,8}\b/gi)].map((m) => m[0]);
      const fonctions = [...css.matchAll(/\b(?:rgba?|hsla?)\(/gi)].map((m) => m[0]);
      expect([...couleurs, ...fonctions], relatif).toEqual([]);
    }
  });

  it('toute couleur du module local vient d’un token', () => {
    for (const relatif of MODULES_CSS) {
      const css = sansCommentaires(contenu(relatif));
      for (const propriete of ['color', 'background', 'border-color', 'border-left', 'border-top']) {
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
    const PROPRIETES =
      /(?:^|[;{}\s])(?:padding|margin|gap|min-height|max-height|inset|flex|font-size)(?:-(?:top|right|bottom|left))?\s*:\s*([^;]+);/gm;

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

  it('les points de rupture restent {360, 420, 768}', () => {
    for (const relatif of MODULES_CSS) {
      const css = sansCommentaires(contenu(relatif));
      const points = [...css.matchAll(/min-width:\s*(\d+)px/g)].map((m) => Number(m[1]));
      for (const point of points) expect([360, 420, 768]).toContain(point);
    }
  });
});

describe('/parcours/[id] — la logique est intacte', () => {
  const EXERCICE = sansCommentaires(contenu('components/Exercice.tsx'));

  it('les six useState sont toujours là, dans le même ordre', () => {
    // Le chantier porte sur la couche visuelle. Les six états d'origine sont :
    // exercice, erreur de chargement, saisie, verdict, en cours, indices,
    // plus clavier mathématique, clavier système et tentatives.
    const attendus = [
      'exercice',
      'erreurChargement',
      'saisie',
      'verdict',
      'enCours',
      'indices',
      'clavierOuvert',
      'clavierSysteme',
      'tentatives',
      'suivi',
    ];

    // Chaque état est déclaré une seule fois.
    for (const nom of attendus) {
      const declarations = EXERCICE.match(new RegExp(`const \\[${nom},`, 'g')) ?? [];
      expect(declarations, `${nom} : déclaration unique`).toHaveLength(1);
    }
    // Décompte total : dix appels, exactement les mêmes qu'avant le chantier.
    // Les six d'origine (exercice, erreur, saisie, verdict, en cours, indices)
    // plus les quatre ajoutés par le chantier 7.5 (clavier mathématique,
    // clavier système, tentatives, suivi).
    const total = (EXERCICE.match(/= useState/g) ?? []).length;
    expect(total).toBe(10);
    expect(total).toBe(attendus.length);
  });

  it('aucun useReducer n’a été introduit', () => {
    expect(EXERCICE).not.toMatch(/useReducer/);
  });

  it('les quatre appels d’API sont inchangés', () => {
    for (const appel of [
      'chargerExercice',
      'corrigerReponse',
      'demanderIndice',
      'chargerSuivi',
    ]) {
      expect(EXERCICE, appel).toContain(`${appel}(`);
    }
  });

  it('le journal local est toujours écrit et effaçable', () => {
    expect(EXERCICE).toContain('ajouterObservation(');
    expect(EXERCICE).toContain('effacerJournal()');
    expect(EXERCICE).toContain('lireJournal()');
    expect(EXERCICE).toContain('echecsConsecutifs(');
  });

  it('le clavier garde exactement les mêmes props', () => {
    for (const prop of [
      'typeReponse=',
      'onChange={setSaisie}',
      'onValider=',
      'onFermer=',
      'onSysteme=',
      'champId=',
      'champRef=',
    ]) {
      expect(EXERCICE, prop).toContain(prop);
    }
  });

  it('le composant reste un composant client', () => {
    expect(contenu('components/Exercice.tsx').startsWith("'use client'")).toBe(true);
  });

  it('la mesure du clavier système est toujours branchée', () => {
    expect(EXERCICE).toContain('useHauteurClavierSysteme()');
    expect(EXERCICE).toContain('data-clavier-systeme={clavierSystemeVisible.hauteur}');
  });

  it('les accessibilités déjà en place sont conservées', () => {
    // Champ : `Champ` relie label, aide et erreur. C'est le composant du design
    // system qui le fait désormais — l'ancien `<label>` ne faisait que la
    // moitié du travail.
    expect(EXERCICE).toContain('<Champ');
    expect(EXERCICE).toContain('label="Ta réponse"');

    // Aperçu de la saisie : annoncé poliment.
    expect(EXERCICE).toMatch(/aria-live="polite"/);

    // Verdict et saisie illisible : régions vivantes.
    expect(EXERCICE).toMatch(/role="status"/);
    expect(EXERCICE).toMatch(/aria-live="polite"/);

    // Sections nommées.
    expect(EXERCICE).toContain('aria-label="Indices"');
    expect(EXERCICE).toContain('aria-label="Mon suivi"');
  });

  it('les libellés du serveur ne sont pas recomposés localement', () => {
    // `LIBELLE_REPLI` et `libelleAffiche` ont rejoint `Verdict.tsx`. L'écran
    // ne doit plus les contenir : une correspondance locale risquerait de
    // diverger de la règle validée par l'enseignant.
    expect(EXERCICE).not.toContain('LIBELLE_REPLI');
    expect(EXERCICE).not.toContain('libelleAffiche');
  });
});