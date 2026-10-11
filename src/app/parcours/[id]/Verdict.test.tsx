import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Verdict } from '@/app/parcours/[id]/Verdict';
import type { Correction } from '@/lib/parcours';
import type { Tutorat } from '@/lib/tutorat';

/**
 * Le verdict — les cinq variantes de la décision D5.
 *
 * ## Ce que ces tests verrouillent
 *
 * 1. **Chaque verdict a sa pastille et son message.** Le libellé vient du
 *    serveur : le test fournit un `libelle` distinct par variante et vérifie
 *    qu'il est affiché mot pour mot. Une correspondance locale qui divergerait
 *    de la règle validée par l'enseignant serait un défaut pédagogique, pas
 *    un détail d'affichage.
 * 2. **Aucun score.** Ni pourcentage, ni « 7/10 », ni niveau de maîtrise.
 * 3. **Le message est en français, sans terme technique.**
 * 4. **La pastille porte son texte.** « Correct » est écrit ; une pastille
 *    colorée seule ne serait pas une information.
 */

function correction(partiel: Partial<Correction> = {}): Correction {
  return {
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
    ...partiel,
  };
}

const TUTEUR: Tutorat = {
  niveau: 1,
  message: 'Reprends la dernière étape.',
  action: 'Relis la question.',
  origine: 'signature',
  resume: null,
};

/** Les cinq verdicts de la décision D5, avec leur libellé serveur. */
const VARIANTES: { verdict: Correction['verdict']; libelle: string; pastille: string }[] = [
  { verdict: 'correct', libelle: 'Ta réponse est juste.', pastille: 'Juste' },
  {
    verdict: 'partiellement_correct',
    libelle: 'Ta réponse est partiellement correcte.',
    pastille: 'À compléter',
  },
  {
    verdict: 'resultat_juste_consigne_non_respectee',
    libelle: 'Ton résultat est juste, mais pas dans la forme demandée.',
    pastille: 'Juste, à reformuler',
  },
  { verdict: 'incorrect', libelle: 'Ce n’est pas encore juste.', pastille: 'À revoir' },
  {
    verdict: 'a_determiner',
    libelle: 'Ta réponse est juste ; la forme demandée reste à vérifier.',
    pastille: 'À vérifier',
  },
];

describe('Verdict — les cinq variantes', () => {
  for (const variante of VARIANTES) {
    it(`« ${variante.verdict} » affiche sa pastille « ${variante.pastille} »`, () => {
      render(
        <Verdict
          correction={correction({ verdict: variante.verdict, libelle: variante.libelle })}
          tutorat={null}
        />,
      );

      // La pastille porte son texte : une couleur seule n'est pas une
      // information lisible par tout le monde.
      expect(screen.getByText(variante.pastille)).toBeDefined();
    });

    it(`« ${variante.verdict} » affiche le libellé du serveur, mot pour mot`, () => {
      const { container } = render(
        <Verdict
          correction={correction({ verdict: variante.verdict, libelle: variante.libelle })}
          tutorat={null}
        />,
      );

      expect(container.textContent).toContain(variante.libelle);
    });
  }

  it('« correct » affiche une pastille de ton succès', () => {
    const { container } = render(
      <Verdict correction={correction({ verdict: 'correct', statut: 'correcte' })} tutorat={null} />,
    );

    expect(screen.getByText('Juste')).toBeDefined();
    // Le verdict juste et le verdict « forme non respectée » ne doivent pas
    // être confondus : le second n'est pas une erreur de mathématique.
    expect(screen.queryByText('À revoir')).toBeNull();
  });

  it('« resultat_juste_consigne_non_respectee » n’est jamais présenté comme faux', () => {
    render(
      <Verdict
        correction={correction({ verdict: 'resultat_juste_consigne_non_respectee' })}
        tutorat={null}
      />,
    );

    // Le libellé est celui du serveur. La pastille dit « juste, à reformuler »,
    // jamais « faux » : le signal serait un contresens pédagogique.
    expect(screen.queryByText('À revoir')).toBeNull();
    expect(screen.getByText('Juste, à reformuler')).toBeDefined();
  });

  it('« a_determiner » ne tranche pas', () => {
    render(<Verdict correction={correction({ verdict: 'a_determiner' })} tutorat={null} />);

    expect(screen.getByText('À vérifier')).toBeDefined();
    expect(screen.queryByText('Juste')).toBeNull();
    expect(screen.queryByText('À revoir')).toBeNull();
  });

  it('retombe sur un libellé de repli quand le serveur n’en fournit pas', () => {
    // Une API antérieure ne renvoie pas `libelle` : l'écran doit rester
    // utilisable plutôt que d'afficher une ligne vide.
    render(<Verdict correction={correction({ verdict: 'correct', libelle: '   ' })} tutorat={null} />);

    expect(screen.getByText('Ta réponse est juste.')).toBeDefined();
  });
});

