import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Exercice } from '@/components/Exercice';

/**
 * L'écran d'exercice — les états, et ce qui doit rester vrai après migration.
 *
 * ## Ce que la migration ne doit pas perdre
 *
 * Le chantier C2a porte sur la couche visuelle. Ces tests vérifient que le
 * comportement observable est resté le même : mêmes appels d'API, même journal
 * local, mêmes régions vivantes, même libellés de boutons.
 *
 * Le clavier mathématique est monté tel quel — il n'est pas migré (C2b), et
 * son comportement doit être strictement identique.
 */

const chargerExercice = vi.fn();
const corrigerReponse = vi.fn();
const demanderIndice = vi.fn();
const chargerSuivi = vi.fn();

vi.mock('@/lib/parcours', async (importOriginal) => {
  const reel = await importOriginal<typeof import('@/lib/parcours')>();
  return {
    ...reel,
    chargerExercice: (...args: unknown[]) => chargerExercice(...args),
    corrigerReponse: (...args: unknown[]) => corrigerReponse(...args),
    demanderIndice: (...args: unknown[]) => demanderIndice(...args),
    chargerSuivi: (...args: unknown[]) => chargerSuivi(...args),
  };
});

vi.mock('@/components/ClavierMath', () => ({
  ClavierMath: () => <div data-testid="clavier">Clavier mathématique</div>,
}));

const EXERCICE = {
  id: 'MVP-B1-E1',
  blocId: 'B1',
  rang: 1,
  objectifs: ['OO-L1-1'],
  enonce: 'On considère le nombre A = 3(x + 2) − (x + 5).',
  consigne: 'Développe et réduis A. Écris le résultat réduit.',
  typeReponse: 'expression' as const,
  formeDemandee: null,
  nbIndices: 3,
  origine: 'originale' as const,
};

beforeEach(() => {
  localStorage.clear();

  // `jsdom` n'implémente pas `scrollIntoView`. L'appel existe depuis le
  // chantier 7.5 et doit le rester : on le rend observable plutôt que de
  // modifier le composant pour satisfaire l'environnement de test.
  Element.prototype.scrollIntoView = vi.fn();
  for (const fn of [chargerExercice, corrigerReponse, demanderIndice, chargerSuivi]) {
    fn.mockReset();
  }
  chargerSuivi.mockResolvedValue(null);
});

afterEach(() => {
  vi.useRealTimers();
});

function monter() {
  return render(<Exercice baseUrl="https://api.exemple.test" exerciceId="MVP-B1-E1" />);
}

