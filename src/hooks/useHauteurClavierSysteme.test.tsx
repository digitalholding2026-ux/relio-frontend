/**
 * Chantier 7.7 — partie A : le clavier ne recouvre plus le contenu.
 *
 * ## Ce que le test vérifie
 *
 * Le cœur du correctif est la **mesure** de la hauteur du clavier système. C'est
 * elle qui manquait : sans elle, une page en `100dvh` continue de croire que
 * l'écran fait 640 px de haut et le clavier mathématique se retrouve derrière le
 * clavier du téléphone.
 *
 * Le test reproduit donc le comportement d'Android : `innerHeight` inchangée,
 * `visualViewport.height` réduite.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';

import { useHauteurClavierSysteme, VARIABLE_HAUTEUR_CLAVIER } from './useHauteurClavierSysteme';

/**
 * Fausse fenêtre visuelle.
 *
 * `jsdom` n'implémente pas `visualViewport`. On installe un objet qui se
 * comporte comme celui d'Android : la hauteur visible diminue quand le clavier
 * s'ouvre, et un événement `resize` le signale.
 */
function installerViewport(hauteurVisible: number, offsetTop = 0) {
  const ecouteurs = new Set<() => void>();
  const vue = {
    height: hauteurVisible,
    offsetTop,
    addEventListener: (_: string, fn: () => void) => ecouteurs.add(fn),
    removeEventListener: (_: string, fn: () => void) => ecouteurs.delete(fn),
  };

  Object.defineProperty(window, 'visualViewport', { value: vue, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: 640, configurable: true, writable: true });

  return {
    /** Change la hauteur visible et déclenche le redimensionnement. */
    ouvrir(hauteur: number) {
      vue.height = hauteur;
      act(() => {
        for (const fn of ecouteurs) fn();
      });
    },
    /** Retire l'API, comme un navigateur sans fenêtre visuelle. */
    retirer() {
      Object.defineProperty(window, 'visualViewport', { value: undefined, configurable: true });
    },
  };
}

function Sonde() {
  const { hauteur, mesure } = useHauteurClavierSysteme();
  return (
    <p>
      {mesure ? 'mesuré' : 'inconnu'} : {hauteur}
    </p>
  );
}

function hauteurPubliee(): string {
  return document.documentElement.style.getPropertyValue(VARIABLE_HAUTEUR_CLAVIER);
}

afterEach(() => {
  document.documentElement.style.removeProperty(VARIABLE_HAUTEUR_CLAVIER);
});

describe('7.7 — mesure de la hauteur du clavier système', () => {
  it('renvoie 0 et ne publie rien quand le clavier est fermé', () => {
    const viewport = installerViewport(640);
    render(<Sonde />);

    expect(screen.getByText('mesuré : 0')).toBeDefined();
    expect(hauteurPubliee()).toBe('');
    viewport.retirer();
  });

  it('mesure la hauteur occupée par le clavier ouvert', () => {
    // Écran de 640 px, clavier de 240 px : il reste 400 px visibles.
    const viewport = installerViewport(400);
    render(<Sonde />);

    expect(screen.getByText('mesuré : 240')).toBeDefined();
    expect(hauteurPubliee()).toBe('240px');
    viewport.retirer();
  });

  it('suit l’ouverture puis la fermeture du clavier', () => {
    const viewport = installerViewport(640);
    render(<Sonde />);

    viewport.ouvrir(360);
    expect(screen.getByText('mesuré : 280')).toBeDefined();

    viewport.ouvrir(640);
    expect(screen.getByText('mesuré : 0')).toBeDefined();
    // Refermé, la variable doit disparaître : une valeur figée ferait croire
    // que le clavier est encore là et rognerait la page pour rien.
    expect(hauteurPubliee()).toBe('');

    viewport.retirer();
  });

  it('déduit la hauteur même quand le navigateur retire aussi le haut', () => {
    // Certains navigateurs baissent `offsetTop` sans le répercuter sur
    // `height` : sans cette correction, la hauteur serait sous-estimée et le
    // clavier recouvrirait encore le bas de l'écran.
    const viewport = installerViewport(420, 20);
    render(<Sonde />);

    expect(screen.getByText('mesuré : 200')).toBeDefined();
    viewport.retirer();
  });

  it('ne suppose rien quand l’API n’existe pas', () => {
    // Bureau, ou navigateur ancien : la page doit se comporter comme si le
    // clavier faisait zéro hauteur, sans planter.
    const viewport = installerViewport(640);
    viewport.retirer();

    render(<Sonde />);
    expect(screen.getByText('inconnu : 0')).toBeDefined();
  });

  it('ne publie jamais une hauteur négative', () => {
    // Certains navigateurs rapportent une hauteur visible supérieure à la
    // fenêtre, brièvement, pendant l'animation d'ouverture.
    const viewport = installerViewport(700);
    render(<Sonde />);

    expect(screen.getByText('mesuré : 0')).toBeDefined();
    viewport.retirer();
  });
});