'use client';

import { useEffect, useMemo, useState } from 'react';

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const PIE_COLORS = ['#0ea5e9', '#0369a1', '#38bdf8', '#7dd3fc', '#0284c7', '#075985', '#bae6fd', '#0c4a6e'];

/** Camembert SVG */
function PieChart({ slices, size = 200 }) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;
  let angle = -Math.PI / 2;
  const paths = slices.map((sl, i) => {
    const a = (sl.value / total) * Math.PI * 2;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    angle += a;
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    const large = a > Math.PI ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    return { d, color: PIE_COLORS[i % PIE_COLORS.length], label: sl.label, value: sl.value, pct: (sl.value / total) * 100 };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill={p.color} stroke="#fff" strokeWidth="2">
            <title>{`${p.label}: ${p.value.toFixed(0)} € (${p.pct.toFixed(0)} %)`}</title>
          </path>
        ))}
      </svg>
      <ul className="text-sm space-y-1.5 w-full">
        {paths.map((p, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: p.color }} />
            <span className="flex-1 truncate">{p.label}</span>
            <span className="font-medium tabular-nums">{p.value.toFixed(0)} €</span>
            <span className="text-slate-400 text-xs w-10 text-right">{p.pct.toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Courbe avec points */
function LineChart({ values, labels, height = 180 }) {
  const max = Math.max(...values, 1);
  const pad = { t: 16, r: 12, b: 28, l: 40 };
  const w = 600;
  const h = height;
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const pts = values.map((v, i) => {
    const x = pad.l + (i / Math.max(values.length - 1, 1)) * innerW;
    const y = pad.t + innerH - (v / max) * innerH;
    return { x, y, v, label: labels[i] };
  });
  const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const area = `${pad.l},${pad.t + innerH} ${polyline} ${pts[pts.length - 1]?.x || pad.l},${pad.t + innerH}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {/* grille */}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => {
        const y = pad.t + innerH * (1 - f);
        return (
          <g key={f}>
            <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="#e2e8f0" strokeWidth="1" />
            <text x={pad.l - 6} y={y + 3} textAnchor="end" className="fill-slate-400" style={{ fontSize: 10 }}>
              {Math.round(max * f)}
            </text>
          </g>
        );
      })}
      <polygon points={area} fill="rgba(14,165,233,0.12)" />
      <polyline points={polyline} fill="none" stroke="#0ea5e9" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4.5" fill="#fff" stroke="#0284c7" strokeWidth="2" />
          <title>{`${p.label}: ${p.v.toFixed(0)} €`}</title>
          <text x={p.x} y={h - 8} textAnchor="middle" className="fill-slate-500" style={{ fontSize: 10 }}>
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** Bâtonnets de progression */
function BarChart({ values, labels }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-1.5 sm:gap-2 h-48 pt-2">
      {values.map((v, i) => {
        const pct = Math.max(v > 0 ? 6 : 2, (v / max) * 100);
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1 min-w-0">
            <span className="text-[9px] text-slate-500 tabular-nums truncate w-full text-center">
              {v > 0 ? `${Math.round(v)}` : ''}
            </span>
            <div
              className="w-full max-w-[36px] mx-auto rounded-t-md bg-gradient-to-t from-sky-700 to-sky-400 transition-all"
              style={{ height: `${pct}%` }}
              title={`${labels[i]}: ${v.toFixed(2)} €`}
            />
            <span className="text-[9px] sm:text-[10px] text-slate-500">{labels[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function FinancePage() {
  const [data, setData] = useState(null);
  const [chart, setChart] = useState('bars'); // bars | pie | line

  useEffect(() => {
    fetch('/api/finance')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ error: 'Erreur chargement' }));
  }, []);

  const pieSlices = useMemo(() => {
    if (!data) return [];
    if (data.topClients?.length) {
      return data.topClients.map((c) => ({ label: c.name, value: c.total }));
    }
    return [
      { label: 'Payé', value: data.paid || 0 },
      { label: 'Impayé', value: data.unpaid || 0 },
    ].filter((s) => s.value > 0);
  }, [data]);

  if (!data) return <p className="text-slate-400">Chargement…</p>;
  if (data.error) return <p className="text-red-600">{data.error}</p>;

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Finances / CA</h1>
      <p className="text-sm text-slate-500 mb-4">
        Vue administrateur — chiffre d&apos;affaires, encaissements et clients.
        {data.demo && (
          <span className="ml-1 text-amber-600">(données de démonstration — créez des factures pour du réel)</span>
        )}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card">
          <div className="text-xs text-slate-500">CA mois</div>
          <div className="text-xl font-bold text-brand-700">{Number(data.caMonth || 0).toFixed(2)} €</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500">CA année</div>
          <div className="text-xl font-bold">{Number(data.caYear || 0).toFixed(2)} €</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500">Encaissé</div>
          <div className="text-xl font-bold text-emerald-600">{Number(data.paid || 0).toFixed(2)} €</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500">Impayés</div>
          <div className="text-xl font-bold text-amber-600">{Number(data.unpaid || 0).toFixed(2)} €</div>
        </div>
      </div>

      {/* Sélecteur de graphique */}
      <div className="flex flex-wrap gap-2 mb-3">
        {[
          { id: 'bars', label: 'Bâtonnets' },
          { id: 'line', label: 'Courbe' },
          { id: 'pie', label: 'Camembert' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setChart(t.id)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium border ${
              chart === t.id
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card mb-6">
        <h2 className="font-semibold text-sm mb-3">
          {chart === 'bars' && 'CA mensuel (bâtonnets)'}
          {chart === 'line' && 'CA cumulé (courbe à points)'}
          {chart === 'pie' && 'Répartition (camembert)'}
        </h2>

        {chart === 'bars' && (
          <BarChart values={data.byMonth || Array(12).fill(0)} labels={MONTHS} />
        )}
        {chart === 'line' && (
          <LineChart
            values={data.cumulative?.length ? data.cumulative : (data.byMonth || []).reduce((acc, v) => {
              const last = acc.length ? acc[acc.length - 1] : 0;
              acc.push(last + v);
              return acc;
            }, [])}
            labels={MONTHS}
          />
        )}
        {chart === 'pie' && (
          pieSlices.length ? (
            <PieChart slices={pieSlices} />
          ) : (
            <p className="text-sm text-slate-400">Pas encore de données pour le camembert.</p>
          )
        )}
      </div>

      {/* Barres de progression payé / impayé */}
      <div className="card mb-6">
        <h2 className="font-semibold text-sm mb-3">Progression encaissement</h2>
        {(() => {
          const total = (data.paid || 0) + (data.unpaid || 0) || 1;
          const pctPaid = Math.round(((data.paid || 0) / total) * 100);
          return (
            <>
              <div className="h-4 rounded-full bg-slate-100 overflow-hidden flex">
                <div className="bg-emerald-500 h-full transition-all" style={{ width: `${pctPaid}%` }} title={`Payé ${pctPaid}%`} />
                <div className="bg-amber-400 h-full flex-1" title="Impayé" />
              </div>
              <div className="flex justify-between text-xs mt-2 text-slate-600">
                <span>Payé {Number(data.paid || 0).toFixed(2)} € ({pctPaid} %)</span>
                <span>Impayé {Number(data.unpaid || 0).toFixed(2)} €</span>
              </div>
            </>
          );
        })()}
      </div>

      <div className="card">
        <h2 className="font-semibold text-sm mb-3">Top clients</h2>
        <ul className="space-y-2">
          {(data.topClients || []).map((c) => {
            const maxT = data.topClients[0]?.total || 1;
            const w = Math.round((c.total / maxT) * 100);
            return (
              <li key={c.name} className="text-sm">
                <div className="flex justify-between mb-0.5">
                  <span className="truncate pr-2">{c.name}</span>
                  <span className="font-medium tabular-nums shrink-0">{c.total.toFixed(2)} €</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-sky-500 rounded-full" style={{ width: `${w}%` }} />
                </div>
              </li>
            );
          })}
          {!(data.topClients || []).length && (
            <li className="text-slate-400 text-sm">Aucun client facturé pour l’instant</li>
          )}
        </ul>
        <p className="text-[10px] text-slate-400 mt-3">
          {data.orderCount || 0} commande(s) · {data.invoiceCount || 0} facture(s)
        </p>
      </div>
    </div>
  );
}
