import { verifierApi } from '@/lib/api';

import { Bouton } from '@/components/ds/Bouton';
import { Pastille } from '@/components/ds/Pastille';
import styles from './ApiStatus.module.css';

/**
 * État du service — une pastille discrète, en bas de page.
 *
 * ## Ce que ce composant ne fait plus
 *
 * Il n'affiche **plus l'adresse du backend**. L'ancien composant montrait
 * `baseUrl` sous le nom du service : une URL de déploiement n'a aucune
 * utilité pour un élève et n'a pas sa place sur son écran. Elle reste une
 * information d'exploitation, lisible dans les journaux du serveur.
 *
 * Il ne montre plus non plus une carte à cinq états. L'élève n'a pas à
 * distinguer « contrat désynchronisé » de « service indisponible » : ce sont
 * deux formulations du même fait pour lui, et une seule question compte —
 * « puis-je travailler ? ». La distinction reste visible côté serveur, dans les
 * journaux et dans `lib/api.test.ts`.
 *
 * ## Pourquoi ce n'est plus un composant client
 *
 * Il l'était, et la raison était alors valable : sans elle, un build Vercel
 * aurait fait un appel réseau et échoué si l'API était indisponible au moment
 * de la compilation. La situation a changé — cette page interroge déjà l'API
 * **côté serveur** pour construire la carte principale, donc l'appel est déjà
 * fait, et `force-dynamic` garantit qu'il a lieu à chaque requête plutôt qu'au
 * build.
 *
 * Refaire la même vérification depuis le navigateur coûtait une seconde
 * requête et **3,7 Ko de JavaScript** : le design system entier entrait dans le
 * bundle de l'accueil par ce chemin, alors que rien n'y interagissait. Le
 * composant est donc rendu côté serveur, et le bouton « Réessayer » est un
 * formulaire `GET` vers la page — il fonctionne même si aucun script n'a
 * chargé.
 *
 * ## Aucune invention
 *
 * Comme `lib/api.ts`, ce composant ne fabrique jamais une réponse favorable :
 * sans réponse réelle du serveur, il affiche l'indisponibilité, jamais
 * « disponible ».
 */
export async function ApiStatus({ baseUrl }: { baseUrl: string }) {
  if (baseUrl === '') {
    return (
      <p className={styles.ligne}>
        <Pastille ton="neutre" compacte>
          Service non configuré
        </Pastille>
      </p>
    );
  }

  const etat = await verifierApi(baseUrl);
  const disponible = etat.kind === 'joignable';

  return (
    <p className={styles.ligne}>
      <Pastille ton={disponible ? 'succes' : 'alerte'} compacte>
        {disponible ? 'Service disponible' : 'Service injoignable'}
      </Pastille>

      {!disponible ? (
        <form action="/" method="get" className={styles.formulaire}>
          <Bouton type="submit" variante="ghost" taille="sm">
            Réessayer
          </Bouton>
        </form>
      ) : null}
    </p>
  );
}