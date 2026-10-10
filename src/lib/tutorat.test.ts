/**
 * Chantier 7.5 — contrat d'affichage du tutorat côté client.
 *
 * Le client est un **affichage** : il ne décide ni du verdict, ni du niveau
 * d'aide, ni du contenu pédagogique. Ces tests verrouillent donc que la règle
 * ne s'infiltre pas dans le frontend :
 *
 * 1. aucun mot de maîtrise ne peut apparaître dans un libellé ;
 * 2. une catégorie technique n'est jamais affichée brute ;
 * 3. le texte affiché est bien celui du serveur, jamais une reformulation
 *    locale qui divergerait de la règle ;
 * 4. une API antérieure, sans `tutorat`, reste affichable.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  LIBELLE_CATEGORIE,
  LIBELLE_NIVEAU,
  LIBELLE_SUIVI,
  libelleCategorie,
  texteAffiche,
  type SuiviObjectif,
  type Tutorat,
} from './tutorat.js';

const TUTEUR: Tutorat = {
  niveau: 1,
  message: 'As-tu distribué le signe « − » dans chaque terme entre parenthèses ?',
  action: 'Réessaie en tenant compte de cette question.',
  origine: 'signature',
  resume: null,
};

describe('7.5 — le texte affiché est celui du serveur', () => {
  it('affiche le message du tutorat quand il est présent', () => {
    assert.equal(texteAffiche(TUTEUR, 'explication de repli'), TUTEUR.message);
  });

  it('retombe sur l’explication si l’API ne renvoie pas de tutorat', () => {
    // Une API antérieure ne porte pas le champ : l'écran doit rester utile.
    assert.equal(texteAffiche(null, 'explication de repli'), 'explication de repli');
    assert.equal(texteAffiche(undefined, 'explication de repli'), 'explication de repli');
  });

  it('retombe sur l’explication si le message est vide', () => {
    assert.equal(texteAffiche({ ...TUTEUR, message: '   ' }, 'repli'), 'repli');
  });

  it('ne reformule jamais le message reçu', () => {
    const long = 'Une aide volontairement longue, avec des parenthèses (comme ici).';
    assert.equal(texteAffiche({ ...TUTEUR, message: long }, 'repli'), long);
  });
});

describe('7.5 — aucune maîtrise affirmée', () => {
  const MOTS_INTERDITS = /maîtris|maîtris\w*|acquis|dominé|assimilé|niveau \d sur \d/i;

  it('ne dit jamais « maîtrisé » dans un libellé de niveau', () => {
    for (const [niveau, libelle] of Object.entries(LIBELLE_NIVEAU)) {
      assert.doesNotMatch(libelle, MOTS_INTERDITS, `niveau ${niveau}`);
    }
  });

  it('ne dit jamais « maîtrisé » dans un libellé de suivi', () => {
    for (const [etat, libelle] of Object.entries(LIBELLE_SUIVI)) {
      assert.doesNotMatch(libelle, MOTS_INTERDITS, etat);
    }
  });

  it('présente une réussite après aide comme « à confirmer »', () => {
    // La nuance du chantier : une réussite après aide n'est pas une maîtrise.
    assert.match(LIBELLE_SUIVI.a_confirmer, /avec de l’aide/i);
    assert.match(LIBELLE_SUIVI.a_confirmer, /essaie seul/i);
  });

  it('ne produit aucun état nommé « maîtrisé »', () => {
    const etats = Object.keys(LIBELLE_SUIVI);
    assert.equal(etats.includes('maitrise'), false);
    assert.equal(etats.includes('acquis'), false);
  });

  it('ne donne aucun score ni pourcentage', () => {
    for (const libelle of [...Object.values(LIBELLE_SUIVI), ...Object.values(LIBELLE_NIVEAU)]) {
      assert.doesNotMatch(libelle, /\d+\s*%|note|score/i, libelle);
    }
  });
});

describe('7.5 — aucune clé technique affichée à l’élève', () => {
  it('traduit chaque catégorie connue', () => {
    for (const cle of Object.keys(LIBELLE_CATEGORIE)) {
      const libelle = libelleCategorie(cle);
      assert.notEqual(libelle, '', cle);
      assert.doesNotMatch(libelle, /_/, `« ${cle} » est affiché brut.`);
    }
  });

  it('retombe sur un texte prudent pour une catégorie inconnue', () => {
    // Une catégorie venue d'une API plus récente ne doit pas fuir en clair.
    assert.equal(libelleCategorie('truc_inconnu'), 'difficulté que je n’ai pas su nommer');
  });

  it('ne rend rien sur une absence de catégorie', () => {
    assert.equal(libelleCategorie(null), '');
    assert.equal(libelleCategorie(undefined), '');
  });

  it('ne présente jamais « erreur non identifiée » comme une absence d’erreur', () => {
    // La nuance du backend : `null` = aucune erreur,
    // `erreur_non_identifiee` = erreur constatée mais non qualifiée.
    assert.notEqual(libelleCategorie('erreur_non_identifiee'), '');
    assert.equal(libelleCategorie(null), '');
  });

  it('décrit une difficulté récurrente sans la dramatiser', () => {
    const suivi: SuiviObjectif = {
      objectifId: 'OO-L1-1',
      exercicesTraites: 2,
      tentatives: 4,
      reussisSansAide: 0,
      reussisApresUnIndice: 1,
      reussisApresPlusieursAides: 0,
      nonReussis: 1,
      niveau: 'difficulte',
      difficultesRecurrentes: [{ categorie: 'erreur_de_signe', occurrences: 2 }],
    };

    assert.equal(LIBELLE_SUIVI[suivi.niveau], 'C’est difficile pour toi en ce moment. Demande un indice.');
    assert.equal(libelleCategorie(suivi.difficultesRecurrentes[0]?.categorie), 'signe');
  });
});