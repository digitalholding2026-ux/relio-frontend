/**
 * Chantier 7.5 — clavier mathématique.
 *
 * La règle structurante de ce chantier est qu'une touche doit **insérer un
 * caractère que le moteur de correction sait lire**. Une touche décorative, ou
 * qui insère `³` alors que la grammaire le refuse, produirait une réponse
 * rejetée alors que l'élève a écrit ce qu'il croit être juste — le pire échec
 * possible pour un clavier.
 *
 * Ces tests verrouillent donc :
 *
 * 1. l'insertion exacte au curseur, y compris **au milieu** d'une expression ;
 * 2. les symboles réellement acceptés par le moteur de production, vérifiés ici
 *    par les mêmes règles de normalisation que l'analyseur ;
 * 3. la présence des touches exigées, et l'absence des touches qui
 *    produiraient une réponse refusée ;
 * 4. le retour arrière, l'effacement et le déplacement du curseur ;
 * 5. la lisibilité de l'aperçu, sans jamais modifier la valeur.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  apercuLisible,
  COLONNES,
  creerFraction,
  largeurRangee,
  rangeesPour,
  deplacer,
  effacerTout,
  inserer,
  retirer,
  saisieVide,
  touchesPour,
  SAISIE_MAX,
  type EtatSaisie,
  type Touche,
} from './clavier.js';

function etat(valeur: string, curseur = valeur.length): EtatSaisie {
  return { valeur, curseur };
}

/**
 * Mêmes normalisations que l'analyseur d'expressions de production
 * (`backend/src/lib/analyseur-expression.ts`). Un caractère qui ne passe pas
 * ici sera refusé par le serveur.
 */
function normaliseCommeLeMoteur(saisie: string): string {
  return saisie
    .replace(/−/g, '-')
    .replace(/[–—]/g, '-')
    .replace(/×/g, '*')
    .replace(/·/g, '*')
    .replace(/²/g, '^2');
}

describe('7.5 — insertion au curseur', () => {
  it('insère en fin de saisie', () => {
    assert.deepEqual(inserer(etat('2x'), '+'), etat('2x+'));
  });

  it('insère au milieu et place le curseur juste après', () => {
    // Le cas central du chantier : corriger une expression existante.
    const resultat = inserer(etat('2x+1', 2), '(');
    assert.equal(resultat.valeur, '2x(+1');
    assert.equal(resultat.curseur, 3, 'Le curseur doit être après la parenthèse.');
  });

  it('insère plusieurs caractères d’un bloc', () => {
    assert.equal(inserer(etat(''), '^2').valeur, '^2');
  });

  it('ne fait rien sur une insertion vide', () => {
    const avant = etat('2x');
    assert.deepEqual(inserer(avant, ''), avant);
  });

  it('borne la longueur de saisie', () => {
    const long = 'x'.repeat(SAISIE_MAX + 10);
    assert.ok(inserer(etat(long), '+').valeur.length <= SAISIE_MAX);
  });

  it('ne place jamais le curseur au-delà de la valeur', () => {
    const resultat = inserer({ valeur: 'ab', curseur: 9999 }, 'c');
    assert.ok(resultat.curseur <= resultat.valeur.length);
  });
});

describe('7.5 — effacement et curseur', () => {
  it('efface le caractère précédant le curseur', () => {
    assert.deepEqual(retirer(etat('2x+')), etat('2x'));
  });

  it('ne fait rien quand le curseur est en début', () => {
    const debut = etat('2x', 0);
    assert.deepEqual(retirer(debut), debut);
  });

  it('efface au milieu sans toucher au reste', () => {
    assert.deepEqual(retirer(etat('2x+1', 3)), etat('2x1', 2));
  });

  it('vide toute la saisie', () => {
    assert.deepEqual(effacerTout(etat('2x+1')), saisieVide());
  });

  it('déplace le curseur sans modifier la valeur', () => {
    const depart = etat('2x+1', 3);
    assert.deepEqual(deplacer(depart, -1), etat('2x+1', 2));
    assert.deepEqual(deplacer(depart, 1), etat('2x+1', 4));
  });

  it('ne sort jamais du texte', () => {
    assert.deepEqual(deplacer(etat('ab', 0), -1), etat('ab', 0));
    assert.deepEqual(deplacer(etat('ab', 2), 1), etat('ab', 2));
  });
});

