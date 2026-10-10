/**
 * Tests de rendu du design system.
 *
 * ## Ce que ces tests vérifient, et ce qu'ils ne vérifient pas
 *
 * Ils vérifient **ce qui est vérifiable sans écran** : présence du rôle ARIA
 * attendu, liaison entre une étiquette et son champ, présence d'un libellé sur
 * chaque contrôle, transmission des événements.
 *
 * Ils ne vérifient **pas** le rendu visuel : ni la taille réelle des cibles
 * tactiles, ni le contraste à l'écran, ni la mise en page à 360 px. Ces points
 * sont traités par les tests de tokens (contrastes, mesures) et par la page
 * `/design-system`, qui doit être ouverte sur un vrai appareil.
 *
 * Un test de rendu qui prétend vérifier un contraste ne vérifierait rien : il
 * n'y a pas de feuille de style appliquée.
 */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { Bouton } from './Bouton';
import { BoutonIcone } from './BoutonIcone';
import { Carte } from './Carte';
import { Puce } from './Puce';
import { Champ, ZoneTexte } from './Input';
import { Icone } from './Icone';
import { Pastille } from './Pastille';
import { BarreProgression } from './BarreProgression';
import { AnneauProgression } from './AnneauProgression';
import { EtatVide } from './EtatVide';
import { Feuille } from './Feuille';
import { Squelette } from './Skeleton';
import { Avatar } from './Avatar';
import { FournisseurNotification, ZoneNotification, useNotifications } from './Toast';

// ---------------------------------------------------------------------------

describe('Bouton', () => {
  it('affiche son libellé et se déclenche', () => {
    const clic = vi.fn();
    render(<Bouton onClick={clic}>Vérifier</Bouton>);

    const bouton = screen.getByRole('button', { name: 'Vérifier' });
    fireEvent.click(bouton);

    expect(clic).toHaveBeenCalledTimes(1);
  });

  it('reste activable sans treatment particulier', () => {
    // Un `type` par défaut évite le piège classique du bouton qui soumet un
    // formulaire par surprise.
    render(<Bouton>Vérifier</Bouton>);
    expect(screen.getByRole('button')).toHaveProperty('type', 'button');
  });

  it('ne se déclenche pas quand il est désactivé', () => {
    const clic = vi.fn();
    render(
      <Bouton disabled onClick={clic}>
        Vérifier
      </Bouton>,
    );

    fireEvent.click(screen.getByRole('button'));
    expect(clic).not.toHaveBeenCalled();
  });

  it('se rend indisponible et s’annonce occupé pendant le chargement', () => {
    render(<Bouton chargement>Vérification…</Bouton>);

    const bouton = screen.getByRole('button', { name: 'Vérification…' });
    // Le libellé reste lisible : la mise en page ne saute pas, et l'élève sait
    // ce qui se passe.
    expect(bouton).toHaveProperty('disabled', true);
    expect(bouton.getAttribute('aria-busy')).toBe('true');
  });

  it('rend chaque variante demandée', () => {
    for (const variante of ['primary', 'secondary', 'ghost', 'danger'] as const) {
      const { unmount } = render(<Bouton variante={variante}>Action</Bouton>);
      expect(screen.getByRole('button', { name: 'Action' })).toBeDefined();
      unmount();
    }
  });

  it('rend chaque taille demandée', () => {
    for (const taille of ['sm', 'md', 'lg'] as const) {
      const { unmount } = render(<Bouton taille={taille}>Action</Bouton>);
      expect(screen.getByRole('button', { name: 'Action' })).toBeDefined();
      unmount();
    }
  });
});

// ---------------------------------------------------------------------------

