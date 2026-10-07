'use client';

import { useEffect, useState } from 'react';

export default function GarmentsPage() {
  const [list, setList] = useState([]);
  const [user, setUser] = useState(null);
  const [label, setLabel] = useState('Gilet HV');
  const [maxWashes, setMaxWashes] = useState(50);
  const [edit, setEdit] = useState(null);

  function load() {
    fetch('/api/garments').then((r) => r.json()).then((d) => setList(d.garments || []));
  }

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setUser(d.user));
    load();
  }, []);

  async function create(e) {
    e.preventDefault();
    await fetch('/api/garments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, maxWashes }),
    });
    setLabel('Gilet HV');
    load();
  }

  async function increment(id) {
    await fetch('/api/garments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, incrementWash: true }),
    });
    load();
  }

  async function retire(id) {
    await fetch('/api/garments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, retire: true }),
    });
    load();
  }

  async function remove(id) {
    if (user?.role !== 'admin') return;
    if (!confirm('Supprimer ?')) return;
    await fetch(`/api/garments?id=${id}`, { method: 'DELETE' });
    load();
  }

  async function saveEdit(e) {
    e.preventDefault();
    await fetch('/api/garments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: edit._id,
        label: edit.label,
        type: edit.type,
        maxWashes: Number(edit.maxWashes) || 50,
        washCount: Number(edit.washCount) || 0,
        status: edit.status,
        notes: edit.notes,
        clientName: edit.clientName,
      }),
    });
    setEdit(null);
    load();
  }

  const alerts = list.filter((g) => ['attention', 'critique', 'hors_service'].includes(g.status));
  const colors = {
    ok: 'bg-emerald-100 text-emerald-800',
    attention: 'bg-amber-100 text-amber-800',
    critique: 'bg-orange-100 text-orange-800',
    hors_service: 'bg-red-100 text-red-800',
  };
  const canEdit = user?.role === 'admin' || user?.role === 'operateur';

  return (
    <div>
      <h1 className="text-xl font-bold mb-2">Vêtements réfléchissants</h1>
      <p className="text-sm text-slate-500 mb-4">Suivi des cycles de lavage (ex. 50 max).</p>

      {alerts.length > 0 && (
        <div className="card border-amber-200 bg-amber-50 mb-4 text-sm">
          <strong>{alerts.length}</strong> pièce(s) en alerte ou hors service.
        </div>
      )}

      {(user?.role === 'admin' || user?.role === 'client') && (
        <form onSubmit={create} className="card flex flex-wrap gap-2 items-end mb-6">
          <div className="flex-1 min-w-[8rem]">
            <label className="label">Libellé</label>
            <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} required />
          </div>
          <div className="w-28">
            <label className="label">Max lavages</label>
            <input className="input" type="number" min="1" value={maxWashes} onChange={(e) => setMaxWashes(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary">Ajouter</button>
        </form>
      )}

      <div className="space-y-2">
        {list.map((g) => (
          <div key={g._id} className="card">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <div className="font-medium">{g.label || g.type} <span className="text-xs text-slate-400">{g.code}</span></div>
                <div className="text-xs text-slate-500">{g.clientName} · {g.washCount || 0}/{g.maxWashes || 50} lavages</div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full h-fit ${colors[g.status] || colors.ok}`}>{g.status}</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <button type="button" className="btn-secondary text-xs" onClick={() => increment(g._id)}>+1 lavage</button>
              {g.status !== 'hors_service' && (
                <button type="button" className="btn-secondary text-xs" onClick={() => retire(g._id)}>Retirer</button>
              )}
              {canEdit && (
                <button type="button" className="btn-primary text-xs" onClick={() => setEdit({ ...g })}>Éditer</button>
              )}
              {user?.role === 'admin' && (
                <button type="button" className="btn-danger text-xs" onClick={() => remove(g._id)}>Supprimer</button>
              )}
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="text-slate-400 text-sm">Aucun vêtement suivi</p>}
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={saveEdit} className="card w-full max-w-md space-y-3 max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold">Éditer {edit.code || edit.label}</h2>
            <div>
              <label className="label">Libellé</label>
              <input className="input" value={edit.label || ''} onChange={(e) => setEdit({ ...edit, label: e.target.value })} />
            </div>
            <div>
              <label className="label">Type</label>
              <input className="input" value={edit.type || ''} onChange={(e) => setEdit({ ...edit, type: e.target.value })} />
            </div>
            <div>
              <label className="label">Client</label>
              <input className="input" value={edit.clientName || ''} onChange={(e) => setEdit({ ...edit, clientName: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Lavages effectués</label>
                <input className="input" type="number" min="0" value={edit.washCount ?? 0} onChange={(e) => setEdit({ ...edit, washCount: e.target.value })} />
              </div>
              <div>
                <label className="label">Max lavages</label>
                <input className="input" type="number" min="1" value={edit.maxWashes ?? 50} onChange={(e) => setEdit({ ...edit, maxWashes: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Statut</label>
              <select className="input" value={edit.status || 'ok'} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
                <option value="ok">OK</option>
                <option value="attention">Attention</option>
                <option value="critique">Critique</option>
                <option value="hors_service">Hors service</option>
              </select>
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={edit.notes || ''} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setEdit(null)}>Annuler</button>
              <button type="submit" className="btn-primary flex-1">Enregistrer</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
