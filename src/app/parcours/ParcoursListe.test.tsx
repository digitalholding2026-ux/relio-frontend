import { render, screen } from '@testing-library/react';
import { renderToReadableStream } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import PageParcours from '@/app/parcours/page';
import { ParcoursListe, ParcoursListeEnAttente } from '@/app/parcours/ParcoursListe';
import type { ParcoursEtat } from '@/lib/parcours';

/**
 * La page `/parcours` — les quatre états, et l'écran complet.
 *
 * ## Deux façons de rendre, pour deux raisons
 *
 * `ParcoursListe` est un composant **pur** : il reçoit l'état et le rend. Il se
 * teste directement, ce qui permet de couvrir les quatre états sans stubber
 * `fetch`.
 *
 * `PageParcours` contient des composants serveur asynchrones, que le runtime de
 * rendu client des tests ne sait pas résoudre — React réserve les composants
 * `async` au pipeline serveur de Next.js. Elle se teste donc par
 * `renderToReadableStream`, qui est le moteur du build, et produit exactement
 * le HTML que le navigateur recevra.
 */

function bloc(partiel: Record<string, unknown> = {}) {
  return {
    id: 'B1',
    titre: 'Calcul littéral',
    leconId: 'LEC-CM-MATH-3E-2025-2026-01',
    volumeHoraireH: 7,
    semaineDebut: 1,
    disponible: true,
    semainesAvantOuverture: null,
    objectifs: [{ id: 'OO-L1-1', libelle: 'Développer une expression', prerequis: [] }],
    exercices: [
      {
        id: 'MVP-B1-E1',
        blocId: 'B1',
        rang: 1,
        objectifs: ['OO-L1-1'],
        enonce: 'Énoncé',
        consigne: 'Développe et réduis A.',
        typeReponse: 'expression' as const,
        formeDemandee: null,
        nbIndices: 3,
        origine: 'originale' as const,
      },
    ],
    ...partiel,
  };
}

const BLOCS_OUVERTS: ParcoursEtat = {
  kind: 'parcours',
  parcours: {
    version: 'mvp-1',
    anneeScolaire: { debut: '2026-09-07', semaine: 5, dansAnneeScolaire: true, anneeTerminee: false },
    message: 'Semaine 5 de l’année scolaire.',
    blocs: [bloc(), bloc({ id: 'B2', titre: 'Racines carrées', semaineDebut: 5, leconId: 'LEC-02' })],
  },
};

const AUCUN_OUVERT: ParcoursEtat = {
  kind: 'parcours',
  parcours: {
    version: 'mvp-1',
    anneeScolaire: { debut: '2026-09-07', semaine: 1, dansAnneeScolaire: true, anneeTerminee: false },
    message: 'Semaine 1 de l’année scolaire.',
    blocs: [
      bloc({ id: 'B3', titre: 'Calcul numérique', semaineDebut: 10, disponible: false, semainesAvantOuverture: 9, exercices: [] }),
    ],
  },
};

const INJOIGNABLE: ParcoursEtat = { kind: 'indisponible', raison: 'Le service ne répond pas.' };

