/**
 * Accueil — « Ta route cette semaine ».
 *
 * Ce que l'élève doit comprendre en cinq secondes, dans cet ordre :
 *
 * 1. où il en est  — la semaine, et le bloc ouvert ;
 * 2. ce qu'il peut faire — un seul bouton, « Continuer » ;
 * 3. combien de temps — la durée à côté du bouton ;
 * 4. ce qu'il va apprendre — le titre du bloc ;
 * 5. qu'il est au bon endroit — « Prépare ton BEPC de mathématiques. »
 *
 * ## D'où viennent les données
 *
 * **De l'API, pas d'un tableau en dur.** L'ancien accueil annonçait des
 * fonctionnalités « Disponible » ou « Bientôt » à partir d'une liste statique
 * maintenue à la main : elle pouvait dire « Disponible » pour un service
 * arrêté. La carte principale lit `GET /api/v1/parcours`, dont la réponse
 * décrit réellement quels blocs sont ouverts cette semaine.
 *
 * ## Ce que la page ne fait pas
 *
 * Elle n'invente rien. Si l'API ne répond pas, la carte le dit et propose de
 * réessayer ; elle n'affiche jamais un parcours de remplacement, ni un score,
 * ni un pourcentage de réussite. `BarreProgression` porte ici la **position
 * dans l'année**, pas un niveau : rien de ce qui est affiché ne se déduit
 * d'une réponse de l'élève.
 */

import { Suspense } from 'react';

import { ApiStatus } from '@/components/ApiStatus';
import { Carte } from '@/components/ds/Carte';
import { Icone } from '@/components/ds/Icone';
import { chargerParcours } from '@/lib/parcours';

import { CarteRoute, CarteRouteEnAttente } from './CarteRoute';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

/**
 * Durée d'une année scolaire, en semaines.
 *
 * Cette valeur duplique `NOMBRE_SEMAINES` côté serveur (`src/lib/calendrier.ts`
 * du dépôt `relio-backend`). Elle est écrite ici parce que l'API renvoie la
 * semaine en cours mais pas la longueur de l'année, et que l'écran doit dire
 * « Semaine 5 sur 30 » sans ajouter un aller-retour.
 *
 * **Si le serveur change cette valeur, ce nombre doit changer ici aussi.**
 * C'est la seule donnée de la page qui ne vient pas de l'API.
 */
const SEMAINES_PAR_ANNEE = 30;

const normaliserUrl = (brut: string | undefined): string => {
  const valeur = (brut ?? '').trim();
  if (valeur === '') return '';
  return valeur.replace(/\/+$/, '');
};

const ETAPES = [
  {
    icone: 'info',
    titre: 'Tu lis la notion',
    phrase: 'Une leçon courte, écrite simplement, avant de commencer.',
  },
  {
    icone: 'cible',
    titre: 'Tu t’entraînes',
    phrase: 'Des exercices qui correspondent à ce que tu viens de voir.',
  },
  {
    icone: 'rafraichir',
    titre: 'Tu comprends tes erreurs',
    phrase: 'Chaque réponse est expliquée, pour que tu progresses vraiment.',
  },
] as const;

/** La carte principale, alimentée par l'API. */
async function CarteDepuisApi({ baseUrl, semainesParAnnee }: { baseUrl: string; semainesParAnnee: number }) {
  const etat = await chargerParcours(baseUrl);
  return <CarteRoute etat={etat} semainesParAnnee={semainesParAnnee} />;
}

export default async function PageAccueil() {
  const apiBaseUrl = normaliserUrl(process.env.API_BASE_URL);

  return (
    <div className={styles.page}>
      <main className={styles.conteneur}>
        <header className={styles.entete}>
          <h1 className={styles.salutation}>Bonjour.</h1>
          <p className={styles.sousTitre}>Prépare ton BEPC de mathématiques.</p>
        </header>

        {/* Le repli a la forme de la carte, pas la forme d'un texte : à
            l'arrivée des données, le contenu occupe exactement la même place
            et la page ne saute pas — y compris sur une connexion lente. */}
        <Suspense fallback={<CarteRouteEnAttente />}>
          <CarteDepuisApi baseUrl={apiBaseUrl} semainesParAnnee={SEMAINES_PAR_ANNEE} />
        </Suspense>

        <section className={styles.section} aria-labelledby="titre-etapes">
          <h2 className={styles.titreSection} id="titre-etapes">
            Comment ça marche
          </h2>
          <ul className={styles.etapes}>
            {ETAPES.map((etape) => (
              <li key={etape.titre}>
                <Carte sansOmbre className={styles.etape}>
                  <span className={styles.etapeIcone} aria-hidden="true">
                    <Icone nom={etape.icone} taille={24} />
                  </span>
                  <p className={styles.etapeTitre}>{etape.titre}</p>
                  <p className={styles.etapePhrase}>{etape.phrase}</p>
                </Carte>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className={styles.pied}>
        <div className={styles.conteneur}>
          <p className={styles.piedTexte}>
            Aucun contenu d’épreuve officielle n’est reproduit, et aucune donnée
            personnelle n’est collectée. Tes réponses sont enregistrées sur ton
            appareil pour te permettre de suivre ta progression ; tu peux les
            effacer à tout moment, et rien n’est conservé de ton parcours sur nos
            serveurs.
          </p>
          <ApiStatus baseUrl={apiBaseUrl} />
        </div>
      </footer>
    </div>
  );
}