describe('7.5 — la fraction a un numérateur et un dénominateur distincts', () => {
  it('insère la barre de division entre les deux termes', () => {
    assert.equal(creerFraction(etat('7')).valeur, '7/');
  });

  it('sépare deux termes déjà saisis', () => {
    assert.equal(creerFraction(etat('73', 1)).valeur, '7/3');
  });

  it('place le curseur après la barre', () => {
    assert.equal(creerFraction(etat('7')).curseur, 2);
  });

  it('produit une écriture que l’analyseur rationnel lit', () => {
    // Le format produit est exactement celui du backend : `n/d`.
    const valeur = creerFraction(etat('14', 2) , ).valeur + '12';
    assert.match(valeur, /^-?\d+\/\d+$/, `« ${valeur} » n’est pas une fraction.`);
  });
});

describe('7.5 — les touches insèrent des symboles que le moteur comprend', () => {
  /** Tous les symboles littéraux qu'une touche peut insérer. */
  function symbolesInseres(type: 'rationnelle' | 'expression' | 'racine'): string[] {
    return touchesPour(type)
      .filter((t) => t.action.type === 'inserer')
      .map((t) => (t.action as { texte: string }).texte);
  }

  it('n’insère jamais un caractère refusé par la grammaire', () => {
    // `³` et `÷` sont refusés par l'analyseur d'expressions : le clavier
    // n'a pas le droit de les produire.
    for (const type of ['rationnelle', 'expression', 'racine'] as const) {
      for (const symbole of symbolesInseres(type)) {
        assert.doesNotMatch(
          symbole,
          /[³÷²³²]/u,
          `${type} : la touche insère « ${symbole} », refusé par l’analyseur.`,
        );
      }
    }
  });

  it('normalise la saisie produite vers un texte que le moteur analyse', () => {
    // Après passage dans la normalisation de production, plus aucun caractère
    // ne doit être exotique : il ne resterait que des chiffres, des opérateurs
    // connus — et la virgule, que l'analyseur rationnel accepte.
    for (const type of ['rationnelle', 'expression'] as const) {
      for (const symbole of symbolesInseres(type)) {
        const normalise = normaliseCommeLeMoteur(symbole);
        assert.match(
          normalise,
          /^[0-9a-zA-Z+\-*/^()=., ]*$/,
          `${type} : « ${symbole} » donne « ${normalise} », hors alphabet du moteur.`,
        );
      }
    }
  });

  it('n’insère jamais de virgule dans une expression', () => {
    // L'analyseur d'expressions refuse « , » : `1,5x` est rejeté. La touche
    // décimale doit donc insérer un point sur ces exercices.
    for (const symbole of symbolesInseres('expression')) {
      assert.doesNotMatch(symbole, /,/, `expression : « ${symbole} » serait refusé.`);
    }
    const touche = touchesPour('expression').find((t) => t.id === 'virgule');
    assert.equal(touche?.libelle, '.');
    assert.equal((touche?.action as { texte: string }).texte, '.');
  });

  it('insère la virgule sur un exercice fractionnaire, où elle est acceptée', () => {
    // L'analyseur rationnel lit `1,5` comme `1.5`. La convention francophone
    // s'applique donc sans casser la correction.
    const touche = touchesPour('rationnelle').find((t) => t.id === 'virgule');
    assert.equal(touche?.libelle, ',');
    assert.equal((touche?.action as { texte: string }).texte, ',');
  });

  it('étiquette la division « ÷ » mais insère « / »', () => {
    const touche = touchesPour('expression').find((t) => t.id === 'division');
    assert.ok(touche);
    assert.equal(touche.libelle, '÷', 'L’étiquette doit rester lisible.');
    assert.equal(
      (touche.action as { texte: string }).texte,
      '/',
      'Le caractère inséré doit être accepté par le moteur.',
    );
  });

  it('étiquette les puissances mais insère « ^2 » et « ^3 »', () => {
    const touches = touchesPour('expression');
    const p2 = touches.find((t) => t.id === 'puissance2');
    const p3 = touches.find((t) => t.id === 'puissance3');
    assert.ok(p2 && p3);
    assert.equal(p2.libelle, 'x²');
    assert.equal(p3.libelle, 'x³');
    assert.equal((p2.action as { texte: string }).texte, '^2');
    assert.equal((p3.action as { texte: string }).texte, '^3');
  });

  it('permet une puissance générale', () => {
    const touche = touchesPour('expression').find((t) => t.id === 'puissance');
    assert.ok(touche, 'La touche de puissance générale est exigée.');
    assert.equal((touche.action as { texte: string }).texte, '^');
  });

  it('insère le vrai symbole racine, accepté par l’analyseur de racines', () => {
    const touche = touchesPour('racine').find((t) => t.id === 'racine');
    assert.ok(touche);
    assert.equal((touche.action as { texte: string }).texte, '√');
  });

  it('utilise des signes que la normalisation ramène à l’opérateur attendu', () => {
    // `−` et `×` sont volontairement gardés tels quels : ils sont plus lisibles,
    // et l'analyseur les ramène à `-` et `*`.
    assert.equal(normaliseCommeLeMoteur('−'), '-');
    assert.equal(normaliseCommeLeMoteur('×'), '*');
    const symboles = symbolesInseres('expression');
    assert.ok(symboles.includes('−'));
    assert.ok(symboles.includes('×'));
  });
});

