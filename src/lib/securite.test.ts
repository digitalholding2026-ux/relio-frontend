import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Contrôles automatisés de conformité du **frontend**.
 *
 * Le chantier 6 (critères C1 et C3) exige que deux interdits soient vérifiés
 * par un contrôle automatique et non par une convention :
 *
 * 1. **aucun contenu d'épreuve officielle dans le code client** ;
 * 2. **aucune clé d'API ou autre secret dans le bundle**.
 *
 * Ces deux règles sont ici contrôlées à la **source**, c'est-à-dire avant même
 * le build : un contenu d'épreuve ou un secret introduit par erreur dans un
 * composant est détecté par la CI, pas par un lecteur prudent.
 *
 * Le contrôle est volontairement **textuel et exhaustif** plutôt que
 * sémantique : il ne cherche pas à comprendre le code, il refuse toute
 * présence d'un motif interdit. Un contrôle qui prétendrait juger du sens
 * donnerait une assurance fausse ; celui-ci donne une garantie simple.
 *
 * Le périmètre est `src/` : les dépendances installées et les fichiers de
 * configuration sont hors du contrôle, le premier cas relevant des tiers et le
 * second étant couvert par le `.gitignore` et les variables d'environnement.
 */

// Ce fichier vit dans `src/lib/` : deux niveaux remontent à la racine du dépôt.
const RACINE = new URL('../../', import.meta.url).pathname;
const DOSSIER_SOURCE = join(RACINE, 'src');

const EXTENSIONS_A_SCANNER = ['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.md'];

interface FichierSource {
  readonly chemin: string;
  readonly contenu: string;
}

/** Liste récursive des fichiers scannables sous `src/`. */
function listerSources(chemin: string = DOSSIER_SOURCE): FichierSource[] {
  const fichiers: FichierSource[] = [];

  for (const entree of readdirSync(chemin)) {
    const complet = join(chemin, entree);

    if (statSync(complet).isDirectory()) {
      fichiers.push(...listerSources(complet));
      continue;
    }

    // Les tests décrivent le contrat : ils citent des identifiants d'exercice
    // et des statuts. Les scanner produirait des faux positifs sans valeur.
    if (entree.endsWith('.test.ts') || entree.endsWith('.test.tsx')) continue;

    if (EXTENSIONS_A_SCANNER.includes(extname(entree))) {
      fichiers.push({ chemin: complet.replace(`${RACINE}`, ''), contenu: readFileSync(complet, 'utf8') });
    }
  }

  return fichiers;
}

const SOURCES = listerSources();

describe('conformité du contenu client', () => {
  it('scanne une surface non vide de sources', () => {
    // Un contrôle qui ne lirait aucun fichier passerait toujours : il faut
    // s'assurer qu'il a réellement quelque chose à regarder.
    assert.ok(SOURCES.length >= 8, `Seulement ${SOURCES.length} fichier(s) scanné(s).`);
  });

  it('ne contient aucun énoncé d’épreuve officielle', () => {
    // Les identifiants de l'inventaire BEPC sont le meilleur marqueur : ils
    // sont de la forme BEPC-2025-A-NUM-EX2-1.
    const MOTIF_EPREUVE = /BEPC-20\d\d-[A-Z0-9]+-/i;

    for (const { chemin, contenu } of SOURCES) {
      assert.ok(
        !MOTIF_EPREUVE.test(contenu),
        `${chemin} : identifiant d'épreuve du BEPC présent dans le code client. ` +
          "Les questions du jury sont interdites de publication (droits non établis).",
      );
    }
  });

  it('ne contient aucune citation de sujet d’examen', () => {
    // Un énoncé recopié sans son identifiant laisserait passer le contrôle
    // précédent. On refuse donc aussi les formulations **propres aux sujets**,
    // c'est-à-dire celles qui désignent un document du jury.
    //
    // ⚠️ Le nom du produit — « BEPC de mathématiques » — est volontaire et
    // autorisé : il figure dans le titre de l'application. Ce qui est refusé,
    // c'est la désignation d'un **document** (« sujet d'examen de BEPC maths
    // 2025 », « barème officiel », « sujet de la session normale »).
    const MOTIFS = [
      /sujet\s+(?:d['’]examen|de\s+(?:BEPC|concours))/i,
      /BEPC\s*(?:maths?|mathématiques)\s*20\d\d/i,
      /session\s+(?:normale|rattrapage)/i,
      /barème\s+officiel/i,
      /Direction des Examens/i,
      /corrigé\s+(?:officiel|du\s+jury)/i,
    ];

    for (const { chemin, contenu } of SOURCES) {
      for (const motif of MOTIFS) {
        assert.ok(
          !motif.test(contenu),
          `${chemin} : formulation de sujet d'examen détectée (${motif}).`,
        );
      }
    }
  });

  it('ne contient aucune clé d’API ni secret', () => {
    const MOTIFS = [
      // Préfixes de clés convectionnelles : toute clé en dur est interdite.
      /\bsk-[A-Za-z0-9]{16,}/,
      /\bghp_[A-Za-z0-9]{20,}/,
      /\bAIza[0-9A-Za-z_-]{30,}/,
      /\bBearer\s+[A-Za-z0-9._-]{20,}/,
      // Formes génériques, y compris les variables Next.js exposées au client.
      /\bNEXT_PUBLIC_[A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD)/,
      // Un secret codé en dur est d'abord une chaînē...
      /\b(?:apiKey|api_key|secretKey|accessToken)\s*[:=]\s*['"][^'"]{16,}['"]/i,
    ];

    for (const { chemin, contenu } of SOURCES) {
      for (const motif of MOTIFS) {
        assert.ok(
          !motif.test(contenu),
          `${chemin} : secret détecté (${motif}). Aucune clé ne doit figurer dans le code client.`,
        );
      }
    }
  });

  it('ne lit l’URL du service que côté serveur', () => {
    // `API_BASE_URL` n'est pas préfixée par `NEXT_PUBLIC_` : elle est donc
    // lue dans un composant serveur et transmise par prop. Le préfixe
    // réapparaissant, la variable partirait dans le bundle client.
    for (const { chemin, contenu } of SOURCES) {
      assert.ok(
        !/NEXT_PUBLIC_API_BASE_URL/.test(contenu),
        `${chemin} : API_BASE_URL ne doit pas être exposée au client.`,
      );
    }
  });

  it('ne contient pas de contenu pédagogique', () => {
    // Les énoncés, les indices et les réponses attendues vivent côté serveur.
    // Leur présence ici signifierait que le contenu est figé dans le bundle.
    const MOTIFS = [/reponseAttendue/, /\bpieges?\b\s*:/, /indices\s*:\s*\[/];

    for (const { chemin, contenu } of SOURCES) {
      for (const motif of MOTIFS) {
        assert.ok(
          !motif.test(contenu),
          `${chemin} : contenu pédagogique détecté (${motif}) dans le code client.`,
        );
      }
    }
  });
});
