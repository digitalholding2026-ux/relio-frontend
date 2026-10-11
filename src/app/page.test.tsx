import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PageAccueil from '@/app/page';

/**
 * Page d'accueil — rôle du bandeau d'avertissement et exactitude du texte de
 * pied de page.
 *
 * Deux défauts réels ont atteint la production ici :
 *
 * - le bandeau portait `role="note"`, rôle qui **n'existe pas** en ARIA : il
 *   était donc ignoré par les lecteurs d'écran, et l'élève n'était jamais
 *   averti du périmètre restreint de la version ;
 * - le pied de page affirmait « tes réponses ne sont pas conservées », ce qui
 *   est faux côté client : les réponses sont conservées dans le navigateur
 *   (jusqu'à 500 entrées) et transmises au serveur à chaque tentative.
 *
 * La page est un composant serveur : elle est rendue directement ici, sans
 * passer par `next dev`, ce qui est possible parce qu'elle ne dépend que de
 * `process.env.API_BASE_URL`, absent ici → l'état « non configuré » est rendu.
 */

describe('Page d’accueil — bandeau d’avertissement', () => {
  it('le bandeau porte un rôle que le lecteur d’écran connaît', async () => {
    render(await PageAccueil());

    const bandeau = screen.getByText(/Première version/).closest('.avertissement');
    expect(bandeau).not.toBeNull();
    // `note` n'existe pas dans la spécification : il serait ignoré.
    expect(bandeau!.getAttribute('role')).toBe('status');
  });

  it('le bandeau est une région vivante polie, pas une interruption', async () => {
    render(await PageAccueil());

    const bandeau = screen.getByText(/Première version/).closest('.avertissement')!;
    // `status` implique implicitement aria-live=polite et aria-atomic=true :
    // le message est lu sans couper la navigation en cours.
    expect(bandeau.getAttribute('role')).toBe('status');
    expect(bandeau.hasAttribute('aria-live')).toBe(false);
  });

  it('aucun élément de la page ne porte un rôle inconnu', async () => {
    const { container } = render(await PageAccueil());

    const roles = [...container.querySelectorAll('[role]')].map((n) => n.getAttribute('role'));
    expect(roles.length).toBeGreaterThan(0);
    for (const role of roles) expect(role).not.toBe('note');
  });
});

describe('Page d’accueil — exactitude du texte sur les réponses', () => {
  it('ne dit pas que les réponses ne sont pas conservées', async () => {
    const { container } = render(await PageAccueil());

    const texte = container.textContent ?? '';
    expect(texte).not.toMatch(/réponses ne sont pas conservées/i);
    expect(texte).not.toMatch(/tes réponses ne sont pas/i);
  });

  it('dit où sont enregistrées les réponses, et qu’elles sont effaçables', async () => {
    const { container } = render(await PageAccueil());
    const texte = (container.textContent ?? '').replace(/\s+/g, ' ');

    expect(texte).toContain('enregistrées sur ton appareil');
    expect(texte).toContain('suivre ta progression');
    expect(texte).toMatch(/effacer à tout moment/);
  });

  it('reste vrai sur le serveur, sans inventer de promesse', async () => {
    const { container } = render(await PageAccueil());
    const texte = (container.textContent ?? '').replace(/\s+/g, ' ');

    expect(texte).toContain('rien n’est conservé de ton parcours sur nos serveurs');
  });

  it('n’introduit aucun terme technique', async () => {
    const { container } = render(await PageAccueil());
    const texte = (container.textContent ?? '').toLowerCase();

    for (const terme of ['localstorage', 'sessionstorage', 'cookie', 'api', 'json', 'stockage']) {
      // « API » apparaît ailleurs sur la page (carte d'état du service) : ce
      // qui est contrôlé ici, c'est le paragraphe de confidentialité.
      expect(texte.split('aucun contenu d’épreuve')[1] ?? '').not.toContain(terme);
    }
  });

  it('conserve la promesse sur l’absence de collecte de données personnelles', async () => {
    const { container } = render(await PageAccueil());
    expect((container.textContent ?? '').replace(/\s+/g, ' ')).toContain(
      'aucune donnée personnelle n’est collectée',
    );
  });
});