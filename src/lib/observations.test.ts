/**
 * Chantier 7.5 — journal local des tentatives.
 *
 * Ce journal est la **seule** persistance du chantier. Il touche à des données
 * d'élèves, souvent mineurs, ce qui impose des garanties précises :
 *
 * 1. aucune donnée personnelle n'est collectée ni conservée ;
 * 2. une entrée corrompue est ignorée, jamais interprétée ni devinée ;
 * 3. un stockage inaccessible (navigation privée, quota) ne doit **jamais**
 *    faire tomber l'écran d'exercice ;
 * 4. l'élève peut effacer son historique ;
 * 5. le contexte d'échecs ne compte que les échecs **consécutifs**.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ajouterObservation,
  CLE_JOURNAL,
  echecsConsecutifs,
  effacerJournal,
  lireJournal,
  nombreTentatives,
  totalTentatives,
  TENTATIVES_MAX,
  type Observation,
  type Stockage,
} from './observations.js';

/** Stockage en mémoire, pour tester sans navigateur. */
function stockageFaux(initial?: string): Stockage & { brut: () => string | null } {
  let contenu = initial ?? null;
  return {
    getItem: () => contenu,
    setItem: (_cle, valeur) => {
      contenu = valeur;
    },
    removeItem: () => {
      contenu = null;
    },
    brut: () => contenu,
  };
}

/** Tentative par défaut : un échec ordinaire. */
function echec(partiel: Partial<Observation> & { exerciceId: string }): Omit<Observation, 'rang'> {
  return {
    reponse: '4x + 1',
    statut: 'fausse',
    categorie: 'oubli_de_distribuer_un_facteur',
    niveauAide: 1,
    reussiteApresAides: false,
    ...partiel,
  };
}

describe('7.5 — le journal enregistre ce qui sert au suivi, et rien d’autre', () => {
  it('conserve les champs pédagogiques attendus', () => {
    const stockage = stockageFaux();
    ajouterObservation(echec({ exerciceId: 'MVP-B1-E1' }), stockage);

    const [observation] = lireJournal(stockage);
    assert.ok(observation);
    assert.equal(observation.exerciceId, 'MVP-B1-E1');
    assert.equal(observation.rang, 1);
    assert.equal(observation.reponse, '4x + 1');
    assert.equal(observation.statut, 'fausse');
    assert.equal(observation.categorie, 'oubli_de_distribuer_un_facteur');
    assert.equal(observation.niveauAide, 1);
  });

  it('ne contient aucun champ identifiant', () => {
    const stockage = stockageFaux();
    ajouterObservation(echec({ exerciceId: 'MVP-B1-E1' }), stockage);

    const [observation] = lireJournal(stockage);
    assert.ok(observation);
    for (const interdit of ['nom', 'prenom', 'email', 'idEleve', 'telephone', 'dateNaissance', 'deviceId']) {
      assert.ok(!(interdit in observation), `${interdit} ne doit jamais être collecté.`);
    }
  });

  it('numérote les tentatives par ordre sur chaque exercice', () => {
    const stockage = stockageFaux();
    ajouterObservation(echec({ exerciceId: 'A' }), stockage);
    ajouterObservation(echec({ exerciceId: 'A' }), stockage);
    ajouterObservation(echec({ exerciceId: 'B' }), stockage);

    assert.equal(nombreTentatives('A', stockage), 2);
    assert.equal(nombreTentatives('B', stockage), 1);
    assert.deepEqual(
      lireJournal(stockage).filter((o) => o.exerciceId === 'A').map((o) => o.rang),
      [1, 2],
    );
  });

  it('mémorise définitivement une réussite', () => {
    // L'élève revient plus tard : le suivi doit refléter qu'il a su faire
    // l'exercice, même si la tentative enregistrée maintenant est un échec.
    const stockage = stockageFaux();
    ajouterObservation(
      echec({ exerciceId: 'A', statut: 'correcte', categorie: null, reussiteApresAides: true }),
      stockage,
    );
    ajouterObservation(echec({ exerciceId: 'A' }), stockage);

    assert.equal(lireJournal(stockage)[1]?.reussiteApresAides, true);
  });
});

