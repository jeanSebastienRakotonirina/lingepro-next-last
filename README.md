# LingePro / Text'eau — Blanchisserie professionnelle (Next.js)

## Stack
- Next.js 14 (App Router) + Tailwind CSS **3.4.17**
- MongoDB + Mongoose
- JWT auth, rôles : admin / operateur / livreur / client

## Workflow
1. Client coche les produits (sans quantités) → commande
2. Tâches atelier créées automatiquement (**date = veille** de la livraison)
3. Opérateur saisit quantités (pièces / kg machines)
4. Marquer livré → **BL** (sans prix) + **facture** (HT/TVA/TTC) — livraison **lendemain**
5. Prix visibles admin + client uniquement

## Démarrage
```bash
cp .env.example .env
# MONGODB_URI, JWT_SECRET
npm install
npm run seed    # utilisateurs mock + fix index code_1
npm run dev     # nodemon + next dev
```

Ouvrir http://localhost:3000

### Comptes seed
| Email | Mot de passe | Rôle |
|-------|--------------|------|
| demo@lingepro.fr | Demo123! | admin |
| marie@lingepro.fr | Op1234! | operateur |
| paul@lingepro.fr | Drv123! | livreur |
| contact@legourmet.fr | Cli123! | client |

## Scripts
- `npm run dev` — développement (nodemon)
- `npm run build` / `npm start` — production
- `npm run seed` — seed + correction index MongoDB

## Notes
- Tailwind **3.4.17** (pas v4) — voir postcss.config.js
- Admin : Éditer / Supprimer sur commandes, BL, factures, tâches, messages, users

## Nouveautés v2.3
- **Documents rôle** : factures détaillées HT/TVA/TTC (admin/client) ; BL & fiches atelier quantités seules (opérateur/livreur)
- **Tarifs admin** : page `/tariffs` — modification prix HT
- **Commande** : choix case à cocher **ou** quantités indicatives (admin + client)
- **PayPal** : paiement facture (mode démo sans clés, ou sandbox via `PAYPAL_CLIENT_ID`)
- **Fidélité** : points = euros TTC à chaque paiement
- **Score éco** & express sur commandes
