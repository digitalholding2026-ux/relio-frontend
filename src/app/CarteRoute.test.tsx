import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CarteRoute, CarteRouteEnAttente } from '@/app/CarteRoute';
import type { BlocPublic, ParcoursEtat } from '@/lib/parcours';

/**
 * La carte principale de l'accueil — les quatre états.
 *
 * L'ancien accueil affichait un parcours marketing figé dans le code : il
 * pouvait annoncer « Disponible » alors que le service était arrêté. Ces tests
 * verrouillent l'inverse — **ce qui est rendu vient de la réponse de l'API**,
 * et chaque état a un rendu propre, sans texte d'attente trompeur.
 *
 * `CarteRoute` est un composant pur : il ne fait aucun appel réseau. C'est ce
 * qui permet de couvrir les quatre états sans stubber `fetch`, et sans que le
 * test et l'écran puissent diverger.
 */

const SEMAINES = 30;

function bloc(partiel: Partial<BlocPublic> = {}): BlocPublic {
  return {
    id: 'B1',
    titre: 'Calcul littéral',
    leconId: 'LEC-CM-MATH-3E-2025-2026-01',
    volumeHoraireH: 7,
    semaineDebut: 1,
    disponible: true,
    semainesAvantOuverture: null,
    objectifs: [],
    exercices: [
      {
        id: 'MVP-B1-E1',
        blocId: 'B1',
        rang: 1,
        objectifs: [],
        enonce: 'Énoncé',
        consigne: 'Consigne',
        typeReponse: 'expression',
        formeDemandee: null,
        nbIndices: 3,
        origine: 'originale',
      },
    ],
    ...partiel,
  };
}

function parcours(blocs: BlocPublic[], semaine: number | null = 5) {
  return {
    kind: 'parcours' as const,
    parcours: {
      version: 'mvp-1',
      anneeScolaire: { debut: '2026-09-07', semaine, dansAnneeScolaire: true, anneeTerminee: false },
      message: `Semaine ${semaine} de l’année scolaire.`,
      blocs,
    },
  } satisfies ParcoursEtat;
}

/** Douze exercices, pour produire une durée d'un palier supérieur. */
function exercices(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `MVP-B1-E${i + 1}`,
    blocId: 'B1',
    rang: i + 1,
    objectifs: [],
    enonce: 'Énoncé',
    consigne: 'Consigne',
    typeReponse: 'expression' as const,
    formeDemandee: null,
    nbIndices: 3,
    origine: 'originale' as const,
  }));
}

describe('Carte principale — état 1 : API disponible, bloc ouvert', () => {
  const etat = parcours([bloc({ exercices: exercices(6) })]);

  it('affiche la carte avec son titre', () => {
    render(<CarteRoute etat={etat} semainesParAnnee={SEMAINES} />);

    expect(screen.getByRole('heading', { name: 'Ta route cette semaine' })).toBeDefined();
    expect(screen.getByText('Calcul littéral')).toBeDefined();
  });

  it('affiche la pastille « Ouvert », portée par son texte et non par sa couleur', () => {
    render(<CarteRoute etat={etat} semainesParAnnee={SEMAINES} />);

    expect(screen.getByText('Ouvert')).toBeDefined();
  });

  it('affiche la position dans l’année scolaire', () => {
    render(<CarteRoute etat={etat} semainesParAnnee={SEMAINES} />);

    // « Semaine 5 sur 30 » — et pas un pourcentage de réussite.
    expect(screen.getByText('Semaine 5 sur 30')).toBeDefined();
  });

  it('expose la position dans l’année comme une barre de progression', () => {
    render(<CarteRoute etat={etat} semainesParAnnee={SEMAINES} />);

    const barre = screen.getByRole('progressbar');
    expect(barre.getAttribute('aria-valuenow')).toBe('17');
    expect(barre.getAttribute('aria-valuemin')).toBe('0');
    expect(barre.getAttribute('aria-valuemax')).toBe('100');
  });

  it('le bouton « Continuer » est un vrai lien vers un exercice', () => {
    render(<CarteRoute etat={etat} semainesParAnnee={SEMAINES} />);

    const lien = screen.getByRole('link', { name: 'Continuer' });
    expect(lien.getAttribute('href')).toBe('/parcours/MVP-B1-E1');
  });

  it('affiche une durée estimée', () => {
    render(<CarteRoute etat={etat} semainesParAnnee={SEMAINES} />);

    // Six exercices : deux minutes chacun, arrondies à cinq.
    expect(screen.getByText(/10 min/).textContent).toContain('10 min');
  });

  it('la carte est une section titrée, atteignable par les lecteurs d’écran', () => {
    const { container } = render(<CarteRoute etat={etat} semainesParAnnee={SEMAINES} />);

    const section = container.querySelector('section');
    expect(section).not.toBeNull();
    expect(section!.getAttribute('aria-labelledby')).toBe('titre-route');
    expect(container.querySelector('#titre-route')).not.toBeNull();
  });

  it('n’affiche aucun pourcentage de réussite', () => {
    const { container } = render(<CarteRoute etat={etat} semainesParAnnee={SEMAINES} />);

    // La barre porte la position dans l'année, jamais un score.
    expect(container.textContent).not.toMatch(/\d+\s*%/);
  });
});

