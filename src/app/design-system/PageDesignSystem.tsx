'use client';

/**
 * La page `/design-system` — catalogue visuel de Relio.
 *
 * ## Ce que cette page est, et ce qu'elle n'est pas
 *
 * Elle montre **tous les états** de chaque composant : c'est sa raison d'être.
 * Un composant présenté seulement dans son état par défaut n'apprend rien, et le
 * premier écran où l'on découvre un état « désactivé » ou « chargement » est
 * presque toujours le pire moment pour le découvrir.
 *
 * Elle ne remplace pas une revue sur appareil : elle documente, elle ne valide
 * pas. Le contraste affiché est calculé et exact ; la taille réelle des cibles
 * tactiles, non.
 *
 * ## Elle reste une page interne
 *
 * Aucun contenu pédagogique ici. Les textes sont des exemples de libellés, et
 * non des énoncés : afficher un vrai exercice dans un catalogue de composants
 * ferait dgiter sur cette page ce que le dépôt interdit ailleurs.
 */

import { useState } from 'react';

import { Avatar } from '@/components/ds/Avatar';
import { BarreProgression } from '@/components/ds/BarreProgression';
import { AnneauProgression } from '@/components/ds/AnneauProgression';
import { Bouton } from '@/components/ds/Bouton';
import { BoutonIcone } from '@/components/ds/BoutonIcone';
import { Carte } from '@/components/ds/Carte';
import { EtatVide } from '@/components/ds/EtatVide';
import { Feuille } from '@/components/ds/Feuille';
import { Icone, type NomIcone } from '@/components/ds/Icone';
import { Champ, ZoneTexte } from '@/components/ds/Input';
import { Pastille, type TonPastille } from '@/components/ds/Pastille';
import { Puce } from '@/components/ds/Puce';
import { Squelette } from '@/components/ds/Skeleton';
import { BasculeTheme } from '@/components/ds/Theme';
import {
  COULEURS_MARQUE,
  DUREES,
  ESPACEMENTS,
  GRAISSES,
  PALETTE_CLAIRE,
  PALETTE_SOMBRE,
  RAYONS,
  TAILLES_TEXTE,
} from '@/design/tokens';
import { contrasteArrondi } from '@/design/contraste';
import styles from './design-system.module.css';

const ICONES: NomIcone[] = ['check', 'alerte', 'info', 'croix', 'chevron', 'lumiere', 'lune', 'rafraichir', 'indice', 'cible', 'temps', 'donnees'];

const TONS: TonPastille[] = ['neutre', 'succes', 'alerte', 'accent', 'primaire'];

const LIBELLES_TONS: Record<TonPastille, string> = {
  neutre: 'À venir',
  succes: 'Réussi',
  alerte: 'À revoir',
  accent: 'Indice',
  primaire: 'En cours',
};

/** Bloc de démonstration : un titre, une description, les exemples. */
function Section({
  titre,
  description,
  children,
  id,
}: {
  titre: string;
  description: string;
  children: React.ReactNode;
  id: string;
}) {
  return (
    <section className={styles.section} id={id} aria-labelledby={`${id}-titre`}>
      <h2 className={styles.sectionTitre} id={`${id}-titre`}>
        {titre}
      </h2>
      <p className={styles.sectionDescription}>{description}</p>
      <div className={styles.grille}>{children}</div>
    </section>
  );
}

