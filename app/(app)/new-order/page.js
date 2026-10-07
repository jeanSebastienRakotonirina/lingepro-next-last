'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewOrderPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [clients, setClients] = useState([]);
  const [mode, setMode] = useState('checkbox'); // checkbox | quantities
  const [selected, setSelected] = useState({}); // sku -> true or qty
  const [clientId, setClientId] = useState('');
  const [notes, setNotes] = useState('');
  const [express, setExpress] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const isStaff = user && ['admin', 'operateur'].includes(user.role);
  const canChooseMode = user && (user.role === 'admin' || user.role === 'client');

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setUser(d.user));
    fetch('/api/tariffs').then((r) => r.json()).then((d) => setCatalog(d.catalog || []));
    fetch('/api/users').then((r) => r.json()).then((d) => {
      setClients((d.users || []).filter((u) => u.role === 'client'));
    }).catch(() => {});
  }, []);

  function toggleSku(sku) {
    setSelected((prev) => {
      const next = { ...prev };
      if (mode === 'checkbox') {
        if (next[sku]) delete next[sku];
        else next[sku] = true;
      } else {
        // quantities mode handled by input
      }
      return next;
    });
  }

  function setQty(sku, qty) {
    setSelected((prev) => {
      const next = { ...prev };
      const n = Number(qty);
      if (!n || n <= 0) delete next[sku];
      else next[sku] = n;
      return next;
    });
  }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    const skus = Object.keys(selected);
    if (!skus.length) {
      setMsg('Sélectionnez au moins un produit');
      setLoading(false);
      return;
    }
    const body = {
      skus: mode === 'checkbox' ? skus : skus,
      orderMode: mode,
      notes,
      express,
      promoCode: promoCode || undefined,
      clientId: isStaff && clientId ? clientId : undefined,
    };
    // Si mode quantités : envoyer aussi les quantités demandées (indicatif)
    if (mode === 'quantities') {
      body.requestedQuantities = skus.map((sku) => ({
        sku,
        qty: Number(selected[sku]) || 0,
      }));
    }
    const r = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    setLoading(false);
    if (!r.ok) {
      setMsg(d.error || 'Erreur');
      return;
    }
    setMsg(d.message || 'Commande créée');
    setTimeout(() => router.push('/orders'), 800);
  }

  const byCat = catalog.reduce((acc, c) => {
    const k = c.category || 'autre';
    if (!acc[k]) acc[k] = [];
    acc[k].push(c);
    return acc;
  }, {});

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Nouvelle commande</h1>
      <p className="text-sm text-slate-500 mb-4">
        {mode === 'checkbox'
          ? 'Cochez les produits — les quantités seront saisies à l’atelier.'
          : 'Indiquez les quantités souhaitées (indicatif) — l’opérateur confirmera le traité.'}
      </p>

      {canChooseMode && (
        <div className="card mb-4 flex flex-wrap gap-3 items-center">
          <span className="text-sm font-medium">Mode de commande :</span>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="mode"
              checked={mode === 'checkbox'}
              onChange={() => { setMode('checkbox'); setSelected({}); }}
            />
            Cases à cocher (sans nombre)
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="mode"
              checked={mode === 'quantities'}
              onChange={() => { setMode('quantities'); setSelected({}); }}
            />
            Avec quantités indicatives
          </label>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        {isStaff && (
          <div className="card">
            <label className="label">Client</label>
            <select className="input" value={clientId} onChange={(e) => setClientId(e.target.value)} required={isStaff}>
              <option value="">— Choisir —</option>
              {clients.map((c) => (
                <option key={c._id} value={c._id}>{c.name} ({c.email})</option>
              ))}
            </select>
          </div>
        )}

        {Object.entries(byCat).map(([cat, items]) => (
          <div key={cat} className="card">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-slate-500 mb-3">{cat}</h2>
            <div className="space-y-2">
              {items.map((c) => (
                <label key={c.sku} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  {mode === 'checkbox' ? (
                    <input
                      type="checkbox"
                      checked={!!selected[c.sku]}
                      onChange={() => toggleSku(c.sku)}
                      className="w-5 h-5"
                    />
                  ) : (
                    <input
                      type="number"
                      min="0"
                      className="input w-20"
                      placeholder="0"
                      value={selected[c.sku] || ''}
                      onChange={(e) => setQty(c.sku, e.target.value)}
                    />
                  )}
                  <span className="flex-1 text-sm">{c.name}</span>
                  {c.unitPrice != null && (
                    <span className="text-xs text-slate-400">{Number(c.unitPrice).toFixed(2)} € HT</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        ))}

        <div className="card space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={express} onChange={(e) => setExpress(e.target.checked)} />
            Express (+15 % — score éco réduit)
          </label>
          <div>
            <label className="label">Code promo (ex: ECO10, FIDELITE)</label>
            <input className="input" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} placeholder="Optionnel" />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        {msg && <p className="text-sm text-brand-700">{msg}</p>}
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Envoi…' : 'Valider la commande'}
        </button>
      </form>
    </div>
  );
}
