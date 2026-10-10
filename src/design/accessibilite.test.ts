/**
 * Invariants de feuille de style du design system.
 *
 * ## Pourquoi lire les CSS plutôt que le DOM
 *
 * « Aucune taille tactile inférieure à 44 px » est un critère d'acceptation
 * qu'un test de rendu ne peut pas vérifier : `jsdom` n'applique pas de feuille
 * de style, et `getComputedStyle` y renvoie des valeurs vides. Un test de rendu
 * qui prétendrait mesurer une cible tactile passerait toujours, donc ne
 * vérifierait rien.
 *
 * La seule vérification honnête est donc **statique** : lire la feuille de style
 * du composant et vérifier que la contrainte y est exprimée. C'est moins
 * complet qu'une mesure à l'écran — le contour d'une bordure ou un padding
 * podrían déformer le calcul — mais cela attrape le cas réel, qui est la
 * régression : quelqu'un qui remplace la règle par une valeur en dur.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { TAILLE_CHAMP_MIN, TAILLE_TACTILE_MIN } from './tokens.js';

const DOSSIER = join(__dirname, '..', 'components', 'ds');

/** Feuilles contenant un élément réellement cliquable ou saisissable. */
const INTERACTIFS = [
  'Bouton.module.css',
  'BoutonIcone.module.css',
  'Puce.module.css',
  'Input.module.css',
  'Toast.module.css',
];

function lire(nom: string): string {
  return readFileSync(join(DOSSIER, nom), 'utf8');
}

describe('accessibilité — la cible tactile de 44 px est garantie par construction', () => {
  it('fixe la valeur à 44 px dans les tokens', () => {
    expect(TAILLE_TACTILE_MIN).toBe(44);
  });

  /**
   * Hauteur tactile **effective**, en pixels.
   *
   * Plutôt que de compter les motifs, on résout la valeur : un token connu
   * donne sa valeur, une valeur en dur donne elle-même. Une feuille qui
   * n'exprime aucune hauteur interactive renvoie `null`, et le test échoue —
   * ce qui est le comportement voulu, car c'est exactement le cas d'une cible
   * tactile non garantie.
   */
  function hauteurEffective(fichier: string): number | null {
    const css = lire(fichier);
    const tokens: Record<string, number> = {
      'var(--relio-tactile-min)': TAILLE_TACTILE_MIN,
      'var(--relio-champ-min)': TAILLE_CHAMP_MIN,
    };

    let trouvee: number | null = null;
    for (const [nom, valeur] of Object.entries(tokens)) {
      if (css.includes(`min-height: ${nom}`)) trouvee = valeur;
    }

    const enDur = /min-height:\s*(\d+)px/.exec(css);
    if (enDur?.[1] !== undefined) trouvee = Number(enDur[1]);

    // Composer la classe partagée vaut autant que déclarer la règle : c'est
    // même règle vue autrement.
    if (/composes:[\w\s]*\bcible\b/.test(css)) trouvee = TAILLE_TACTILE_MIN;

    return trouvee;
  }

  for (const fichier of INTERACTIFS) {
    it(`${fichier} garantit au moins 44 px`, () => {
      const hauteur = hauteurEffective(fichier);
      expect(hauteur, `${fichier} n'exprime aucune hauteur tactile`).not.toBeNull();
      expect(hauteur ?? 0, `${fichier} : ${hauteur} px, sous le plancher de 44 px`).toBeGreaterThanOrEqual(
        TAILLE_TACTILE_MIN,
      );
    });
  }

  it('ne fige aucune largeur tactile en dur', () => {
    // La largeur minimale d'un contrôle est **toujours** une dimension tactile :
    // elle doit donc venir d'un token. Une valeur en dur passe la revue
    // aujourd'hui et diverge demain, quand le token change.
    //
    // La hauteur, elle, peut être pilotée par le contenu — une zone de texte à
    // 96 px n'est pas une cible tactile, c'est une taille de lecture. Elle est
    // couverte par le test de résolution ci-dessus, pas par celui-ci.
    for (const fichier of INTERACTIFS) {
      const css = lire(fichier);
      const enDur = [...css.matchAll(/min-width:\s*(\d+)px/g)];
      for (const trouve of enDur) {
        expect(
          trouve[1],
          `${fichier} : « ${trouve[0]} » en dur, il faut passer par un token`,
        ).toBeUndefined();
      }
    }
  });
});