describe('7.5 — les touches exigées sont présentes', () => {
  const ATTENDUES = [
    'plus',
    'moins',
    'croix',
    'division',
    'egal',
    'x',
    'parOuvrante',
    'parFermante',
    'puissance2',
    'puissance3',
    'retour',
    'effacer',
    'gauche',
    'droite',
    'valider',
    'fermer',
  ];

  it('expose toutes les touches d’expression demandées', () => {
    const ids = touchesPour('expression').map((t: Touche) => t.id);
    for (const attendu of ATTENDUES) {
      assert.ok(ids.includes(attendu), `Touche manquante : ${attendu}`);
    }
  });

  it('propose la racine et la fraction là où elles ont un sens', () => {
    assert.ok(touchesPour('racine').some((t) => t.id === 'racine'));
    assert.ok(touchesPour('rationnelle').some((t) => t.id === 'fraction'));
  });

  it('ne propose pas la racine sur un exercice d’expression', () => {
    // L'analyseur d'expressions **refuse** `√` : l'afficher serait inviter à
    // composer une réponse qui sera rejetée.
    assert.equal(
      touchesPour('expression').some((t) => t.id === 'racine'),
      false,
    );
  });

  it('donne un libellé accessible à chaque touche', () => {
    for (const type of ['rationnelle', 'expression', 'racine'] as const) {
      for (const touche of touchesPour(type)) {
        assert.ok(
          touche.aria.trim().length >= 2 && /[a-zA-Zàâéèêëîïôûù]/u.test(touche.aria),
          `${type}/${touche.id} : libellé accessible manquant ou trop court.`,
        );
      }
    }
  });

  it('ne définit aucun identifiant de touche en double', () => {
    for (const type of ['rationnelle', 'expression', 'racine'] as const) {
      const ids = touchesPour(type).map((t) => t.id);
      assert.equal(new Set(ids).size, ids.length, `${type} : identifiants de touches dupliqués.`);
    }
  });

  it('ne rend aucune touche décorative', () => {
    // Toute touche doit soit modifier la saisie, soit valider, masquer le
    // clavier ou proposer le clavier système.
    for (const type of ['rationnelle', 'expression', 'racine'] as const) {
      for (const touche of touchesPour(type)) {
        const action = touche.action.type;
        assert.ok(
          ['inserer', 'fraction', 'retirer', 'effacer', 'deplacer', 'valider', 'fermer', 'systeme'].includes(action),
          `${type}/${touche.id} : action « ${action} » sans effet.`,
        );
      }
    }
  });
});

