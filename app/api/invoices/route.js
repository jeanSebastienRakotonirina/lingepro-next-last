import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Invoice } from '@/lib/models';
import { getSession, isAdmin, isStaff, canSeePrices } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (!canSeePrices(session)) {
    return NextResponse.json({ error: 'Factures réservées admin / client', invoices: [] }, { status: 403 });
  }
  await connectDB();
  const filter = session.role === 'client' ? { clientId: session.id } : {};
  const invoices = await Invoice.find(filter).sort({ createdAt: -1 }).limit(200).lean();
  return NextResponse.json({ invoices });
}

export async function PATCH(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  await connectDB();
  const body = await req.json();
  const inv = await Invoice.findById(body.id);
  if (!inv) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  if (isAdmin(session)) {
    if (body.status) inv.status = body.status;
    if (body.notes !== undefined) inv.notes = body.notes;
    if (body.totalHT !== undefined) inv.totalHT = Number(body.totalHT);
    if (body.totalTVA !== undefined) inv.totalTVA = Number(body.totalTVA);
    if (body.totalTTC !== undefined) inv.totalTTC = Number(body.totalTTC);
    if (body.clientName !== undefined) inv.clientName = body.clientName;
    if (body.address) inv.address = body.address;
    await inv.save();
    return NextResponse.json({ invoice: inv });
  }
  if (isStaff(session) && body.status) {
    inv.status = body.status;
    await inv.save();
    return NextResponse.json({ invoice: inv });
  }
  return NextResponse.json({ error: 'Interdit' }, { status: 403 });
}

export async function DELETE(req) {
  const session = await getSession();
  if (!isAdmin(session)) return NextResponse.json({ error: 'Admin uniquement' }, { status: 403 });
  await connectDB();
  await Invoice.findByIdAndDelete(new URL(req.url).searchParams.get('id'));
  return NextResponse.json({ ok: true });
}
