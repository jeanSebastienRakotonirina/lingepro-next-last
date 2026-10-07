import { openPrintWindow } from '@/lib/printDoc';
import { buildTaskSheetHtml } from '@/lib/documents';
'use client';

import { useEffect, useState } from 'react';

const TYPE_LABEL = {
  traitement: 'Traitement',
  lavage_kg: 'Lavage (kg)',
  sechage_kg: 'Séchage (kg)',
  calandre: 'Calandre',
  foltext: 'Foltext',
};

const PIECE_CATALOG = [
  { sku: 'DB-STD', name: 'Drap de bain' },
  { sku: 'TB-STD', name: 'Tapis de bain' },
  { sku: 'ST-STD', name: 'Serviette de toilette' },
  { sku: 'SB-STD', name: 'Serviette de bain' },
  { sku: 'TO-CAR', name: "Taie d'oreiller carrée" },
  { sku: 'TO-REC', name: "Taie d'oreiller rectangulaire" },
  { sku: 'DR-STD', name: 'Drap plat' },
  { sku: 'DH-STD', name: 'Drap housse' },
  { sku: 'HC-STD', name: 'Housse de couette' },
  { sku: 'TAB-CU', name: 'Tablier cuisinier' },
  { sku: 'STAB', name: 'Serviette de table' },
  { sku: 'NAP-STD', name: 'Nappe de table' },
  { sku: 'HV-GIL', name: 'Gilet HV' },
  { sku: 'HV-PAN', name: 'Pantalon HV' },
  { sku: 'HV-VES', name: 'Veste HV' },
  { sku: 'HV-BAN', name: 'Bande HV' },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('todo');
  const [form, setForm] = useState(null); // { orderId, orderNumber, qty: {}, washKg, dryKg }
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [user, setUser] = useState(null);
  const [editTask, setEditTask] = useState(null);

  function load() {
    fetch('/api/tasks').then((r) => r.json()).then((d) => setTasks(d.tasks || []));
    fetch('/api/orders').then((r) => r.json()).then((d) => setOrders(d.orders || []));
  }

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setUser(d.user));
    load();
  }, []);

  async function removeTask(id) {
    if (!confirm('Supprimer cette tâche ?')) return;
    await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' });
    load();
  }

  async function saveTask(e) {
    e.preventDefault();
    await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editTask._id, label: editTask.label, status: editTask.status, notes: editTask.notes }),
    });
    setEditTask(null);
    load();
  }

  function printTaskSheet(o) {
    const related = tasks.filter((x) => x.orderId === o._id || x.orderNumber === o.number);
    openPrintWindow(buildTaskSheetHtml(o, related), 'Atelier ' + o.number);
  }

  function openSaisie(orderId, orderNumber, requestedItems) {
    const qty = {};
    PIECE_CATALOG.forEach((c) => { qty[c.sku] = 0; });
    (requestedItems || []).forEach((i) => {
      if (qty[i.sku] !== undefined) qty[i.sku] = 0;
    });
    setForm({ orderId, orderNumber, qty, washKg: '', dryKg: '', machineWash: 'L80', machineDry: 'S80', machineFold: 'FOLTEXT', machineIron: 'GIRBAU' });
    setMsg('');
  }

  function setQ(sku, n) {
    const v = Math.max(0, Math.min(9999, Number.isFinite(n) ? n : 0));
    setForm((f) => ({ ...f, qty: { ...f.qty, [sku]: v } }));
  }

  async function submitSaisie(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const processedItems = PIECE_CATALOG
        .filter((c) => (form.qty[c.sku] || 0) > 0)
        .map((c) => ({
          sku: c.sku,
          qty: form.qty[c.sku],
          unit: 'piece',
          machine: form.machineFold,
          machineType: 'foltext',
        }));
      const kgEntries = [];
      if (Number(form.washKg) > 0) {
        kgEntries.push({ name: 'Lavage', qty: Number(form.washKg), machine: form.machineWash, machineType: 'lave_linge', sku: 'WASH-KG' });
      }
      if (Number(form.dryKg) > 0) {
        kgEntries.push({ name: 'Séchage', qty: Number(form.dryKg), machine: form.machineDry, machineType: 'sechoir', sku: 'DRY-KG' });
      }
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: form.orderId,
          action: 'record_quantities',
          processedItems,
          kgEntries,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setMsg(data.message || 'Quantités enregistrées');
      setForm(null);
      load();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deliver(orderId) {
    if (!confirm('Marquer comme livré ? Cela génère le BL (sans tarifs) et la facture (avec TVA).')) return;
    const res = await fetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: orderId, action: 'deliver' }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Erreur');
      return;
    }
    alert(data.message || `BL ${data.deliveryNumber} · Facture ${data.invoiceNumber || ''}`);
    load();
  }

  const filtered = tasks.filter((t) => (filter === 'all' ? true : t.status === filter));
  const pendingOrders = orders.filter((o) => ['pending', 'in_progress', 'quantities_recorded'].includes(o.status));

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Tâches atelier</h1>
      <p className="text-sm text-slate-500 mb-4">
        Saisissez les quantités traitées : <strong>pièces</strong> (Foltext / calandres) et <strong>kg</strong> (lave-linge / séchoirs).
        Puis marquez livré pour générer BL + facture.
      </p>
      {msg && <div className="mb-3 rounded-xl bg-brand-50 text-brand-800 text-sm px-3 py-2">{msg}</div>}

      <h2 className="font-semibold text-sm mb-2">Commandes à traiter</h2>
      <div className="space-y-2 mb-6">
        {pendingOrders.map((o) => (
          <div key={o._id} className="card">
            <div className="font-medium text-sm">{o.number} — {o.clientName}</div>
            <div className="text-xs text-slate-500 mb-2">
              {(o.requestedItems || []).map((i) => i.name).join(', ') || '—'} · statut : {o.status}
            </div>
            <div className="text-xs text-brand-700 mb-2">
              Atelier : {o.taskDueDate ? new Date(o.taskDueDate).toLocaleDateString('fr-FR') : '—'} (veille)
              {' · '}
              Livraison : {o.pickupDate ? new Date(o.pickupDate).toLocaleDateString('fr-FR') : '—'} (lendemain)
            </div>
            <div className="flex flex-wrap gap-2">
              {o.status !== 'quantities_recorded' && o.status !== 'delivered' && (
                <>
                  <button
                    type="button"
                    className="btn-primary text-xs"
                    onClick={() => openSaisie(o._id, o.number, o.requestedItems)}
                  >
                    Saisir quantités
                  </button>
                  <button type="button" className="btn-secondary text-xs" onClick={() => printTaskSheet(o)}>
                    PDF atelier
                  </button>
                </>
              )}
              {o.status === 'quantities_recorded' && (
                <button type="button" className="btn-primary text-xs" onClick={() => deliver(o._id)}>
                  Marquer livré → BL + Facture
                </button>
              )}
              {o.processedItems?.length > 0 && (
                <span className="text-xs text-slate-400 self-center">
                  {o.processedItems.length} ligne(s) saisie(s)
                </span>
              )}
            </div>
          </div>
        ))}
        {pendingOrders.length === 0 && <p className="text-slate-400 text-sm">Aucune commande en attente</p>}
      </div>

      <div className="flex gap-2 mb-3 flex-wrap">
        {['todo', 'doing', 'done', 'all'].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${filter === f ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200'}`}
          >
            {f === 'todo' ? 'À faire' : f === 'doing' ? 'En cours' : f === 'done' ? 'Terminées' : 'Toutes'}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {filtered.map((t) => (
          <div key={t._id} className="card text-sm">
            <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-xs mr-2">{TYPE_LABEL[t.type] || t.type}</span>
            {t.label}
            <div className="text-xs text-slate-400 mt-1">
              {t.clientName} · {t.status}
              {t.dueDate && <> · À faire le <strong>{new Date(t.dueDate).toLocaleDateString('fr-FR')}</strong> (veille)</>}
            </div>
            {user?.role === 'admin' && (
              <div className="flex gap-2 mt-2">
                <button type="button" className="btn-primary text-xs" onClick={() => setEditTask({ ...t })}>Éditer</button>
                <button type="button" className="btn-danger text-xs" onClick={() => removeTask(t._id)}>Supprimer</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal saisie quantités */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex justify-between items-center">
              <h2 className="font-bold text-sm">Saisie — {form.orderNumber}</h2>
              <button type="button" className="text-xl px-2" onClick={() => setForm(null)}>×</button>
            </div>
            <form onSubmit={submitSaisie} className="p-4 space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Pièces (Foltext / calandres)</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {PIECE_CATALOG.map((c) => (
                    <div key={c.sku} className="flex items-center gap-2">
                      <div className="flex-1 text-sm truncate">{c.name}</div>
                      <button type="button" className="w-8 h-8 border rounded-lg" onClick={() => setQ(c.sku, (form.qty[c.sku] || 0) - 1)}>−</button>
                      <input
                        type="number"
                        min={0}
                        className="w-14 text-center input py-1 px-0"
                        value={form.qty[c.sku] || 0}
                        onChange={(e) => setQ(c.sku, parseInt(e.target.value, 10) || 0)}
                      />
                      <button type="button" className="w-8 h-8 border rounded-lg" onClick={() => setQ(c.sku, (form.qty[c.sku] || 0) + 1)}>+</button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Lavage (kg)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    className="input"
                    value={form.washKg}
                    onChange={(e) => setForm({ ...form, washKg: e.target.value })}
                    placeholder="0"
                  />
                  <select className="input mt-1 text-xs" value={form.machineWash} onChange={(e) => setForm({ ...form, machineWash: e.target.value })}>
                    <option value="L80">Lave-linge 80 kg</option>
                    <option value="L60-1">Lave-linge 60 kg #1</option>
                    <option value="L60-2">Lave-linge 60 kg #2</option>
                    <option value="L60-3">Lave-linge 60 kg #3</option>
                    <option value="L45">Lave-linge 45 kg</option>
                  </select>
                </div>
                <div>
                  <label className="label">Séchage (kg)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    className="input"
                    value={form.dryKg}
                    onChange={(e) => setForm({ ...form, dryKg: e.target.value })}
                    placeholder="0"
                  />
                  <select className="input mt-1 text-xs" value={form.machineDry} onChange={(e) => setForm({ ...form, machineDry: e.target.value })}>
                    <option value="S80">Séchoir 80 kg</option>
                    <option value="S60-1">Séchoir 60 kg #1</option>
                    <option value="S60-2">Séchoir 60 kg #2</option>
                    <option value="S42">Séchoir 42 kg</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => setForm(null)}>Annuler</button>
                <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? '…' : 'Enregistrer quantités'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={saveTask} className="card w-full max-w-md space-y-3">
            <h2 className="font-bold">Éditer la tâche</h2>
            <div>
              <label className="label">Libellé</label>
              <input className="input" value={editTask.label || ''} onChange={(e) => setEditTask({ ...editTask, label: e.target.value })} />
            </div>
            <div>
              <label className="label">Statut</label>
              <select className="input" value={editTask.status} onChange={(e) => setEditTask({ ...editTask, status: e.target.value })}>
                <option value="todo">À faire</option>
                <option value="doing">En cours</option>
                <option value="done">Terminée</option>
              </select>
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={editTask.notes || ''} onChange={(e) => setEditTask({ ...editTask, notes: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setEditTask(null)}>Annuler</button>
              <button type="submit" className="btn-primary flex-1">Enregistrer</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
