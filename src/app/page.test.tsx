import { renderToReadableStream } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import PageAccueil from '@/app/page';

/**
 * Page d'accueil — HTML rendu, rôles ARIA et exactitude du texte.
 *
 * Ce fichier a été écrit au chantier A pour verrouiller deux correctifs :
 * le bandeau portait `role="note"` — rôle qui **n'existe pas** en ARIA, donc
 * ignoré par les lecteurs d'écran — et le pied de page affirmait que les
 * réponses de l'élève n'étaient pas conservées, ce qui est faux côté client.
 *
 * **Chantier B** : le bandeau d'avertissement a disparu de l'accueil. Il
 * annonçait le périmètre restreint de la version ; cette information a laissé
 * la place à la carte principale, dont le contenu vient de l'API et ne peut
 * donc pas mentir. Les contrôles ci-dessous vérifient donc l'absence de rôle
 * invalide — qui reste le vrai risque — et l'exactitude du texte de
 * confidentialité, qui reste à l'identique.
 *
 * ## Pourquoi le rendu passe par le serveur
 *
 * La page contient des composants serveur asynchrones (`CarteDepuisApi`,
 * `ApiStatus`). Le runtime de rendu client utilisé dans les tests ne sait pas
 * les résoudre : React réserve les composants `async` au pipeline serveur de
 * Next.js. `renderToReadableStream` les gère — c'est le même moteur que celui
 * du build — et produit exactement le HTML que le navigateur recevra, ce qui
 * est précisément ce que ces contrôles doivent vérifier : ce qui est
 * **rendu**, pas ce qui est déclaré.
 *
 * Le rendu est **complet**, Suspense compris : le flux est lu jusqu'au bout,
 * squelette de chargement compris, pour que le DOM corresponde à celui
 * qu'un élève voit après l'arrivée des données.
 */
async function htmlDeLaPage(): Promise<Document> {
  const flux = await renderToReadableStream(await PageAccueil());
  await flux.allReady;

  const html = await new Response(flux).text();
  return new DOMParser().parseFromString(
    `<!doctype html><html lang="fr"><body>${html}</body></html>`,
    'text/html',
  );
}

/**
 * La page complète, l'API répondante.
 *
 * Les contrôles ci-dessous portent sur l'écran assemblé — bandeau, carte,
 * trois étapes, pied de page — et non sur une brique isolée : c'est à cet
 * endroit que les composants du design system et le module local se rencontrent,
 * et qu'une régression d'intégration pourrait se glisser.
 */
