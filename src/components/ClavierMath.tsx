'use client';

/**
 * Clavier mathématique — chantier 7.5.
 *
 * ## Contraintes d'un téléphone Android
 *
 * Le problème réel : le clavier système ne propose ni exposant, ni symbole
 * racine, ni barre de fraction sur la plupart des configurations de clavier
 * français. Un élève de 3e devrait alors copier un caractère depuis une autre
 * application, ce qui est hors de portée sur un téléphone d'entrée de gamme.
 *
 * Ce composant apporte les touches manquantes **sans** dépendre du système.
 *
 * ## Choix d'implémentation, et pourquoi
 *
 * **Aucun `<textarea>` caché, aucun éditeur à curseur maison.** La saisie reste
 * portée par l'`<input>` natif du composant parent : le navigateur gère le
 * curseur, la sélection et le collage. Ce module ne fait qu'appliquer une
 * opération à `selectionStart`, puis rendre la position. Cela évite le piège
 * classique du champ dont le curseur revient au début après chaque frappe, et
 * conserve le collage du presse-papiers.
 *
 * **`inputMode="none"`** (posé par le parent) supprime le clavier système sur
 * Android tout en laissant le champ focusable et saisissable au clavier
 * physique. Le bouton « Clavier système » rend ce comportement à l'élève.
 *
 * **Aucune dépendance ajoutée.** Pas de bibliothèque de clavier : le composant
 * tient en une centaine de lignes, ce qui préserve le poids de la page et la
 * consommation de données — deux contraintes explicites du chantier.
 *
 * ## Accessibilité
 *
 * - chaque touche porte un `aria-label` en français : un glyphe seul (`^2`,
 *   `√`) n'est pas lu de façon utilisable par un lecteur d'écran ;
 * - le bloc est un `role="group"` avec un libellé ;
 * - fermeture et réouverture passent par des boutons nommés ;
 * - chaque touche réagit au `pointerdown` **et** au `click`, ce qui la rend
 *   actionnable au clavier physique, au commutateur d'accès et à toute
 *   technologie d'assistance, sans jamais exécuter l'action deux fois.
 *
 * ## Chantier C2b — migration sur le design system
 *
 * Seule **l'habillage** change. Les deux gestionnaires d'activation ci-dessus,
 * la discrimination `detail > 0`, la grille de `rangeesPour()` et le
 * pilotage de l'`<input>` natif sont **inchangés** : ils sont déplacés dans
 * `ToucheClavier.tsx`, pas réécrits.
 *
 * La touche n'est pas rendue par le composant `Bouton` du design system : il
 * impose `min-height: 48px`, et le clavier fait 9 rangées de 44 px. L'utiliser
 * porterait le clavier de 453 à 485 px et recouvrirait à nouveau l'énoncé —
 * exactement ce que le chantier 7.7 a corrigé. Voir `ToucheClavier.module.css`.
 */

import { useCallback, useEffect, type MouseEvent, type PointerEvent, type RefObject } from 'react';

import { ToucheClavier } from '@/components/ToucheClavier';
import styles from '@/components/clavier.module.css';
import {
  creerFraction,
  deplacer,
  effacerTout,
  inserer,
  rangeesPour,
  retirer,
  COLONNES,
  type EtatSaisie,
  type Touche,
  type ToucheAction,
  type TypeReponse,
} from '@/lib/clavier';

/** Relit la valeur et la position depuis le champ natif. */
function lireEtat(champ: HTMLInputElement | null): EtatSaisie {
  return {
    valeur: champ?.value ?? '',
    curseur: champ?.selectionStart ?? 0,
  };
}

export interface ClavierMathProps {
  readonly typeReponse: TypeReponse;
  readonly onChange: (etat: EtatSaisie) => void;
  readonly onValider: () => void;
  readonly onFermer: () => void;
  readonly onSysteme: () => void;
  /** Accessibilité : identifiant du champ piloté. */
  readonly champId: string;
  /**
   * Référence du `<input>` piloté, **partagée avec le parent**.
   *
   * Elle est indispensable : la position du curseur n'existe que dans l'élément
   * natif. Sans elle, toute insertion se ferait au début de la saisie et l'élève
   * ne pourrait plus corriger au milieu de son expression.
   */
  readonly champRef: RefObject<HTMLInputElement | null>;
}

