'use client';

import { useEffect, useState } from 'react';

export default function MessagesPage() {
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [user, setUser] = useState(null);
  const [edit, setEdit] = useState(null);
  const isAdmin = user?.role === 'admin';

  function load() {
    fetch('/api/messages').then((r) => r.json()).then((d) => setMessages(d.messages || []));
  }

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setUser(d.user));
    load();
  }, []);

  async function send(e) {
    e.preventDefault();
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    });
    setBody('');
    load();
  }

  async function saveEdit(e) {
    e.preventDefault();
    await fetch('/api/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: edit._id, body: edit.body }),
    });
    setEdit(null);
    load();
  }

  async function remove(id) {
    if (!confirm('Supprimer ce message ?')) return;
    await fetch(`/api/messages?id=${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Messages</h1>
      <form onSubmit={send} className="card flex gap-2 mb-4">
        <input className="input flex-1" placeholder="Votre message…" value={body} onChange={(e) => setBody(e.target.value)} required />
        <button type="submit" className="btn-primary">Envoyer</button>
      </form>
      <div className="space-y-2">
        {messages.map((m) => (
          <div key={m._id} className="card text-sm">
            <div className="text-xs text-slate-400 mb-1">
              {m.fromName} · {m.createdAt ? new Date(m.createdAt).toLocaleString('fr-FR') : ''}
            </div>
            <div className="mb-2">{m.body}</div>
            {isAdmin && (
              <div className="flex gap-2">
                <button type="button" className="btn-primary text-xs" onClick={() => setEdit({ ...m })}>Éditer</button>
                <button type="button" className="btn-danger text-xs" onClick={() => remove(m._id)}>Supprimer</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={saveEdit} className="card w-full max-w-md space-y-3">
            <h2 className="font-bold">Éditer le message</h2>
            <textarea className="input" rows={4} value={edit.body || ''} onChange={(e) => setEdit({ ...edit, body: e.target.value })} />
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
