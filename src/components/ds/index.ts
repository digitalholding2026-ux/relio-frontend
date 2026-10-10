/**
 * Point d'entrée unique du design system.
 *
 * Importer depuis `@/components/ds` plutôt que depuis un fichier précis évite
 * qu'un chantier suivant ne s'accroche à un chemin interne et ne casse quand
 * le composant est renommé.
 */

export { AnneauProgression, type AnneauProgressionProps } from './AnneauProgression';
export { Avatar, type AvatarProps } from './Avatar';
export { BarreProgression, type BarreProgressionProps, type TonProgression } from './BarreProgression';
export { Bouton, type BoutonProps, type TailleBouton, type VarianteBouton } from './Bouton';
export { Carte, type CarteProps } from './Carte';
export { BoutonIcone, type BoutonIconeProps, type TailleBoutonIcone } from './BoutonIcone';
export { EtatVide, type EtatVideProps } from './EtatVide';
export { Feuille, type FeuilleProps } from './Feuille';
export { Icone, type IconeProps, type NomIcone } from './Icone';
export { Champ, ZoneTexte, type ChampProps, type ZoneTexteProps } from './Input';
export { Pastille, type PastilleProps, type TonPastille } from './Pastille';
export { Puce, type PuceProps } from './Puce';
export { Squelette, type SqueletteProps } from './Skeleton';
export {
  FournisseurNotification,
  ZoneNotification,
  useNotifications,
  type NotificationItem,
  type TonNotification,
} from './Toast';