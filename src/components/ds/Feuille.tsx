'use client';

/**
 * Feuille glissante — la boîte de dialogue sur téléphone.
 *
 * ## Pourquoi une feuille et non une modale centrée
 *
 * Sur un écran de 360 px de haut utile, une boîte centrée mange la moitié de
 * l'écran et masque le contenu. Une feuille qui remonte du bas laisse voir ce
 * qui reste, et son geste de fermeture — glisser vers le bas — est celui que
 * l'élève connaît déjà.
 *
 * ## Comportement attendu
 *
 * - `Échap` ferme ;
 * - le clic sur le fond ferme ;
 * - le focus entre dans la feuille à l'ouverture, et y reste piégé tant qu'elle
 *   est ouverte — sans piège, la tabulation passe derrière et l'écran devient
 *   illisible au clavier comme au lecteur d'écran ;
 * - le défilement de la page derrière est bloqué.
 *
 * La feuille est rendue dans un portail : hors de la hiérarchie visuelle du
 * parent, elle ne peut pas être tronquée par un `overflow: hidden` sur un
 * conteneur intermédiaire.
 */

import { useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

import { BoutonIcone } from './BoutonIcone';
import styles from './Feuille.module.css';

export interface FeuilleProps {
  readonly ouverte: boolean;
  readonly titre: string;
  readonly onFermer: () => void;
  readonly children: ReactNode;
  /** Pied de feuille, pour les actions. */
  readonly pied?: ReactNode;
  /** Désactive la fermeture au clic sur le fond — pour une action à confirmer. */
  readonly fermeAuFond?: boolean;
}

export function Feuille({ ouverte, titre, onFermer, children, pied, fermeAuFond = true }: FeuilleProps) {
  const idTitre = useId();
  const panneau = useRef<HTMLDivElement | null>(null);
  const declencheur = useRef<HTMLElement | null>(null);

  // Focus Trap : on garde la tabulation à l'intérieur de la feuille.
  const onTouche = useCallback(
    (evenement: KeyboardEvent) => {
      if (evenement.key === 'Escape') {
        onFermer();
        return;
      }
      if (evenement.key !== 'Tab') return;

      const racine = panneau.current;
      if (racine === null) return;

      const focusables = racine.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const premier = focusables[0];
      const dernier = focusables[focusables.length - 1];
      if (premier === undefined || dernier === undefined) return;

      if (evenement.shiftKey && document.activeElement === premier) {
        evenement.preventDefault();
        dernier.focus();
      } else if (!evenement.shiftKey && document.activeElement === dernier) {
        evenement.preventDefault();
        premier.focus();
      }
    },
    [onFermer],
  );

  useEffect(() => {
    if (!ouverte) return;

    // Le focus revient sur le bouton qui a ouvert : sans cela, un élève au
    // clavier perdrait sa place et devrait tout retrouver à la tabulation.
    declencheur.current = document.activeElement as HTMLElement | null;

    const premier = panneau.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    premier?.focus();

    document.addEventListener('keydown', onTouche);

    // Empêcher le défilement de la page derrière, sans perdre la position.
    const corps = document.body;
    const overflowInitial = corps.style.overflow;
    corps.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onTouche);
      corps.style.overflow = overflowInitial;
      declencheur.current?.focus();
    };
  }, [ouverte, onTouche]);

  if (!ouverte || typeof document === 'undefined') return null;

  return createPortal(
    <div className={styles.hote}>
      <div
        className={styles.fond}
        onClick={fermeAuFond ? onFermer : undefined}
        // Le fond n'est pas un contrôle : il ne doit pas être atteignable au
        // clavier, sinon il ajoute une tabulation sans action.
        aria-hidden={fermeAuFond ? true : undefined}
      />

      <div
        ref={panneau}
        className={styles.feuille}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitre}
      >
        <div className={styles.poignee} aria-hidden="true" />

        <div className={styles.entete}>
          <h2 className={styles.titre} id={idTitre}>
            {titre}
          </h2>
          <BoutonIcone nom="croix" label="Fermer" variante="discret" onClick={onFermer} />
        </div>

        <div className={styles.corps}>{children}</div>

        {pied !== undefined && <div className={styles.pied}>{pied}</div>}
      </div>
    </div>,
    document.body,
  );
}