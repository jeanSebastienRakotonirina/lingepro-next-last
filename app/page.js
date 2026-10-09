import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export const metadata = {
  title: "Text'eau / LingePro — Accueil",
  description: 'Application de gestion de blanchisserie professionnelle',
};

const ROLES = [
  {
    name: 'Administrateur',
    icon: '👑',
    points: [
      'Vue complète : utilisateurs, tarifs, finances / CA, messages',
      'Édition et suppression sur commandes, BL, factures, tâches',
      'Modification de la grille tarifaire HT',
      'Accès aux montants HT, TVA et TTC',
    ],
  },
  {
    name: 'Opérateur',
    icon: '🧺',
    points: [
      'Tâches atelier générées automatiquement à chaque commande',
      'Saisie des quantités traitées (pièces et kg machines)',
      'Fiches atelier et bons de livraison sans tarifs',
      'Suivi des vêtements réfléchissants (cycles de lavage)',
    ],
  },
  {
    name: 'Livreur',
    icon: '🚚',
    points: [
      'Consultation des bons de livraison (quantités uniquement)',
      'Pas d’accès aux prix ni aux factures',
      'Suivi du statut des tournées',
    ],
  },
  {
    name: 'Client',
    icon: '🏨',
    points: [
      'Passage de commande (cases à cocher ou quantités indicatives)',
      'Consultation de ses commandes, BL et factures',
      'Paiement en ligne (PayPal) et points de fidélité',
      'Messages vers l’équipe et suivi des pièces HV',
    ],
  },
];

const STEPS = [
  {
    n: '1',
    title: 'Commande',
    text: 'Le client (ou un administrateur pour un client) sélectionne les articles : cases à cocher sans nombre, ou quantités indicatives. Option express et code promo possibles.',
  },
  {
    n: '2',
    title: 'Tâches atelier (veille)',
    text: 'Dès validation, des tâches sont créées automatiquement. La date de traitement correspond à la veille de la livraison prévue.',
  },
  {
    n: '3',
    title: 'Saisie opérateur',
    text: 'L’opérateur enregistre les quantités réellement traitées : pièces (Foltext, calandres) et kilogrammes (lave-linge, séchoirs), avec préremplissage si des quantités avaient été indiquées.',
  },
  {
    n: '4',
    title: 'Livraison (lendemain)',
    text: 'Au marquage « livré », génération du bon de livraison (quantités, sans prix) et de la facture (détail HT, TVA 20 %, TTC) pour admin et client.',
  },
  {
    n: '5',
    title: 'Paiement & suivi',
    text: 'Le client peut régler la facture (PayPal). Points de fidélité crédités. L’admin suit le CA (courbes, bâtonnets, camembert) et les tarifs.',
  },
];

const FEATURES = [
  { title: 'Documents selon le rôle', text: 'Factures détaillées (admin / client). BL et fiches atelier en quantités seules (opérateur / livreur).' },
  { title: 'Parc machines', text: 'Lave-linge, séchoirs, calandres Girbau / Danube, Foltext — planification des charges.' },
  { title: 'Réfléchissants (HV)', text: 'Suivi du nombre de lavages restants avant mise hors service.' },
  { title: 'Tarifs & finances', text: 'Grille HT modifiable, TVA, graphiques de CA et top clients.' },
  { title: 'PayPal & fidélité', text: 'Paiement des factures et points proportionnels au TTC.' },
  { title: 'Aide & IA', text: 'Tutoriel, documentation et assistant de navigation intégrés.' },
];

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="bg-gradient-to-b from-sky-50 via-white to-slate-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <Image
              src="/logo-texteau.png"
              alt="Text'eau"
              width={220}
              height={64}
              className="h-14 sm:h-16 w-auto object-contain"
              priority
            />
            <div className="flex-1">
              <p className="text-[10px] sm:text-xs tracking-[0.2em] text-slate-400 uppercase mb-1">
                Le nettoyage nature
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                LingePro — Gestion de blanchisserie professionnelle
              </h1>
              <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl">
                Application web pour piloter commandes, atelier, livraisons, facturation et paiements,
                avec des droits adaptés à chaque métier de la blanchisserie.
              </p>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700"
            >
              Se connecter
            </Link>
            <a
              href="#fonctionnement"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Voir le fonctionnement
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-14">
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">À propos</h2>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 text-sm text-slate-600 space-y-3 leading-relaxed">
            <p>
              <strong className="text-slate-800">LingePro / Text&apos;eau</strong> centralise le cycle
              complet d&apos;une blanchisserie professionnelle : prise de commande, organisation de
              l&apos;atelier (lavage, séchage, calandrage, pliage), livraison, facturation et encaissement.
            </p>
            <p>
              Les <strong className="text-slate-800">prix et la TVA</strong> ne sont visibles que par
              l&apos;administrateur et le client. L&apos;opérateur et le livreur travaillent sur des
              documents centrés sur les <strong className="text-slate-800">quantités</strong> et les machines.
            </p>
            <p>
              Les dates suivent une règle métier simple : <strong className="text-slate-800">traitement atelier = veille</strong> de la
              livraison, <strong className="text-slate-800">livraison = lendemain</strong> de la commande (par défaut).
            </p>
          </div>
        </section>

        <section id="roles">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Les rôles</h2>
          <p className="text-sm text-slate-500 mb-4">
            Quatre profils, chacun avec un périmètre clair — sans partage des informations tarifaires inutiles.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {ROLES.map((r) => (
              <article
                key={r.name}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-3">
                  <span className="text-xl" aria-hidden>
                    {r.icon}
                  </span>
                  {r.name}
                </h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  {r.points.map((p) => (
                    <li key={p} className="flex gap-2">
                      <span className="text-sky-500 mt-0.5">•</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section id="fonctionnement">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Fonctionnement</h2>
          <p className="text-sm text-slate-500 mb-6">
            Du passage de commande à la facture payée, en cinq étapes automatisées.
          </p>
          <ol className="space-y-4">
            {STEPS.map((s) => (
              <li
                key={s.n}
                className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-600 text-sm font-bold text-white">
                  {s.n}
                </span>
                <div>
                  <h3 className="font-semibold text-slate-900">{s.title}</h3>
                  <p className="mt-1 text-sm text-slate-600 leading-relaxed">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Modules principaux</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-slate-200 bg-white p-4 text-sm"
              >
                <h3 className="font-semibold text-slate-900 mb-1">{f.title}</h3>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">Types d&apos;articles gérés</h2>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
            <p className="mb-3">
              Draps de bain, tapis de bain, serviettes, taies d&apos;oreiller, draps, housses de couette,
              tabliers, nappes, serviettes de table, et équipements haute visibilité (gilets, pantalons,
              vestes) avec limite de cycles de lavage.
            </p>
            <p className="text-xs text-slate-400">
              La grille tarifaire HT est configurable par l&apos;administrateur ; la TVA est appliquée à
              la facturation.
            </p>
          </div>
        </section>

        <section className="rounded-2xl bg-sky-600 text-white p-6 sm:p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Prêt à démarrer ?</h2>
          <p className="text-sky-100 text-sm mb-5 max-w-md mx-auto">
            Connectez-vous avec le compte fourni par votre administrateur pour accéder à votre espace
            selon votre rôle.
          </p>
          <Link
            href="/login"
            className="inline-flex rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-sky-700 hover:bg-sky-50"
          >
            Accéder à l&apos;application
          </Link>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        Text&apos;eau — LingePro · Blanchisserie professionnelle
      </footer>
    </div>
  );
}