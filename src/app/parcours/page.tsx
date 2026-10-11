import Link from 'next/link';
import { Suspense } from 'react';

import { ParcoursServeur } from '@/components/ParcoursServeur';
import stylesBouton from '@/components/ds/Bouton.module.css';
import { Icone } from '@/components/ds/Icone';

import { ParcoursListeEnAttente } from './ParcoursListe';
import styles from './parcours.module.css';

function normaliserUrl(valeur: string | undefined): string {
  const brute = valeur?.trim();
  if (!brute) return '';
  return brute.replace(/\/+$/, '');
}

// `API_BASE_URL` doit être lue **à la requête**, pas au build.
//
// Sans cette directive, Next.js classe la page comme statique et la
// prerend au build : `process.env.API_BASE_URL` vaut alors `undefined`, la
// page affiche « Le service d'exercices n'est pas configuré sur ce
// déploiement », et elle est servie telle quelle jusqu'au prochain build.
// Un élève voyait donc un parcours vide alors que le backend répondait très
// bien — et changer la variable d'environnement sur Vercel n'y changeait
// rien. C'est le défaut de navigation du chantier 7.1.
export const dynamic = 'force-dynamic';

/**
 * Page du parcours — composant **serveur**.
 *
 * `API_BASE_URL` est lue ici, côté serveur, puis transmise par prop. Aucun
 * secret ne part dans le bundle, et le build n'effectue aucun appel réseau :
 * la seule conséquence de la directive ci-dessus est que la page est rendue
 * à chaque requête, ce qui est nécessaire pour que la configuration de
 * production s'applique.
 *
 * ## Chantier C1 — migration sur le design system
 *
 * La page n'utilise plus aucune classe de `globals.css` : tout est dans
 * `parcours.module.css`, alimenté par les tokens `--relio-*`. Le bandeau
 * d'avertissement, l'en-tête et le pied de page sont eux aussi migrés.
 *
 * Le repli de chargement est un `<Suspense>` : le HTML part tout de suite avec
 * la forme des cartes, au lieu d'attendre les 8 secondes du délai réseau avant
 * d'afficher quoi que ce soit.
 */
export default async function PageParcours() {
  const apiBaseUrl = normaliserUrl(process.env.API_BASE_URL);

  return (
    <div className={styles.page}>
      <main className={styles.conteneur}>
        <header className={styles.entete}>
          <p className={styles.enteteMarque}>
            <span className={styles.enteteLogo} aria-hidden="true">
              R
            </span>
            Relio
          </p>
          <h1 className={styles.titre}>Ton parcours de mathématiques</h1>
          <p className={styles.sousTitre}>
            Trois leçons du programme, des exercices et des indices progressifs.
          </p>
        </header>

        <div className={styles.avertissement} role="status">
          <span className={styles.avertissementIcone} aria-hidden="true">
            !
          </span>
          <span>
            Ces exercices donnent une <strong>première idée</strong> de tes acquis sur
            quelques points du programme. Ils ne couvrent pas tout le programme, et
            aucun score ni niveau n’en est tiré.
          </span>
        </div>

        <Suspense fallback={<ParcoursListeEnAttente />}>
          <ParcoursServeur baseUrl={apiBaseUrl} />
        </Suspense>
      </main>

      <footer className={styles.pied}>
        <div className={styles.conteneur}>
          <Link
            href="/"
            className={[stylesBouton.bouton, stylesBouton.ghost, styles.lienRetour].join(' ')}
          >
            <Icone nom="chevron" className={styles.fleche} aria-hidden="true" />
            Retour à l’accueil
          </Link>
        </div>
      </footer>
    </div>
  );
}