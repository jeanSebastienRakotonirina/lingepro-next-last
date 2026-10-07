'use client';

import { useEffect, useState } from 'react';
import { openPrintWindow } from '@/lib/printDoc';
import { buildOrderHtml } from '@/lib/documents';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [user, setUser] = useState(null);
  const [edit, setEdit] = useState(null);
  const isAdmin = user?.role === 'admin';
  const showPrices = user?.role === 'admin' || user?.role === 'client';

  function load() {
    fetch('/api/orders').then((r) => r.json()).then((d) => setOrders(d.orders || []));
  }

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setUser(d.user));
    load();
  }, []);

  function printOrder(o) {
    openPrintWindow(buildOrderHtml(o, { showPrices }), o.number);
  }

  async function saveEdit(e) {
    e.preventDefault();
    await fetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: edit._id,
        status: edit.status,
        notes: edit.notes,
        clientName: edit.clientName,
        deliveryAddress: {
          street: edit.street || '',
          postalCode: edit.postalCode || '',
          city: edit.city || '',
        },
        pickupDate: edit.pickupDate || undefined,
      }),
    });
    setEdit(null);
    load();
  }

  async function remove(id) {
    if (!confirm('Supprimer cette commande et documents liés ?')) return;
    await fetch(`/api/orders?id=${id}`, { method: 'DELETE' });
    load();
  }

  async function cancel(id) {
    if (!confirm('Annuler la commande ?')) return;
    await fetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'cancel' }),
    });
    load();
  }

  async function deliver(id) {
    const r = await fetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'deliver' }),
    });
    const d = await r.json();
    if (!r.ok) alert(d.error || 'Erreur');
    else load();
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Commandes</h1>
      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o._id} className="card">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <div className="font-semibold">{o.number}</div>
                <div className="text-xs text-slate-500">{o.clientName} · {o.status}</div>
                <div className="text-xs text-slate-400">
                  {[o.deliveryAddress?.street, o.deliveryAddress?.postalCode, o.deliveryAddress?.city].filter(Boolean).join(', ')}
                </div>
                <div className="text-xs text-brand-700 mt-1">
                  Atelier (veille) : {o.taskDueDate ? new Date(o.taskDueDate).toLocaleDateString('fr-FR') : '—'}
                  {' · '}
                  Livraison (lendemain) : {o.pickupDate ? new Date(o.pickupDate).toLocaleDateString('fr-FR') : '—'}
                </div>
              </div>
              {showPrices && o.totalTTC > 0 && (
                <div className="font-bold text-brand-700">{Number(o.totalTTC).toFixed(2)} € TTC</div>
              )}
            </div>
            <ul className="text-sm text-slate-600 mt-2">
              {(o.requestedItems || []).map((i, idx) => (
                <li key={idx}>• {i.name}</li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2 mt-3">
              <button type="button" className="btn-secondary text-xs" onClick={() => printOrder(o)}>PDF / Imprimer</button>
              {isAdmin && (
                <>
                  <button
                    type="button"
                    className="btn-primary text-xs"
                    onClick={() =>
                      setEdit({
                        ...o,
                        street: o.deliveryAddress?.street || '',
                        postalCode: o.deliveryAddress?.postalCode || '',
                        city: o.deliveryAddress?.city || '',
                        pickupDate: o.pickupDate ? new Date(o.pickupDate).toISOString().slice(0, 16) : '',
                      })
                    }
                  >
                    Éditer
                  </button>
                  <button type="button" className="btn-danger text-xs" onClick={() => remove(o._id)}>Supprimer</button>
                </>
              )}
              {(user?.role === 'admin' || user?.role === 'operateur' || user?.role === 'livreur') &&
                o.status === 'quantities_recorded' && (
                  <button type="button" className="btn-primary text-xs" onClick={() => deliver(o._id)}>
                    Marquer livré
                  </button>
                )}
              {['pending', 'in_progress'].includes(o.status) && (
                <button type="button" className="btn-secondary text-xs" onClick={() => cancel(o._id)}>
                  Annuler
                </button>
              )}
            </div>
          </div>
        ))}
        {orders.length === 0 && <p className="text-slate-400 text-sm">Aucune commande</p>}
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
                <option value="pending">En attente</option>
                <option value="in_progress">En cours</option>
                <option value="quantities_recorded">Quantités saisies</option>
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
                <label className="label">Code postal</label>
                <input className="input" value={edit.postalCode} onChange={(e) => setEdit({ ...edit, postalCode: e.target.value })} />
              </div>
              <div>
                <label className="label">Ville</label>
                <input className="input" value={edit.city} onChange={(e) => setEdit({ ...edit, city: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Date livraison</label>
              <input className="input" type="datetime-local" value={edit.pickupDate} onChange={(e) => setEdit({ ...edit, pickupDate: e.target.value })} />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea className="input" rows={3} value={edit.notes || ''} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
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
