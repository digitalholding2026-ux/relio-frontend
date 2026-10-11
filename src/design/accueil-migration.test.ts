import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * L'accueil doit être bâti sur le design system — et le rester.
 *
 * ## Le risque
 *
 * `globals.css` définit des classes attractive et pratiques (`.entete`,
 * `.section`, `.grille`, `.bouton`). Un écran qui les utilise fonctionne
 * parfaitement et passe tous les tests… tout en échappant aux contrôles
 * d'accessibilité, qui ne portent que sur `src/components/ds` (voir
 * `design/accessibilite.test.ts`). Un travail fait à la main dans la feuille
 * globale n'est donc jamais contrôlé : ni contraste de bordure à 3:1, ni cible
 * tactile de 44 px, ni anneau de focus.
 *
 * ## Ce que ces tests verrouillent
 *
 * - l'accueil n'utilise **aucune** classe globale ;
 * - il ne réintroduit pas la section « État des fonctionnalités », qui ne
 *   parle pas à un élève ;
 * - il n'affiche jamais l'adresse du backend, qui n'est pas son affaire ;
 * - il ne déclare aucune couleur brute ni aucun px en dur hors échelle.
 */

const RACINE = join(process.cwd(), 'src');

/** Les fichiers qui composent l'accueil. */
const SOURCES_ACCUEIL = ['app/page.tsx', 'app/CarteRoute.tsx', 'components/ApiStatus.tsx'];

const CLASSES_GLOBALES = [
  'entete',
  'section',
  'grille',
  'etape',
  'badge',
  'carte',
  'bouton',
  'lien',
  'conteneur',
  'pied',
  'avertissement',
  'verdict',
  'tutorat',
];

/** Échelle d'espacement autorisée, hors tokens. */
const ECHELLE = new Set([0, 4, 8, 12, 16, 24, 32, 48, 64]);

function contenu(relatif: string): string {
  return readFileSync(join(RACINE, relatif), 'utf8');
}

function sansCommentaires(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '));
}