describe('7.5 — le contexte d’échecs est honnête', () => {
  it('compte les échecs consécutifs', () => {
    const stockage = stockageFaux();
    ajouterObservation(echec({ exerciceId: 'A' }), stockage);
    ajouterObservation(echec({ exerciceId: 'A' }), stockage);

    assert.equal(echecsConsecutifs('A', stockage), 2);
  });

  it('interrompt la série après une réussite', () => {
    // Reprendre le niveau 3 alors que l'élève vient de réussir n'aide personne.
    const stockage = stockageFaux();
    ajouterObservation(echec({ exerciceId: 'A' }), stockage);
    ajouterObservation(echec({ exerciceId: 'A' }), stockage);
    ajouterObservation(
      echec({ exerciceId: 'A', statut: 'correcte', categorie: null, reussiteApresAides: true }),
      stockage,
    );

    assert.equal(echecsConsecutifs('A', stockage), 0);
  });

  it('ne compte pas une réponse partielle comme un échec', () => {
    const stockage = stockageFaux();
    ajouterObservation(
      echec({ exerciceId: 'A', statut: 'partielle', categorie: 'fraction_non_reduite' }),
      stockage,
    );

    assert.equal(echecsConsecutifs('A', stockage), 0);
  });

  it('ne compte que les échecs de l’exercice concerné', () => {
    const stockage = stockageFaux();
    ajouterObservation(echec({ exerciceId: 'A' }), stockage);
    ajouterObservation(echec({ exerciceId: 'A' }), stockage);
    ajouterObservation(echec({ exerciceId: 'B' }), stockage);

    assert.equal(echecsConsecutifs('A', stockage), 2);
    assert.equal(echecsConsecutifs('B', stockage), 1);
    assert.equal(echecsConsecutifs('C', stockage), 0);
  });
});

describe('7.5 — robustesse du stockage', () => {
  it('reste muet si le stockage est indisponible', () => {
    // Navigation privée, mode strict, environnement sans DOM : l'écran
    // d'exercice doit continuer à fonctionner.
    assert.deepEqual(lireJournal(null), []);
    assert.equal(nombreTentatives('A', null), 0);
    assert.equal(echecsConsecutifs('A', null), 0);
    assert.doesNotThrow(() => ajouterObservation(echec({ exerciceId: 'A' }), null));
    assert.doesNotThrow(() => effacerJournal(null));
  });

  it('ne tombe pas si le stockage refuse d’écrire', () => {
    const stockage: Stockage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => undefined,
    };

    assert.doesNotThrow(() => ajouterObservation(echec({ exerciceId: 'A' }), stockage));
    assert.deepEqual(lireJournal(stockage), []);
  });

  it('ignore une entrée illisible plutôt que de la deviner', () => {
    const stockage = stockageFaux(JSON.stringify([
      { exerciceId: 'A', rang: 1, reponse: 'x', statut: 'fausse', categorie: null, niveauAide: 1, reussiteApresAides: false },
      { exerciceId: '', rang: 1 },
      { exerciceId: 'B', rang: 0 },
      { exerciceId: 'C', rang: 1, statut: 'inventé' },
      'pas un objet',
      null,
    ]));

    const journal = lireJournal(stockage);
    assert.equal(journal.length, 1, 'Seule la première entrée est valide.');
    assert.equal(journal[0]?.exerciceId, 'A');
  });

  it('ignore un contenu corrompu au lieu de planter', () => {
    for (const corrompu of ['pas du json', '{', '[', 'null', '"chaine"', '42']) {
      const stockage = stockageFaux(corrompu);
      assert.deepEqual(lireJournal(stockage), [], corrompu);
    }
  });

  it('plafonne la taille du journal', () => {
    const stockage = stockageFaux();
    for (let i = 0; i < TENTATIVES_MAX + 20; i += 1) {
      ajouterObservation(echec({ exerciceId: `E${i % 12}` }), stockage);
    }
    assert.ok(
      lireJournal(stockage).length <= TENTATIVES_MAX,
      'Le journal doit rester borné.',
    );
  });
});

describe('7.5 — l’élève peut effacer son historique', () => {
  it('vide le journal', () => {
    const stockage = stockageFaux();
    ajouterObservation(echec({ exerciceId: 'A' }), stockage);
    assert.equal(totalTentatives(stockage), 1);

    effacerJournal(stockage);
    assert.equal(totalTentatives(stockage), 0);
    assert.equal(lireJournal(stockage).length, 0);
  });

  it('utilise une clef versionnée', () => {
    // Une clef versionnée permet de migrer le format plus tard sans casser.
    assert.match(CLE_JOURNAL, /^relio\.observations\.v\d+$/);
  });
});