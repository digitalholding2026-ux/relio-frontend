import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ClavierMath } from '@/components/ClavierMath';
import type { EtatSaisie, TypeReponse } from '@/lib/clavier';

/**
 * Clavier mathématique — activation au clavier physique.
 *
 * Le composant n'écoutait que `pointerdown`. Les touches étant des
 * `<button type="button">`, le navigateur déclenche un `click` sur Enter et sur
 * Espace : ce `click` n'était écouté par personne. Les 25 touches, y compris
 * « Masquer » et « Clavier système », étaient donc inopérantes au clavier
 * physique, au commutateur d'accès et à toute technologie d'assistance.
 *
 * Ces tests montent réellement le composant et vérifient les deux voies.
 */

/** Un `click` que le navigateur produit depuis le clavier porte `detail === 0`. */
const CLIC_CLAVIER = { detail: 0 };
/** Un `click` que le navigateur produit depuis un doigt ou une souris. */
const CLIC_POINTEUR = { detail: 1 };

function monter(typeReponse: TypeReponse = 'expression') {
  const champRef = createRef<HTMLInputElement>();
  const surChange = vi.fn<(etat: EtatSaisie) => void>();
  const surValider = vi.fn();
  const surFermer = vi.fn();
  const surSysteme = vi.fn();

  render(
    <>
      <input id="reponse" ref={champRef} aria-label="Ma réponse" />
      <ClavierMath
        typeReponse={typeReponse}
        onChange={surChange}
        onValider={surValider}
        onFermer={surFermer}
        onSysteme={surSysteme}
        champId="reponse"
        champRef={champRef}
      />
    </>,
  );

  return { surChange, surValider, surFermer, surSysteme };
}

function touche(nomAccessible: string): HTMLElement {
  return screen.getByRole('button', { name: nomAccessible });
}

describe('ClavierMath — activation au clavier physique', () => {
  it('déclenche l’action au clic clavier (Entrée)', () => {
    const { surValider } = monter();

    fireEvent.click(touche('Vérifier ma réponse'), CLIC_CLAVIER);

    expect(surValider).toHaveBeenCalledTimes(1);
  });

  it('déclenche l’action au clic clavier (Espace)', () => {
    const { surChange } = monter();

    fireEvent.click(touche('Sept'), CLIC_CLAVIER);

    // Une frappe numérique doit modifier la saisie, pas valider.
    expect(surChange).toHaveBeenCalledTimes(1);
    expect(surChange.mock.calls[0]![0]).toEqual({ valeur: '7', curseur: 1 });
  });

  it('la touche Masquer est actionnable au clavier', () => {
    const { surFermer } = monter();

    fireEvent.click(touche('Masquer le clavier mathématique'), CLIC_CLAVIER);

    expect(surFermer).toHaveBeenCalledTimes(1);
  });

  it('la touche Clavier système est actionnable au clavier', () => {
    const { surSysteme } = monter();

    fireEvent.click(touche('Utiliser le clavier du téléphone'), CLIC_CLAVIER);

    expect(surSysteme).toHaveBeenCalledTimes(1);
  });

  it('chaque touche du service est actionnable au clavier', () => {
    const { surValider, surFermer, surSysteme } = monter('rationnelle');

    fireEvent.click(touche('Vérifier ma réponse'), CLIC_CLAVIER);
    fireEvent.click(touche('Masquer le clavier mathématique'), CLIC_CLAVIER);
    fireEvent.click(touche('Utiliser le clavier du téléphone'), CLIC_CLAVIER);

    expect(surValider).toHaveBeenCalledTimes(1);
    expect(surFermer).toHaveBeenCalledTimes(1);
    expect(surSysteme).toHaveBeenCalledTimes(1);
  });
});