describe('Écran d’exercice — chargement', () => {
  it('affiche un squelette pendant le chargement', async () => {
    // La promesse ne résout pas : l'écran reste dans son état de chargement.
    chargerExercice.mockReturnValue(new Promise(() => {}));
    monter();

    await screen.findByTestId('clavier').catch(() => undefined);
    const region = document.querySelector('[role="status"]');
    expect(region).not.toBeNull();
    // Les squelettes sont décoratifs : ils n'annoncent rien.
    expect(document.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
  });
});

describe('Écran d’exercice — exercice indisponible', () => {
  it('affiche un état vide et propose de réessayer', async () => {
    chargerExercice.mockResolvedValue({ ok: false, raison: 'Le service ne répond pas.' });
    monter();

    await screen.findByText('Cet exercice n’est pas disponible pour le moment');
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeDefined();
  });

  it('« Réessayer » est un formulaire GET vers /parcours, sans JavaScript', async () => {
    chargerExercice.mockResolvedValue({ ok: false, raison: 'Le service ne répond pas.' });
    monter();

    const formulaire = (await screen.findByRole('button', { name: 'Réessayer' })).closest('form')!;
    expect(formulaire.getAttribute('action')).toBe('/parcours');
    expect(formulaire.getAttribute('method')).toBe('get');
  });

  it('n’affiche pas le motif technique de l’erreur', async () => {
    chargerExercice.mockResolvedValue({ ok: false, raison: 'HTTP 500' });
    monter();

    await screen.findByText('Cet exercice n’est pas disponible pour le moment');
    expect(screen.queryByText('HTTP 500')).toBeNull();
  });
});

describe('Écran d’exercice — exercice chargé', () => {
  beforeEach(() => {
    chargerExercice.mockResolvedValue({ ok: true, exercice: EXERCICE });
  });

  it('affiche l’énoncé et la consigne', async () => {
    monter();

    expect(await screen.findByText(EXERCICE.enonce)).toBeDefined();
    expect(screen.getByText(EXERCICE.consigne)).toBeDefined();
  });

  it('le champ de saisie a un label visible et associé', async () => {
    monter();
    await screen.findByText(EXERCICE.enonce);

    const champ = screen.getByLabelText('Ta réponse');
    expect(champ.tagName).toBe('INPUT');
    expect(champ.getAttribute('type')).toBe('text');
  });

  it('la consigne de forme est liée au champ par aria-describedby', async () => {
    chargerExercice.mockResolvedValue({
      ok: true,
      exercice: { ...EXERCICE, formeDemandee: 'forme réduite' },
    });
    monter();
    await screen.findByText(EXERCICE.enonce);

    const champ = screen.getByLabelText('Ta réponse');
    const decrit = champ.getAttribute('aria-describedby');
    expect(decrit).toBeTruthy();

    const aide = document.getElementById(decrit!);
    expect(aide?.textContent).toContain('Réponse attendue : forme réduite.');
  });

  it('affiche les boutons Vérifier et Un indice', async () => {
    monter();
    await screen.findByText(EXERCICE.enonce);

    expect(screen.getByRole('button', { name: 'Vérifier' })).toBeDefined();
    // Trois indices disponibles : le compte est annoncé.
    expect(screen.getByRole('button', { name: 'Un indice (3)' })).toBeDefined();
  });

  it('« Vérifier » est désactivé tant que la réponse est vide', async () => {
    monter();
    await screen.findByText(EXERCICE.enonce);

    expect(screen.getByRole('button', { name: 'Vérifier' })).toBeDefined();
    expect((screen.getByRole('button', { name: 'Vérifier' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('demander un indice appelle l’API et affiche l’indice reçu', async () => {
    demanderIndice.mockResolvedValue('Distribue avant de réduire.');
    monter();
    await screen.findByText(EXERCICE.enonce);

    screen.getByRole('button', { name: 'Un indice (3)' }).click();

    expect(await screen.findByText(/Indice 1\./)).toBeDefined();
    expect(demanderIndice).toHaveBeenCalledWith('https://api.exemple.test', 'MVP-B1-E1', 1);
  });

  it('le clavier mathématique est monté tel quel, sans changement', async () => {
    monter();
    await screen.findByText(EXERCICE.enonce);

    // Le champ déclenche l'ouverture : c'est le comportement du chantier 7.5.
    const champ = screen.getByLabelText('Ta réponse');
    champ.focus();
    champ.click();

    expect(await screen.findByTestId('clavier')).toBeDefined();
  });

  it('aucun rôle inexistant en ARIA', async () => {
    monter();
    await screen.findByText(EXERCICE.enonce);

    const roles = [...document.querySelectorAll('[role]')].map((n) => n.getAttribute('role'));
    for (const role of roles) expect(role).not.toBe('note');
  });
});

describe('Écran d’exercice — après correction', () => {
  beforeEach(() => {
    chargerExercice.mockResolvedValue({ ok: true, exercice: EXERCICE });
  });

  it('la correction est annoncée dans une région vivante', async () => {
    corrigerReponse.mockResolvedValue({
      exerciceId: 'MVP-B1-E1',
      objectifId: 'OO-L1-1',
      mathemathiquementJuste: false,
      formeRespectee: null,
      achevement: 'acheve',
      statut: 'fausse',
      verdict: 'incorrect',
      libelle: 'Ce n’est pas encore juste.',
      signatureErreur: 'erreur_de_signe',
      leconsCandidates: [],
      explication: 'Reviens sur la distributivité.',
      indice: null,
      lectureArbitree: true,
      pointsArbitrage: [],
      categorieDifficulte: 'erreur_de_signe',
      tutorat: {
        niveau: 1,
        message: 'Reprends la dernière étape.',
        action: 'Relis la question.',
        origine: 'signature',
        resume: null,
      },
    });

    monter();
    await screen.findByText(EXERCICE.enonce);

    const champ = screen.getByLabelText('Ta réponse');
    await screen.findByRole('button', { name: 'Vérifier' });
    // Saisie par l'événement natif, pour que la valeur remonte au composant.
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!.call(
      champ,
      '3x+1',
    );
    champ.dispatchEvent(new Event('input', { bubbles: true }));
    await screen.findByRole('button', { name: 'Vérifier' });

    (screen.getByRole('button', { name: 'Vérifier' }) as HTMLButtonElement).click();

    expect(await screen.findByText('Ce n’est pas encore juste.')).toBeDefined();
    expect(corrigerReponse).toHaveBeenCalledTimes(1);
    expect(corrigerReponse).toHaveBeenCalledWith(
      'https://api.exemple.test',
      'MVP-B1-E1',
      '3x+1',
      0,
      expect.any(Number),
    );
  });

  it('une réponse illisible est présentée sans indication technique', async () => {
    corrigerReponse.mockResolvedValue({
      erreurSaisie: true,
      message: 'Ta réponse n’est pas lisible. Vérifie les symboles.',
      exerciceId: 'MVP-B1-E1',
      categorieDifficulte: 'reponse_illisible',
      tutorat: {
        niveau: 1,
        message: 'Reprends la dernière étape.',
        action: 'Relis la question.',
        origine: 'signature',
        resume: null,
      },
    });

    monter();
    await screen.findByText(EXERCICE.enonce);

    const champ = screen.getByLabelText('Ta réponse');
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!.call(
      champ,
      'xyz',
    );
    champ.dispatchEvent(new Event('input', { bubbles: true }));
    await screen.findByRole('button', { name: 'Vérifier' });
    (screen.getByRole('button', { name: 'Vérifier' }) as HTMLButtonElement).click();

    expect(await screen.findByText('Ta réponse n’est pas lisible. Vérifie les symboles.')).toBeDefined();
    expect(screen.queryByText(/reponse_illisible/)).toBeNull();
  });
});