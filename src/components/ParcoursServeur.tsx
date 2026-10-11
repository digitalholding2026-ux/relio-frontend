import { chargerParcours } from '@/lib/parcours';

import { ParcoursListe } from '@/app/parcours/ParcoursListe';

/**
 * Affichage du parcours — le composant qui interroge l'API.
 *
 * ## Ce qui change au chantier C1
 *
 * Le composant ne contient plus aucun balisage. Il lit l'API, passe l'état à
 * `ParcoursListe`, et c'est tout. Le rendu — y compris ses quatre états — est
 * dans un composant pur, testable sans `fetch`.
 *
 * ## Ce qui ne change pas
 *
 * Les règles de rendu sont celles du chantier 7, et le test le vérifie :
 *
 * - un bloc **fermé** n'affiche aucun exercice : rien d'inachevé n'est exposé ;
 * - un bloc fermé indique la semaine à laquelle il s'ouvre, ce qui est plus
 *   utile qu'une case vide ;
 * - hors année scolaire, la page **l'explique** au lieu d'afficher un parcours
 *   vide sans raison.
 *
 * Le composant reste **serveur** : aucun `'use client'`, aucun état React, et
 * `API_BASE_URL` ne quitte jamais le serveur.
 */
export async function ParcoursServeur({ baseUrl }: { baseUrl: string }) {
  const etat = await chargerParcours(baseUrl);
  return <ParcoursListe etat={etat} />;
}

export type { BlocPublic } from '@/lib/parcours';