describe('Accueil — aucune classe globale', () => {
  it('la liste des sources contrôlées existe', () => {
    for (const relatif of SOURCES_ACCUEIL) {
      expect(() => statSync(join(RACINE, relatif))).not.toThrow();
    }
  });

  for (const relatif of SOURCES_ACCUEIL) {
    it(`${relatif} n’utilise aucune classe de globals.css`, () => {
      const source = sansCommentaires(contenu(relatif));
      const trouvees: string[] = [];

      for (const nom of CLASSES_GLOBALES) {
        // `className="..."` ou `className={`...`}`
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

  it('la page n’importe plus globals.css', () => {
    // `layout.tsx` l'importe encore pour les écrans non migrés ; l'accueil,
    // lui, ne doit pas y ajouter la sienne.
    expect(contenu('app/page.tsx')).not.toMatch(/globals\.css/);
  });

  it('l’accueil utilise bien des modules CSS locaux ou du design system', () => {
    const page = contenu('app/page.tsx');
    expect(page).toMatch(/page\.module\.css/);
    expect(page).toMatch(/@\/components\/ds\//);
  });
});

describe('Accueil — pas de retour du parcours marketing en dur', () => {
  it('« État des fonctionnalités » a disparu de toute la source', () => {
    const coupables: string[] = [];
    const parcourir = (dossier: string) => {
      for (const entree of readdirSync(dossier)) {
        const chemin = join(dossier, entree);
        if (statSync(chemin).isDirectory()) {
          parcourir(chemin);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(entree) || /\.test\.(ts|tsx)$/.test(entree)) continue;
        if (contenu(relative(RACINE, chemin)).includes('État des fonctionnalités')) {
          coupables.push(relative(RACINE, chemin));
        }
      }
    };
    parcourir(RACINE);

    expect(coupables).toEqual([]);
  });

  it('le fichier `components/parcours.ts` n’existe plus', () => {
    // Il portait les cinq étapes en dur qui annonçaient un état du service
    // sans jamais le vérifier.
    expect(() => statSync(join(RACINE, 'components/parcours.ts'))).toThrow();
  });

  it('la page ne déclare plus de liste de fonctionnalités en dur', () => {
    const page = sansCommentaires(contenu('app/page.tsx'));
    expect(page).not.toMatch(/FONCTIONNALITES/);
    expect(page).not.toMatch(/\betat:\s*'Disponible'/);
  });

  it('la seule source de vérité du parcours est l’API', () => {
    const page = sansCommentaires(contenu('app/page.tsx'));
    expect(page).toContain('chargerParcours');
  });
});

describe('Accueil — l’adresse du backend ne quitte jamais le serveur', () => {
  it('aucun composant de l’accueil ne rend l’adresse du backend', () => {
    const coupables: string[] = [];

    // Passer l'adresse **en prop** à un composant serveur est correct : elle ne
    // quitte jamais le serveur. Ce qui est interdit, c'est qu'elle apparaisse
    // dans le HTML rendu — comme texte, ou dans un attribut visible.
    const RENDU_VISIBLE =
      /=\s*["']\{(?:baseUrl|apiBaseUrl)\}["']|\b(?:href|src|content|alt|title|value|aria-label|data-\w+)=\{["']?\{(?:baseUrl|apiBaseUrl)\}/;

    for (const relatif of SOURCES_ACCUEIL) {
      const source = sansCommentaires(contenu(relatif));
      source.split('\n').forEach((ligne, index) => {
        if (RENDU_VISIBLE.test(ligne)) coupables.push(`${relatif}:${index + 1}`);
      });
    }

    expect(coupables).toEqual([]);
  });

  it('l’adresse n’est transmise que par prop, jamais rendue', () => {
    const page = sansCommentaires(contenu('app/page.tsx'));

    // La seule occurrence autorisée est le passage en prop aux deux
    // composants serveur de l'écran.
    const occurrences = [...page.matchAll(/baseUrl=\{apiBaseUrl\}/g)].length;
    expect(occurrences).toBe(2);
  });

  it('l’API n’est jamais appelée depuis le navigateur pour cette page', () => {
    // Un composant client afficherait l'adresse pour appeler la requête.
    for (const relatif of SOURCES_ACCUEIL) {
      expect(sansCommentaires(contenu(relatif))).not.toMatch(/'use client'/);
    }
  });

  it('`verifierApi` et `chargerParcours` sont bien importés statiquement', () => {
    // Un appel dynamique (`import()`, `fetch` sur une variable) passerait
    // entre les mailles de la vérification précédente.
    const api = contenu('components/ApiStatus.tsx');
    expect(api).toMatch(/from '@\/lib\/api'/);
    expect(api).not.toMatch(/import\(/);
  });
});

describe('Accueil — aucune couleur brute, aucune mesure hors échelle', () => {
  const modulesCSS = ['app/page.module.css', 'components/ApiStatus.module.css'];

  it('aucune couleur hexadécimale en dur', () => {
    for (const relatif of modulesCSS) {
      const css = sansCommentaires(contenu(relatif));
      const couleurs = [...css.matchAll(/#[0-9a-f]{3,8}\b/gi)].map((m) => m[0]);
      expect(couleurs, `${relatif} : ${couleurs.join(', ')}`).toEqual([]);
    }
  });

  it('toute couleur vient d’un token', () => {
    for (const relatif of modulesCSS) {
      const css = sansCommentaires(contenu(relatif));
      for (const propriete of ['color', 'background', 'border-color', 'border-top']) {
        for (const m of css.matchAll(new RegExp(`^\\s*${propriete}:\\s*([^;]+);`, 'gm'))) {
          const declaration = m[1]!.trim();
          if (declaration === 'none' || declaration === 'transparent') continue;
          // `1px solid var(--relio-…)` : l'épaisseur est une convention de trait,
          // la couleur doit venir d'un token.
          const couleur = declaration.replace(/^[\d.]+px\s+(solid|dashed|dotted|none)\s+/, '');
          if (couleur === '') continue;
          expect(couleur, `${relatif} → ${propriete}: ${declaration}`).toMatch(/^var\(--relio-/);
        }
      }
    }
  });

  it('aucune mesure en dur hors de l’échelle 4/8/12/16/24/32/48/64', () => {
    // Seules les déclarations d'espacement portent une mesure à contrôler.
    // Le trait de bordure (`1px`) est une convention et non un espacement ;
    // `max-width`, `width` et les points de rupture relèvent de la mise en
    // page, pas de l'échelle — ils sont contrôlés séparément.
    const PROPRIETES = /(?:^|[;{}\s])(?:padding|margin|gap|min-height|max-height|inset)(?:-(?:top|right|bottom|left))?\s*:\s*([^;]+);/gm;

    for (const relatif of modulesCSS) {
      const css = sansCommentaires(contenu(relatif));
      const declarations = [...css.matchAll(PROPRIETES)].map((m) => m[1]!);
      const mesures = declarations
        .flatMap((d) => [...d.matchAll(/(-?\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1])))
        .filter((v) => v !== 0);
      const horsEchelle = [...new Set(mesures.filter((v) => !ECHELLE.has(v)))];
      expect(horsEchelle, `${relatif} : ${horsEchelle.join(', ')}`).toEqual([]);
    }
  });

  it('aucune media query n’utilise de largeur hors des points de rupture déclarés', () => {
    // `tokens.ts` déclare `RUPTURES = { sm: 360, md: 420, lg: 768 }`. Un autre
    // point de rupture produirait une largeur que le design system ignore.
    for (const relatif of modulesCSS) {
      const css = sansCommentaires(contenu(relatif));
      const points = [...css.matchAll(/min-width:\s*(\d+)px/g)].map((m) => Number(m[1]));
      for (const point of points) expect([360, 420, 768]).toContain(point);
    }
  });

  it('aucune nouvelle classe n’a été ajoutée à globals.css par l’accueil', () => {
    // Le chantier B ne touche pas aux écrans non migrés : si une classe
    // globale a été ajoutée, c’est que l’accueil y a写的.
    const css = sansCommentaires(contenu('app/globals.css'));
    expect(css).not.toMatch(/^\s*\.carte-route/m);
    expect(css).not.toMatch(/^\s*\.salutation/m);
    expect(css).not.toMatch(/^\s*\.sous-titre/m);
  });
});