describe('7.5 — l’aperçu est lisible et sans effet', () => {
  it('décrit une fraction en nommant ses deux termes', () => {
    // Valeurs choisies hors des réponses attendues du MVP : un test ne doit
    // pas ressembler à un corrigé, même dans ses propres données d'exemple.
    const texte = apercuLisible('3/4');
    assert.match(texte, /3/);
    assert.match(texte, /4/);
  });

  it('décrit une racine', () => {
    assert.match(apercuLisible('7√5'), /racine/i);
  });

  it('décrit une puissance', () => {
    assert.match(apercuLisible('x^3'), /3/);
  });

  it('reste vide sur une saisie vide', () => {
    assert.equal(apercuLisible(''), '');
    assert.equal(apercuLisible('   '), '');
  });

  it('ne modifie jamais la valeur envoyée à l’API', () => {
    // L'aperçu est une aide à la lecture : il ne produit pas de second texte.
    for (const valeur of ['3/4', '7√5', 'x^3', '2x + 3', '7/']) {
      const original = valeur;
      apercuLisible(valeur);
      assert.equal(original, valeur);
    }
  });

  it('ne laisse fuir aucun caractère illisible', () => {
    assert.doesNotMatch(apercuLisible('$$$'), /\$/);
  });
});
describe('7.5.1 — la disposition est organisée, pas empilée', () => {
  it('compose chaque rangée de exactement quatre colonnes', () => {
    // Une rangée qui déborde pousserait une touche hors de l'écran sur un
    // téléphone : la somme des largeurs doit valoir exactement la largeur de
    // la grille.
    for (const type of ['rationnelle', 'expression', 'racine'] as const) {
      for (const [index, rangee] of rangeesPour(type).entries()) {
        assert.equal(
          largeurRangee(rangee),
          COLONNES,
          `${type} rangée ${index} : ${largeurRangee(rangee)} colonnes au lieu de ${COLONNES}.`,
        );
      }
    }
  });

  it('n’a aucune rangée vide ni rangée fantôme', () => {
    for (const type of ['rationnelle', 'expression', 'racine'] as const) {
      for (const rangee of rangeesPour(type)) {
        assert.ok(rangee.touches.length > 0, `${type} : rangée vide.`);
      }
    }
  });

  it('place les chiffres sur la gauche et les opérations à droite', () => {
    // Disposition de calculatrice : l'élève retrouve ÷ et − au même endroit.
    for (const type of ['rationnelle', 'expression', 'racine'] as const) {
      const rangees = rangeesPour(type).slice(0, 4);
      for (const [index, rangee] of rangees.entries()) {
        const premier = rangee.touches[0];
        const dernier = rangee.touches[rangee.touches.length - 1];
        assert.match(premier?.id ?? '', /^chiffre-/, `${type} rangée ${index} : la première colonne n'est pas un chiffre.`);
        assert.ok(
          ['division', 'croix', 'moins', 'plus', 'fraction', 'racine', 'x'].includes(dernier?.id ?? ''),
          `${type} rangée ${index} : la colonne de droite n’est pas une opération (${dernier?.id}).`,
        );
      }
    }
  });

  it('garde les chiffres dans l’ordre décroissant puis nul', () => {
    const suite = rangeesPour('expression')
      .slice(0, 4)
      .flatMap((r) => r.touches.map((t) => t.id));
    assert.deepEqual(suite, [
      'chiffre-7',
      'chiffre-8',
      'chiffre-9',
      'division',
      'chiffre-4',
      'chiffre-5',
      'chiffre-6',
      'croix',
      'chiffre-1',
      'chiffre-2',
      'chiffre-3',
      'moins',
      'chiffre-0',
      'virgule',
      'x',
      'plus',
    ]);
  });

  it('termine par la validation, la dernière touche du clavier', () => {
    // La validation ne doit jamais être buried au milieu des caractères.
    for (const type of ['rationnelle', 'expression', 'racine'] as const) {
      const derniere = touchesPour(type).at(-1);
      assert.equal(derniere?.id, 'valider', `${type} : la dernière touche doit être la validation.`);
      assert.equal(derniere.largeur, 4, `${type} : la validation doit occuper toute la largeur.`);
    }
  });

  it('garde la correction et le masquage juste avant la validation', () => {
    const ids = touchesPour('expression').map((t) => t.id);
    const iCorrection = ids.indexOf('gauche');
    const iMasque = ids.indexOf('fermer');
    const iValider = ids.indexOf('valider');
    assert.ok(iCorrection < iMasque && iMasque < iValider, `ordre inattendu : ${ids.join(', ')}`);
  });

  it('donne un identifiant unique à chaque touche, tous types confondus', () => {
    for (const type of ['rationnelle', 'expression', 'racine'] as const) {
      const ids = touchesPour(type).map((t) => t.id);
      assert.equal(new Set(ids).size, ids.length, `${type} : identifiants dupliqués.`);
    }
  });

  it('donne à chaque chiffre un libellé accessible nommé', () => {
    // Un chiffre affiché seul est ambigu : « 1 » se lit « un ».
    const attendu: Record<string, string> = {
      'chiffre-0': 'Zéro',
      'chiffre-1': 'Un',
      'chiffre-7': 'Sept',
      'chiffre-9': 'Neuf',
    };
    for (const type of ['rationnelle', 'expression', 'racine'] as const) {
      for (const [id, aria] of Object.entries(attendu)) {
        const touche = touchesPour(type).find((t) => t.id === id);
        assert.equal(touche?.aria, aria, `${type}/${id}`);
      }
    }
  });

  it('propose la racine dans la colonne des opérations d’un exercice de racines', () => {
    const premiere = rangeesPour('racine')[0];
    assert.equal(premiere?.touches.at(-1)?.id, 'racine');
  });

  it('propose la fraction dans la colonne des opérations d’un exercice fractionnaire', () => {
    const premiere = rangeesPour('rationnelle')[0];
    assert.equal(premiere?.touches.at(-1)?.id, 'fraction');
  });
});
