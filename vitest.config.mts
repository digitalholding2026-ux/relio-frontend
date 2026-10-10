import { defineConfig } from 'vitest/config';

/**
 * Configuration de test du design system.
 *
 * ## Deux suites de tests coexistent
 *
 * - `node --test` (`npm run test:logique`) teste la logique pure — analyseur,
 *   clavier, observations. C'est la suite historique du projet, rapide et sans
 *   DOM ;
 * - `vitest` (`npm run test:ui`) teste le **rendu** des composants, ce qui exige
 *   un DOM et donc `jsdom`.
 *
 * Elles ne sont pas mélangées : la logique historique ne doit pas devenir plus
 * lente parce qu'un DOM a été chargé, et le rendu n'a pas besoin d'être rejoué
 * par le runner historique.
 */
export default defineConfig({
  /*
   * `jsx: preserve` est imposé par Next.js : le compilateur ne transforme rien,
   * c'est Next qui le fait plus tard. Or les tests de rendu ne passent pas par
   * Next — il faut donc que la transformation JSX ait lieu ici, sinon
   * `<Bouton />` arrive tel quel à l'analyse d'import et échoue.
   *
   * Vite 8 transforme le TypeScript avec **oxc**, pas esbuild : l'option se
   * trouve sous `oxc.jsx`, à la racine de la configuration et non sous `test`.
   */
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    environment: 'jsdom',
    /*
     * Périmètre volontairement disjoint de celui de `npm run test:logique`
     * (qui ne vise que `src/lib/*.test.ts`). Deux suites ne doivent jamais
     * réclamer le même fichier : la seconde qui le trouve échoue avec une
     * erreur incompréhensible.
     */
    include: ['src/components/**/*.test.tsx', 'src/design/**/*.test.ts'],
    globals: false,
    setupFiles: ['./src/design/setup.ts'],
  },
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname },
  },
});