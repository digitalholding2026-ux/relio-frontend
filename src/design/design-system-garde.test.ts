import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { dynamic, metadata } from '@/app/design-system/page';

/**
 * Garde d'accès de `/design-system`.
 *
 * ## Le défaut
 *
 * La page était **prérendue** au build. Or la garde lit `NODE_ENV` et
 * `DESIGN_SYSTEM_ENABLED`, et `next build` s'exécute avec `NODE_ENV=production`
 * sans cette seconde variable : la page était donc prérendue **en 404**
 * (`.next/server/app/design-system.html` commençait par
 * `<html id="__next_error__">`). Poser `DESIGN_SYSTEM_ENABLED=on` sur le
 * déploiement ne changeait plus rien — le HTML servi restait celui de l'erreur.
 *
 * `force-dynamic` déplace l'évaluation de la garde au moment de la requête.
 */

const SOURCE = readFileSync(
  join(process.cwd(), 'src/app/design-system/page.tsx'),
  'utf8',
);

describe('/design-system — rendu dynamique', () => {
  it('la page exporte `dynamic = "force-dynamic"`', () => {
    // Export réellement consommé par le routeur : c'est lui que vérifie le test.
    expect(dynamic).toBe('force-dynamic');
  });

  it('la déclaration est présente dans le source', () => {
    expect(SOURCE).toMatch(/export const dynamic\s*=\s*'force-dynamic'/);
  });

  it('la garde d’environnement est conservée', () => {
    // `force-dynamic` ne doit pas avoir supprimé la fermeture de la page :
    // en production sans la variable, elle doit toujours renvoyer 404.
    expect(SOURCE).toContain('DESIGN_SYSTEM_ENABLED');
    expect(SOURCE).toContain('notFound()');
  });

  it('la page reste fermée aux moteurs de recherche', () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it('le manifeste de build ne prérend plus la route en erreur', () => {
    const manifeste = join(process.cwd(), '.next/prerender-manifest.json');
    // Le test doit passer sans build : on n'affirme alors que le comportement
    // déclaré. L'affirmation sur le build réel est faite par le rapport de
    // chantier, à partir de la sortie de `next build`.
    if (!existsSync(manifeste)) return;

    const contenu = JSON.parse(readFileSync(manifeste, 'utf8'));
    const prerendus: string[] = Object.keys(contenu.routes ?? {});
    expect(prerendus).not.toContain('/design-system');
  });
});