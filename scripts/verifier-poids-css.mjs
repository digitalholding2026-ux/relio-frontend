/**
 * Contrôle du poids du CSS de production.
 *
 * ## Pourquoi un script plutôt qu'un test
 *
 * Un test s'exécute avant le build, donc avant que les CSS Modules aient été
 * fusionnés et élagués. Il ne verrait que les sources, pas ce qui part
 * réellement sur le réseau. La seule mesure honnête se fait sur
 * `.next/static/css`, donc **après** le build.
 *
 * ## Le seuil
 *
 * 30 Ko gzip, imposé par le projet. La feuille complète pèse aujourd'hui
 * environ 7 Ko gzip, soit moins d'un quart du budget : la marge est
 * volontaire, elle absorbersera les composants à venir sans qu'il faille
 * choisir entre l'accessibilité et la vitesse de chargement.
 *
 * Sur une connexion 3G, 30 Ko représentent une seconde et demie d'attente
 * avant même que le premier texte apparaisse.
 */

import { gzipSync } from 'node:zlib';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SEUIL_KO = 30;
const DOSSIER = join(process.cwd(), '.next', 'static', 'css');

try {
  statSync(DOSSIER);
} catch {
  console.error('Dossier .next/static/css absent. Lancez `npm run build` avant ce contrôle.');
  process.exit(1);
}

const fichiers = readdirSync(DOSSIER).filter((nom) => nom.endsWith('.css'));

let totalGzip = 0;
let totalBrut = 0;

for (const nom of fichiers) {
  const contenu = readFileSync(join(DOSSIER, nom));
  const gzip = gzipSync(contenu, { level: 9 }).length;
  totalGzip += gzip;
  totalBrut += contenu.length;
  console.log(`  ${nom} — ${(contenu.length / 1024).toFixed(1)} Ko -> ${(gzip / 1024).toFixed(1)} Ko gzip`);
}

const ko = totalGzip / 1024;
console.log(`\nTotal CSS : ${(totalBrut / 1024).toFixed(1)} Ko bruts -> ${ko.toFixed(1)} Ko gzip`);
console.log(`Budget    : ${SEUIL_KO} Ko gzip — marge restante ${(SEUIL_KO - ko).toFixed(1)} Ko`);

if (ko > SEUIL_KO) {
  console.error(
    `\nÉCHEC : le CSS dépasse de ${(ko - SEUIL_KO).toFixed(1)} Ko le budget de ${SEUIL_KO} Ko gzip.`,
  );
  process.exit(1);
}

console.log('OK');