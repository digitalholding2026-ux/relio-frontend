import Link from 'next/link';

import { Exercice } from '@/components/Exercice';
import stylesBouton from '@/components/ds/Bouton.module.css';
import stylesParcours from '@/app/parcours/parcours.module.css';
import styles from './exercice.module.css';

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
 *
 * ## Chantier C2a — migration sur le design system
 *
 * L'en-tête et le pied de page reprennent exactement la structure de
 * `/parcours` : mêmes composants, mêmes tokens, mêmes styles de lien retour.
 * Les classes utilisées ici sont celles de `parcours.module.css`, et non des
 * duplications — les deux écrans ne peuvent pas diverger.
 */
export default async function PageExercice({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const apiBaseUrl = normaliserUrl(process.env.API_BASE_URL);

  return (
    <div className={`${stylesParcours.page} ${styles.pageExercice}`}>
      <main className={stylesParcours.conteneur}>
        <header className={stylesParcours.entete}>
          <p className={stylesParcours.enteteMarque}>
            <span className={stylesParcours.enteteLogo} aria-hidden="true">
              R
            </span>
            Relio
          </p>
          <h1 className={stylesParcours.titre}>Exercice</h1>
          <p className={stylesParcours.sousTitre}>
            Lis l’énoncé, écris ta réponse, et vérifie.
          </p>
        </header>

        <Exercice baseUrl={apiBaseUrl} exerciceId={id} />

        <footer className={stylesParcours.pied}>
          <div className={stylesParcours.conteneur}>
            <Link
              href="/parcours"
              className={[
                stylesBouton.bouton,
                stylesBouton.ghost,
                stylesParcours.lienRetour,
              ].join(' ')}
            >
              Retour au parcours
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}