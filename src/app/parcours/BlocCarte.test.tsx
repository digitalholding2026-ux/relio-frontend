import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BlocCarte } from '@/app/parcours/BlocCarte';
import type { BlocPublic } from '@/lib/parcours';

/**
 * Une carte de bloc — ouvert et fermé.
 *
 * ## La règle que ces tests verrouillent
 *
 * **Un bloc fermé n'expose rien.** Pas de liste d'exercices, pas un seul lien.
 * Un élève ne doit pas pouvoir cliquer sur ce qu'il ne peut pas faire : voir
 * « Exercice 3 » sous « disponible dans six semaines » l'inviterait à chercher
 * un écran qui n'existe pas.
 *
 * `BlocCarte` est un composant pur : il reçoit le bloc et le rend. Aucune
 * requête, aucune dépendance à l'environnement — c'est ce qui permet de
 * couvrir les deux états sans stubper `fetch`.
 */

function exercice(rang: number): BlocPublic['exercices'][number] {
  return {
    id: `MVP-B1-E${rang}`,
    blocId: 'B1',
    rang,
    objectifs: ['OO-L1-1'],
    enonce: `Énoncé ${rang}`,
    consigne: `Consigne de l’exercice ${rang}.`,
    typeReponse: 'expression',
    formeDemandee: null,
    nbIndices: 3,
    origine: 'originale',
  };
}

const BLOC_OUVERT: BlocPublic = {
  id: 'B1',
  titre: 'Calcul littéral',
  leconId: 'LEC-CM-MATH-3E-2025-2026-01',
  volumeHoraireH: 7,
  semaineDebut: 1,
  disponible: true,
  semainesAvantOuverture: null,
  objectifs: [
    { id: 'OO-L1-1', libelle: 'Développer et réduire une expression', prerequis: [] },
    { id: 'OO-L1-2', libelle: 'Factoriser une expression', prerequis: ['OO-L1-1'] },
  ],
  exercices: [exercice(1), exercice(2)],
};

const BLOC_FERME: BlocPublic = {
  id: 'B3',
  titre: 'Calcul numérique',
  leconId: 'LEC-CM-MATH-3E-2025-2026-09',
  volumeHoraireH: 6,
  semaineDebut: 10,
  disponible: false,
  semainesAvantOuverture: 5,
  objectifs: [],
  exercices: [],
};

