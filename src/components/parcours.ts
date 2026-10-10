export type Ton = 'attente' | 'neutre';

export interface Etape {
  numero: number;
  titre: string;
  detail: string;
  /** `attente` = pas encore disponible. `neutre` = à venir. */
  etat: Ton;
}

/**
 * Étapes du parcours d'apprentissage.
 *
 * ⚠️ Aucune de ces étapes n'est implémentée. Elles décrivent un parcours
 * **prévu**, pas un produit livré. Le rendu affiche explicitement leur état.
 */
export const PARCOURS: Etape[] = [
  {
    numero: 1,
    titre: 'Mini-diagnostic',
    detail: 'Quelques questions pour situer tes acquis et te proposer un premier exercice.',
    etat: 'attente',
  },
  {
    numero: 2,
    titre: 'Premier exercice adapté',
    detail: 'Un exercice choisi selon ton point de départ, avec des indices progressifs.',
    etat: 'attente',
  },
  {
    numero: 3,
    titre: 'Explication et indices',
    detail: 'Trois niveaux d’aide : un rappel, une méthode, puis la première étape.',
    etat: 'attente',
  },
  {
    numero: 4,
    titre: 'Diagnostic plus complet',
    detail: 'Un parcours approfondi sur l’ensemble du programme si tu le souhaites.',
    etat: 'attente',
  },
  {
    numero: 5,
    titre: 'Suivi de la progression',
    detail: 'Visualiser tes acquis et les notions à consolider.',
    etat: 'neutre',
  },
];