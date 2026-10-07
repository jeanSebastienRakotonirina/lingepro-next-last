import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Order, Invoice } from '@/lib/models';
import { getSession, isAdmin } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!isAdmin(session)) return NextResponse.json({ error: 'Admin uniquement' }, { status: 403 });
  await connectDB();

  const orders = await Order.find({ status: { $ne: 'cancelled' } }).lean();
  const invoices = await Invoice.find({ status: { $ne: 'cancelled' } }).lean();
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  let caMonth = 0;
  let caYear = 0;
  const byMonth = Array(12).fill(0);
  const byClient = {};
  let paid = 0;
  let unpaid = 0;

  // CA depuis factures (plus fiable) sinon commandes livrées
  const source = invoices.length
    ? invoices.map((inv) => ({
        total: Number(inv.totalTTC) || 0,
        date: inv.createdAt || inv.paidAt,
        client: inv.clientName || 'Inconnu',
        paid: inv.paymentStatus === 'paid' || inv.status === 'paid',
      }))
    : orders
        .filter((o) => o.status === 'delivered' || (o.totalTTC || 0) > 0)
        .map((o) => ({
          total: Number(o.totalTTC) || 0,
          date: o.deliveredAt || o.createdAt,
          client: o.clientName || 'Inconnu',
          paid: o.paymentStatus === 'paid',
        }));

  for (const row of source) {
    const d = new Date(row.date || now);
    const t = row.total;
    if (d.getFullYear() === y) {
      caYear += t;
      byMonth[d.getMonth()] += t;
      if (d.getMonth() === m) caMonth += t;
    }
    byClient[row.client] = (byClient[row.client] || 0) + t;
    if (row.paid) paid += t;
    else unpaid += t;
  }

  // Si aucune donnée réelle : série de démo pour visualiser les graphiques
  let demo = false;
  if (caYear === 0 && byMonth.every((v) => v === 0)) {
    demo = true;
    const demoVals = [1200, 1450, 980, 2100, 1800, 2300, 1950, 2500, 2200, 2700, 2400, 1600];
    for (let i = 0; i < 12; i++) byMonth[i] = demoVals[i];
    caMonth = byMonth[m];
    caYear = byMonth.reduce((a, b) => a + b, 0);
    paid = Math.round(caYear * 0.72);
    unpaid = Math.round(caYear * 0.28);
    byClient['Restaurant Le Gourmet'] = 4200;
    byClient['Hôtel de la Baie'] = 3800;
    byClient['Clinique Ker Ys'] = 2900;
    byClient['Spa Océane'] = 2100;
  }

  const topClients = Object.entries(byClient)
    .map(([name, total]) => ({ name, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  // Cumul pour courbe
  let run = 0;
  const cumulative = byMonth.map((v) => {
    run += v;
    return Math.round(run * 100) / 100;
  });

  return NextResponse.json({
    caMonth: Math.round(caMonth * 100) / 100,
    caYear: Math.round(caYear * 100) / 100,
    unpaid: Math.round(unpaid * 100) / 100,
    paid: Math.round(paid * 100) / 100,
    byMonth: byMonth.map((v) => Math.round(v * 100) / 100),
    cumulative,
    topClients,
    orderCount: orders.length,
    invoiceCount: invoices.length,
    demo,
  });
}
