/**
 * Mise en place de la suite de rendu.
 *
 * `globals: false` est choisi dans `vitest.config.ts` pour que les variables de
 * test ne s'échappent pas dans le reste du projet. Le prix à payer est que le
 * nettoyage automatique de Testing Library, qui s'appuie sur un `afterEach`
 * global, n'est pas enregistré : il faut le poser explicitement, sinon le DOM
 * accumule les montages et un test peut trouver le texte d'un autre.
 */

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});