export function ClavierMath({
  typeReponse,
  onChange,
  onValider,
  onFermer,
  onSysteme,
  champId,
  champRef,
}: ClavierMathProps) {
  const rangees = rangeesPour(typeReponse);

  /**
   * Applique l'action au texte, puis rend la position.
   *
   * Le focus et la position sont rétablis **après** le rendu : le parent pilote
   * la valeur, et React écrase la position native à chaque rendu.
   */
  const appliquer = useCallback(
    (action: ToucheAction) => {
      const champ = champRef.current;
      const debut = champ?.selectionStart ?? 0;
      const fin = champ?.selectionEnd ?? debut;
      const valeur = champ?.value ?? '';

      let suivant: EtatSaisie;
      switch (action.type) {
        case 'inserer':
          suivant = inserer({ valeur, curseur: debut }, action.texte);
          break;
        case 'fraction':
          suivant = creerFraction({ valeur, curseur: debut });
          break;
        case 'retirer':
          // Une sélection explicite est supprimée en entier, comme le ferait le
          // clavier système : c'est le geste attendu.
          suivant =
            debut !== fin
              ? { valeur: valeur.slice(0, debut) + valeur.slice(fin), curseur: debut }
              : retirer({ valeur, curseur: debut });
          break;
        case 'effacer':
          suivant = effacerTout({ valeur, curseur: debut });
          break;
        case 'deplacer':
          suivant = deplacer({ valeur, curseur: debut }, action.pas);
          break;
        default:
          return;
      }

      onChange(suivant);
      requestAnimationFrame(() => {
        const cible = champRef.current;
        if (!cible) return;
        cible.focus({ preventScroll: true });
        cible.setSelectionRange(suivant.curseur, suivant.curseur);
      });
    },
    [onChange],
  );

  const appuyer = useCallback(
    (action: ToucheAction) => {
      if (action.type === 'valider') {
        onValider();
        return;
      }
      if (action.type === 'fermer') {
        onFermer();
        return;
      }
      if (action.type === 'systeme') {
        onSysteme();
        return;
      }
      appliquer(action);
    },
    [appliquer, onFermer, onSysteme, onValider],
  );

  // Le clavier mathématique ne doit pas « voler » le focus : le champ reste la
  // cible, pour que la saisie au clavier physique continue de fonctionner.
  useEffect(() => {
    champRef.current?.focus({ preventScroll: true });
  }, []);

  /**
   * Activation au doigt ou à la souris.
   *
   * `pointerdown` est traité avant `click` pour deux raisons : sur Android, le
   * `click` arrive après un délai pendant lequel le champ a perdu le focus — et
   * le curseur avec. `preventDefault()` empêche en outre la génération du
   * `click` qui suit, ce qui est exactement ce que l'on veut ici.
   */
  const surPointerDown = useCallback(
    (evenement: PointerEvent<HTMLButtonElement>, touche: Touche) => {
      evenement.preventDefault();
      appuyer(touche.action);
    },
    [appuyer],
  );

  /**
   * Activation au clavier, au commutateur d'accès ou par une technologie
   * d'assistance.
   *
   * Un `click` née du clavier porte toujours `detail === 0` : le navigateur
   * ne compte aucun point d'appui. Un `click` issu d'un doigt, d'une souris ou
   * d'un écran tactile porte `detail >= 1`.
   *
   * C'est cette propriété qui empêche l'action de s'exécuter deux fois quand le
   * tactile déclenche `pointerdown` **puis** `click` : le second est ignoré,
   * car il vient d'un point d'appui. Elle ne dépend d'aucun minuteur, d'aucun
   * état à raisonner et ne peut pas rester bloquée si un `click` n'arrive
   * jamais.
   */
  const surClick = useCallback(
    (evenement: MouseEvent<HTMLButtonElement>, touche: Touche) => {
      if (evenement.detail > 0) return;
      appuyer(touche.action);
    },
    [appuyer],
  );

  return (
    <div className={styles.clavier} role="group" aria-label="Clavier mathématique">
      {rangees.map((rangee, index) => (
        <div
          // Chaque rangée est une grille indépendante de quatre colonnes : le
          // regroupement visuel est fait par le CSS, pas par des sauts de ligne.
          className={styles.rangee}
          key={`rangee-${index}`}
          style={{ ['--colonnes' as string]: String(COLONNES) }}
        >
          {rangee.touches.map((touche) => (
            <ToucheClavier
              key={touche.id}
              touche={touche}
              champId={champId}
              surPointerDown={surPointerDown}
              surClick={surClick}
            />
          ))}
        </div>
      ))}
    </div>
  );
}