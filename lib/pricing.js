import { CATALOG, TVA_RATE } from './catalog';
import { Tariff } from './models';

/** Catalogue effectif : tarifs DB (admin) sinon CATALOG statique */
export async function getEffectiveCatalog() {
  try {
    const tariffs = await Tariff.find({ active: { $ne: false } }).lean();
    if (tariffs?.length) {
      return tariffs.map((t) => ({
        sku: t.sku,
        name: t.name,
        category: t.category || 'autre',
        unitPrice: Number(t.unitPrice),
        unit: t.unit || 'piece',
        machineHint: t.machineHint || 'foltext',
        needsIron: !!t.needsIron,
        needsFold: t.needsFold !== false,
        isHV: !!t.isHV,
        maxWashes: t.maxWashes,
      }));
    }
  } catch (_) {}
  return CATALOG;
}

export async function ensureTariffsSeeded() {
  const n = await Tariff.countDocuments();
  if (n > 0) return;
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
}

export function computeTotalsFromCatalog(items, catalog) {
  let totalHT = 0;
  const lines = [];
  for (const it of items || []) {
    const cat = catalog.find((c) => c.sku === it.sku);
    const qty = Number(it.qty) || 0;
    if (!cat || qty <= 0) continue;
    // kg entries without unit price in catalog: skip or generic
    if (it.unit === 'kg' && !cat.unitPrice) continue;
    const unitPrice = Number(cat.unitPrice) || 0;
    const lineHT = Math.round(unitPrice * qty * 100) / 100;
    totalHT += lineHT;
    lines.push({
      sku: cat.sku,
      name: cat.name,
      qty,
      unit: it.unit || cat.unit || 'piece',
      unitPrice,
      lineHT,
      lineTVA: Math.round(lineHT * TVA_RATE * 100) / 100,
      lineTTC: Math.round(lineHT * (1 + TVA_RATE) * 100) / 100,
    });
  }
  totalHT = Math.round(totalHT * 100) / 100;
  const totalTVA = Math.round(totalHT * TVA_RATE * 100) / 100;
  const totalTTC = Math.round((totalHT + totalTVA) * 100) / 100;
  return { lines, totalHT, totalTVA, totalTTC, tvaRate: TVA_RATE };
}

/** Score éco 0-100 selon volume et express */
export function computeEcoScore(processedItems = [], express = false) {
  const pieces = (processedItems || []).filter((i) => i.unit !== 'kg').reduce((s, i) => s + (Number(i.qty) || 0), 0);
  const kg = (processedItems || []).filter((i) => i.unit === 'kg').reduce((s, i) => s + (Number(i.qty) || 0), 0);
  let score = 85;
  if (express) score -= 15;
  if (kg > 80) score -= 10;
  if (pieces > 100) score -= 5;
  if (pieces > 0 && kg === 0) score += 5; // lots pièces bien chargés
  return Math.max(0, Math.min(100, score));
}
