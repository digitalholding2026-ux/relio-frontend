import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { API_TIMEOUT_MS, verifierApi, type ApiState } from './api.js';

/**
 * Tests du client de l'API — jamais de contact avec la production.
 *
 * `fetch` est remplacé par un stub local : ces tests sont déterministes,
 * hors ligne, et n'ouvrent aucune connexion sortante.
 */

const BASE = 'https://api.exemple.test';

type FetchArgs = { url: string; init: RequestInit };

function stubFetch(impl: (args: FetchArgs) => Promise<unknown>): FetchArgs[] {
  const calls: FetchArgs[] = [];
  globalThis.fetch = (async (input: unknown, init: RequestInit = {}) => {
    calls.push({ url: String(input), init });
    return impl({ url: String(input), init });
  }) as unknown as typeof fetch;
  return calls;
}

function json(body: unknown, status = 200): unknown {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

const contratValide = {
  name: 'relio-backend',
  apiVersion: 'v1',
  status: 'socle',
  documentation: '…',
};

afterEach(() => {
  delete (globalThis as { fetch?: unknown }).fetch;
});

describe('verifierApi', () => {
  it('signale « non configurée » si l’URL est vide', async () => {
    stubFetch(() => {
      throw new Error('ne doit pas être appelé');
    });

    const etat = await verifierApi('');

    assert.equal(etat.kind, 'non-configure');
  });

  it('renvoie « joignable » avec version et statut sur un contrat valide', async () => {
    stubFetch(() => Promise.resolve(json(contratValide)));

    const etat = await verifierApi(BASE);

    assert.equal(etat.kind, 'joignable');
    if (etat.kind === 'joignable') {
      assert.equal(etat.version, 'v1');
      assert.equal(etat.statut, 'socle');
    }
  });

  it('interroge bien /api/v1 sur la base fournie', async () => {
    const calls = stubFetch(() => Promise.resolve(json(contratValide)));

    await verifierApi(BASE);

    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.url, `${BASE}/api/v1`);
    assert.equal(calls[0]?.init.method, 'GET');
    assert.equal(calls[0]?.init.cache, 'no-store');
  });

  it('ne met jamais en cache la réponse', async () => {
    const calls = stubFetch(() => Promise.resolve(json(contratValide)));

    await verifierApi(BASE);

    assert.equal(calls[0]?.init.cache, 'no-store');
  });

  it('signale « désynchronisé » sur un 404 (contrat en retard)', async () => {
    stubFetch(() => Promise.resolve(json({ error: { code: 'NOT_FOUND' } }, 404)));

    const etat = await verifierApi(BASE);

    assert.equal(etat.kind, 'desaccord');
  });

  it('signale « indisponible » sur une erreur HTTP 500', async () => {
    stubFetch(() => Promise.resolve(json({ error: { code: 'INTERNAL_ERROR' } }, 500)));

    const etat = await verifierApi(BASE);

    assert.equal(etat.kind, 'indisponible');
  });

  it('refuse une réponse qui ne respecte pas le contrat', async () => {
    stubFetch(() => Promise.resolve(json({ status: 'ok' })));

    const etat = await verifierApi(BASE);

    assert.equal(etat.kind, 'desaccord');
  });

  it('ne déclare jamais « joignable » sur une réponse incomplète', async () => {
    const etats: ApiState[] = [];
    for (const corps of [{}, { apiVersion: 'v1' }, { status: 'socle' }, null]) {
      stubFetch(() => Promise.resolve(json(corps)));
      etats.push(await verifierApi(BASE));
    }

    assert.ok(
      etats.every((e) => e.kind !== 'joignable'),
      'aucune réponse incomplète ne doit être considérée comme joignable',
    );
  });

  it('signale « indisponible » sur une panne réseau', async () => {
    stubFetch(() => Promise.reject(new TypeError('Failed to fetch')));

    const etat = await verifierApi(BASE);

    assert.equal(etat.kind, 'indisponible');
  });

  it('signale « indisponible » sur un délai dépassé (AbortError)', async () => {
    const erreur = Object.assign(new Error('aborted'), { name: 'AbortError' });
    stubFetch(() => Promise.reject(erreur));

    const etat = await verifierApi(BASE);

    assert.equal(etat.kind, 'indisponible');
  });

  it('applique un délai d’attente borné', () => {
    assert.ok(API_TIMEOUT_MS > 0 && API_TIMEOUT_MS <= 10_000);
  });

  it('passe un signal d’annulation à fetch', async () => {
    const calls = stubFetch(() => Promise.resolve(json(contratValide)));

    await verifierApi(BASE);

    assert.ok(
      calls[0]?.init.signal instanceof AbortSignal,
      'un AbortSignal doit être transmis à fetch',
    );
  });

  it('ne lève jamais, quelle que soit la panne', async () => {
    const pannes = [
      () => Promise.reject(new TypeError('Failed to fetch')),
      () => Promise.reject(Object.assign(new Error('x'), { name: 'AbortError' })),
      () => Promise.resolve(json({}, 404)),
      () => Promise.resolve(json({}, 500)),
      () => Promise.resolve(null),
    ];

    for (const panne of pannes) {
      stubFetch(panne as never);
      const etat = await verifierApi(BASE);
      assert.notEqual(etat.kind, 'joignable', `panne non gérée : ${panne.toString()}`);
    }
  });
});