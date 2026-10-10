'use client';

/**
 * Notification — un retour qui n'interrompt pas.
 *
 * ## Quand une notification, quand une feuille ?
 *
 * La notification confirme ou prévient **après** une action. Elle ne demande
 * rien et n'empêche rien. Si l'élève doit choisir, c'est une feuille : une
 * notification qui disparaît seule pendant qu'on la lit est un piège.
 *
 * ## Le temps d'affichage n'est pas fixe
 *
 * Une erreur reste plus longtemps qu'un succès : « c'est faux » est une
 * information à lire, « c'est enregistré » peut se dissiper. Un élève qui lit
 * lentement n'a pas le temps de lire avant que le message parte.
 *
 * ## Annonce
 *
 * `role="status"` pour une information, `role="alert"` pour une erreur : ce
 * second rôle interrompt la lecture en cours, ce qui est précisément le
 * comportement voulu quand une action vient d'échouer.
 */

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { Icone, type NomIcone } from './Icone';
import styles from './Toast.module.css';

export type TonNotification = 'info' | 'succes' | 'alerte';

export interface NotificationItem {
  readonly id: number;
  readonly message: string;
  readonly ton: TonNotification;
}

interface ContexteNotification {
  readonly notifier: (message: string, ton?: TonNotification) => void;
  readonly items: readonly NotificationItem[];
  readonly fermer: (id: number) => void;
}

const Contexte = createContext<ContexteNotification | null>(null);

/** Durées d'affichage en millisecondes, par ton. */
const DUREES: Record<TonNotification, number> = {
  info: 4000,
  succes: 3000,
  alerte: 7000,
};

export function FournisseurNotification({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<readonly NotificationItem[]>([]);
  const compteur = useRef(0);

  const fermer = useCallback((id: number) => {
    setItems((actuels) => actuels.filter((item) => item.id !== id));
  }, []);

  const notifier = useCallback(
    (message: string, ton: TonNotification = 'info') => {
      compteur.current += 1;
      const id = compteur.current;
      setItems((actuels) => [...actuels, { id, message, ton }]);

      setTimeout(() => {
        setItems((actuels) => actuels.filter((item) => item.id !== id));
      }, DUREES[ton]);
    },
    [],
  );

  const valeur = useMemo<ContexteNotification>(() => ({ notifier, items, fermer }), [notifier, items, fermer]);

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

/**
 * Accès aux notifications.
 *
 * Lève si le composant est rendu hors du fournisseur : une notification qui
 * disparaît silencieusement est pire qu'une erreur explicite en développement.
 */
export function useNotifications(): ContexteNotification {
  const contexte = useContext(Contexte);
  if (contexte === null) {
    throw new Error('useNotifications doit être utilisé dans un <FournisseurNotification>.');
  }
  return contexte;
}

/** Zone d'affichage des notifications. À poser une fois, au plus haut. */
export function ZoneNotification() {
  const { items, fermer } = useNotifications();

  if (items.length === 0) return null;

  return (
    <div className={styles.zone} aria-live="polite" aria-atomic="false">
      {items.map((item) => (
        <div
          key={item.id}
          className={[styles.notification, styles[item.ton]].join(' ')}
          role={item.ton === 'alerte' ? 'alert' : 'status'}
        >
          <Icone nom={item.ton === 'succes' ? 'check' : item.ton === 'alerte' ? 'alerte' : 'info'} aria-hidden="true" />
          <span className={styles.texte}>{item.message}</span>
          <button
            type="button"
            className={styles.fermer}
            onClick={() => fermer(item.id)}
            aria-label="Fermer la notification"
          >
            <Icone nom="croix" taille={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