describe('BlocCarte — bloc ouvert', () => {
  it('affiche le titre du bloc', () => {
    render(<BlocCarte bloc={BLOC_OUVERT} />);

    expect(screen.getByRole('heading', { name: 'Calcul littéral' })).toBeDefined();
  });

  it('affiche une pastille « Ouvert », portée par son texte', () => {
    render(<BlocCarte bloc={BLOC_OUVERT} />);

    expect(screen.getByText('Ouvert')).toBeDefined();
  });

  it('liste les exercices du bloc', () => {
    render(<BlocCarte bloc={BLOC_OUVERT} />);

    const liens = screen.getAllByRole('link');
    expect(liens).toHaveLength(2);
    expect(liens[0]!.textContent).toContain('Exercice 1');
    expect(liens[1]!.textContent).toContain('Exercice 2');
  });

  it('chaque lien pointe vers la route de son exercice', () => {
    render(<BlocCarte bloc={BLOC_OUVERT} />);

    const liens = screen.getAllByRole('link');
    expect(liens[0]!.getAttribute('href')).toBe('/parcours/MVP-B1-E1');
    expect(liens[1]!.getAttribute('href')).toBe('/parcours/MVP-B1-E2');
  });

  it('chaque exercice est un <a>, jamais un <button>', () => {
    render(<BlocCarte bloc={BLOC_OUVERT} />);

    // Un `<button>` ne s'ouvre pas dans un nouvel onglet et n'affiche pas
    // l'adresse dans la barre d'état : ce serait un défaut de navigation.
    for (const lien of screen.getAllByRole('link')) {
      expect(lien.tagName).toBe('A');
    }
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('chaque lien montre la consigne de l’exercice', () => {
    render(<BlocCarte bloc={BLOC_OUVERT} />);

    const lien = screen.getByRole('link', { name: /Exercice 1/ });
    expect(lien.textContent).toContain('Consigne de l’exercice 1.');
  });

  it('affiche les objectifs du bloc', () => {
    render(<BlocCarte bloc={BLOC_OUVERT} />);

    expect(screen.getByText('Développer et réduire une expression')).toBeDefined();
    expect(screen.getByText('Factoriser une expression')).toBeDefined();
  });

  it('le bloc est une région nommée par son titre', () => {
    const { container } = render(<BlocCarte bloc={BLOC_OUVERT} />);

    const section = container.querySelector('section');
    expect(section!.getAttribute('aria-labelledby')).toBe('titre-B1');
    expect(container.querySelector('#titre-B1')).not.toBeNull();
  });
});

describe('BlocCarte — bloc fermé', () => {
  it('affiche le titre du bloc', () => {
    render(<BlocCarte bloc={BLOC_FERME} />);

    expect(screen.getByRole('heading', { name: 'Calcul numérique' })).toBeDefined();
  });

  it('affiche la pastille « Ouvre à la semaine X », portée par son texte', () => {
    render(<BlocCarte bloc={BLOC_FERME} />);

    expect(screen.getByText('Ouvre à la semaine 10')).toBeDefined();
  });

  it('n’expose AUCUN lien', () => {
    const { container } = render(<BlocCarte bloc={BLOC_FERME} />);

    expect(screen.queryAllByRole('link')).toHaveLength(0);
    expect(container.querySelector('a')).toBeNull();
    expect(container.querySelector('button')).toBeNull();
  });

  it('n’affiche aucune liste d’exercices', () => {
    const { container } = render(<BlocCarte bloc={BLOC_FERME} />);

    // Une liste vide se lirait comme un contenu manquant.
    expect(container.querySelectorAll('ul')).toHaveLength(0);
  });

  it('indique la semaine d’ouverture, en texte et en région vivante', () => {
    render(<BlocCarte bloc={BLOC_FERME} />);

    const message = screen.getByText('Disponible à partir de la semaine 10.');
    expect(message.getAttribute('role')).toBe('status');
  });

  it('ne montre pas de pastille « Ouvert »', () => {
    render(<BlocCarte bloc={BLOC_FERME} />);

    expect(screen.queryByText('Ouvert')).toBeNull();
  });
});

describe('BlocCarte — cas limites', () => {
  it('un bloc ouvert sans exercice n’affiche aucune liste vide', () => {
    // L'API renvoie `exercices: []` pour un bloc fermé. Si `disponible` et
    // `exercices` divergeaient, aucune liste ne doit apparaître : une liste
    // vide se lit comme un contenu manquant, pas comme « pas encore ».
    const bloc: BlocPublic = { ...BLOC_OUVERT, disponible: true, exercices: [] };
    const { container } = render(<BlocCarte bloc={bloc} />);

    // Aucune liste d'exercices, et aucun lien : une liste vide se lit comme un
    // contenu manquant, pas comme « pas encore ».
    const listes = container.querySelectorAll('ul');
    for (const liste of Array.from(listes)) {
      expect(within(liste as HTMLElement).queryByRole('link')).toBeNull();
    }
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('un bloc sans objectif n’affiche pas de liste d’objectifs vide', () => {
    const bloc: BlocPublic = { ...BLOC_OUVERT, objectifs: [] };
    const { container } = render(<BlocCarte bloc={bloc} />);

    // Seule la liste des exercices subsiste : deux éléments, deux liens.
    const listes = container.querySelectorAll('ul');
    expect(listes).toHaveLength(1);
    expect(listes[0]!.querySelectorAll('li')).toHaveLength(2);
  });

  it('deux blocs portent des identifiants de titre distincts', () => {
    const { container, unmount } = render(<BlocCarte bloc={BLOC_OUVERT} />);
    const premier = container.querySelector('h2')!.id;
    unmount();

    const second = render(<BlocCarte bloc={BLOC_FERME} />);
    expect(second.container.querySelector('h2')!.id).not.toBe(premier);
  });

  it('les exercices sont dans une liste, pas une suite de paragraphes', () => {
    const { container } = render(<BlocCarte bloc={BLOC_OUVERT} />);

    // Deux objectifs + deux exercices.
    const items = container.querySelectorAll('li');
    expect(items).toHaveLength(4);

    // Les deux derniers sont les exercices, et chacun contient son lien.
    for (const item of Array.from(items).slice(2)) {
      expect(within(item as HTMLElement).getByRole('link')).toBeDefined();
    }
  });
});