describe('ParcoursListe — état 1 : blocs ouverts', () => {
  it('affiche tous les blocs', () => {
    render(<ParcoursListe etat={BLOCS_OUVERTS} />);

    expect(screen.getByRole('heading', { name: 'Calcul littéral' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Racines carrées' })).toBeDefined();
  });

  it('affiche les liens d’exercice vers les vraies routes', () => {
    render(<ParcoursListe etat={BLOCS_OUVERTS} />);

    // Deux blocs ouverts, donc deux liens « Exercice 1 » : un par bloc.
    const liens = screen.getAllByRole('link', { name: /Exercice 1/ });
    expect(liens).toHaveLength(2);
    for (const lien of liens) {
      expect(lien.getAttribute('href')).toBe('/parcours/MVP-B1-E1');
    }
  });

  it('affiche l’état de l’année', () => {
    render(<ParcoursListe etat={BLOCS_OUVERTS} />);

    expect(screen.getByText('Semaine 5 de l’année scolaire.')).toBeDefined();
  });

  it('la liste est une région nommée', () => {
    const { container } = render(<ParcoursListe etat={BLOCS_OUVERTS} />);

    const liste = container.querySelector('#titre-liste')!.closest('section');
    expect(liste!.getAttribute('aria-labelledby')).toBe('titre-liste');
  });
});

describe('ParcoursListe — état 2 : aucun bloc ouvert', () => {
  it('affiche un état vide, pas une liste vide', () => {
    const { container } = render(<ParcoursListe etat={AUCUN_OUVERT} />);

    expect(screen.getByText('Aucun bloc n’est ouvert aujourd’hui')).toBeDefined();
    expect(container.querySelectorAll('ul')).toHaveLength(0);
  });

  it('annonce la date d’ouverture du prochain bloc', () => {
    render(<ParcoursListe etat={AUCUN_OUVERT} />);

    expect(screen.getByText(/Calcul numérique ouvre à la semaine 10/)).toBeDefined();
  });
});

describe('ParcoursListe — état 3 : API injoignable', () => {
  it('affiche un état vide et propose de réessayer', () => {
    render(<ParcoursListe etat={INJOIGNABLE} />);

    expect(screen.getByText('Tes exercices arrivent dans un instant')).toBeDefined();

    const bouton = screen.getByRole('button', { name: 'Réessayer' });
    expect(bouton.getAttribute('type')).toBe('submit');
  });

  it('« Réessayer » est un formulaire GET vers la page, sans JavaScript', () => {
    render(<ParcoursListe etat={INJOIGNABLE} />);

    const formulaire = screen.getByRole('button', { name: 'Réessayer' }).closest('form')!;
    expect(formulaire.getAttribute('action')).toBe('/parcours');
    expect(formulaire.getAttribute('method')).toBe('get');
  });

  it('n’affiche pas le motif technique de l’erreur', () => {
    render(<ParcoursListe etat={INJOIGNABLE} />);

    expect(screen.queryByText('Le service ne répond pas.')).toBeNull();
  });
});

describe('ParcoursListe — état 4 : chargement', () => {
  it('affiche des cartes squelette de la forme de celles qui arrivent', () => {
    const { container } = render(<ParcoursListeEnAttente />);

    const squelettes = container.querySelectorAll('[aria-hidden="true"]');
    expect(squelettes.length).toBeGreaterThan(0);
  });

  it('ne montre aucun lien pendant le chargement', () => {
    render(<ParcoursListeEnAttente />);

    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('conserve le titre de la liste, pour que rien ne saute', () => {
    const { unmount } = render(<ParcoursListeEnAttente />);
    const titreAttente = screen.getByRole('heading', { name: 'Tes blocs' }).className;
    unmount();

    render(<ParcoursListe etat={BLOCS_OUVERTS} />);
    expect(screen.getByRole('heading', { name: 'Tes blocs' }).className).toBe(titreAttente);
  });
});

/** Rendu complet de la page, comme le fait le serveur. */
async function htmlDeLaPage(): Promise<Document> {
  const flux = await renderToReadableStream(await PageParcours());
  await flux.allReady;
  const html = await new Response(flux).text();
  return new DOMParser().parseFromString(
    `<!doctype html><html lang="fr"><body>${html}</body></html>`,
    'text/html',
  );
}

describe('Page /parcours — rendu complet', () => {
  it('la page affiche son titre et son sous-titre', async () => {
    const document = await htmlDeLaPage();

    expect(document.body.textContent).toContain('Ton parcours de mathématiques');
    expect(document.body.textContent).toContain('Trois leçons du programme');
  });

  it('le bandeau d’avertissement a toujours un rôle de région vivante', async () => {
    const document = await htmlDeLaPage();

    const bandeau = document.body.querySelector('[role="status"]');
    expect(bandeau).not.toBeNull();
    expect(bandeau!.textContent).toContain('première idée');
  });

  it('l’adresse du backend n’apparaît pas dans le HTML', async () => {
    const document = await htmlDeLaPage();

    expect(document.body.innerHTML).not.toMatch(/railway\.app|API_BASE_URL/);
  });

  it('la page reste complète quand l’API ne répond pas', async () => {
    const document = await htmlDeLaPage();

    // Sans `API_BASE_URL`, la liste affiche un état vide et propose de
    // réessayer — mais l'en-tête, le bandeau et le pied de page sont là.
    expect(document.body.textContent).toContain('Ton parcours de mathématiques');
    expect(document.body.textContent).toContain('première idée');
    expect(document.body.textContent).toContain('Réessayer');
    expect(document.body.textContent).toContain('Retour à l’accueil');
  });

  it('le lien de retour mène à l’accueil', async () => {
    const document = await htmlDeLaPage();

    const lien = [...document.body.querySelectorAll('a')].find((a) =>
      a.textContent?.includes('Retour à l’accueil'),
    );
    expect(lien).not.toBeNull();
    expect(lien!.getAttribute('href')).toBe('/');
  });

  it('aucun rôle inexistant en ARIA dans le HTML rendu', async () => {
    const document = await htmlDeLaPage();

    const roles = [...document.body.querySelectorAll('[role]')].map((n) => n.getAttribute('role'));
    for (const role of roles) {
      expect(role).not.toBe('note');
    }
  });
});