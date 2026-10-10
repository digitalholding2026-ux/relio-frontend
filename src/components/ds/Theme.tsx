'use client';

/**
 * Bascule de thème et d'économie de données.
 *
 * ## Le problème du scintillement
 *
 * Appliquer le thème depuis React signifie que la page s'affiche d'abord en
 * mode clair, puis bascule : sur un téléphone en mode sombre, l'élève voit un
 * éclair blanc à chaque navigation. C'est le défaut le plus visible d'un
 * basculement de thème.
 *
 * La correction ici est double :
 *
 * 1. le CSS déclare déjà un mode sombre via `prefers-color-scheme`, avant tout
 *    JavaScript — l'élève qui n'a jamais choisi voit le bon thème immédiatement ;
 * 2. ce composant ne mémorise que le **choix explicite**, et le applique.
 *
 * Les deux réglages sont conservés dans `localStorage`. Le thème est aussi
 * écrit dans la balise `<meta name="theme-color">`, sans quoi la barre
 * d'adresse du navigateur resterait claire en mode sombre.
 */

import { useEffect, useState } from 'react';

import { BoutonIcone } from './BoutonIcone';
import styles from './Theme.module.css';

type Theme = 'clair' | 'sombre';
type Economie = 'on' | 'off';

const CLE_THEME = 'relio.theme';
const CLE_ECONOMIE = 'relio.economie';

export function BasculeTheme() {
  const [theme, setTheme] = useState<Theme>('clair');
  const [economie, setEconomie] = useState<Economie>('off');
  const [monte, setMonte] = useState(false);

  // L'état ne peut être lu qu'après le montage : le serveur ne voit pas
  // `localStorage`, et un rendu serveur qui divergerait de celui du client
  // provoquerait un avertissement d'hydratation.
  useEffect(() => {
    const stockeTheme = localStorage.getItem(CLE_THEME);
    const stockeEconomie = localStorage.getItem(CLE_ECONOMIE);

    const initial: Theme =
      stockeTheme === 'clair' || stockeTheme === 'sombre'
        ? stockeTheme
        : window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'sombre'
          : 'clair';

    setTheme(initial);
    setEconomie(stockeEconomie === 'on' ? 'on' : 'off');
    setMonte(true);
  }, []);

  useEffect(() => {
    if (!monte) return;
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(CLE_THEME, theme);

    // La barre d'adresse suit le fond, sinon la page semble flotter.
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', theme === 'sombre' ? '#0B1020' : '#FAF7F2');
  }, [theme, monte]);

  useEffect(() => {
    if (!monte) return;
    document.documentElement.dataset.economie = economie;
    localStorage.setItem(CLE_ECONOMIE, economie);
  }, [economie, monte]);

  if (!monte) {
    // Avant le montage, on rend la même taille qu'après : pas de saut de mise
    // en page quand les boutons apparaissent.
    return <div className={styles.espace} aria-hidden="true" />;
  }

  return (
    <div className={styles.groupe}>
      <BoutonIcone
        nom={theme === 'sombre' ? 'lumiere' : 'lune'}
        label={theme === 'sombre' ? 'Passer en mode clair' : 'Passer en mode sombre'}
        variante="leger"
        onClick={() => setTheme(theme === 'sombre' ? 'clair' : 'sombre')}
      />

      <BoutonIcone
        nom="donnees"
        label={economie === 'on' ? 'Restaurer les animations' : 'Activer le mode économie de données'}
        variante={economie === 'on' ? 'plein' : 'leger'}
        onClick={() => setEconomie(economie === 'on' ? 'off' : 'on')}
      />
    </div>
  );
}