describe('BoutonIcone', () => {
  it('porte toujours un libellé accessible', () => {
    render(<BoutonIcone nom="croix" label="Fermer" />);

    // Sans ce libellé, le bouton ne serait annoncé que par « bouton ».
    expect(screen.getByRole('button', { name: 'Fermer' })).toBeDefined();
  });

  it('déclenche son action', () => {
    const clic = vi.fn();
    render(<BoutonIcone nom="rafraichir" label="Actualiser" onClick={clic} />);

    fireEvent.click(screen.getByRole('button', { name: 'Actualiser' }));
    expect(clic).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------

describe('Carte', () => {
  it('rend son contenu', () => {
    render(<Carte>Exercice 1</Carte>);
    expect(screen.getByText('Exercice 1')).toBeDefined();
  });

  it('applique chaque variante de surface', () => {
    const { container } = render(<Carte variante="elevee">Contenu</Carte>);
    expect(container.firstChild).toBeDefined();
  });
});

// ---------------------------------------------------------------------------

describe('Puce', () => {
  it('expose son état de sélection à l Lecteur d’écran', () => {
    const { rerender } = render(<Puce active={false}>Calcul littéral</Puce>);
    expect(screen.getByRole('button', { name: 'Calcul littéral' }).getAttribute('aria-pressed')).toBe(
      'false',
    );

    rerender(<Puce active>Calcul littéral</Puce>);
    expect(screen.getByRole('button', { name: 'Calcul littéral' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('se déclenche', () => {
    const clic = vi.fn();
    render(<Puce onClick={clic}>Racines</Puce>);
    fireEvent.click(screen.getByRole('button', { name: 'Racines' }));
    expect(clic).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------

describe('Pastille', () => {
  it('porte toujours un texte : la couleur ne suffit pas', () => {
    render(<Pastille ton="succes">Réussi</Pastille>);
    expect(screen.getByText('Réussi')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------

describe('Icône', () => {
  it('est décorative par défaut, donc invisible au lecteur d’écran', () => {
    const { container } = render(<Icone nom="check" />);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('devient une image nommée dès qu’on lui donne un titre', () => {
    render(<Icone nom="check" titre="Réussi" />);
    expect(screen.getByRole('img', { name: 'Réussi' })).toBeDefined();
  });
});

// ---------------------------------------------------------------------------

describe('Champ', () => {
  it('relie l’étiquette à son champ', () => {
    render(<Champ label="Ta réponse" />);

    const champ = screen.getByLabelText('Ta réponse');
    expect(champ.tagName).toBe('INPUT');
  });

  it('relie l’aide et l’erreur au champ par aria-describedby', () => {
    render(<Champ label="Ta réponse" aide="Un nombre entier." erreur="Ce n’est pas un nombre." />);

    const champ = screen.getByLabelText('Ta réponse');
    const decrit = champ.getAttribute('aria-describedby') ?? '';
    const ids = decrit.split(' ');

    // L'aide et l'erreur doivent être deux cibles distinctes du champ.
    expect(ids).toHaveLength(2);
    for (const id of ids) {
      expect(document.getElementById(id)).not.toBeNull();
    }
  });

  it('annonce l’erreur de façon interrupting', () => {
    render(<Champ label="Ta réponse" erreur="Réponse illisible." />);
    expect(screen.getByRole('alert').textContent).toContain('Réponse illisible.');
  });

  it('marque le champ comme invalide quand une erreur est présente', () => {
    const { rerender } = render(<Champ label="Ta réponse" />);
    expect(screen.getByLabelText('Ta réponse').getAttribute('aria-invalid')).toBeNull();

    rerender(<Champ label="Ta réponse" erreur="Réponse illisible." />);
    expect(screen.getByLabelText('Ta réponse').getAttribute('aria-invalid')).toBe('true');
  });

  it('rend « obligatoire » audible sans le dupliquer visuellement', () => {
    render(<Champ label="Ta réponse" requis />);
    // L'astérisque est masqué, le mot est réservé au lecteur d'écran.
    expect(screen.getByText('(obligatoire)').getAttribute('aria-hidden')).toBeNull();
  });

  it('transmet les changements de valeur', () => {
    const changement = vi.fn();
    render(<Champ label="Ta réponse" onChange={changement} />);

    fireEvent.change(screen.getByLabelText('Ta réponse'), { target: { value: '2x + 1' } });
    expect(changement).toHaveBeenCalled();
  });
});

describe('ZoneTexte', () => {
  it('relie son étiquette et son erreur comme un champ', () => {
    render(<ZoneTexte label="Ton explication" erreur="Explique un peu plus." />);

    const zone = screen.getByLabelText('Ton explication');
    expect(zone.tagName).toBe('TEXTAREA');
    expect(screen.getByRole('alert').textContent).toContain('Explique un peu plus.');
  });
});

// ---------------------------------------------------------------------------

describe('BarreProgression', () => {
  it('expose le rôle et les trois valeurs ARIA', () => {
    render(<BarreProgression valeur={40} label="Progression du bloc" />);

    const barre = screen.getByRole('progressbar', { name: 'Progression du bloc' });
    expect(barre.getAttribute('aria-valuenow')).toBe('40');
    expect(barre.getAttribute('aria-valuemin')).toBe('0');
    expect(barre.getAttribute('aria-valuemax')).toBe('100');
  });

  it('ramène les valeurs hors bornes au lieu de les laisser passer', () => {
    const { rerender } = render(<BarreProgression valeur={-20} label="P" />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0');

    rerender(<BarreProgression valeur={180} label="P" />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
  });

  it('traite une valeur non finie comme zéro', () => {
    render(<BarreProgression valeur={Number.NaN} label="P" />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0');
  });

  it('affiche le pourcentage en texte quand on le demande', () => {
    render(<BarreProgression valeur={60} afficherValeur />);
    expect(screen.getByText('60 %')).toBeDefined();
  });
});

describe('AnneauProgression', () => {
  it('affiche la valeur au centre et reste décoratif', () => {
    const { container } = render(<AnneauProgression valeur={25} />);

    expect(screen.getByText('25 %')).toBeDefined();
    // L'anneau dupliquerait l'annonce du texte central.
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });

  it('accepte un texte de remplacement au centre', () => {
    render(<AnneauProgression valeur={25}>2/3</AnneauProgression>);
    expect(screen.getByText('2/3')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------

describe('EtatVide', () => {
  it('donne un titre et une action de sortie', () => {
    const clic = vi.fn();
    render(<EtatVide titre="Aucun exercice ici" action="Voir le parcours" onAction={clic} />);

    expect(screen.getByText('Aucun exercice ici')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Voir le parcours' }));
    expect(clic).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------

describe('Squelette', () => {
  it('est invisible au lecteur d’écran', () => {
    // Le squelette ne doit pas être lu comme du contenu.
    const { container } = render(<Squelette />);
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });

  it('rend autant de lignes que demandé', () => {
    const { container } = render(<Squelette lignes={3} />);
    // Le conteneur du bloc s'ajoute aux lignes : on compte les enfants, pas
    // tous les `div` du rendu.
    const bloc = container.firstElementChild;
    expect(bloc?.children).toHaveLength(3);
  });
});

describe('Avatar', () => {
  it('tire l’initiale du nom', () => {
    const { container } = render(<Avatar nom="Aline" />);
    expect(container.textContent).toBe('A');
  });

  it('donne toujours la même couleur au même nom', () => {
    const { container: premier } = render(<Avatar nom="Aline" />);
    const { container: second } = render(<Avatar nom="Aline" />);
    expect(premier.firstElementChild?.getAttribute('style')).toBe(second.firstElementChild?.getAttribute('style'));
  });

  it('ne se lit pas à voix haute : le nom reste à côté', () => {
    const { container } = render(<Avatar nom="Aline" />);
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });
});

// ---------------------------------------------------------------------------

describe('Feuille', () => {
  it('ne rend rien quand elle est fermée', () => {
    render(
      <Feuille ouverte={false} titre="Aide" onFermer={() => undefined}>
        Contenu
      </Feuille>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('s’expose comme une boîte de dialogue modale nommée', () => {
    render(
      <Feuille ouverte titre="Aide" onFermer={() => undefined}>
        Contenu
      </Feuille>,
    );

    const dialogue = screen.getByRole('dialog', { name: 'Aide' });
    expect(dialogue.getAttribute('aria-modal')).toBe('true');
    expect(screen.getByText('Contenu')).toBeDefined();
  });

  it('se ferme avec la touche Échap', () => {
    const fermer = vi.fn();
    render(
      <Feuille ouverte titre="Aide" onFermer={fermer}>
        Contenu
      </Feuille>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(fermer).toHaveBeenCalledTimes(1);
  });

  it('offre une fermeture atteignable au clavier', () => {
    const fermer = vi.fn();
    render(
      <Feuille ouverte titre="Aide" onFermer={fermer}>
        Contenu
      </Feuille>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(fermer).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------

/** Petit composant qui déclenche une notification au clic. */
function Declencheur({ ton }: { ton?: 'info' | 'succes' | 'alerte' }) {
  const { notifier } = useNotifications();
  return (
    <button type="button" onClick={() => notifier('Réponse enregistrée.', ton)}>
      Notifier
    </button>
  );
}

describe('Notification', () => {
  it('affiche le message et l’annonce sans interrompre', () => {
    render(
      <FournisseurNotification>
        <Declencheur />
        <ZoneNotification />
      </FournisseurNotification>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Notifier' }));

    const zone = screen.getByRole('status');
    expect(zone.textContent).toContain('Réponse enregistrée.');
  });

  it('interrompt la lecture pour une erreur', () => {
    render(
      <FournisseurNotification>
        <Declencheur ton="alerte" />
        <ZoneNotification />
      </FournisseurNotification>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Notifier' }));
    // Une action qui vient d'échouer doit être annoncée immédiatement.
    expect(screen.getByRole('alert').textContent).toContain('Réponse enregistrée.');
  });

  it('permet de fermer une notification à la main', () => {
    render(
      <FournisseurNotification>
        <Declencheur />
        <ZoneNotification />
      </FournisseurNotification>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Notifier' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fermer la notification' }));

    expect(screen.queryByText('Réponse enregistrée.')).toBeNull();
  });

  it('refuse d’être utilisé hors du fournisseur', () => {
    // Une notification qui disparaît silencieusement serait pire qu'une erreur.
    expect(() => render(<Declencheur />)).toThrow(/FournisseurNotification/);
  });
});