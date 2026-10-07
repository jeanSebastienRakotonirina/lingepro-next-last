'use client';

import { useEffect, useState } from 'react';
import { openPrintWindow } from '@/lib/printDoc';
import { buildInvoiceHtml } from '@/lib/documents';

export default function InvoicesPage() {
  const [list, setList] = useState([]);
  const [user, setUser] = useState(null);
  const [edit, setEdit] = useState(null);
  const [paypal, setPaypal] = useState(null);
  const [payMsg, setPayMsg] = useState('');
  const isAdmin = user?.role === 'admin';
  const showPrices = user?.role === 'admin' || user?.role === 'client';

  function load() {
    fetch('/api/invoices').then((r) => r.json()).then((d) => setList(d.invoices || []));
  }

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setUser(d.user));
    fetch('/api/paypal').then((r) => r.json()).then(setPaypal).catch(() => {});
    load();
  }, []);

  if (user && user.role !== 'admin' && user.role !== 'client') {
    return <div className="card text-sm text-slate-600">Factures (prix & TVA) réservées à l&apos;admin et au client.</div>;
  }

  async function payDemo(inv) {
    setPayMsg('');
    const r = await fetch('/api/paypal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId: inv._id, demo: true }),
    });
    const d = await r.json();
    setPayMsg(d.message || d.error || '');
    if (r.ok) load();
  }

  async function saveEdit(e) {
    e.preventDefault();
    await fetch('/api/invoices', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: edit._id,
        status: edit.status,
        notes: edit.notes,
        totalHT: edit.totalHT,
        totalTVA: edit.totalTVA,
        totalTTC: edit.totalTTC,
        clientName: edit.clientName,
        paymentStatus: edit.paymentStatus,
        address: { street: edit.street || '', postalCode: edit.postalCode || '', city: edit.city || '' },
        items: edit.items || [],
      }),
    });
    setEdit(null);
    load();
  }

  async function remove(id) {
    if (!confirm('Supprimer cette facture ?')) return;
    await fetch(`/api/invoices?id=${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-2">Factures</h1>
      <p className="text-sm text-slate-500 mb-4">
        Détail quantités, prix HT, TVA 20 %, TTC — admin & client.
        {paypal?.demo && ' Paiement PayPal en mode démo disponible.'}
        {paypal?.clientId && ' PayPal sandbox configuré.'}
      </p>
      {payMsg && <p className="text-sm text-brand-700 mb-2">{payMsg}</p>}
      <div className="space-y-3">
        {list.map((inv) => (
          <div key={inv._id} className="card">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <div className="font-semibold">{inv.number}</div>
                <div className="text-xs text-slate-500">
                  {inv.clientName} · {inv.orderNumber} · {inv.status}
                  {inv.paymentStatus && inv.paymentStatus !== 'unpaid' && ` · paiement ${inv.paymentStatus}`}
                </div>
              </div>
              {showPrices && (
                <div className="text-right">
                  <div className="font-bold text-brand-700">{Number(inv.totalTTC || 0).toFixed(2)} € TTC</div>
                  <div className="text-[10px] text-slate-400">
                    HT {Number(inv.totalHT || 0).toFixed(2)} · TVA {Number(inv.totalTVA || 0).toFixed(2)}
                  </div>
                </div>
              )}
            </div>
            {showPrices && (inv.items || []).length > 0 && (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-400">
                      <th className="pr-2">Article</th>
                      <th>Qté</th>
                      <th>P.U.</th>
                      <th>HT</th>
                      <th>TVA</th>
                      <th>TTC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inv.items.map((i, idx) => (
                      <tr key={idx} className="border-t border-slate-50">
                        <td className="py-1">{i.name}</td>
                        <td>{i.qty}</td>
                        <td>{Number(i.unitPrice || 0).toFixed(2)}</td>
                        <td>{Number(i.lineHT || 0).toFixed(2)}</td>
                        <td>{Number(i.lineTVA || 0).toFixed(2)}</td>
                        <td>{Number(i.lineTTC || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={() => openPrintWindow(buildInvoiceHtml(inv), inv.number)}
              >
                PDF / Imprimer
              </button>
              {showPrices && inv.paymentStatus !== 'paid' && inv.status !== 'paid' && (
                <button type="button" className="btn-primary text-xs" onClick={() => payDemo(inv)}>
                  💳 Payer avec PayPal{paypal?.demo ? ' (démo)' : ''}
                </button>
              )}
              {isAdmin && (
                <>
                  <button
                    type="button"
                    className="btn-primary text-xs"
                    onClick={() =>
                      setEdit({
                        ...inv,
                        street: inv.address?.street || '',
                        postalCode: inv.address?.postalCode || '',
                        city: inv.address?.city || '',
                      })
                    }
                  >
                    Éditer
                  </button>
                  <button type="button" className="btn-danger text-xs" onClick={() => remove(inv._id)}>
                    Supprimer
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="text-slate-400 text-sm">Aucune facture</p>}
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
                <option value="draft">Brouillon</option>
                <option value="sent">Émise</option>
                <option value="paid">Payée</option>
                <option value="cancelled">Annulée</option>
              </select>
            </div>
            <div>
              <label className="label">Paiement</label>
              <select className="input" value={edit.paymentStatus || 'unpaid'} onChange={(e) => setEdit({ ...edit, paymentStatus: e.target.value })}>
                <option value="unpaid">Impayé</option>
                <option value="pending">En cours</option>
                <option value="paid">Payé</option>
                <option value="refunded">Remboursé</option>
              </select>
            </div>
            <div>
              <label className="label">Lignes (qté / P.U. modifiables)</label>
              <div className="space-y-1 max-h-36 overflow-y-auto text-xs">
                {(edit.items || []).map((it, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_4rem_4rem] gap-1 items-center">
                    <span className="truncate">{it.name}</span>
                    <input type="number" className="input" value={it.qty ?? 0} onChange={(e) => {
                      const items = [...(edit.items || [])];
                      const qty = Number(e.target.value) || 0;
                      const unitPrice = Number(it.unitPrice) || 0;
                      const lineHT = Math.round(qty * unitPrice * 100) / 100;
                      items[idx] = { ...it, qty, lineHT, lineTVA: Math.round(lineHT * 0.2 * 100) / 100, lineTTC: Math.round(lineHT * 1.2 * 100) / 100 };
                      setEdit({ ...edit, items });
                    }} />
                    <input type="number" step="0.01" className="input" value={it.unitPrice ?? 0} onChange={(e) => {
                      const items = [...(edit.items || [])];
                      const unitPrice = Number(e.target.value) || 0;
                      const qty = Number(it.qty) || 0;
                      const lineHT = Math.round(qty * unitPrice * 100) / 100;
                      items[idx] = { ...it, unitPrice, lineHT, lineTVA: Math.round(lineHT * 0.2 * 100) / 100, lineTTC: Math.round(lineHT * 1.2 * 100) / 100 };
                      setEdit({ ...edit, items });
                    }} />
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="label">HT</label>
                <input className="input" type="number" step="0.01" value={edit.totalHT ?? 0} onChange={(e) => setEdit({ ...edit, totalHT: e.target.value })} />
              </div>
              <div>
                <label className="label">TVA</label>
                <input className="input" type="number" step="0.01" value={edit.totalTVA ?? 0} onChange={(e) => setEdit({ ...edit, totalTVA: e.target.value })} />
              </div>
              <div>
                <label className="label">TTC</label>
                <input className="input" type="number" step="0.01" value={edit.totalTTC ?? 0} onChange={(e) => setEdit({ ...edit, totalTTC: e.target.value })} />
              </div>
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
