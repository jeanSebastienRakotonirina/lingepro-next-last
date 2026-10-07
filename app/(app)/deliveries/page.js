'use client';

import { useEffect, useState } from 'react';
import { openPrintWindow } from '@/lib/printDoc';
import { buildDeliveryHtml } from '@/lib/documents';

export default function DeliveriesPage() {
  const [list, setList] = useState([]);
  const [user, setUser] = useState(null);
  const [edit, setEdit] = useState(null);
  const isAdmin = user?.role === 'admin';

  function load() {
    fetch('/api/deliveries').then((r) => r.json()).then((d) => setList(d.deliveries || []));
  }

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setUser(d.user));
    load();
  }, []);

  function printBL(d) {
    openPrintWindow(buildDeliveryHtml(d), d.number);
  }

  async function saveEdit(e) {
    e.preventDefault();
    await fetch('/api/deliveries', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: edit._id,
        status: edit.status,
        notes: edit.notes,
        clientName: edit.clientName,
        address: { street: edit.street || '', postalCode: edit.postalCode || '', city: edit.city || '' },
        scheduledDate: edit.scheduledDate || undefined,
      }),
    });
    setEdit(null);
    load();
  }

  async function remove(id) {
    if (!confirm('Supprimer ce BL ?')) return;
    await fetch(`/api/deliveries?id=${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-2">Bons de livraison</h1>
      <p className="text-sm text-slate-500 mb-4">Quantités uniquement, sans tarifs.</p>
      <div className="space-y-3">
        {list.map((d) => (
          <div key={d._id} className="card">
            <div className="font-semibold">{d.number}</div>
            <div className="text-xs text-slate-500 mb-2">
              {d.orderNumber} · {d.clientName} · {d.status}
              {d.scheduledDate && (
                <> · Livraison le <strong>{new Date(d.scheduledDate).toLocaleDateString('fr-FR')}</strong></>
              )}
            </div>
            <ul className="text-sm text-slate-600 mb-2">
              {(d.items || []).map((i, idx) => (
                <li key={idx}>{i.qty} {i.unit === 'kg' ? 'kg' : '×'} {i.name}</li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary text-xs" onClick={() => printBL(d)}>PDF / Imprimer</button>
              {isAdmin && (
                <>
                  <button
                    type="button"
                    className="btn-primary text-xs"
                    onClick={() =>
                      setEdit({
                        ...d,
                        street: d.address?.street || '',
                        postalCode: d.address?.postalCode || '',
                        city: d.address?.city || '',
                        scheduledDate: d.scheduledDate ? new Date(d.scheduledDate).toISOString().slice(0, 16) : '',
                      })
                    }
                  >
                    Éditer
                  </button>
                  <button type="button" className="btn-danger text-xs" onClick={() => remove(d._id)}>Supprimer</button>
                </>
              )}
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="text-slate-400 text-sm">Aucun BL</p>}
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={saveEdit} className="card w-full max-w-md space-y-3 max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold">Éditer {edit.number}</h2>
            <div>
              <label className="label">Client</label>
              <input className="input" value={edit.clientName || ''} onChange={(e) => setEdit({ ...edit, clientName: e.target.value })} />
            </div>
            <div>
              <label className="label">Statut</label>
              <select className="input" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
                <option value="planned">Planifiée</option>
                <option value="in_transit">En cours</option>
                <option value="delivered">Livrée</option>
                <option value="cancelled">Annulée</option>
              </select>
            </div>
            <div>
              <label className="label">Rue</label>
              <input className="input" value={edit.street} onChange={(e) => setEdit({ ...edit, street: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">CP</label>
                <input className="input" value={edit.postalCode} onChange={(e) => setEdit({ ...edit, postalCode: e.target.value })} />
              </div>
              <div>
                <label className="label">Ville</label>
                <input className="input" value={edit.city} onChange={(e) => setEdit({ ...edit, city: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Date planifiée</label>
              <input className="input" type="datetime-local" value={edit.scheduledDate} onChange={(e) => setEdit({ ...edit, scheduledDate: e.target.value })} />
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
