import { ApiStatus } from '@/components/ApiStatus';
import { PARCOURS } from '@/components/parcours';

const MOTS_CLES = ['Mathématiques', '3e', 'BEPC', 'Cameroun'];

const FONCTIONNALITES_PREVUES = [
  {
    titre: 'Diagnostic initial',
    detail: 'Un court questionnaire ciblé pour situer le niveau de départ.',
    etat: 'Prévu',
  },
  {
    titre: 'Exercices guidés',
    detail: 'Des exercices adaptés, avec des indices progressifs et des explications.',
    etat: 'Prévu',
  },
  {
    titre: 'Tuteur intelligent',
    detail: 'Une assistance pédagogique adaptée à ton niveau.',
    etat: 'Non planifié',
  },
  {
    titre: 'Suivi de progression',
    detail: 'Un tableau de tes acquis et des notions à retravailler.',
    etat: 'Non planifié',
  },
];

function normaliserUrl(valeur: string | undefined): string {
  const brute = valeur?.trim();
  if (!brute) return '';
  return brute.replace(/\/+$/, '');
}

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
        <div className="avertissement" role="note">
          <span className="avertissement__icone" aria-hidden="true">
            !
          </span>
          <span>
            <strong>Version de démonstration.</strong> Relio est en cours de
            construction. Aucune fonctionnalité pédagogique n’est encore
            disponible : ce qui suit décrit un parcours <em>prévu</em>, pas un
            produit livré.
          </span>
        </div>

        <section className="section" aria-labelledby="titre-parcours">
          <h2 className="section__titre" id="titre-parcours">
            Le parcours prévu
          </h2>
          <p className="section__note">
            Cinq étapes. Aucune n’est encore accessible.
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
                    <span
                      className={
                        etape.etat === 'attente' ? 'badge badge--attente' : 'badge badge--neutre'
                      }
                    >
                      {etape.etat === 'attente' ? 'Bientôt' : 'Prévu'}
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
            Ce que Relio prévoit de proposer, avec son état réel aujourd’hui.
          </p>
          <div className="grille">
            {FONCTIONNALITES_PREVUES.map((fonctionnalite) => (
              <article className="carte" key={fonctionnalite.titre}>
                <div className="etat-api__ligne">
                  <h3 className="etape__titre">{fonctionnalite.titre}</h3>
                  <span
                    className={
                      fonctionnalite.etat === 'Prévu'
                        ? 'badge badge--attente'
                        : 'badge badge--neutre'
                    }
                  >
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
            Socle technique v0.1. Aucun contenu d’épreuve officielle n’est
            reproduit. Aucune donnée personnelle n’est collectée.
          </p>
        </div>
      </footer>
    </div>
  );
}