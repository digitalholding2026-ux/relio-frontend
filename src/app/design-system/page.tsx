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

export default async function DesignSystemPage() {
  const actifEnProduction = process.env.DESIGN_SYSTEM_ENABLED === 'on';
  const estProduction = process.env.NODE_ENV === 'production';

  if (estProduction && !actifEnProduction) {
    notFound();
  }

  return <PageDesignSystem />;
}