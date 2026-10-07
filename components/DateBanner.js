'use client';

import { useEffect, useState } from 'react';

/** Date du jour affichée sur chaque page de l'application */
export default function DateBanner() {
  const [label, setLabel] = useState('');

  useEffect(() => {
    const d = new Date();
    setLabel(
      d.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    );
  }, []);

  if (!label) return null;

  return (
    <div className="mb-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm text-slate-600">
      <span aria-hidden>📅</span>
      <span className="capitalize font-medium">{label}</span>
      <span className="text-slate-400">·</span>
      <span className="text-slate-500">Atelier = veille · Livraison = lendemain</span>
    </div>
  );
}
