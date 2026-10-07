'use client';

import { useEffect, useState } from 'react';

export default function TariffsPage() {
  const [catalog, setCatalog] = useState([]);
  const [canEdit, setCanEdit] = useState(false);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    fetch('/api/tariffs')
      .then((r) => r.json())
      .then((d) => {
        setCatalog(d.catalog || []);
        setCanEdit(!!d.canEdit);
      });
  }

  useEffect(() => { load(); }, []);

  async function saveAll(e) {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    const r = await fetch('/api/tariffs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: catalog.map((c) => ({ sku: c.sku, name: c.name, unitPrice: c.unitPrice, active: true })),
      }),
    });
    setSaving(false);
    setMsg(r.ok ? 'Tarifs enregistrés' : 'Erreur');
    load();
  }

  async function reset() {
    if (!confirm('Réinitialiser les tarifs catalogue par défaut ?')) return;
    await fetch('/api/tariffs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset' }),
    });
    load();
    setMsg('Tarifs réinitialisés');
  }

  if (!canEdit && catalog.length && catalog[0].unitPrice === undefined) {
    return <div className="card text-sm">Tarifs masqués pour votre rôle.</div>;
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Grille tarifaire</h1>
      <p className="text-sm text-slate-500 mb-4">
        Prix HT unitaires. TVA 20 % appliquée à la facturation. Modifiable par l&apos;administrateur.
      </p>
      {msg && <p className="text-sm text-brand-700 mb-2">{msg}</p>}
      <form onSubmit={saveAll} className="space-y-2">
        <div className="overflow-x-auto card p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="p-3">SKU</th>
                <th className="p-3">Désignation</th>
                <th className="p-3">Catégorie</th>
                <th className="p-3">Prix HT (€)</th>
              </tr>
            </thead>
            <tbody>
              {catalog.map((c, idx) => (
                <tr key={c.sku} className="border-t border-slate-100">
                  <td className="p-2 font-mono text-xs">{c.sku}</td>
                  <td className="p-2">{c.name}</td>
                  <td className="p-2 text-slate-500">{c.category}</td>
                  <td className="p-2">
                    {canEdit ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="input w-28"
                        value={c.unitPrice ?? 0}
                        onChange={(e) => {
                          const next = [...catalog];
                          next[idx] = { ...c, unitPrice: e.target.value };
                          setCatalog(next);
                        }}
                      />
                    ) : (
                      <span>{Number(c.unitPrice || 0).toFixed(2)} €</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer les tarifs'}
            </button>
            <button type="button" className="btn-secondary" onClick={reset}>
              Réinitialiser défaut
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