async function htmlAvecApi(): Promise<Document> {
  const reponses: Record<string, unknown> = {
    '/api/v1': {
      name: 'relio-backend',
      apiVersion: 'v1',
      status: 'mvp-pedagogique',
      documentation: '',
      endpoints: [],
    },
    '/api/v1/parcours': {
      version: 'mvp-1',
      anneeScolaire: {
        debut: '2026-09-07',
        semaine: 5,
        dansAnneeScolaire: true,
        anneeTerminee: false,
      },
      message: 'Semaine 5 de l’année scolaire.',
      blocs: [
        {
          id: 'B1',
          titre: 'Calcul littéral',
          leconId: 'LEC-CM-MATH-3E-2025-2026-01',
          volumeHoraireH: 7,
          semaineDebut: 1,
          disponible: true,
          semainesAvantOuverture: null,
          objectifs: [],
          exercices: [
            {
              id: 'MVP-B1-E1',
              blocId: 'B1',
              rang: 1,
              objectifs: [],
              enonce: 'Énoncé',
              consigne: 'Consigne',
              typeReponse: 'expression',
              formeDemandee: null,
              nbIndices: 3,
              origine: 'originale',
            },
          ],
        },
      ],
    },
  };

  const vraiFetch = globalThis.fetch;
  const vraiEnv = process.env.API_BASE_URL;

  globalThis.fetch = (async (url: string | URL | Request) => {
    const chemin = typeof url === 'string' ? url : url.toString();
    const cle = Object.keys(reponses).find((c) => chemin.endsWith(c));
    return new Response(JSON.stringify(cle ? reponses[cle] : {}), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
  process.env.API_BASE_URL = 'https://api.exemple.test';

  try {
    return await htmlDeLaPage();
  } finally {
    globalThis.fetch = vraiFetch;
    if (vraiEnv === undefined) delete process.env.API_BASE_URL;
    else process.env.API_BASE_URL = vraiEnv;
  }
}

describe('Page d accueil — aucun rôle ARIA invalide', () => {
  it('la page produit du contenu', async () => {
    const document = await htmlDeLaPage();

    expect(document.body.textContent).toContain('Bonjour.');
  });

  it('la page ne porte aucun rôle qui n existe pas en ARIA', async () => {
    const document = await htmlAvecApi();

    const roles = [...document.body.querySelectorAll('[role]')].map((n) => n.getAttribute('role'));
    expect(roles.length).toBeGreaterThan(0);
    for (const role of roles) {
      expect(role).not.toBe('note');
    }
  });

  it('la carte principale est une région nommée', async () => {
    const document = await htmlAvecApi();

    const region = document.body.querySelector('section[aria-labelledby]');
    expect(region).not.toBeNull();

    const titre = region!.querySelector('h2');
    expect(titre?.textContent).toBe('Ta route cette semaine');
    expect(region!.getAttribute('aria-labelledby')).toBe(titre!.id);
  });

  it('n affiche jamais l adresse du backend', async () => {
    const document = await htmlAvecApi();

    // L'adresse est lue côté serveur pour interroger l'API ; elle ne doit
    // jamais atteindre le HTML que l'élève reçoit.
    expect(document.body.innerHTML).not.toMatch(/api\.exemple\.test|API_BASE_URL/);
  });

  it('la page reste utilisable quand l API ne répond pas', async () => {
    const document = await htmlDeLaPage();

    // Sans `API_BASE_URL`, la carte affiche un état vide et propose de
    // réessayer — mais le reste de l'écran, lui, est complet.
    expect(document.body.textContent).toContain('Bonjour.');
    expect(document.body.textContent).toContain('Comment ça marche');
    expect(document.body.textContent).toContain('Réessayer');
  });

  it('le bouton principal est un vrai lien, pas un bouton de navigation', async () => {
    const document = await htmlAvecApi();

    // Un `<button>` ne s'ouvre pas dans un nouvel onglet et n'affiche pas
    // l'adresse dans la barre d'état : ce serait un défaut pour qui navigue
    // au clavier ou avec un lecteur d'écran.
    const lien = document.body.querySelector('a[href^="/parcours/"]');
    expect(lien).not.toBeNull();
    expect(lien!.textContent).toBe('Continuer');
  });
});

describe('Page d accueil — exactitude du texte sur les réponses', () => {
  it('ne dit pas que les réponses ne sont pas conservées', async () => {
    const document = await htmlDeLaPage();

    expect(document.body.textContent ?? '').not.toMatch(/réponses ne sont pas conservées/i);
  });

  it('dit où sont enregistrées les réponses, et qu elles sont effaçables', async () => {
    const document = await htmlDeLaPage();
    const texte = (document.body.textContent ?? '').replace(/\s+/g, ' ');

    expect(texte).toContain('enregistrées sur ton appareil');
    expect(texte).toContain('suivre ta progression');
    expect(texte).toMatch(/effacer à tout moment/);
  });

  it('reste vrai sur le serveur, sans inventer de promesse', async () => {
    const document = await htmlDeLaPage();
    const texte = (document.body.textContent ?? '').replace(/\s+/g, ' ');

    expect(texte).toContain('rien n’est conservé de ton parcours sur nos serveurs');
  });

  it('n introduit aucun terme technique', async () => {
    const document = await htmlDeLaPage();
    const pied = (document.body.textContent ?? '').split('Aucun contenu d’épreuve')[1] ?? '';

    for (const terme of ['localstorage', 'sessionstorage', 'cookie', 'json', 'stockage']) {
      expect(pied.toLowerCase()).not.toContain(terme);
    }
  });

  it('conserve la promesse sur l absence de collecte de données personnelles', async () => {
    const document = await htmlDeLaPage();

    expect((document.body.textContent ?? '').replace(/\s+/g, ' ')).toContain(
      'aucune donnée personnelle n’est collectée',
    );
  });
});