describe('Carte principale — état 2 : API disponible, aucun bloc ouvert', () => {
  const etat = parcours([
    bloc({ id: 'B3', titre: 'Calcul numérique', semaineDebut: 10, disponible: false, semainesAvantOuverture: 5, exercices: [] }),
  ]);

  it('affiche un état vide, pas une fausse action', () => {
    render(<CarteRoute etat={etat} semainesParAnnee={SEMAINES} />);

    expect(screen.getByText('Aucun bloc n’est ouvert pour l’instant')).toBeDefined();
  });

  it('annonce la date d’ouverture du prochain bloc', () => {
    render(<CarteRoute etat={etat} semainesParAnnee={SEMAINES} />);

    expect(screen.getByText(/Calcul numérique ouvre à la semaine 10/)).toBeDefined();
  });

  it('ne propose pas de « Continuer » alors qu’il n’y a rien à faire', () => {
    render(<CarteRoute etat={etat} semainesParAnnee={SEMAINES} />);

    expect(screen.queryByRole('link', { name: 'Continuer' })).toBeNull();
  });

  it('garde quand même la position dans l’année', () => {
    render(<CarteRoute etat={etat} semainesParAnnee={SEMAINES} />);

    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('17');
  });
});

describe('Carte principale — état 3 : API injoignable', () => {
  const etat: ParcoursEtat = { kind: 'indisponible', raison: 'Le service ne répond pas.' };

  it('affiche un état vide bienveillant, pas une erreur brute', () => {
    render(<CarteRoute etat={etat} semainesParAnnee={SEMAINES} />);

    expect(screen.getByText('Ton parcours arrive dans un instant')).toBeDefined();
    // Le motif technique n'est pas renvoyé tel quel à l'élève.
    expect(screen.queryByText('Le service ne répond pas.')).toBeNull();
  });

  it('propose un bouton « Réessayer » qui fonctionne sans JavaScript', () => {
    render(<CarteRoute etat={etat} semainesParAnnee={SEMAINES} />);

    const bouton = screen.getByRole('button', { name: 'Réessayer' });
    expect(bouton.getAttribute('type')).toBe('submit');

    // Un formulaire GET vers la page elle-même recharge le rendu serveur.
    const formulaire = bouton.closest('form');
    expect(formulaire).not.toBeNull();
    expect(formulaire!.getAttribute('method')).toBe('get');
    expect(formulaire!.getAttribute('action')).toBe('/');
  });

  it('n’affiche ni bloc, ni bouton « Continuer », ni progression', () => {
    render(<CarteRoute etat={etat} semainesParAnnee={SEMAINES} />);

    expect(screen.queryByRole('link', { name: 'Continuer' })).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByText('Ouvert')).toBeNull();
  });
});

describe('Carte principale — état 4 : chargement', () => {
  it('affiche un squelette de la forme de la carte', () => {
    const { container } = render(<CarteRouteEnAttente />);

    // Même titre que la carte réelle : rien ne saute à l'arrivée des données.
    expect(screen.getByRole('heading', { name: 'Ta route cette semaine' })).toBeDefined();

    // Les squelettes sont décoratifs : ils ne doivent rien annoncer.
    const squelettes = container.querySelectorAll('[aria-hidden="true"]');
    expect(squelettes.length).toBeGreaterThan(0);
  });

  it('ne montre ni bouton actif, ni faux bloc, pendant le chargement', () => {
    render(<CarteRouteEnAttente />);

    expect(screen.queryByRole('link', { name: 'Continuer' })).toBeNull();
    expect(screen.queryByText('Ouvert')).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('reprend exactement la même mise en forme de titre que la carte réelle', () => {
    // Comparaison directe : c'est la mise en forme qui doit être identique, pas
    // l'identifiant — les deux sections ne doivent pas être confondues par le
    // lecteur d'écran, donc leurs `id` sont volontairement distincts.
    const { unmount } = render(<CarteRouteEnAttente />);
    const attente = screen.getByRole('heading', { name: 'Ta route cette semaine' });
    const styleAttente = { classe: attente.className, texte: attente.textContent };
    unmount();

    const etat = parcours([bloc()]);
    render(<CarteRoute etat={etat} semainesParAnnee={SEMAINES} />);
    const reel = screen.getByRole('heading', { name: 'Ta route cette semaine' });

    expect(reel.className).toBe(styleAttente.classe);
    expect(reel.textContent).toBe(styleAttente.texte);
    // Deux `id` distincts : pas de collision d'ancrage.
    expect(reel.id).not.toBe('titre-route-attente');
  });
});