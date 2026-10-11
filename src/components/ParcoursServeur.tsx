import Link from 'next/link';

import { chargerParcours, type BlocPublic } from '@/lib/parcours';

/**
 * Affichage du parcours.
 *
 * Règles de rendu :
 *
 * - un bloc **fermé** n'affiche aucun exercice : rien d'inachevé n'est exposé ;
 * - un bloc fermé indique la semaine à laquelle il s'ouvre, ce qui est plus utile
 *   qu'une case vide ;
 * - hors année scolaire, la page **l'explique** au lieu d'afficher un parcours
 *   vide sans raison.
 */
export async function ParcoursServeur({ baseUrl }: { baseUrl: string }) {
  const etat = await chargerParcours(baseUrl);

  if (etat.kind === 'indisponible') {
    return (
      <div className="carte" role="status">
        <p className="carte__titre">Exercices indisponibles</p>
        <p>{etat.raison}</p>
      </div>
    );
  }

  const { parcours } = etat;
  const ouverts = parcours.blocs.filter((bloc) => bloc.disponible);

  return (
    <>
      <section className="section" aria-labelledby="titre-parcours-etat">
        <h2 className="section__titre" id="titre-parcours-etat">
          Où en est le programme
        </h2>
        <p className="section__note">{parcours.message}</p>
      </section>

      {ouverts.length === 0 && (
        <div className="carte">
          <p className="carte__titre">Aucun bloc ouvert aujourd’hui</p>
          <p>
            Les leçons se débloquent au fur et à mesure de l’année scolaire, à la
            semaine où elles sont enseignées. Reviens à la rentrée, ou plus tard dans
            l’année.
          </p>
        </div>
      )}

      {parcours.blocs.map((bloc) => (
        <section className="section" key={bloc.id} aria-labelledby={`titre-${bloc.id}`}>
          <h2 className="section__titre" id={`titre-${bloc.id}`}>
            {bloc.titre}
          </h2>
          <p className="section__note">
            {bloc.volumeHoraireH} h de programme · s’ouvre en semaine {bloc.semaineDebut}
            {bloc.disponible ? ' — ouverte' : ''}
          </p>

          <ul className="objectifs">
            {bloc.objectifs.map((objectif) => (
              <li key={objectif.id}>{objectif.libelle}</li>
            ))}
          </ul>

          {!bloc.disponible ? (
            <p className="message-ferme" role="status">
              {bloc.semainesAvantOuverture !== null
                ? `Disponible à partir de la semaine ${bloc.semaineDebut}.`
                : 'Ce bloc n’est pas encore ouvert.'}
            </p>
          ) : (
            <div className="grille">
              {bloc.exercices.map((exercice) => (
                <Link
                  className="carte exercice-lien"
                  key={exercice.id}
                  href={`/parcours/${exercice.id}`}
                >
                  <span className="etape__numero" aria-hidden="true">
                    {exercice.rang}
                  </span>
                  <div className="etape__corps">
                    <h3 className="etape__titre">Exercice {exercice.rang}</h3>
                    <p className="etape__detail">{exercice.consigne}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      ))}
    </>
  );
}

export type { BlocPublic };