describe('Verdict — aucune note, aucun score', () => {
  for (const variante of VARIANTES) {
    it(`« ${variante.verdict} » n’affiche aucun pourcentage`, () => {
      const { container } = render(
        <Verdict
          correction={correction({ verdict: variante.verdict, libelle: variante.libelle })}
          tutorat={TUTEUR}
        />,
      );

      const texte = container.textContent ?? '';
      expect(texte).not.toMatch(/\d+\s*%/);
      expect(texte).not.toMatch(/\d+\s*\/\s*\d+/);
      expect(texte.toLowerCase()).not.toMatch(/score|note sur|maîtris/);
    });
  }
});

describe('Verdict — langue', () => {
  const interdits = [
    'undefined', 'NaN', 'null', 'TypeError', 'Object',
    'OO-L', 'erreur_de_signe', 'signatureErreur', 'pointsArbitrage',
  ];

  for (const variante of VARIANTES) {
    it(`« ${variante.verdict} » n’affiche aucun terme technique`, () => {
      const { container } = render(
        <Verdict
          correction={correction({ verdict: variante.verdict, libelle: variante.libelle })}
          tutorat={TUTEUR}
        />,
      );

      const texte = container.textContent ?? '';
      for (const terme of interdits) {
        expect(texte, `${variante.verdict} → ${terme}`).not.toContain(terme);
      }
    });
  }
});

describe('Verdict — détails contextuels', () => {
  it('affiche l’explication quand il n’y a pas de tutorat', () => {
    render(<Verdict correction={correction()} tutorat={null} />);

    expect(screen.getByText('Reviens sur la distributivité.')).toBeDefined();
  });

  it('affiche le message du tutorat quand il y en a un', () => {
    render(<Verdict correction={correction()} tutorat={TUTEUR} />);

    expect(screen.getByText('Reprends la dernière étape.')).toBeDefined();
    expect(screen.queryByText('Reviens sur la distributivité.')).toBeNull();
  });

  it('« résultat juste, forme non respectée » ajoute la consigne de réécriture', () => {
    render(
      <Verdict
        correction={correction({ verdict: 'resultat_juste_consigne_non_respectee' })}
        tutorat={null}
      />,
    );

    expect(
      screen.getByText(/Ton calcul est bon : il reste seulement à l’écrire/),
    ).toBeDefined();
  });

  it('un travail inachevé est présenté comme un commencement, pas comme un échec', () => {
    render(<Verdict correction={correction({ achevement: 'inacheve' })} tutorat={null} />);

    expect(screen.getByText('Tu as bien commencé ! Il reste une étape.')).toBeDefined();
  });

  it('un point non arbitré n’est jamais présenté comme une conclusion', () => {
    render(<Verdict correction={correction({ lectureArbitree: false })} tutorat={null} />);

    expect(screen.getByText('Ton enseignant vérifiera ce point.')).toBeDefined();
  });
});