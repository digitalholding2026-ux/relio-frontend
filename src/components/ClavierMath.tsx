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
 * - fermeture et réouverture passent par des boutons nommés.
 */

import { useCallback, useEffect, type RefObject } from 'react';

import {
  creerFraction,
  deplacer,
  effacerTout,
  inserer,
  retirer,
  touchesPour,
  type EtatSaisie,
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
  const touches = touchesPour(typeReponse);

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

  return (
    <div className="clavier" role="group" aria-label="Clavier mathématique">
      <div className="clavier__grille">
        {touches.map((touche) => (
          <button
            key={touche.id}
            type="button"
            className="bouton clavier__touche"
            style={touche.largeur ? { gridColumn: `span ${touche.largeur}` } : undefined}
            aria-label={touche.aria}
            aria-controls={champId}
            // `onPointerDown` et non `onClick` : sur Android, le `click` arrive
            // après un délai pendant lequel le champ a perdu le focus — et le
            // curseur avec.
            onPointerDown={(evenement) => {
              evenement.preventDefault();
              appuyer(touche.action);
            }}
          >
            {touche.libelle}
          </button>
        ))}
      </div>
    </div>
  );
}