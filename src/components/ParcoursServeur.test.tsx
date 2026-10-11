import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ParcoursServeur } from '@/components/ParcoursServeur';

/**
 * Rendu effectif des rôles — complément du contrôle statique
 * `design/roles-aria.test.ts`.
 *
 * Le contrôle statique vérifie qu'aucun `role="note"` ne subsiste dans le
 * code. Celui-ci vérifie que le rôle annoncé **existe réellement dans le
 * DOM** et est donc exposé au lecteur d'écran, ce qu'un attribut invalide ne
 * fait pas.
 */

vi.mock('@/lib/parcours', async (importOriginal) => {
  const reel = await importOriginal<typeof import('@/lib/parcours')>();
  return { ...reel, chargerParcours: vi.fn() };
});

const { chargerParcours } = await import('@/lib/parcours');
const chargerParcoursSimule = vi.mocked(chargerParcours);

function parcoursAvecBlocs(blocs: unknown[]) {
  chargerParcoursSimule.mockResolvedValue(
    // La forme suit `ParcoursEtat` : seules les clés lues par le rendu sont
    // nécessaires, le reste est validé par le type du module d'origine.
    {
      kind: 'parcours',
      parcours: {
        version: 'mvp-1',
        anneeScolaire: {
          debut: '2026-09-07',
          semaine: 5,
          dansAnneeScolaire: true,
          anneeTerminee: false,
        },
        message: 'Semaine 5 de l’année scolaire.',
        blocs,
      },
    } as Awaited<ReturnType<typeof chargerParcours>>,
  );
}

describe('ParcoursServeur — rôle du message de bloc fermé', () => {
  it('le message « disponible à partir de la semaine N » est exposé au lecteur d’écran', async () => {
    parcoursAvecBlocs([
      {
        id: 'B3',
        titre: 'Statistiques',
        leconId: 'LEC-CM-MATH-3E-2025-2026-09',
        volumeHoraireH: 6,
        semaineDebut: 10,
        disponible: false,
        semainesAvantOuverture: 5,
        objectifs: [],
        exercices: [],
      },
    ]);

    render(await ParcoursServeur({ baseUrl: 'http://exemple.test' }));

    const message = screen.getByText('Disponible à partir de la semaine 10.');
    // `role="status"` → région vivante polie, annoncée sans interrompre.
    expect(message.getAttribute('role')).toBe('status');
    expect(message.closest('[role="note"]')).toBeNull();
  });

  it('le message « bloc pas encore ouvert » est exposé au lecteur d’écran', async () => {
    parcoursAvecBlocs([
      {
        id: 'B2',
        titre: 'Fonctions',
        leconId: 'LEC-CM-MATH-3E-2025-2026-07',
        volumeHoraireH: 8,
        semaineDebut: 5,
        disponible: false,
        semainesAvantOuverture: null,
        objectifs: [],
        exercices: [],
      },
    ]);

    render(await ParcoursServeur({ baseUrl: 'http://exemple.test' }));

    expect(screen.getByText('Ce bloc n’est pas encore ouvert.').getAttribute('role')).toBe('status');
  });

  it('aucun élément rendu ne porte un rôle inconnu', async () => {
    parcoursAvecBlocs([
      {
        id: 'B1',
        titre: 'Calcul littéral',
        leconId: 'LEC-CM-MATH-3E-2025-2026-01',
        volumeHoraireH: 7,
        semaineDebut: 1,
        disponible: true,
        semainesAvantOuverture: null,
        objectifs: [{ id: 'OO-L1-1', libelle: 'Développer et réduire une expression' }],
        exercices: [{ id: 'MVP-B1-E1', titre: 'Une expression', rang: 1, objectifs: ['OO-L1-1'] }],
      },
      {
        id: 'B3',
        titre: 'Statistiques',
        leconId: 'LEC-CM-MATH-3E-2025-2026-09',
        volumeHoraireH: 6,
        semaineDebut: 10,
        disponible: false,
        semainesAvantOuverture: 5,
        objectifs: [],
        exercices: [],
      },
    ]);

    const { container } = render(await ParcoursServeur({ baseUrl: 'http://exemple.test' }));

    const roles = [...container.querySelectorAll('[role]')].map((n) => n.getAttribute('role'));
    expect(roles).toContain('status');
    for (const role of roles) {
      expect(role).not.toBe('note');
    }
  });

  it('un bloc fermé n’expose aucun exercice', async () => {
    parcoursAvecBlocs([
      {
        id: 'B3',
        titre: 'Statistiques',
        leconId: 'LEC-CM-MATH-3E-2025-2026-09',
        volumeHoraireH: 6,
        semaineDebut: 10,
        disponible: false,
        semainesAvantOuverture: 5,
        objectifs: [],
        exercices: [{ id: 'MVP-B3-E1', titre: 'Une statistique', rang: 1, objectifs: [] }],
      },
    ]);

    render(await ParcoursServeur({ baseUrl: 'http://exemple.test' }));

    expect(screen.queryByText('Une statistique')).toBeNull();
  });
});