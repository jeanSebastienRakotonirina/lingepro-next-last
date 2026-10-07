export default function HelpPage() {
  return (
    <div className="prose prose-sm max-w-none">
      <h1 className="text-xl font-bold mb-4">Aide — flux Text&apos;eau</h1>
      <div className="card space-y-4 text-sm text-slate-700">
        <section>
          <h2 className="font-semibold">1. Commande client</h2>
          <p>Cochez les <strong>intitulés</strong> des produits (cases à cocher), sans indiquer de quantités. Adresse de livraison + valider → tâches atelier créées.</p>
        </section>
        <section>
          <h2 className="font-semibold">2. Opérateur — saisie</h2>
          <p>Dans <strong>Tâches atelier</strong> : saisir le nombre de <strong>pièces</strong> traitées (Foltext, calandres Girbau/Danube) et les <strong>kg</strong> en lave-linge / séchoirs.</p>
        </section>
        <section>
          <h2 className="font-semibold">3. Livraison</h2>
          <p>Bouton <strong>Marquer livré</strong> → génère automatiquement :</p>
          <ul className="list-disc pl-5">
            <li><strong>Bon de livraison</strong> : quantités uniquement, sans tarifs</li>
            <li><strong>Facture</strong> : détail, prix HT, TVA 20 %, TTC — visible admin et client seulement</li>
          </ul>
        </section>
        <section>
          <h2 className="font-semibold">Rôles</h2>
          <p>Opérateur / livreur ne voient pas les montants ni les factures. Admin et client voient CA et factures.</p>
        </section>
      </div>
    </div>
  );
}
