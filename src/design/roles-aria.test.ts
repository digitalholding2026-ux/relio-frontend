import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Rôles ARIA utilisés dans `src/`.
 *
 * `role="note"` a été employé trois fois — accueil, page parcours et message de
 * bloc fermé. Ce rôle **n'existe pas** dans la spécification ARIA : un lecteur
 * d'écran ignore l'attribut, et le bandeau d'avertissement n'était donc jamais
 * annoncé.
 *
 * Ce contrôle est statique : il porte sur le code source, qui est la seule
 * façon de voir un rôle posé sur un élément que le rendu dynamique n'atteint
 * pas encore (pages serveur, composants serveur asynchrones).
 */

const RACINE = join(process.cwd(), 'src');

/** Tous les fichiers `.ts` et `.tsx` de `src/`, tests exclus. */
function sources(): string[] {
  const trouves: string[] = [];
  const parcourir = (dossier: string) => {
    for (const entree of readdirSync(dossier)) {
      const chemin = join(dossier, entree);
      if (statSync(chemin).isDirectory()) {
        parcourir(chemin);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entree)) continue;
      if (/\.test\.(ts|tsx)$/.test(entree)) continue;
      trouves.push(chemin);
    }
  };
  parcourir(RACINE);
  return trouves.sort();
}

const SOURCES = sources();

/** Les rôles ARIA effectivement utilisés, avec leur chemin. */
function rolesUtilises(): { fichier: string; role: string; ligne: number }[] {
  const trouve: { fichier: string; role: string; ligne: number }[] = [];
  for (const fichier of SOURCES) {
    const lignes = readFileSync(fichier, 'utf8').split('\n');
    lignes.forEach((ligne, index) => {
      for (const correspondance of ligne.matchAll(/\brole=["']([a-z-]+)["']/g)) {
        trouve.push({
          fichier: relative(RACINE, fichier),
          role: correspondance[1]!,
          ligne: index + 1,
        });
      }
    });
  }
  return trouve;
}

describe('Rôles ARIA — contrôle statique', () => {
  it('le contrôle porte sur une surface non vide', () => {
    expect(SOURCES.length).toBeGreaterThan(10);
  });

  it('aucun `role="note"` ne subsiste dans `src/`', () => {
    const fautifs = rolesUtilises().filter((r) => r.role === 'note');
    expect(
      fautifs.map((r) => `${r.fichier}:${r.ligne}`),
    ).toEqual([]);
  });

  it('tous les rôles utilisés appartiennent à la spécification ARIA 1.2', () => {
    // Rôles abstraits exclus : ils ne doivent jamais être portés par un élément.
    const abstraits = new Set([
      'command', 'composite', 'input', 'landmark', 'range', 'roletype', 'section',
      'sectionhead', 'select', 'structure', 'widget', 'window',
    ]);
    const connus = new Set([
      'alert', 'alertdialog', 'application', 'article', 'banner', 'blockquote',
      'button', 'caption', 'cell', 'checkbox', 'code', 'columnheader',
      'combobox', 'complementary', 'contentinfo', 'definition', 'deletion',
      'dialog', 'directory', 'document', 'emphasis', 'feed', 'figure', 'form',
      'generic', 'grid', 'gridcell', 'group', 'heading', 'img', 'insertion',
      'link', 'list', 'listbox', 'listitem', 'log', 'main', 'marquee', 'math',
      'menu', 'menubar', 'menuitem', 'menuitemcheckbox', 'menuitemradio',
      'meter', 'navigation', 'none', 'note', 'option', 'paragraph',
      'presentation', 'progressbar', 'radio', 'radiogroup', 'region', 'row',
      'rowgroup', 'rowheader', 'scrollbar', 'search', 'searchbox', 'separator',
      'slider', 'spinbutton', 'status', 'strong', 'subscript', 'superscript',
      'switch', 'tab', 'table', 'tablist', 'tabpanel', 'term', 'textbox',
      'time', 'timer', 'toolbar', 'tooltip', 'tree', 'treegrid', 'treeitem',
    ]);

    const inconnus = rolesUtilises().filter(
      (r) => !abstraits.has(r.role) && !connus.has(r.role),
    );
    expect(
      inconnus.map((r) => `${r.fichier}:${r.ligne} → ${r.role}`),
    ).toEqual([]);
  });

  it('aucun rôle abstrait n’est porté par un élément', () => {
    const abstraits = new Set([
      'command', 'composite', 'input', 'landmark', 'range', 'roletype', 'section',
      'sectionhead', 'select', 'structure', 'widget', 'window',
    ]);
    const fautifs = rolesUtilises().filter((r) => abstraits.has(r.role));
    expect(fautifs.map((r) => `${r.fichier}:${r.ligne} → ${r.role}`)).toEqual([]);
  });

  it('chaque écran qui a encore un message à annoncer porte un rôle annonçant', () => {
    // Chantier B : l'accueil n'a plus de bandeau d'avertissement — son contenu
    // vient de l'API et ne peut donc pas annoncer un périmètre périmé.
    //
    // Chantier C1 : le rendu du parcours a quitté `components/ParcoursServeur.tsx`
    // — devenu le simple appelant de l'API — pour `app/parcours/BlocCarte.tsx`,
    // qui porte désormais le message de bloc fermé. Les fichiers qui portent un
    // message à annoncer ont donc changé.
    const announcing = rolesUtilises().filter((r) => r.role === 'status' || r.role === 'alert');
    const fichiers = new Set(announcing.map((r) => r.fichier));
    for (const attendu of ['app/parcours/page.tsx', 'app/parcours/BlocCarte.tsx']) {
      expect(fichiers.has(attendu), `${attendu} ne porte aucun rôle status/alert`).toBe(true);
    }
  });

  it('la carte principale de l’accueil est une région nommée', () => {
    // `region` + `aria-labelledby` : c'est le repère qui permet à un lecteur
    // d'écran d'aller directement à l'essentiel, sans lire la page en entier.
    const carte = sources().filter((f) => f.endsWith('.tsx') && !f.includes('.test.'));

    const avecCarte = carte.filter((f) => readFileSync(f, 'utf8').includes('Ta route cette semaine'));
    expect(avecCarte.length).toBeGreaterThan(0);

    for (const fichier of avecCarte) {
      const contenu = readFileSync(fichier, 'utf8');
      expect(contenu, `${fichier} : la carte n'est pas une région nommée`).toMatch(
        /<section[^>]*aria-labelledby/,
      );
    }
  });
});