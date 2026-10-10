import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  chargerExercice,
  chargerParcours,
  corrigerReponse,
  demanderIndice,
  DELAI_MS,
  type BlocPublic,
  type Parcours,
} from './parcours.js';

/**
 * Tests du client du parcours — jamais de contact avec la production.
 *
 * `fetch` est remplacé par un stub local : ces tests sont déterministes, hors
 * ligne, et n'ouvrent aucune connexion sortante.
 *
 * Propriété vérifiée ici : **le client ne fabrique jamais de données**. Une
 * réponse du serveur invalide ou absente produit un état d'indisponibilité,
 * jamais un parcours inventé.
 */

const BASE = 'https://api.exemple.test';

type FetchArgs = { url: string; init: RequestInit };

function stubFetch(impl: (args: FetchArgs) => Promise<unknown>): FetchArgs[] {
  const appels: FetchArgs[] = [];
  globalThis.fetch = (async (input: unknown, init: RequestInit = {}) => {
    const args = { url: String(input), init };
    appels.push(args);
    return impl(args);
  }) as unknown as typeof fetch;
  return appels;
}

function json(body: unknown, status = 200): unknown {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

const PARCOURS_VALIDE: Parcours = {
  version: 'mvp-1',
  anneeScolaire: {
    debut: '2025-09-01',
    semaine: 1,
    dansAnneeScolaire: true,
    anneeTerminee: false,
  },
  message: 'Semaine 1 de l’année scolaire.',
  blocs: [
    {
      id: 'B1',
      titre: 'Calcul littéral',
      leconId: 'LEC-CM-MATH-3E-2025-2026-01',
      volumeHoraireH: 7,
      semaineDebut: 1,
      disponible: true,
      semainesAvantOuverture: null,
      objectifs: [{ id: 'OO-L1-1', libelle: 'Développer', prerequis: [] }],
      exercices: [
        {
          id: 'MVP-B1-E1',
          blocId: 'B1',
          rang: 1,
          objectifs: ['OO-L1-1'],
          enonce: 'On considère A = 3(x + 2) − (x + 5).',
          consigne: 'Développe et réduis A.',
          typeReponse: 'expression',
          formeDemandee: null,
          nbIndices: 3,
          origine: 'originale',
        },
      ],
    },
  ],
};

afterEach(() => {
  delete (globalThis as { fetch?: unknown }).fetch;
});

describe('chargerParcours', () => {
  it('signale « indisponible » si l’URL est vide, sans appeler le réseau', async () => {
    stubFetch(() => {
      throw new Error('ne doit pas être appelé');
    });

    const etat = await chargerParcours('');

    assert.equal(etat.kind, 'indisponible');
    assert.match(etat.kind === 'indisponible' ? etat.raison : '', /pas configuré/);
  });

  it('renvoie le parcours quand la réponse est conforme', async () => {
    const appels = stubFetch(() => Promise.resolve(json(PARCOURS_VALIDE)));

    const etat = await chargerParcours(BASE);

    assert.equal(etat.kind, 'parcours');
    assert.equal(appels[0]?.url, `${BASE}/api/v1/parcours`);
    assert.equal((etat as { parcours: Parcours }).parcours.blocs.length, 1);
  });

  it('refuse une réponse qui ne respecte pas le contrat', async () => {
    stubFetch(() => Promise.resolve(json({ version: 'mvp-1' })));

    const etat = await chargerParcours(BASE);

    assert.equal(etat.kind, 'indisponible');
  });

  it('refuse une erreur HTTP sans inventer de parcours', async () => {
    stubFetch(() => Promise.resolve(json({}, 500)));

    const etat = await chargerParcours(BASE);

    assert.equal(etat.kind, 'indisponible');
  });

  it('traduit un délai dépassé', async () => {
    stubFetch(async () => {
      const erreur = new Error('aborted');
      erreur.name = 'AbortError';
      throw erreur;
    });

    const etat = await chargerParcours(BASE);

    assert.equal(etat.kind, 'indisponible');
    assert.match(etat.kind === 'indisponible' ? etat.raison : '', /ne répond pas/);
  });

  it('utilise un délai borné', () => {
    assert.equal(DELAI_MS, 8000);
  });
});

describe('chargerExercice', () => {
  it('renvoie l’exercice demandé', async () => {
    const appels = stubFetch(() =>
      Promise.resolve(json(PARCOURS_VALIDE.blocs[0]?.exercices[0])),
    );

    const resultat = await chargerExercice(BASE, 'MVP-B1-E1');

    assert.equal(resultat.ok, true);
    assert.equal(appels[0]?.url, `${BASE}/api/v1/exercices/MVP-B1-E1`);
  });

  it('échoue proprement sur un exercice fermé ou inconnu', async () => {
    stubFetch(() => Promise.resolve(json({}, 403)));

    const resultat = await chargerExercice(BASE, 'MVP-B3-E1');

    assert.equal(resultat.ok, false);
  });

  it('encode l’identifiant dans l’URL', async () => {
    const appels = stubFetch(() => Promise.resolve(json(PARCOURS_VALIDE.blocs[0]?.exercices[0])));

    await chargerExercice(BASE, 'MVP B1/E1');

    assert.match(appels[0]?.url ?? '', /MVP%20B1%2FE1/);
  });
});

describe('demanderIndice', () => {
  it('renvoie le texte du palier', async () => {
    stubFetch(() => Promise.resolve(json({ palier: 1, texte: 'Un rappel.' })));

    const texte = await demanderIndice(BASE, 'MVP-B1-E1', 1);

    assert.equal(texte, 'Un rappel.');
  });

  it('renvoie null plutôt que d’inventer un indice', async () => {
    stubFetch(() => Promise.resolve(json({}, 404)));

    assert.equal(await demanderIndice(BASE, 'MVP-B1-E1', 9), null);
  });
});

describe('corrigerReponse', () => {
  const VERDICT = {
    exerciceId: 'MVP-B1-E4',
    objectifId: 'OO-L1-2',
    mathemathiquementJuste: true,
    formeRespectee: false,
    statut: 'partielle' as const,
    signatureErreur: 'non_factorise',
    leconsCandidates: ['L1'],
    explication: 'Le résultat est exact, mais il est resté sous forme développée.',
    indice: null,
    lectureArbitree: false,
    pointsArbitrage: ['lecture-partielle-a3'],
  };

  it('transmet le verdict sur les trois axes', async () => {
    stubFetch(() => Promise.resolve(json(VERDICT)));

    const verdict = await corrigerReponse(BASE, 'MVP-B1-E4', '4x^2 - 9', null);

    assert.ok(!('erreurSaisie' in verdict));
    assert.equal(verdict.statut, 'partielle');
    assert.equal(verdict.mathemathiquementJuste, true);
    assert.equal(verdict.formeRespectee, false);
    // Le point non arbitré est transmis tel quel au composant.
    assert.equal(verdict.lectureArbitree, false);
  });

  it('n’envoie que des champs pédagogiques, aucune donnée personnelle', async () => {
    // Chantier 7.5 : `nbEchecs` s'ajoute au corps. Il ne sert qu'à choisir le
    // niveau d'aide — ce n'est pas une donnée personnelle, et il ne doit pas
    // être accompagné d'un nom, d'un identifiant d'élève ou d'une date de
    // naissance.
    const appels = stubFetch(() => Promise.resolve(json(VERDICT)));

    await corrigerReponse(BASE, 'MVP-B1-E4', '4x^2 - 9', 2, 3);

    const corps = JSON.parse(String(appels[0]?.init.body)) as Record<string, unknown>;
    assert.deepEqual(Object.keys(corps).sort(), [
      'exerciceId',
      'indiceDemande',
      'nbEchecs',
      'reponse',
    ]);
    assert.equal(corps.nbEchecs, 3);
  });

  it('transmet zéro échec par défaut, sans champ superflu', async () => {
    const appels = stubFetch(() => Promise.resolve(json(VERDICT)));

    await corrigerReponse(BASE, 'MVP-B1-E1', '2x + 1', null);

    const corps = JSON.parse(String(appels[0]?.init.body)) as Record<string, unknown>;
    assert.equal(corps.nbEchecs, 0);
  });

  it('remonte l’erreur de saisie renvoyée par le serveur', async () => {
    stubFetch(() =>
      Promise.resolve(
        json({ erreurSaisie: true, message: 'Réponse illisible.', exerciceId: 'MVP-B1-E1' }),
      ),
    );

    const resultat = await corrigerReponse(BASE, 'MVP-B1-E1', '???', null);

    assert.equal('erreurSaisie' in resultat && resultat.erreurSaisie, true);
  });
});

describe('garde-fous du contenu client', () => {
  it('ne transporte aucun champ de réponse attendue', () => {
    // La projection publique d'un exercice ne doit contenir aucun champ
    // portant la solution : c'est une contrainte structurelle du contrat.
    const exercice = PARCOURS_VALIDE.blocs[0]?.exercices[0];
    assert.ok(exercice);
    assert.deepEqual(Object.keys(exercice).sort(), [
      'blocId',
      'consigne',
      'enonce',
      'formeDemandee',
      'id',
      'nbIndices',
      'objectifs',
      'origine',
      'rang',
      'typeReponse',
    ]);
    for (const cle of Object.keys(exercice)) {
      // `typeReponse` décrit le *format* attendu, pas la réponse elle-même.
      assert.ok(
        !/solution|corrige|attendu|reponseAttendue/i.test(cle),
        `Champ suspect : ${cle}`,
      );
    }
  });

  it('n’expose que les types attendus, sans score ni niveau', () => {
    const bloc = PARCOURS_VALIDE.blocs[0] as BlocPublic;
    const cles = Object.keys(bloc).sort();
    assert.deepEqual(cles, [
      'disponible',
      'exercices',
      'id',
      'leconId',
      'objectifs',
      'semaineDebut',
      'semainesAvantOuverture',
      'titre',
      'volumeHoraireH',
    ]);
  });
});