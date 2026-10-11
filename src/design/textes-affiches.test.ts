import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Textes affichés à l'élève — exactitude de la langue.
 *
 * ## Le défaut
 *
 * `lib/parcours.ts` renvoyait « Le service de exercices n'est pas configuré sur
 * ce déploiement. » — faute d'accord dans un texte qui s'affiche à l'écran en
 * cas de mauvaise configuration. `ApiStatus.tsx` composait `APIRelio` sans
 * espace. Deux défauts de même nature : visibles par l'élève.
 *
 * ## Ce que ce contrôle couvre
 *
 * Les chaînes littérales des modules qui produisent du texte affiché, une fois
 * les commentaires retirés. Il ne s'agit pas d'un correcteur grammatical : il
 * porte sur les constructions fautives constatées, plus deux invariants de
 * langue qui protègent l'élève.
 */

const RACINE = join(process.cwd(), 'src');

/** Fichiers dont les chaînes littérales sont affichées à l'élève. */
const MODULES_AFFICHES = [
  'lib/parcours.ts',
  'lib/api.ts',
  'lib/tutorat.ts',
  'components/Exercice.tsx',
  'components/ApiStatus.tsx',
  'components/ParcoursServeur.tsx',
  'components/parcours.ts',
  'app/page.tsx',
  'app/parcours/page.tsx',
  'app/parcours/[id]/page.tsx',
];

/** Tous les fichiers `.ts`/`.tsx` de `src/`, tests exclus. */
function sources(): string[] {
  const trouves: string[] = [];
  const parcourir = (dossier: string) => {
    for (const entree of readdirSync(dossier)) {
      const chemin = join(dossier, entree);
      if (statSync(chemin).isDirectory()) parcourir(chemin);
      else if (/\.(ts|tsx)$/.test(entree) && !/\.test\.(ts|tsx)$/.test(entree)) trouves.push(chemin);
    }
  };
  parcourir(RACINE);
  return trouves.sort();
}

/** Chaînes littérales d'un fichier, commentaires retirés. */
function chaines(fichier: string): { texte: string; ligne: number }[] {
  const brut = readFileSync(fichier, 'utf8');
  const sansCommentaires = brut
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '));

  const trouve: { texte: string; ligne: number }[] = [];
  const lignes = sansCommentaires.split('\n');
  lignes.forEach((ligne, index) => {
    // Un `throw new Error(...)` porte un message de développeur : il est
    // intercepté et remplacé par un message élève, il n'est jamais rendu.
    const messageDeveloppeur = /throw new Error\(/.test(ligne);
    for (const m of ligne.matchAll(/'([^'\n]+)'|`([^`\n]+)`/g)) {
      const texte = (m[1] ?? m[2] ?? '').trim();
      if (messageDeveloppeur) continue;
      if (texte.length >= 12) trouve.push({ texte, ligne: index + 1 });
    }
  });
  return trouve;
}

const AFFICHES = MODULES_AFFICHES.map((m) => join(RACINE, m)).filter((f) => {
  try {
    statSync(f);
    return true;
  } catch {
    return false;
  }
});

describe('Textes affichés — fautes d’accord', () => {
  it('la surface contrôlée n’est pas vide', () => {
    expect(AFFICHES.length).toBe(MODULES_AFFICHES.length);
  });

  it('aucun « de exercice » ne subsiste', () => {
    const fautifs = AFFICHES.flatMap((f) =>
      chaines(f)
        .filter((c) => /\bde (exercices?|applications?|indices?|objectifs?|exemples?)\b/i.test(c.texte))
        .map((c) => `${relative(RACINE, f)}:${c.ligne} → ${c.texte}`),
    );
    expect(fautifs).toEqual([]);
  });

  it('aucune construction « à le » ne subsiste', () => {
    const fautifs = AFFICHES.flatMap((f) =>
      chaines(f)
        .filter((c) => /\bà (le|les|des|un|une)\b/i.test(c.texte))
        .map((c) => `${relative(RACINE, f)}:${c.ligne} → ${c.texte}`),
    );
    expect(fautifs).toEqual([]);
  });

  it('aucun « pas de le / pas de les » ne subsiste', () => {
    const fautifs = AFFICHES.flatMap((f) =>
      chaines(f)
        .filter((c) => /\b(pas|sans) de (le|les|des)\b/i.test(c.texte))
        .map((c) => `${relative(RACINE, f)}:${c.ligne} → ${c.texte}`),
    );
    expect(fautifs).toEqual([]);
  });

  it('aucun mot collé par concatenation abusive (« APIRelio »)', () => {
    const fautifs = AFFICHES.flatMap((f) =>
      chaines(f)
        .filter((c) => /\b(APIRelio|RelioAPI)\b/.test(c.texte))
        .map((c) => `${relative(RACINE, f)}:${c.ligne} → ${c.texte}`),
    );
    expect(fautifs).toEqual([]);
  });

  it('le message de configuration du service est correctement accordé', () => {
    const source = readFileSync(join(RACINE, 'lib/parcours.ts'), 'utf8');
    expect(source).toContain('Le service d’exercices n’est pas configuré');
    expect(source).not.toContain('Le service de exercices');
  });
});

describe('Textes affichés — invariants de langue', () => {
  it('aucun texte ne promet une absence de conservation des réponses', () => {
    // Invariant issu du correctif 5 : la formulation était fausse côté client.
    const fautifs = sources()
      .flatMap((f) =>
        chaines(f)
          .filter((c) => /réponses ne sont pas conservées/i.test(c.texte))
          .map((c) => `${relative(RACINE, f)}:${c.ligne} → ${c.texte}`),
      );
    expect(fautifs).toEqual([]);
  });

  it('aucun texte ne promet qu’aucune donnée n’est conservée « partout »', () => {
    const fautifs = sources()
      .flatMap((f) =>
        chaines(f)
          .filter((c) => /rien n'est conservé|rien n’est conservé/i.test(c.texte))
          .map((c) => `${relative(RACINE, f)}:${c.ligne} → ${c.texte}`),
      );
    // Le pied de page parle explicitement de « nos serveurs », ce qui est vrai.
    for (const faute of fautifs) {
      expect(faute).toMatch(/serveurs/i);
    }
  });

  it('les messages d’erreur ne contiennent pas de terme technique courant', () => {
    // `ApiStatus` affiche volontairement un diagnostic d'opérateur : le
    // message CORS est gardé, car c'est la seule action utile quand la
    // configuration est fausse. Les termes d'implémentation, eux, ne doivent
    // jamais atteindre l'élève.
    const interdits = ['AbortError', 'undefined', 'NaN', 'TypeError', 'Error:', 'stack trace'];
    const fautifs = AFFICHES.flatMap((f) =>
      chaines(f)
        .filter((c) => interdits.some((t) => new RegExp(`\\b${t}\\b`).test(c.texte)))
        .map((c) => `${relative(RACINE, f)}:${c.ligne} → ${c.texte}`),
    );
    expect(fautifs).toEqual([]);
  });

  it('le diagnostic CORS reste actionnable pour un opérateur', () => {
    // Ce texte est volontairement technique : sans lui, un déploiement mal
    // configuré n'offre aucune piste. Il ne s'adresse pas à l'élève.
    const source = readFileSync(join(RACINE, 'lib/api.ts'), 'utf8');
    expect(source).toContain('configuration CORS du backend');
  });
});