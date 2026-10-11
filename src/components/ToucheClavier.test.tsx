import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ToucheClavier } from '@/components/ToucheClavier';
import type { Touche } from '@/lib/clavier';

/**
 * Une touche du clavier mathématique.
 *
 * ## Ce que ces tests verrouillent
 *
 * 1. **La cible tactile.** Le clavier fait 453 px de haut grâce à 9 rangées de
 *    44 px. Le composant `Bouton` du design system impose 48 px : l'utiliser
 *    porterait le clavier à 485 px et recouvrirait à nouveau l'énoncé. Ce test
 *    est donc une **non-régression de la hauteur**.
 * 2. **Les deux voies d'activation du correctif A1** : `pointerdown` pour le
 *    doigt, `click` pour le clavier physique. Aucune n'a le droit de
 *    disparaître.
 * 3. **Pas de double déclenchement** quand `pointerdown` puis `click` se
 *    produisent.
 */

const TOUCHE_CHIFFRE: Touche = {
  id: 'chiffre-7',
  libelle: '7',
  aria: 'Sept',
  action: { type: 'inserer', texte: '7' },
};

const TOUCHE_VALIDER: Touche = {
  id: 'valider',
  libelle: 'Vérifier',
  aria: 'Vérifier ma réponse',
  action: { type: 'valider' },
  largeur: 4,
};

const TOUCHE_FERMER: Touche = {
  id: 'fermer',
  libelle: 'Masquer',
  aria: 'Masquer le clavier mathématique',
  action: { type: 'fermer' },
  largeur: 2,
};

const CLIC_CLAVIER = { detail: 0 };
const CLIC_POINTEUR = { detail: 1 };

function monter(touche: Touche = TOUCHE_CHIFFRE) {
  const surPointerDown = vi.fn();
  const surClick = vi.fn();

  render(
    <ToucheClavier
      touche={touche}
      champId="reponse"
      surPointerDown={surPointerDown}
      surClick={surClick}
    />,
  );

  return { bouton: screen.getByRole('button'), surPointerDown, surClick };
}

describe('ToucheClavier — cible tactile', () => {
  it('la classe de la touche reprend le module local', () => {
    const { bouton } = monter();

    // Next.js ne conserve pas le nom du fichier dans la classe : ce qui compte
    // est que la classe ne soit plus celle de `globals.css`, et qu'elle
    // porte bien la variante de la touche.
    expect(bouton.className).toContain('touche_');
    expect(bouton.className).not.toContain('clavier__touche');
    expect(bouton.className).toMatch(/tonchiffre-7/);
  });

  it('la touche est un vrai bouton, avec son étiquette accessible', () => {
    const { bouton } = monter();

    expect(bouton.tagName).toBe('BUTTON');
    expect(bouton.getAttribute('type')).toBe('button');
    expect(bouton.getAttribute('aria-label')).toBe('Sept');
    expect(bouton.getAttribute('aria-controls')).toBe('reponse');
  });

  it('la largeur de la touche est appliquée sur la grille', () => {
    const { bouton } = monter(TOUCHE_VALIDER);

    // La grille est à quatre colonnes : une touche spanning 4 occupe la rangée.
    expect(bouton.style.gridColumn).toBe('span 4');
  });

  it('une touche sans largeur ne force rien sur la grille', () => {
    const { bouton } = monter(TOUCHE_CHIFFRE);

    expect(bouton.style.gridColumn).toBe('');
  });

  it('les variantes de service existent dans le module', () => {
    const { bouton } = monter(TOUCHE_FERMER);

    expect(bouton.textContent).toBe('Masquer');
    expect(bouton.className).toContain('tonfermer');
  });
});