export function PageDesignSystem() {
  const [feuilleOuverte, setFeuilleOuverte] = useState(false);
  const [champErreur, setChampErreur] = useState(false);

  return (
    <main className={styles.page}>
      <header className={styles.entete}>
        <div>
          <p className={styles.surtitre}>Relio — document interne</p>
          <h1 className={styles.titre}>Design system</h1>
          <p className={styles.chapo}>
            Contrat visuel du produit. Tout écran ajouté doit se comparer à cette
            page, pas la redéfinir.
          </p>
        </div>
        <BasculeTheme />
      </header>

      {/* --- Couleurs ------------------------------------------------------- */}
      <Section
        id="couleurs"
        titre="Couleurs"
        description="Les rôles, pas les teintes. Une couleur de marque ne s'utilise jamais directement comme fond de texte : c'est le rôle qui porte le contraste."
      >
        <Carte className={styles.bloc}>
          <h3 className={styles.sousTitre}>Rôles, mode clair</h3>
          <div className={styles.nuances}>
            {(Object.entries(PALETTE_CLAIRE) as Array<[string, string]>).map(([role, valeur]) => (
              <div className={styles.nuance} key={role}>
                <span className={styles.pastilleCouleur} style={{ background: valeur }} />
                <span className={styles.nuanceTexte}>
                  <strong>{role}</strong>
                  <code>{valeur}</code>
                </span>
              </div>
            ))}
          </div>
        </Carte>

        <Carte className={styles.bloc}>
          <h3 className={styles.sousTitre}>Rôles, mode sombre</h3>
          <div className={styles.nuances}>
            {(Object.entries(PALETTE_SOMBRE) as Array<[string, string]>).map(([role, valeur]) => (
              <div className={styles.nuance} key={role}>
                <span className={styles.pastilleCouleur} style={{ background: valeur }} />
                <span className={styles.nuanceTexte}>
                  <strong>{role}</strong>
                  <code>{valeur}</code>
                </span>
              </div>
            ))}
          </div>
        </Carte>

        <Carte className={styles.bloc}>
          <h3 className={styles.sousTitre}>Couleurs de marque</h3>
          <div className={styles.nuances}>
            {(Object.entries(COULEURS_MARQUE) as Array<[string, string]>).map(([nom, valeur]) => (
              <div className={styles.nuance} key={nom}>
                <span className={styles.pastilleCouleur} style={{ background: valeur }} />
                <span className={styles.nuanceTexte}>
                  <strong>{nom}</strong>
                  <code>{valeur}</code>
                </span>
              </div>
            ))}
          </div>
        </Carte>
      </Section>

      {/* --- Contrastes mesurés --------------------------------------------- */}
      <Section
        id="contraste"
        titre="Contrastes mesurés"
        description="Calculés avec la formule WCAG, pas estimés à l'œil. AA exige 4,5:1 pour un texte courant et 3:1 pour un grand texte ou un élément d'interface."
      >
        <Carte className={styles.bloc}>
          <table className={styles.tableau}>
            <caption className={styles.caption}>
              Seuil AA : texte courant 4,5:1 · grand texte et interface 3:1
            </caption>
            <thead>
              <tr>
                <th scope="col">Fond</th>
                <th scope="col">Texte</th>
                <th scope="col">Ratio</th>
                <th scope="col">AA texte</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ['texte / fond', PALETTE_CLAIRE.texte, PALETTE_CLAIRE.fond],
                  ['secondaire / fond', PALETTE_CLAIRE.texteSecondaire, PALETTE_CLAIRE.fond],
                  ['primaire', PALETTE_CLAIRE.primaireSur, PALETTE_CLAIRE.primaire],
                  ['accent', PALETTE_CLAIRE.accentSur, PALETTE_CLAIRE.accent],
                  ['succes', PALETTE_CLAIRE.succesSur, PALETTE_CLAIRE.succes],
                  ['alerte', PALETTE_CLAIRE.alerteSur, PALETTE_CLAIRE.alerte],
                  ['sombre — texte / fond', PALETTE_SOMBRE.texte, PALETTE_SOMBRE.fond],
                  ['sombre — accent', PALETTE_SOMBRE.accentSur, PALETTE_SOMBRE.accent],
                ] as Array<[string, string, string]>
              ).map(([nom, texte, fond]) => {
                const ratio = contrasteArrondi(fond, texte);
                return (
                  <tr key={nom}>
                    <th scope="row">{nom}</th>
                    <td>
                      <code>{texte}</code> sur <code>{fond}</code>
                    </td>
                    <td className={styles.ratio}>{ratio} : 1</td>
                    <td>{ratio >= 4.5 ? '✓' : '✗'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Carte>
      </Section>

      {/* --- Typographie ----------------------------------------------------- */}
      <Section
        id="typographie"
        titre="Typographie"
        description="Police système uniquement : aucune police externe n'est téléchargée. Sur une connexion 3G, une police de 200 Ko est le premier élément que l'élève attend."
      >
        <Carte className={styles.bloc}>
          <h3 className={styles.sousTitre}>Échelle</h3>
          <div className={styles.typo}>
            {(Object.entries(TAILLES_TEXTE) as Array<[string, number]>).map(([nom, valeur]) => (
              <p key={nom} style={{ fontSize: `${valeur}px` }}>
                {valeur} px — {nom}
              </p>
            ))}
          </div>
        </Carte>

        <Carte className={styles.bloc}>
          <h3 className={styles.sousTitre}>Graisses</h3>
          <div className={styles.typo}>
            {(Object.entries(GRAISSES) as Array<[string, number]>).map(([nom, valeur]) => (
              <p key={nom} style={{ fontWeight: valeur }}>
                {valeur} — {nom}
              </p>
            ))}
          </div>
          <p className={styles.note}>
            Le corps du texte est à 16 px : en dessous, iOS réduit la police et
            zoome la page au focus.
          </p>
        </Carte>
      </Section>

      {/* --- Espacements, rayons, ombres, durées ---------------------------- */}
      <Section
        id="metriques"
        titre="Espacements, rayons, ombres, durées"
        description="Base 4 px. Trois niveaux d'ombre seulement : une ombre par densité donne une hiérarchie lisible, cinq donnent du flou."
      >
        <Carte className={styles.bloc}>
          <h3 className={styles.sousTitre}>Espacements</h3>
          <div className={styles.mesures}>
            {(Object.entries(ESPACEMENTS) as Array<[string, number]>).map(([nom, valeur]) => (
              <div className={styles.mesure} key={nom}>
                <span className={styles.mesureBarre} style={{ width: `${valeur}px` }} />
                <code>{nom} — {valeur} px</code>
              </div>
            ))}
          </div>
        </Carte>

        <Carte className={styles.bloc}>
          <h3 className={styles.sousTitre}>Rayons</h3>
          <div className={styles.mesures}>
            {(Object.entries(RAYONS) as Array<[string, number]>).map(([nom, valeur]) => (
              <div className={styles.mesure} key={nom}>
                <span
                  className={styles.mesureCoin}
                  style={{ width: '48px', height: '48px', borderRadius: `${valeur}px` }}
                />
                <code>{nom} — {valeur} px</code>
              </div>
            ))}
          </div>
        </Carte>

        <Carte className={styles.bloc}>
          <h3 className={styles.sousTitre}>Ombres</h3>
          <div className={styles.mesures}>
            {(['sm', 'md', 'lg'] as const).map((nom) => (
              <div className={styles.mesure} key={nom}>
                <span className={styles.mesureOmbre} style={{ boxShadow: `var(--relio-ombre-${nom})` }} />
                <code>{nom}</code>
              </div>
            ))}
          </div>
          <p className={styles.note}>
            En mode économie de données, les trois sont remplacées par une
            bordure : même information, moins d'octets et moins de GPU.
          </p>
        </Carte>

        <Carte className={styles.bloc}>
          <h3 className={styles.sousTitre}>Durées</h3>
          <div className={styles.mesures}>
            {(Object.entries(DUREES) as Array<[string, number]>).map(([nom, valeur]) => (
              <div className={styles.mesure} key={nom}>
                <code>
                  {nom} — {valeur} ms
                </code>
              </div>
            ))}
          </div>
        </Carte>
      </Section>

      {/* --- Bouton ---------------------------------------------------------- */}
      <Section
        id="bouton"
        titre="Bouton"
        description="Une seule action principale par écran visible. Les trois tailles font au moins 44 px de haut : la taille du texte ne détermine pas la zone tactile."
      >
        <Carte className={styles.bloc}>
          <h3 className={styles.sousTitre}>Variantes</h3>
          <div className={styles.rangee}>
            <Bouton>Principal</Bouton>
            <Bouton variante="secondary">Secondaire</Bouton>
            <Bouton variante="ghost">Discret</Bouton>
            <Bouton variante="danger">DANGER</Bouton>
          </div>
        </Carte>

        <Carte className={styles.bloc}>
          <h3 className={styles.sousTitre}>Tailles</h3>
          <div className={styles.rangee}>
            <Bouton taille="sm">Petit</Bouton>
            <Bouton taille="md">Moyen</Bouton>
            <Bouton taille="lg">Grand</Bouton>
          </div>
        </Carte>

        <Carte className={styles.bloc}>
          <h3 className={styles.sousTitre}>États</h3>
          <div className={styles.rangee}>
            <Bouton>Défaut</Bouton>
            <Bouton disabled>Désactivé</Bouton>
            <Bouton chargement>Chargement</Bouton>
            <Bouton icone="check">Avec icône</Bouton>
          </div>
          <p className={styles.note}>
            Pendant le chargement, le bouton est indisponible et déclaré
            <code> aria-busy</code>. Le libellé reste visible : la mise en page ne
            saute pas, et l'élève sait ce qui se passe.
          </p>
        </Carte>

        <Carte className={styles.bloc}>
          <h3 className={styles.sousTitre}>Bouton icône</h3>
          <div className={styles.rangee}>
            <BoutonIcone nom="rafraichir" label="Actualiser" />
            <BoutonIcone nom="indice" label="Demander un indice" variante="discret" />
            <BoutonIcone nom="croix" label="Fermer" variante="plein" />
            <BoutonIcone nom="cible" label="Réussite" taille="lg" />
          </div>
          <p className={styles.note}>
            Le libellé est obligatoire dans l'API : une icône seule serait
            annoncée comme « bouton », sans dire quoi.
          </p>
        </Carte>
      </Section>

      {/* --- Carte, pastille, puce ------------------------------------------- */}
      <Section
        id="surfaces"
        titre="Carte, pastille, puce"
        description="Une pastille décrit un état ; une puce sert à choisir. Une action passe par un bouton. Les trois portent toujours du texte : la couleur seule ne dit rien à tout le monde."
      >
        <Carte className={styles.bloc}>
          <h3 className={styles.sousTitre}>Carte</h3>
          <Carte variante="elevee" bordure>
            <p>Une carte contient une idée. Deux cartes imbriquées sur 360 px donnent un empilement illisible.</p>
          </Carte>
          <div className={styles.rangee} style={{ marginTop: 12 }}>
            <Carte padding="sm">Petit</Carte>
            <Carte padding="md">Moyen</Carte>
            <Carte padding="lg">Grand</Carte>
          </div>
        </Carte>

        <Carte className={styles.bloc}>
          <h3 className={styles.sousTitre}>Pastille</h3>
          <div className={styles.rangee}>
            {TONS.map((ton) => (
              <Pastille key={ton} ton={ton}>
                {LIBELLES_TONS[ton]}
              </Pastille>
            ))}
          </div>
        </Carte>

        <Carte className={styles.bloc}>
          <h3 className={styles.sousTitre}>Puce</h3>
          <div className={styles.rangee}>
            <Puce active>Calcul littéral</Puce>
            <Puce>Racines carrées</Puce>
            <Puce>Calcul numérique</Puce>
            <Puce fixe>Terminé</Puce>
          </div>
          <p className={styles.note}>
            L'état sélectionné est porté par le fond, la graisse et{' '}
            <code>aria-pressed</code> — jamais par la couleur seule.
          </p>
        </Carte>
      </Section>

      {/* --- Progression ----------------------------------------------------- */}
      <Section
        id="progression"
        titre="Progression"
        description="Barre pour « sur combien », anneau pour « où dans le tour ». Aucun des deux ne doit servir à afficher un score d'exercice : le projet l'interdit."
      >
        <Carte className={styles.bloc}>
          <h3 className={styles.sousTitre}>Barre</h3>
          <BarreProgression valeur={35} label="Bloc 1 — 1 leçon sur 3" afficherValeur />
          <div style={{ marginTop: 16 }}>
            <BarreProgression valeur={70} ton="succes" />
          </div>
          <div style={{ marginTop: 16 }}>
            <BarreProgression valeur={100} ton="accent" />
          </div>
        </Carte>

        <Carte className={styles.bloc}>
          <h3 className={styles.sousTitre}>Anneau</h3>
          <div className={styles.rangee}>
            <AnneauProgression valeur={25} />
            <AnneauProgression valeur={66} ton="succes" />
            <AnneauProgression valeur={100} ton="accent" />
          </div>
        </Carte>
      </Section>

      {/* --- Champs ---------------------------------------------------------- */}
      <Section
        id="champs"
        titre="Champs de saisie"
        description="L'étiquette, l'aide et l'erreur sont reliées au champ par les attributs ARIA. L'erreur est annoncée de façon interrompante : l'élève doit l'entendre sans la chercher."
      >
        <Carte className={styles.bloc}>
          <Champ label="Ta réponse" placeholder="Une expression" aide="Tu peux utiliser les lettres et les opérations." />
        </Carte>

        <Carte className={styles.bloc}>
          <Champ
            label="Ta réponse"
            placeholder="Une expression"
            erreur={champErreur ? 'Ce symbole n’est pas reconnu. Vérifie ton écriture.' : undefined}
            requis
          />
          <div style={{ marginTop: 12 }}>
            <Bouton variante="secondary" taille="sm" onClick={() => setChampErreur(!champErreur)}>
              {champErreur ? 'Retirer l’erreur' : 'Afficher une erreur'}
            </Bouton>
          </div>
        </Carte>

        <Carte className={styles.bloc}>
          <ZoneTexte
            label="Ton explication"
            rows={4}
            placeholder="Explique ce que tu as fait, en quelques mots."
            aide="Deux ou trois phrases suffisent."
          />
        </Carte>
      </Section>

      {/* --- Avatar, squelette, état vide ------------------------------------ */}
      <Section
        id="etats"
        titre="Avatar, squelette, état vide"
        description="Aucune image de profil ni illustration bitmap : une initiale et une icône SVG pèsent zéro octet et n'attendent aucun réseau."
      >
        <Carte className={styles.bloc}>
          <h3 className={styles.sousTitre}>Avatar</h3>
          <div className={styles.rangee}>
            <Avatar nom="Aline" taille="sm" />
            <Avatar nom="Bertrand" taille="md" />
            <Avatar nom="Clarisse" taille="lg" />
          </div>
          <p className={styles.note}>
            La couleur découle du nom : le même nom donne toujours la même
            teinte, pour que l’élève retrouve sa pastille d’un exercice à
            l’autre.
          </p>
        </Carte>

        <Carte className={styles.bloc}>
          <h3 className={styles.sousTitre}>Squelette</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Squelette lignes={3} />
            <div className={styles.rangee}>
              <Squelette largeur={56} hauteur={56} rond />
              <Squelette largeur={120} hauteur={32} />
            </div>
          </div>
          <p className={styles.note}>
            Sans animation : une pulsation infinie garde le processeur éveillé
            pendant tout le chargement, c’est-à-dire au moment où il doit faire
            autre chose.
          </p>
        </Carte>

        <Carte className={styles.bloc}>
          <EtatVide
            titre="Aucun exercice dans ce bloc pour le moment"
            description="Ce bloc s’ouvrira plus tard dans l’année. Tu peux continuer avec le bloc précédent."
            icone="info"
            action="Retour au parcours"
            onAction={() => undefined}
          />
        </Carte>
      </Section>

      {/* --- Icônes ----------------------------------------------------------- */}
      <Section
        id="icones"
        titre="Icônes"
        description="SVG en ligne, trait de 2 px sur une grille de 24 px. Une icône sans titre est décorative et disparaît du parcours de lecture."
      >
        <Carte className={styles.bloc}>
          <div className={styles.rangeeIcones}>
            {ICONES.map((nom) => (
              <div className={styles.iconeCase} key={nom}>
                <Icone nom={nom} taille={24} />
                <code>{nom}</code>
              </div>
            ))}
          </div>
        </Carte>
      </Section>

      {/* --- Feuille et notifications ---------------------------------------- */}
      <Section
        id="superpositions"
        titre="Feuille et notifications"
        description="Une notification confirme après une action ; elle ne demande rien. Si l'élève doit choisir, c'est une feuille — une notification qui disparaît pendant qu'on la lit est un piège."
      >
        <Carte className={styles.bloc}>
          <h3 className={styles.sousTitre}>Feuille glissante</h3>
          <Bouton variante="secondary" onClick={() => setFeuilleOuverte(true)}>
            Ouvrir la feuille
          </Bouton>
          <p className={styles.note}>
            <code>Échap</code> ferme, le focus entre dans la feuille et y reste
            piégé tant qu’elle est ouverte, et il revient sur le bouton
            d’origine à la fermeture.
          </p>
        </Carte>
      </Section>

      <Feuille
        ouverte={feuilleOuverte}
        titre="Choisir une réponse"
        onFermer={() => setFeuilleOuverte(false)}
        pied={
          <Bouton onClick={() => setFeuilleOuverte(false)} pleineLargeur>
            Fermer
          </Bouton>
        }
      >
        <p>
          Une feuille remonte du bas plutôt que de se centrer : sur un écran de
          360 px, une boîte centrée mange la moitié de l’espace et masque le
          contenu.
        </p>
      </Feuille>
    </main>
  );
}