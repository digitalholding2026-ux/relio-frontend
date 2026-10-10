'use client';

/**
 * Hauteur du clavier système — chantier 7.7, partie A.
 *
 * ## Le problème mesuré
 *
 * Sur Android, l'ouverture du clavier système **ne réduit pas la fenêtre de
 * mise en page** : seule la fenêtre visuelle change. Une mise en page en
 * `100dvh` continue donc de croire que l'écran fait 640 px de haut, alors
 * qu'il n'en reste que 400 à disposition. Tout ce qui est positionné en
 * `bottom` se retrouve derrière le clavier.
 *
 * C'est exactement ce qui était observé : le clavier mathématique, collé en bas
 * de la page, passait sous le clavier du téléphone, et le texte de l'application
 * n'était plus visible.
 *
 * ## La mesure
 *
 * `window.visualViewport` expose la fenêtre réellement visible, et l'API
 * `resize` se déclenche quand le clavier s'ouvre ou se ferme. La différence
 * entre la hauteur de la fenêtre et celle de la fenêtre visible donne la
 * hauteur du clavier.
 *
 * ## Ce que la page en fait
 *
 * La valeur est publiée dans une variable CSS, `--relio-clavier-systeme`. La
 * feuille de style la soustrait à la hauteur disponible. Aucun recalcul dans
 * chaque composant, et le comportement est exactement celui qu'on declare en
 * CSS.
 *
 * ## Pourquoi les deux mécanismes
 *
 * `inputMode="none"` devrait empêcher le clavier système de s'ouvrir sur un
 * champ de saisie mathématique. **Ce n'est pas garanti sur tous les
 * navigateurs Android.** On mesure donc le clavier système *et* on réserve de
 * la place pour le clavier mathématique : si l'un apparaît, l'autre ne peut pas
 * masquer le contenu.
 */

import { useEffect, useState } from 'react';

/** Nom de la variable CSS publication. */
export const VARIABLE_HAUTEUR_CLAVIER = '--relio-clavier-systeme';

export interface EtatClavierSysteme {
  /** Hauteur occupée par le clavier système, en pixels. 0 s'il est fermé. */
  readonly hauteur: number;
  /** Vrai tant que la mesure est disponible — utile pour distinguer 0 mesuré de 0 inconnu. */
  readonly mesure: boolean;
}

/**
 * Mesure la hauteur du clavier système et la publie en variable CSS.
 *
 * Renvoie 0 partout où l'API n'existe pas : sur un ordinateur de bureau, il
 * n'y a pas de clavier système, et la page doit se comporter normalement.
 */
export function useHauteurClavierSysteme(): EtatClavierSysteme {
  const [etat, setEtat] = useState<EtatClavierSysteme>({ hauteur: 0, mesure: false });

  useEffect(() => {
    const vue = window.visualViewport;
    if (vue === null || vue === undefined) return;

    const mesurer = (): void => {
      // La hauteur de la fenêtre visible exclut le clavier et les barres
      // système. `offsetTop` compte en plus l'espace au-dessus, que certains
      // navigateurs retirent de la hauteur visible sans le signaler.
      const hauteur = Math.max(0, window.innerHeight - vue.height - vue.offsetTop);

      setEtat({ hauteur, mesure: true });

      const racine = document.documentElement;
      if (hauteur === 0) {
        racine.style.removeProperty(VARIABLE_HAUTEUR_CLAVIER);
      } else {
        racine.style.setProperty(VARIABLE_HAUTEUR_CLAVIER, `${Math.round(hauteur)}px`);
      }
    };

    mesurer();
    vue.addEventListener('resize', mesurer);
    vue.addEventListener('scroll', mesurer);

    return () => {
      vue.removeEventListener('resize', mesurer);
      vue.removeEventListener('scroll', mesurer);
      document.documentElement.style.removeProperty(VARIABLE_HAUTEUR_CLAVIER);
    };
  }, []);

  return etat;
}