describe('ClavierMath — le tactile reste réactif et ne double pas', () => {
  it('le pointerdown exécute l’action', () => {
    const { surValider } = monter();

    fireEvent.pointerDown(touche('Vérifier ma réponse'));

    expect(surValider).toHaveBeenCalledTimes(1);
  });

  it('le pointerdown empêche le comportement natif (le focus ne doit pas quitter le champ)', () => {
    monter();
    const evenement = new Event('pointerdown', { bubbles: true, cancelable: true });
    fireEvent(touche('Sept'), evenement);

    expect(evenement.defaultPrevented).toBe(true);
  });

  it('pointerdown suivi de click n’exécute l’action qu’une seule fois', () => {
    const { surChange } = monter();

    fireEvent.pointerDown(touche('Sept'));
    fireEvent.click(touche('Sept'), CLIC_POINTEUR);

    expect(surChange).toHaveBeenCalledTimes(1);
    expect(surChange.mock.calls[0]![0]).toEqual({ valeur: '7', curseur: 1 });
  });

  it('pointerdown puis deux clicks n’exécute toujours l’action qu’une fois', () => {
    const { surFermer } = monter();

    fireEvent.pointerDown(touche('Masquer le clavier mathématique'));
    fireEvent.click(touche('Masquer le clavier mathématique'), CLIC_POINTEUR);
    fireEvent.click(touche('Masquer le clavier mathématique'), CLIC_POINTEUR);

    expect(surFermer).toHaveBeenCalledTimes(1);
  });

it('un click porteur d’un point d’appui est ignoré : le pointerdown a déjà fait le travail', () => {
    const { surChange } = monter();

    // C'est le cœur du contrat anti-double-exécution : tout `click` suivi d'un
    // point d'appui (doigt, souris, stylet) est un doublon du `pointerdown`.
    fireEvent.click(touche('Sept'), CLIC_POINTEUR);

    expect(surChange).not.toHaveBeenCalled();
  });

  it('après un pointerdown, un clic clavier ultérieur fonctionne normalement', () => {
    const { surChange } = monter();

    fireEvent.pointerDown(touche('Sept'));
    fireEvent.click(touche('Sept'), CLIC_CLAVIER);

    // Le clic clavier n'est pas un doublon du pointerdown : les deux doivent
    // s'exécuter, dans l'ordre.
    expect(surChange).toHaveBeenCalledTimes(2);
    expect(surChange.mock.calls[1]![0]).toEqual({ valeur: '7', curseur: 1 });
  });
});

describe('ClavierMath — insertion au curseur, aucune régression', () => {
  it('insère au milieu de la saisie, pas seulement à la fin', () => {
    const { surChange } = monter();

    const champ = screen.getByLabelText('Ma réponse') as HTMLInputElement;
    champ.value = '12';
    champ.setSelectionRange(1, 1);

    fireEvent.click(touche('Sept'), CLIC_CLAVIER);

    expect(surChange).toHaveBeenCalledTimes(1);
    expect(surChange.mock.calls[0]![0]).toEqual({ valeur: '172', curseur: 2 });
  });

  it('la touche « effacer » vide la saisie', () => {
    const { surChange } = monter();

    const champ = screen.getByLabelText('Ma réponse') as HTMLInputElement;
    champ.value = '25';
    champ.setSelectionRange(2, 2);

    fireEvent.click(touche('Effacer toute la réponse'), CLIC_CLAVIER);

    expect(surChange).toHaveBeenCalledTimes(1);
    expect(surChange.mock.calls[0]![0]).toEqual({ valeur: '', curseur: 0 });
  });

  it('la touche « fraction » insère la barre au curseur', () => {
    const { surChange } = monter('rationnelle');

    const champ = screen.getByLabelText('Ma réponse') as HTMLInputElement;
    champ.value = '3';
    champ.setSelectionRange(1, 1);

    fireEvent.click(touche('Fraction, pour écrire un numérateur et un dénominateur'), CLIC_CLAVIER);

    expect(surChange).toHaveBeenCalledTimes(1);
    expect(surChange.mock.calls[0]![0].valeur).toContain('/');
  });
});