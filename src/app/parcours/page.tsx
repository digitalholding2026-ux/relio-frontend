import Link from 'next/link';

import { ParcoursServeur } from '@/components/ParcoursServeur';

function normaliserUrl(valeur: string | undefined): string {
  const brute = valeur?.trim();
  if (!brute) return '';
  return brute.replace(/\/+$/, '');
}

/**
 * Page du parcours — composant **serveur**.
 *
 * `API_BASE_URL` est lue ici, côté serveur, puis transmise par prop. Aucun
 * secret ne part dans le bundle, et le build n'effectue aucun appel réseau.
 */
export default async function PageParcours() {
  const apiBaseUrl = normaliserUrl(process.env.API_BASE_URL);

  return (
    <div className="page">
      <main className="conteneur">
        <header className="entete entete--interne">
          <div className="entete__marque">
            <span className="entete__logo" aria-hidden="true">
              R
            </span>
            Relio
          </div>
          <h1 className="entete__titre">Ton parcours de mathématiques</h1>
          <p className="entete__sous-titre">
            Trois leçons du programme, des exercices et des indices progressifs.
          </p>
        </header>

        <div className="avertissement" role="note">
          <span className="avertissement__icone" aria-hidden="true">
            !
          </span>
          <span>
            Ces exercices donnent une <strong>première idée</strong> de tes acquis sur
            quelques points du programme. Ils ne couvrent pas tout le programme, et
            aucun score ni niveau n’en est tiré.
          </span>
        </div>

        <ParcoursServeur baseUrl={apiBaseUrl} />

        <footer className="pied">
          <div className="conteneur">
            <p>
              <Link className="lien" href="/">
                Retour à l’accueil
              </Link>
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}