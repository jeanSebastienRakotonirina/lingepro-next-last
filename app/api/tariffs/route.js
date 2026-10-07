import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Tariff } from '@/lib/models';
import { getSession, isAdmin, isStaff } from '@/lib/auth';
import { ensureTariffsSeeded, getEffectiveCatalog } from '@/lib/pricing';
import { CATALOG } from '@/lib/catalog';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  await connectDB();
  await ensureTariffsSeeded();
  const catalog = await getEffectiveCatalog();
  // Prix visibles admin + client uniquement
  const hidePrices = session.role === 'operateur' || session.role === 'livreur';
  const data = hidePrices
    ? catalog.map(({ unitPrice, ...rest }) => rest)
    : catalog;
  return NextResponse.json({ catalog: data, canEdit: isAdmin(session) });
}

export async function PATCH(req) {
  const session = await getSession();
  if (!isAdmin(session)) return NextResponse.json({ error: 'Admin uniquement' }, { status: 403 });
  await connectDB();
  await ensureTariffsSeeded();
  const body = await req.json();
  if (body.sku && body.unitPrice !== undefined) {
    const t = await Tariff.findOneAndUpdate(
      { sku: body.sku },
      {
        $set: {
          unitPrice: Number(body.unitPrice),
          name: body.name,
          active: body.active !== false,
        },
      },
      { new: true }
    );
    return NextResponse.json({ tariff: t });
  }
  if (Array.isArray(body.items)) {
    for (const it of body.items) {
      if (!it.sku) continue;
      await Tariff.findOneAndUpdate(
        { sku: it.sku },
        { $set: { unitPrice: Number(it.unitPrice), name: it.name, active: it.active !== false } },
        { upsert: true }
      );
    }
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'sku + unitPrice requis' }, { status: 400 });
}

export async function POST(req) {
  const session = await getSession();
  if (!isAdmin(session)) return NextResponse.json({ error: 'Admin uniquement' }, { status: 403 });
  await connectDB();
  const body = await req.json();
  if (body.action === 'reset') {
    await Tariff.deleteMany({});
    await Tariff.insertMany(
      CATALOG.map((c) => ({
        sku: c.sku,
        name: c.name,
        category: c.category,
        unitPrice: c.unitPrice,
        unit: c.unit || 'piece',
        machineHint: c.machineHint,
        needsIron: c.needsIron,
        needsFold: c.needsFold,
        isHV: c.isHV,
        maxWashes: c.maxWashes,
        active: true,
      }))
    );
    return NextResponse.json({ ok: true, message: 'Tarifs réinitialisés' });
  }
  const t = await Tariff.create(body);
  return NextResponse.json({ tariff: t }, { status: 201 });
}
