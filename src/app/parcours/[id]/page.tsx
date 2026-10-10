import Link from 'next/link';

import { Exercice } from '@/components/Exercice';

function normaliserUrl(valeur: string | undefined): string {
  const brute = valeur?.trim();
  if (!brute) return '';
  return brute.replace(/\/+$/, '');
}

/**
 * Page d'un exercice — composant serveur.
 *
 * L'énoncé est chargé côté client via l'API : il ne doit jamais être embarqué
 * dans le bundle, pour que le contenu pédagogique reste sous le contrôle du
 * backend.
 */
export default async function PageExercice({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
          <h1 className="entete__titre">Exercice</h1>
        </header>

        <Exercice baseUrl={apiBaseUrl} exerciceId={id} />

        <footer className="pied">
          <div className="conteneur">
            <p>
              <Link className="lien" href="/parcours">
                Retour au parcours
              </Link>
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}