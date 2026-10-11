/**
 * Le verdict de correction — les cinq variantes de la décision D5.
 *
 * ## Composant pur
 *
 * Il ne fait aucun appel, ne tient aucun état. C'est ce qui permet de tester
 * les cinq variantes côte à côte, sans stubber `fetch` et sans monter l'écran
 * complet.
 *
 * ## La règle pédagogique est celle du serveur
 *
 * Le libellé affiché vient de `correction.libelle`, mot pour mot. Les valeurs
 * de `LIBELLE_REPLI` ne servent que si l'API répond une version antérieure,
 * sans ce champ. L'écran ne reconstruit jamais le message : une
 * correspondance locale risquerait de diverger de la règle validée par
 * l'enseignant.
 *
 * ## Aucune couleur ne porte le sens
 *
 * Le **ton** de la pastille accompagne le message, il ne le remplace pas. Une
 * personne qui ne distingue pas les teintes lit exactement le même texte : la
 * pastille porte son libellé, jamais une pastille vide.
 *
 * ## Jamais de score
 *
 * Aucun pourcentage, aucun « tu as 7/10 », aucun niveau de maîtrise. L'élève
 * reçoit un retour sur **sa réponse**, pas une note.
 */

import { Carte } from '@/components/ds/Carte';
import { Icone } from '@/components/ds/Icone';
import { Pastille, type TonPastille } from '@/components/ds/Pastille';
import { texteAffiche, type Tutorat as TutoratServeur } from '@/lib/tutorat';
import type { Correction } from '@/lib/parcours';

import { PanneauTutorat } from './Tutorat';
import styles from './exercice.module.css';

/**
 * Libellés de repli, par verdict.
 *
 * **Ils ne devraient jamais être utilisés** : le serveur fournit déjà
 * `libelle`, calculé par la même règle que le verdict. Ces valeurs servent si
 * l'API répond une version antérieure, sans le champ.
 */
const LIBELLE_REPLI: Record<Correction['verdict'], string> = {
  correct: 'Ta réponse est juste.',
  partiellement_correct: 'Ta réponse est partiellement correcte.',
  resultat_juste_consigne_non_respectee:
    'Ton résultat est juste, mais pas dans la forme demandée.',
  incorrect: 'Ce n’est pas encore juste.',
  a_determiner: 'Ta réponse est juste ; la forme demandée reste à vérifier.',
};

/**
 * Le libellé affiché vient du serveur. Il n'est amputé d'aucun mot : c'est le
 * retour pédagogique validé par l'enseignant.
 */
function libelleAffiche(correction: Correction): string {
  const fourni = correction.libelle?.trim();
  return fourni && fourni.length > 0 ? fourni : LIBELLE_REPLI[correction.verdict];
}

/**
 * Ton de la pastille, par verdict.
 *
 * `partiellement_correct` et `resultat_juste_consigne_non_respectee` partagent
 * volontairement le même ton : tous deux signifient « tu n'as pas tout à
 * fait, mais tu n'as pas faux ». Le signal « rouge » serait un contresens
 * pédagogique. Ce qui distingue les deux, c'est le libellé.
 */
const TON_PASTILLE: Record<Correction['verdict'], TonPastille> = {
  correct: 'succes',
  partiellement_correct: 'alerte',
  resultat_juste_consigne_non_respectee: 'alerte',
  incorrect: 'alerte',
  a_determiner: 'neutre',
};

/** Rôle du ton dans le titre de la pastille — jamais dans le message. */
const ETIQUETTE_PASTILLE: Record<Correction['verdict'], string> = {
  correct: 'Juste',
  partiellement_correct: 'À compléter',
  resultat_juste_consigne_non_respectee: 'Juste, à reformuler',
  incorrect: 'À revoir',
  a_determiner: 'À vérifier',
};

export interface VerdictProps {
  readonly correction: Correction;
  readonly tutorat: TutoratServeur | null;
}

export function Verdict({ correction, tutorat }: VerdictProps) {
  const juste = correction.statut === 'correcte';

  return (
    <Carte className={styles.verdict}>
      {/* La classe suit le **verdict** (décision D5) et non le statut
          technique : « partiellement correct » et « résultat juste, consigne
          non respectée » doivent se distinguer visuellement. */}
      <div className={styles.verdictEntete} data-verdict={correction.verdict}>
        <Pastille ton={TON_PASTILLE[correction.verdict]} compacte>
          {ETIQUETTE_PASTILLE[correction.verdict]}
        </Pastille>
        <span className={styles.verdictIcone} aria-hidden="true">
          <Icone nom={juste ? 'check' : correction.verdict === 'incorrect' ? 'alerte' : 'info'} taille={16} />
        </span>
      </div>

      <p className={styles.verdictStatut}>{libelleAffiche(correction)}</p>

      {/* Chantier 7.5 : aide progressive. Le niveau affiché est celui que le
          serveur a choisi ; l'écran ne le calcule pas. */}
      {tutorat !== null ? (
        <PanneauTutorat
          niveau={tutorat.niveau}
          message={texteAffiche(tutorat, correction.explication)}
          action={tutorat.action}
          resume={tutorat.resume}
          bilan={juste}
        />
      ) : (
        <p className={styles.verdictDetail}>{correction.explication}</p>
      )}

      {correction.verdict === 'resultat_juste_consigne_non_respectee' && (
        <p className={styles.verdictDetail}>
          Ton calcul est bon : il reste seulement à l’écrire comme la consigne le demande.
        </p>
      )}

      {correction.achevement === 'inacheve' && (
        <p className={styles.verdictDetail}>Tu as bien commencé ! Il reste une étape.</p>
      )}

      {correction.lectureArbitree === false && (
        // Point non arbitré : on ne présente jamais ce cas comme une conclusion
        // ferme.
        <p className={`${styles.verdictDetail} ${styles.verdictDetailDiscret}`}>
          Ton enseignant vérifiera ce point.
        </p>
      )}
    </Carte>
  );
}

/** Re-export pour que l'écran n'ait pas à réimporter le type du serveur. */