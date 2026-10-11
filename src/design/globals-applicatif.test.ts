import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { rapportContraste } from '@/design/contraste';

/**
 * Feuille applicative `globals.css` — contrôles statiques.
 *
 * Ces contrôles portent sur la feuille réellement rendue par l'application,
 * pas sur le design system : `design/accessibilite.test.ts` ne couvre que
 * `src/components/ds`, et aucune vérification ne portait sur les 851 lignes de
 * `globals.css` — d'où deux défauts qui ont atteint la production (bouton
 * principal blanc, bordure de champ à 1,26:1).
 *
 * Les contrôles sont statiques par nature : `jsdom` n'applique pas les CSS.
 * C'est une limite assumée, identique à celle de `accessibilite.test.ts`.
 */

const CSS = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');

/** Le bloc d'une règle CSS, à partir de son sélecteur. */
function bloc(selcteur: string): string {
  const debut = CSS.indexOf(selcteur);
  expect(debut, `la règle « ${selcteur} » est absente de globals.css`).toBeGreaterThan(-1);
  const fin = CSS.indexOf('}', debut);
  return CSS.slice(debut, fin);
}

/** Les occurrences d'un sélecteur de base, hors pseudo-classes et modificateurs. */
function occurrencesDeBase(selcteur: string): number {
  return [...CSS.matchAll(new RegExp(`^\\.${selcteur}\\s*\\{`, 'gm'))].length;
}

describe('globals.css — un seul bloc de base par sélecteur', () => {
  it('`.bouton` n’est déclaré qu’une fois', () => {
    // Avant : `.bouton` était déclaré à la l.303 puis à la l.477. Même
    // spécificité, la seconde règle écrasait la première — le bouton
    // principal de l'accueil s'affichait blanc au repos et bleu au survol.
    expect(occurrencesDeBase('bouton')).toBe(1);
  });

  it('`.bouton` de base est neutre : la couleur d’accent est le rôle de `--principal`', () => {
    const base = bloc('.bouton {');
    expect(base).toContain('background: var(--surface)');
    expect(base).toContain('color: var(--texte)');
    expect(base).not.toContain('background: var(--primaire)');
  });

  it('`.bouton--principal` reste bleu au repos et s’assombrit au survol', () => {
    const principal = bloc('.bouton--principal {');
    expect(principal).toContain('background: var(--primaire)');
    expect(principal).toContain('color: #fff');

    const survol = bloc('.bouton--principal:hover:not(:disabled) {');
    expect(survol).toContain('background: var(--primaire-sombre)');
    expect(survol).toContain('border-color: var(--primaire-sombre)');
  });

  it('`.bouton` conserve la cible tactile de 48 px', () => {
    expect(bloc('.bouton {')).toContain('min-height: 48px');
  });

  it('aucun autre sélecteur applicatif n’est dupliqué', () => {
    const dupliques: string[] = [];
    for (const nom of ['clavier__touche', 'exercice__saisie', 'lien', 'carte', 'pied']) {
      const total = [...CSS.matchAll(new RegExp(`^\\.${nom}\\s*(?:,[^{]*)?\\{`, 'gm'))].length;
      const bases = occurrencesDeBase(nom);
      // Une règle de base peut être redéclarée dans une media query : ce qui est
      // interdit ici, c'est la redéclaration **hors** media query, donc hors
      // accolades de fermeture de bloc média.
      if (total > bases) dupliques.push(nom);
    }
    expect(dupliques).toEqual([]);
  });
});

describe('globals.css — bordure des éléments interactifs', () => {
  it('`--bordure-forte` existe dans `:root`', () => {
    expect(bloc(':root {')).toMatch(/--bordure-forte:\s*#[0-9a-f]{6}/i);
  });

  it('`--bordure-forte` atteint au moins 3:1 sur fond blanc', () => {
    // WCAG 2.1 SC 1.4.11 : 3:1 pour une frontière qui identifie un contrôle.
    const valeur = /--bordure-forte:\s*(#[0-9a-f]{6})/i.exec(CSS)?.[1];
    expect(valeur).toBeDefined();
    const ratio = rapportContraste(valeur!, '#ffffff');
    expect(ratio).toBeGreaterThanOrEqual(3);
    // La cible du chantier est 3,5:1, pas le strict minimum.
    expect(ratio).toBeGreaterThanOrEqual(3.5);
  });

  it('`--bordure-forte` atteint au moins 3:1 sur le fond de page', () => {
    const valeur = /--bordure-forte:\s*(#[0-9a-f]{6})/i.exec(CSS)?.[1]!;
    expect(rapportContraste(valeur, '#f7f8fc')).toBeGreaterThanOrEqual(3);
  });

  it('le champ de saisie utilise `--bordure-forte`', () => {
    expect(bloc('.exercice__saisie {')).toContain('border: 1px solid var(--bordure-forte)');
  });

  it('les touches du clavier utilisent `--bordure-forte`', () => {
    expect(bloc('.clavier__touche {')).toContain('border: 1px solid var(--bordure-forte)');
  });

  it('`--bordure` reste affectée aux séparateurs décoratifs', () => {
    // La bordure décorative doit rester décorative : c'est ce qui distingue
    // `--bordure` de `--bordure-forte`.
    expect(bloc('.pied {')).toContain('border-top: 1px solid var(--bordure)');
  });
});