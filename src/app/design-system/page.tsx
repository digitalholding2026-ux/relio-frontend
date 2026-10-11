import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PageDesignSystem } from './PageDesignSystem';

/**
 * Page de référence visuelle du design system.
 *
 * ## Protection
 *
 * La page est **fermée par défaut en production**. Elle est atteignable quand :
 *
 * - `DESIGN_SYSTEM_ENABLED` vaut `on` dans l'environnement de déploiement ;
 * - ou que le déploiement n'est pas considéré comme la production, ce qui est le
 *   cas de tout `next dev` et de toute prévisualisation.
 *
 * Le projet ne dispose d'aucun système d'authentification, et il n'en est pas
 * introduit ici : une page interne n'est pas une raison de construire un
 * contrôle d'accès. Une variable d'environnement posée par le responsable du
 * projet règle le problème sans introduire de secret ni de session.
 *
 * La page est par ailleurs marquée `noindex` : même ouverte, elle ne doit pas
 * apparaître dans un moteur de recherche.
 *
 * ## Pourquoi cette page existe
 *
 * Elle est le **contrat visuel** du produit. Un chantier qui ajoute un écran
 * doit venir y comparer, et non redéfinir une couleur ou un rayon. C'est la
 * seule façon d'éviter que deux écrans ne divergent sur la même question.
 */

export const metadata: Metadata = {
  title: 'Design system — Relio',
  robots: { index: false, follow: false },
};

/**
 * Rendu à la demande, jamais prérendu.
 *
 * La garde d'accès ci-dessous lit `DESIGN_SYSTEM_ENABLED` **et** `NODE_ENV`.
 * Or, sur une page prérendue, le build évalue cette garde une fois, à la
 * construction duartefact : `next build` s'exécute avec `NODE_ENV=production`,
 * donc sans `DESIGN_SYSTEM_ENABLED`, la page était prérendue en 404
 * (`<html id="__next_error__">`). Poser la variable sur le déploiement ne
 * changeait alors plus rien : le HTML servi restait celui de l'erreur.
 *
 * `force-dynamic` déplace l'évaluation de la garde au moment de la requête, ce
 * qui rend la page réellement pilotable par `DESIGN_SYSTEM_ENABLED`, tout en
 * conservant le 404 propre lorsqu'elle est absente.
 */
export const dynamic = 'force-dynamic';

export default async function DesignSystemPage() {
  const actifEnProduction = process.env.DESIGN_SYSTEM_ENABLED === 'on';
  const estProduction = process.env.NODE_ENV === 'production';

  if (estProduction && !actifEnProduction) {
    notFound();
  }

  return <PageDesignSystem />;
}