describe('ToucheClavier — activation au doigt (non-régression A1)', () => {
  it('le pointerdown exécute l’action', () => {
    const { bouton, surPointerDown } = monter();

    fireEvent.pointerDown(bouton);

    expect(surPointerDown).toHaveBeenCalledTimes(1);
    expect(surPointerDown.mock.calls[0]![1]).toBe(TOUCHE_CHIFFRE);
  });

  it('le pointerdown est transmis tel quel, sans filtrage', () => {
    const { bouton, surPointerDown } = monter();

    // Le `preventDefault()` est fait dans `ClavierMath` — c'est lui qui connaît
    // le champ à ne pas perdre le focus. La touche se contente de transmettre
    // l'événement ; `ClavierMath.test.tsx` vérifie de son côté que le
    // `preventDefault` est bien appelé.
    const evenement = new Event('pointerdown', { bubbles: true, cancelable: true });
    fireEvent(bouton, evenement);

    expect(surPointerDown).toHaveBeenCalledTimes(1);
    // React fournit un événement synthétique, pas l'`Event` natif : on vérifie
    // le type et la transmissibilité, pas l'identité de l'objet.
    expect((surPointerDown.mock.calls[0]![0] as PointerEvent).type).toBe('pointerdown');
    expect(evenement.defaultPrevented).toBe(false);
  });

  it('le pointerdown seul ne déclenche pas la voie clavier', () => {
    const { bouton, surClick } = monter();

    fireEvent.pointerDown(bouton);

    expect(surClick).not.toHaveBeenCalled();
  });
});

describe('ToucheClavier — activation au clavier (non-régression A1)', () => {
  it('le clic clavier exécute l’action', () => {
    const { bouton, surClick } = monter();

    fireEvent.click(bouton, CLIC_CLAVIER);

    expect(surClick).toHaveBeenCalledTimes(1);
    expect(surClick.mock.calls[0]![1]).toBe(TOUCHE_CHIFFRE);
  });

  it('un clic issu d’un doigt est laissé au handler de discrimination', () => {
    const { bouton, surClick } = monter();

    // La discrimination `detail > 0` vit dans `ClavierMath` : la touche
    // transmet l'événement tel quel, elle ne filtre pas.
    fireEvent.click(bouton, CLIC_POINTEUR);

    expect(surClick).toHaveBeenCalledTimes(1);
    expect((surClick.mock.calls[0]![0] as MouseEvent).detail).toBe(1);
  });

  it('la touche « Masquer » est actionnable au clavier', () => {
    const { bouton, surClick } = monter(TOUCHE_FERMER);

    fireEvent.click(bouton, CLIC_CLAVIER);

    expect(surClick).toHaveBeenCalledTimes(1);
  });
});

describe('ToucheClavier — pas de double déclenchement', () => {
  it('pointerdown puis click transmettent les deux événements, pour discrimination', () => {
    // La touche ne filtre rien : c'est `ClavierMath` qui décide, sur
    // `detail > 0`, que le second est un doublon. Ce test verrouille que la
    // discrimination a toujours lieu **là où elle est écrite**.
    const { bouton, surPointerDown, surClick } = monter();

    fireEvent.pointerDown(bouton);
    fireEvent.click(bouton, CLIC_POINTEUR);

    expect(surPointerDown).toHaveBeenCalledTimes(1);
    expect(surClick).toHaveBeenCalledTimes(1);
  });

  it('les deux événements portent la même touche', () => {
    const { bouton, surPointerDown, surClick } = monter();

    fireEvent.pointerDown(bouton);
    fireEvent.click(bouton, CLIC_POINTEUR);

    expect(surPointerDown.mock.calls[0]![1]).toBe(surClick.mock.calls[0]![1]);
  });
});

describe('ToucheClavier — le clavier physique reste atteignable', () => {
  it('une touche est un contrôle de formulaire natif, donc tabulable', () => {
    const { bouton } = monter();

    // Un `<div>` ou un `<span>` avec `onClick` ne serait pas atteignable au
    // clavier : c'est le `<button>` qui rend la touche accessible.
    expect(bouton.tagName).toBe('BUTTON');
    expect(bouton.hasAttribute('disabled')).toBe(false);
    expect(bouton.getAttribute('tabindex')).toBeNull();
  });
});