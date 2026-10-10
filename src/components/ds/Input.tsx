/**
 * Champs de saisie — `Champ` et `ZoneTexte`.
 *
 * ## Les trois liens qui manquent presque toujours
 *
 * Un champ natif sans étiquette visible est une boîte vide pour un lecteur
 * d'écran. Ce composant relie donc **systématiquement** :
 *
 * 1. un `<label for>` — le clic sur l'étiquette place le focus dans le champ ;
 * 2. une description liée par `aria-describedby` ;
 * 3. un message d'erreur lié de la même façon.
 *
 * L'erreur est annoncée par `role="alert"` : elle doit interrompre l'élève dès
 * qu'elle apparaît, pas attendre qu'il la cherche.
 *
 * ## Pourquoi la bordure est forte
 *
 * Le champ est posé sur la surface, en général blanche. Sa bordure doit être
 * **repérable** sans dépendre uniquement de sa couleur d'accent : d'où
 * `--relio-bordure-forte`, calibrée à 3:1. Une bordure purement décorative
 * ferait disparaître le champ pour qui ne distingue pas bien les teintes.
 */

import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

import styles from './Input.module.css';

/** Propriétés communes au champ et à la zone de texte. */
interface SocleProps {
  /** Étiquette visible. Elle est obligatoire : sans elle, le champ est anonyme. */
  readonly label: string;
  readonly erreur?: string;
  readonly aide?: string;
  readonly requis?: boolean;
  /** Classe appliquée à l'enveloppe, pas au champ lui-même. */
  readonly enveloppe?: string;
}

/** Ce que l'enveloppe fournit au champ qu'elle enveloppe. */
interface Liaison {
  readonly id: string;
  readonly decrit: string | undefined;
}

function Enveloppe({
  id,
  label,
  erreur,
  aide,
  requis,
  enveloppe,
  enfant,
}: SocleProps & { id: string; enfant: (liaison: Liaison) => ReactNode }) {
  const idAide = `${id}-aide`;
  const idErreur = `${id}-erreur`;

  // `aria-describedby` énumère les deux descriptions quand elles existent : le
  // lecteur d'écran les enchaîne alors dans l'ordre.
  const decrit = [aide !== undefined ? idAide : null, erreur !== undefined ? idErreur : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={[styles.champ, enveloppe ?? ''].filter(Boolean).join(' ')}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {requis === true && (
          <>
            <span className={styles.requis} aria-hidden="true">
              {' '}
              *
            </span>
            <span className={styles.cache}>(obligatoire)</span>
          </>
        )}
      </label>

      {enfant({ id, decrit: decrit === '' ? undefined : decrit })}

      {aide !== undefined && (
        <p className={styles.aide} id={idAide}>
          {aide}
        </p>
      )}

      {erreur !== undefined && (
        <p className={styles.erreur} id={idErreur} role="alert">
          {erreur}
        </p>
      )}
    </div>
  );
}

export interface ChampProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'aria-describedby'>,
    SocleProps {}

export const Champ = forwardRef<HTMLInputElement, ChampProps>(function Champ(
  { label, erreur, aide, requis, enveloppe, ...reste },
  ref,
) {
  const id = useId();

  return (
    <Enveloppe
      id={id}
      label={label}
      erreur={erreur}
      aide={aide}
      requis={requis}
      enveloppe={enveloppe}
      enfant={({ id: idChamp, decrit }: Liaison) => (
        <input
          {...reste}
          id={idChamp}
          ref={ref}
          className={[styles.saisie, erreur !== undefined ? styles.saisieErreur : ''].filter(Boolean).join(' ')}
          aria-describedby={decrit}
          aria-invalid={erreur !== undefined || undefined}
        />
      )}
    />
  );
});

export interface ZoneTexteProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'aria-describedby'>,
    SocleProps {}

export const ZoneTexte = forwardRef<HTMLTextAreaElement, ZoneTexteProps>(function ZoneTexte(
  { label, erreur, aide, requis, enveloppe, rows = 4, ...reste },
  ref,
) {
  const id = useId();

  return (
    <Enveloppe
      id={id}
      label={label}
      erreur={erreur}
      aide={aide}
      requis={requis}
      enveloppe={enveloppe}
      enfant={({ id: idZone, decrit }: Liaison) => (
        <textarea
          {...reste}
          id={idZone}
          rows={rows}
          ref={ref}
          className={[styles.saisie, styles.zone, erreur !== undefined ? styles.saisieErreur : ''].filter(Boolean).join(' ')}
          aria-describedby={decrit}
          aria-invalid={erreur !== undefined || undefined}
        />
      )}
    />
  );
});