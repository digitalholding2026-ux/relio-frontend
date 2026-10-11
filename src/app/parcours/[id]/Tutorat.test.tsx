import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PanneauTutorat } from '@/app/parcours/[id]/Tutorat';
import { LIBELLE_NIVEAU } from '@/lib/tutorat';

/**
 * Le panneau de tutorat — les trois niveaux d'aide.
 *
 * ## Ce que ces tests verrouillent
 *
 * 1. **Chaque niveau a sa pastille.** Le libellé vient de `LIBELLE_NIVEAU`,
 *    module unique partagé avec l'écran — les deux ne peuvent pas diverger.
 * 2. **Le niveau 1 ne dit jamais « essaie encore ».** Un premier retour qui
 *    ressemble à une relance décourage l'élève de persévérer.
 * 3. **Le niveau 3 ne dit jamais « tu n'as pas compris ».** C'est un jugement
 *    sur l'élève, pas une aide ; le chantier 7.5 l'a expressément écarté.
 * 4. **Aucun identifiant technique à l'écran** : ni `OO-L1-1`, ni
 *    `erreur_de_signe`, ni « N1 ».
 */

const MESSAGE = 'Reprends la dernière étape du calcul.';
const ACTION = 'Relis la question avant de recommencer.';
const RESUME = 'On distribue avant de réduire.';

function monter(niveau: 1 | 2 | 3, resume: string | null = null, bilan = false) {
  return render(
    <PanneauTutorat
      niveau={niveau}
      message={MESSAGE}
      action={ACTION}
      resume={resume}
      bilan={bilan}
    />,
  );
}

describe('Tutorat — les trois niveaux', () => {
  it('le niveau 1 affiche la pastille « Première piste »', () => {
    monter(1);

    expect(screen.getByText(LIBELLE_NIVEAU[1])).toBeDefined();
    expect(screen.getByText('aide 1 sur 3')).toBeDefined();
  });

  it('le niveau 2 affiche la pastille « Explication »', () => {
    monter(2);

    expect(screen.getByText(LIBELLE_NIVEAU[2])).toBeDefined();
    expect(screen.getByText('aide 2 sur 3')).toBeDefined();
  });

  it('le niveau 3 affiche la pastille « Accompagnement »', () => {
    monter(3);

    expect(screen.getByText(LIBELLE_NIVEAU[3])).toBeDefined();
    expect(screen.getByText('aide 3 sur 3')).toBeDefined();
  });

  it('affiche toujours le message reçu du serveur', () => {
    for (const niveau of [1, 2, 3] as const) {
      const { unmount } = monter(niveau);
      expect(screen.getByText(MESSAGE)).toBeDefined();
      unmount();
    }
  });

  it('n’affiche l’action qu’à partir du niveau 2', () => {
    const { unmount } = monter(1);
    expect(screen.queryByText(ACTION)).toBeNull();
    unmount();

    monter(2);
    expect(screen.getByText(ACTION)).toBeDefined();
  });

  it('développe la méthode à retenir dès qu’elle existe', () => {
    monter(1, RESUME);

    expect(screen.getByText(/Méthode à retenir/)).toBeDefined();
    expect(screen.getByText(new RegExp(RESUME))).toBeDefined();
  });

  it('un bilan n’affiche ni palier ni action', () => {
    // Un bilan n'est pas une aide : l'élève a réussi, il n'a pas besoin qu'on
    // lui dise quoi faire ensuite.
    monter(1, RESUME, true);

    expect(screen.queryByText('aide 1 sur 3')).toBeNull();
    expect(screen.queryByText(ACTION)).toBeNull();
    expect(screen.getByText(/Méthode à retenir/)).toBeDefined();
  });
});

describe('Tutorat — ce que le panneau ne dit jamais', () => {
  it('le niveau 1 ne dit jamais « essaie encore »', () => {
    // Une relance qui ressemble à un reproche décourage l'élève de persévérer.
    const { container } = monter(1, RESUME);
    const texte = (container.textContent ?? '').toLowerCase();

    expect(texte).not.toContain('essaie encore');
    expect(texte).not.toContain('réessaie');
    expect(texte).not.toContain('recommence tout');
  });

  it('le niveau 3 ne dit jamais « tu n’as pas compris »', () => {
    const interdits = ['pas compris', 'tu ne comprends pas', 'incompris', 'tu as échoué'];
    for (const niveau of [1, 2, 3] as const) {
      const { container, unmount } = monter(niveau, RESUME);
      const texte = (container.textContent ?? '').toLowerCase();
      for (const interdit of interdits) {
        expect(texte, `niveau ${niveau} → ${interdit}`).not.toContain(interdit);
      }
      unmount();
    }
  });

  it('aucun identifiant technique n’apparaît à l’écran', () => {
    const interdits = [
      'OO-L', 'erreur_de_signe', 'signature', 'pointsArbitrage', 'undefined',
      'NaN', 'TypeError', 'categorie', 'N1', 'niveau :',
    ];

    for (const niveau of [1, 2, 3] as const) {
      const { container, unmount } = monter(niveau, RESUME);
      const texte = container.textContent ?? '';
      for (const interdit of interdits) {
        expect(texte, `niveau ${niveau} → ${interdit}`).not.toContain(interdit);
      }
      unmount();
    }
  });

  it('aucun score, aucun pourcentage', () => {
    for (const niveau of [1, 2, 3] as const) {
      const { container, unmount } = monter(niveau, RESUME);
      const texte = container.textContent ?? '';
      expect(texte).not.toMatch(/\d+\s*%/);
      expect(texte).not.toMatch(/\d+\s*\/\s*\d+/);
      expect(texte.toLowerCase()).not.toMatch(/score|maîtris/);
      unmount();
    }
  });

  it('le mot « aide » qualifie l’aide reçue, jamais un niveau de maîtrise', () => {
    for (const niveau of [1, 2, 3] as const) {
      const { container, unmount } = monter(niveau);
      expect(container.textContent).toContain(`aide ${niveau} sur 3`);
      expect(container.textContent).not.toMatch(/niveau\s*\d\s*(sur|de)?/i);
      unmount();
    }
  });
});