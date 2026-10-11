import Link from 'next/link';

import { ApiStatus } from '@/components/ApiStatus';
import { PARCOURS } from '@/components/parcours';

const MOTS_CLES = ['Mathématiques', '3e', 'BEPC', 'Cameroun'];

const FONCTIONNALITES = [
  {
    titre: 'Parcours d’exercices',
    detail: 'Trois leçons du programme : calcul littéral, racines carrées, calcul numérique.',
    etat: 'Disponible',
    etatClasse: 'succes',
  },
  {
    titre: 'Indices progressifs',
    detail: 'Trois paliers d’aide : un rappel, une méthode, puis la première étape.',
    etat: 'Disponible',
    etatClasse: 'succes',
  },
  {
    titre: 'Diagnostic initial',
    detail: 'Un court questionnaire ciblé pour situer le niveau de départ.',
    etat: 'Prévu',
    etatClasse: 'attente',
  },
  {
    titre: 'Tuteur intelligent',
    detail: 'Une assistance pédagogique adaptée à ton niveau.',
    etat: 'Non planifié',
    etatClasse: 'neutre',
  },
];

function normaliserUrl(valeur: string | undefined): string {
  const brute = valeur?.trim();
  if (!brute) return '';
  return brute.replace(/\/+$/, '');
}

// La page d'accueil lit `API_BASE_URL` pour l'état de connexion au service.
// Elle doit donc être rendue à chaque requête : prérendue au build, elle
// afficherait un état figé. Même raison que sur `/parcours`.
export const dynamic = 'force-dynamic';

/**
 * Page d'accueil — composant serveur.
 *
 * `API_BASE_URL` est lue ici, côté serveur : c'est la raison pour laquelle la
 * variable ne porte pas le préfixe `NEXT_PUBLIC_`. Elle est transmise au
 * composant client `ApiStatus` par prop, et aucun appel réseau n'a lieu
 * pendant le build.
 */
export default function Accueil() {
  const apiBaseUrl = normaliserUrl(process.env.API_BASE_URL);

  return (
    <div className="page">
      <header className="entete">
        <div className="conteneur">
          <div className="entete__marque">
            <span className="entete__logo" aria-hidden="true">
              R
            </span>
            Relio
          </div>
          <h1 className="entete__titre">Prépare ton BEPC de mathématiques</h1>
          <p className="entete__sous-titre">
            Un parcours d’entraînement clair, pensé pour les élèves de 3e au Cameroun.
          </p>
          <ul className="entete__mots-cles">
            {MOTS_CLES.map((mot) => (
              <li className="mot-cle" key={mot}>
                {mot}
              </li>
            ))}
          </ul>
        </div>
      </header>

      <main className="conteneur">
        <section className="section" aria-labelledby="titre-appel">
          <h2 className="section__titre" id="titre-appel">
            Commencer
          </h2>
          <p className="section__note">
            Les exercices s’ouvrent à la semaine où la leçon est enseignée, pour ne
            jamais te demander une notion que tu n’as pas encore vue.
          </p>
          <p>
            <Link className="bouton bouton--principal lien-bouton" href="/parcours">
              Voir le parcours
            </Link>
          </p>
        </section>

        <div className="avertissement" role="status">
          <span className="avertissement__icone" aria-hidden="true">
            !
          </span>
          <span>
            <strong>Première version.</strong> Le parcours couvre trois leçons du
            programme, et rien de plus encore : ni diagnostic complet, ni tuteur, ni
            notation. Ce qui suit décrit ce qui est réellement disponible.
          </span>
        </div>

        <section className="section" aria-labelledby="titre-parcours">
          <h2 className="section__titre" id="titre-parcours">
            Le parcours
          </h2>
          <p className="section__note">
            De la première idée de tes acquis à l’entraînement. Toutes les étapes
            affichées ici sont disponibles.
          </p>
          <div className="grille">
            {PARCOURS.map((etape) => (
              <article className="carte etape" key={etape.numero}>
                <span className="etape__numero" aria-hidden="true">
                  {etape.numero}
                </span>
                <div className="etape__corps">
                  <div className="etat-api__ligne">
                    <h3 className="etape__titre">{etape.titre}</h3>
                    <span className={`badge badge--${etape.etat}`}>
                      {etape.etat === 'succes' ? 'Disponible' : 'Bientôt'}
                    </span>
                  </div>
                  <p className="etape__detail">{etape.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section" aria-labelledby="titre-fonctionnalites">
          <h2 className="section__titre" id="titre-fonctionnalites">
            État des fonctionnalités
          </h2>
          <p className="section__note">
            Ce que Relio propose aujourd’hui, et ce qui ne l’est pas encore.
          </p>
          <div className="grille">
            {FONCTIONNALITES.map((fonctionnalite) => (
              <article className="carte" key={fonctionnalite.titre}>
                <div className="etat-api__ligne">
                  <h3 className="etape__titre">{fonctionnalite.titre}</h3>
                  <span className={`badge badge--${fonctionnalite.etatClasse}`}>
                    {fonctionnalite.etat}
                  </span>
                </div>
                <p className="etape__detail">{fonctionnalite.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section" aria-labelledby="titre-api">
          <h2 className="section__titre" id="titre-api">
            Connexion au service
          </h2>
          <p className="section__note">
            Vérification réelle de la liaison avec le backend, effectuée depuis
            votre navigateur. Aucune réponse n’est inventée : si le service ne
            répond pas, l’application le dit.
          </p>
          <ApiStatus baseUrl={apiBaseUrl} />
        </section>
      </main>

      <footer className="pied">
        <div className="conteneur">
          <p>
            <strong>Relio</strong> — préparation au BEPC de mathématiques, 3e,
            Cameroun.
          </p>
          <p>
            Aucun contenu d’épreuve officielle n’est reproduit, et aucune donnée
            personnelle n’est collectée. Tes réponses sont enregistrées sur ton
            appareil pour te permettre de suivre ta progression ; tu peux les
            effacer à tout moment, et rien n’est conservé de ton parcours sur nos
            serveurs.
          </p>
        </div>
      </footer>
    </div>
  );
}