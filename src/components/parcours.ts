export type Ton = 'succes' | 'attente' | 'neutre';

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
 * `succes` = disponible dans l'application ; `attente` = prévu mais pas encore
 * livré. Le rendu affiche l'état : rien n'est présenté comme disponible s'il
 * ne l'est pas.
 */
export const PARCOURS: Etape[] = [
  {
    numero: 1,
    titre: 'Parcours d’exercices',
    detail: 'Tes exercices, leçon par leçon, à mesure que le programme les ouvre.',
    etat: 'succes',
  },
  {
    numero: 2,
    titre: 'Exercices guidés',
    detail: 'Un exercice à la fois, avec un énoncé et une consigne clairs.',
    etat: 'succes',
  },
  {
    numero: 3,
    titre: 'Explication et indices',
    detail: 'Trois niveaux d’aide : un rappel, une méthode, puis la première étape.',
    etat: 'succes',
  },
  {
    numero: 4,
    titre: 'Diagnostic initial',
    detail: 'Quelques questions pour te proposer un premier exercice adapté.',
    etat: 'attente',
  },
  {
    numero: 5,
    titre: 'Suivi de progression',
    detail: 'Visualiser tes acquis et les notions à consolider.',
    etat: 'neutre',
  },
];