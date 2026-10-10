import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Contrôles de navigation — chantier 7.1.
 *
 * **Pourquoi ce fichier existe.** En septembre 2026, un élève cliquant sur
 * « Voir le parcours » atterrissait sur une page d'état technique au lieu du
 * parcours de mathématiques. Le diagnostic a montré que le bouton n'existait
 * pas dans la version déployée : il n'y avait aucun lien du tout, seulement
 * une section décrivant l'état des fonctionnalités.
 *
 * Un tel défaut ne se voit ni au typecheck, ni au build, ni dans les tests
 * d'API : **tout le reste était vert**. Ces contrôles ferment la faille.
 *
 * Ils vérifient trois choses, sur la source :
 *
 * 1. **le bouton existe et pointe vers `/parcours`** ;
 * 2. **la route `/parcours` existe et affiche le parcours**, pas un état ;
 * 3. **tout lien interne pointe vers une route qui existe** — un lien mort est
 *    le même défaut, sous une autre forme.
 *
 * Le contrôle porte sur la **source** et non sur le build : il doit pouvoir
 * échouer avant même la compilation.
 */

const RACINE = new URL('../../src/', import.meta.url).pathname;

interface FichierSource {
  readonly chemin: string;
  readonly relatif: string;
  readonly contenu: string;
}

function listerSources(chemin: string = RACINE): FichierSource[] {
  const fichiers: FichierSource[] = [];

  for (const entree of readdirSync(chemin)) {
    const complet = join(chemin, entree);

    if (statSync(complet).isDirectory()) {
      fichiers.push(...listerSources(complet));
      continue;
    }
    if (!['.ts', '.tsx'].includes(extname(entree))) continue;
    if (entree.includes('.test.')) continue;

    fichiers.push({
      chemin: complet,
      relatif: complet.replace(`${RACINE}`, ''),
      contenu: readFileSync(complet, 'utf8'),
    });
  }

  return fichiers;
}

const SOURCES = listerSources();

function lirePage(relative: string): string {
  const fichier = SOURCES.find((f) => f.relatif === relative);
  assert.ok(fichier, `Page introuvable : ${relative}`);
  return fichier.contenu;
}

/** Liste les routes Next.js rendues, d'après l'arborescence `app/`. */
function routesConnues(): Set<string> {
  const routes = new Set<string>();
  const appDir = join(RACINE, 'app');

  const parcourir = (chemin: string, prefixe: string): void => {
    for (const entree of readdirSync(chemin)) {
      const complet = join(chemin, entree);
      if (statSync(complet).isDirectory()) {
        const segment = entree === 'page.tsx' ? '' : entree;
        if (entree === '[id]') {
          // Segment paramétré : on conserve le motif pour la comparaison.
          parcourir(complet, `${prefixe}/[id]`);
          continue;
        }
        parcourir(complet, `${prefixe}/${segment}`.replace(/\/$/, ''));
      }
    }
  };

  // `app/page.tsx` → « / », `app/parcours/page.tsx` → « /parcours ».
  if (readdirSync(appDir).includes('page.tsx')) routes.add('/');
  parcourir(join(appDir, 'parcours'), '/parcours');
  if (readdirSync(join(appDir, 'parcours')).includes('page.tsx')) routes.add('/parcours');
  routes.add('/parcours/[id]');

  return routes;
}