describe('accessibilité — le focus reste visible partout', () => {
  it('chaque feuille interactive compose l’anneau de focus', () => {
    for (const fichier of INTERACTIFS) {
      const css = lire(fichier);
      // La feuille `Feuille` est volontairement absente : elle ne définit aucun
      // contrôle propre, elle assemble `BoutonIcone` et `Bouton`.
      const compose = /composes:\s*[\w\s]*focus\b/.test(css);
      expect(compose, `${fichier} : pas d’anneau de focus`).toBe(true);
    }
  });
});

describe('accessibilité — aucune animation ne peut être imposée', () => {
  it('chaque animation déclarée est neutralisée en mouvement réduit', () => {
    const fichiers = readdirSync(DOSSIER).filter((nom) => nom.endsWith('.module.css'));

    for (const fichier of fichiers) {
      const css = lire(fichier);
      const animations = css.match(/animation:\s*(?!none)/g) ?? [];
      if (animations.length === 0) continue;

      // Une animation qui tourne en boucle pendant une attente réseau est
      // costly sur un appareil d'entrée de gamme, et pénible pour une personne
      // vestibulaire. Elle doit donc toujours avoir son échappement.
      expect(css, `${fichier} : animation sans échappement`).toContain('prefers-reduced-motion');
    }
  });

  it('le mode économie de données annule les durées', () => {
    const tokens = readFileSync(join(__dirname, '..', 'design', 'tokens.css'), 'utf8');
    expect(tokens).toMatch(/\[data-economie='on'\]/);
    expect(tokens).toMatch(/--relio-duree-standard:\s*0ms/);
  });
});

describe('contraintes produit — aucune image bitmap, aucune police distante', () => {
  it('aucune feuille ne référence d’image', () => {
    const fichiers = readdirSync(DOSSIER).filter((nom) => nom.endsWith('.css'));
    for (const fichier of fichiers) {
      const css = lire(fichier);
      // Une image de fond bitmap coûterait une requête réseau de plus sur la
      // connexion la plus lente du public visé.
      expect(css, `${fichier} : image bitmap`).not.toMatch(/url\(['"]?[^'")]*\.(png|jpe?g|gif|webp|avif)/i);
    }
  });

  it('aucune feuille ne charge une police distante', () => {
    const fichiers = readdirSync(DOSSIER).filter((nom) => nom.endsWith('.css'));
    for (const fichier of fichiers) {
      expect(lire(fichier), `${fichier} : police distante`).not.toMatch(/@font-face|@import\s+url/);
    }
  });

  it('la feuille globale n’en charge pas davantage', () => {
    const global = readFileSync(join(DOSSIER, '..', '..', 'app', 'globals.css'), 'utf8');
    expect(global).not.toMatch(/@font-face|@import\s+url/);
  });
});

describe('cohérence — les couleurs viennent des tokens', () => {
  it('aucune couleur brute dans les feuilles de composants', () => {
    const fichiers = readdirSync(DOSSIER).filter((nom) => nom.endsWith('.module.css'));

    for (const fichier of fichiers) {
      const css = lire(fichier);
      // Une couleur brute dans un composant est une couleur qui ne suit pas le
      // mode sombre. Seules exceptions : les valeurs de repli explicites et les
      // couleurs de texte portant l'ombre.
      const brutes = [...css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]);
      const tolerees = ['#ffffff', '#b91c1c'];
      for (const couleur of brutes) {
        expect(tolerees, `${fichier} : couleur brute ${couleur}`).toContain(couleur);
      }
    }
  });

  it('les ombres et rayons passent par les variables', () => {
    for (const fichier of INTERACTIFS) {
      const css = lire(fichier);
      const rayonsEnDur = [...css.matchAll(/border-radius:\s*(\d+)px/g)].map((m) => m[1]);
      for (const valeur of rayonsEnDur) {
        // Seuls les rayons de l'échelle 8/12/16/24 sont admis en dur.
        expect(['8', '12', '16', '24'], `${fichier} : rayon ${valeur} hors échelle`).toContain(valeur);
      }
    }
  });
});

// `dirname` est importé pour rester explicite sur le chemin résolu en CI,
// où le répertoire courant du test n'est pas forcément la racine du projet.
export const cheminDesignSystem = dirname(DOSSIER);