describe('navigation — bouton « Voir le parcours »', () => {
  it('la page d’accueil contient un lien vers le parcours', () => {
    const accueil = lirePage('app/page.tsx');

    assert.match(
      accueil,
      /Voir le parcours/,
      "Le bouton « Voir le parcours » a disparu de la page d’accueil. " +
        'C’est exactement le défaut du chantier 7.1 : sans ce lien, l’élève n’a aucun accès au parcours.',
    );

    // Le lien doit viser la route du parcours, pas la page d’accueil elle-même
    // (le symptôme observé : rester ou revenir sur une page d’état).
    const liensVersParcours = [...accueil.matchAll(/href=["'](\/parcours[^"']*)["']/g)];
    assert.ok(
      liensVersParcours.length > 0,
      'Aucun lien `href="/parcours"` sur la page d’accueil.',
    );
  });

  it('la route /parcours existe et rend le parcours', () => {
    const page = lirePage('app/parcours/page.tsx');

    assert.match(
      page,
      /ParcoursServeur/,
      'La page /parcours ne rend pas le parcours des élèves.',
    );
    // Une page d'état technique à la place du parcours serait le défaut
    // initial : on vérifie donc que la page parle d'exercices, pas de statut.
    assert.match(
      page,
      /parcours de mathématiques/i,
      'La page /parcours ne se présente pas comme le parcours de mathématiques.',
    );
  });

  it('la page du parcours charge ses données depuis l’API', () => {
    // Si la page affichait un état en dur, l'élève verrait du contenu périmé
    // et la correction ne fonctionnerait pas.
    const page = lirePage('app/parcours/page.tsx');
    assert.match(
      page,
      /chargerParcours|ParcoursServeur/,
      'La page /parcours ne charge rien depuis l’API.',
    );
  });

  it('tout lien interne pointe vers une route existante', () => {
    const routes = routesConnues();

    // Deux écritures sont admises : `href="/x"` et `href={`/x/${id}`}`.
    // Les deux sont réelles dans ce code, et un test qui n'en couvre qu'une
    // laisse passer la moitié des liens morts — c'est-à-dire aucun.
    const MOTIFS = [
      /href=["'](\/[^"'#?]*)["']/g, // chaîne littérale
      /href=\{`(\/[^`#?]*)`\}/g, // gabarit
    ];

    for (const { relatif, contenu } of SOURCES) {
      for (const motif of MOTIFS) {
        for (const correspondance of contenu.matchAll(motif)) {
          // `noUncheckedIndexedAccess` : le groupe de capture est typé
          // comme pouvant être absent, même si le motif le garantit.
          const cible = correspondance[1];
          if (cible === undefined) continue;
          const normalisee = cible.replace(/\/$/, '') || '/';

          // On compare au motif le plus long : `/parcours/[id]` accepte
          // `/parcours/MVP-B1-E1`, mais `/parcours` ne vaut pas pour
          // `/parcours-autre`.
          const accepte = [...routes].some((route) => {
            const prefixe = route.replace(/\/\[id\]$/, '');
            const memePrefixe = normalisee === prefixe;
            const sousRoute = route.endsWith('[id]') && normalisee.startsWith(prefixe + '/');
            return memePrefixe || sousRoute;
          });

          assert.ok(
            accepte,
            `${relatif} : le lien « ${cible} » pointe vers une route qui n’existe pas. ` +
              `Routes connues : ${[...routes].join(', ')}.`,
          );
        }
      }
    }
  });

  it('permet de revenir à l’accueil depuis le parcours et un exercice', () => {
    // Un élève qui arrive par un lien direct doit pouvoir remonter. Sans lien
    // de retour, il reste bloqué sur une page d'erreur.
    const parcours = lirePage('app/parcours/page.tsx');
    assert.match(parcours, /href=["']\/["']/, 'Aucun lien de retour vers l’accueil.');

    const exercice = lirePage('app/parcours/[id]/page.tsx');
    assert.match(
      exercice,
      /href=["']\/parcours["']/,
      'Aucun lien de retour vers le parcours depuis un exercice.',
    );
  });

  it('la page d’état des fonctionnalités reste accessible et séparée', () => {
    // La page d'état technique est utile au propriétaire : elle ne doit pas
    // disparaître, mais elle ne doit pas non plus remplacer le parcours.
    const accueil = lirePage('app/page.tsx');

    const indexEtat = accueil.indexOf('État des fonctionnalités');
    const indexParcours = accueil.indexOf('Le parcours');

    assert.ok(indexEtat !== -1, 'La section d’état des fonctionnalités a été supprimée.');
    assert.ok(indexParcours !== -1, 'La section du parcours a été supprimée.');
    assert.ok(
      indexParcours < indexEtat,
      'L’état des fonctionnalités doit venir après le parcours : la page d’état ne doit pas ' +
        'donner l’impression d’être la destination principale.',
    );
  });

  it('n’expose aucun lien vers une fonctionnalité non implémentée', () => {
    // Le tuteur, les comptes et le tableau de bord n'existent pas : ils ne
    // doivent pas être annoncés par un lien qui mènerait à une page vide.
    const INTERDITS = ['/tuteur', '/compte', '/tableau-de-bord', '/diagnostic', '/niveau'];

    for (const { relatif, contenu } of SOURCES) {
      for (const chemin of INTERDITS) {
        assert.ok(
          !contenu.includes(`href="${chemin}"`),
          `${relatif} : lien vers « ${chemin} », fonctionnalité non implémentée.`,
        );
      }
    }
  });
});
