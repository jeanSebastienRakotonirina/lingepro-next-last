/** Catalogue : le client coche les intitulés (sans quantité). */
export const CATALOG = [
  { sku: 'DB-STD', name: 'Drap de bain', category: 'bain', unitPrice: 2.8, unit: 'piece', machineHint: 'foltext', needsIron: false, needsFold: true, isHV: false },
  { sku: 'TB-STD', name: 'Tapis de bain', category: 'bain', unitPrice: 3.2, unit: 'piece', machineHint: 'foltext', needsIron: false, needsFold: true, isHV: false },
  { sku: 'ST-STD', name: 'Serviette de toilette', category: 'bain', unitPrice: 1.5, unit: 'piece', machineHint: 'foltext', needsIron: false, needsFold: true, isHV: false },
  { sku: 'SB-STD', name: 'Serviette de bain', category: 'bain', unitPrice: 2.2, unit: 'piece', machineHint: 'foltext', needsIron: false, needsFold: true, isHV: false },
  { sku: 'TO-CAR', name: "Taie d'oreiller carrée", category: 'literie', unitPrice: 1.2, unit: 'piece', machineHint: 'foltext', needsIron: true, needsFold: true, isHV: false },
  { sku: 'TO-REC', name: "Taie d'oreiller rectangulaire", category: 'literie', unitPrice: 1.3, unit: 'piece', machineHint: 'foltext', needsIron: true, needsFold: true, isHV: false },
  { sku: 'DR-STD', name: 'Drap plat', category: 'literie', unitPrice: 2.5, unit: 'piece', machineHint: 'calandre', needsIron: true, needsFold: true, isHV: false },
  { sku: 'DH-STD', name: 'Drap housse', category: 'literie', unitPrice: 2.8, unit: 'piece', machineHint: 'calandre', needsIron: true, needsFold: true, isHV: false },
  { sku: 'HC-STD', name: 'Housse de couette', category: 'literie', unitPrice: 4.5, unit: 'piece', machineHint: 'calandre', needsIron: true, needsFold: true, isHV: false },
  { sku: 'TAB-CU', name: 'Tablier cuisinier', category: 'pro', unitPrice: 2.0, unit: 'piece', machineHint: 'foltext', needsIron: true, needsFold: true, isHV: false },
  { sku: 'STAB', name: 'Serviette de table', category: 'table', unitPrice: 1.0, unit: 'piece', machineHint: 'calandre', needsIron: true, needsFold: true, isHV: false },
  { sku: 'NAP-STD', name: 'Nappe de table', category: 'table', unitPrice: 5.0, unit: 'piece', machineHint: 'calandre', needsIron: true, needsFold: true, isHV: false },
  { sku: 'HV-GIL', name: 'Gilet haute visibilité', category: 'hv', unitPrice: 4.0, unit: 'piece', machineHint: 'foltext', needsIron: false, needsFold: true, isHV: true, maxWashes: 50 },
  { sku: 'HV-PAN', name: 'Pantalon HV', category: 'hv', unitPrice: 5.5, unit: 'piece', machineHint: 'foltext', needsIron: false, needsFold: true, isHV: true, maxWashes: 50 },
  { sku: 'HV-VES', name: 'Veste réfléchissante', category: 'hv', unitPrice: 6.5, unit: 'piece', machineHint: 'foltext', needsIron: false, needsFold: true, isHV: true, maxWashes: 40 },
  { sku: 'HV-BAN', name: 'Bande / accessoire HV', category: 'hv', unitPrice: 2.0, unit: 'piece', machineHint: 'foltext', needsIron: false, needsFold: true, isHV: true, maxWashes: 30 },
];

export const TVA_RATE = 0.20;

export function genOrderNumber() {
  const d = new Date();
  const y = String(d.getFullYear()).slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const r = Math.floor(1000 + Math.random() * 9000);
  return `CMD-${y}${m}${day}-${r}`;
}

export function genDeliveryNumber() {
  const d = new Date();
  const y = String(d.getFullYear()).slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const r = Math.floor(1000 + Math.random() * 9000);
  return `BL-${y}${m}${day}-${r}`;
}

export function genInvoiceNumber() {
  const d = new Date();
  const y = String(d.getFullYear()).slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const r = Math.floor(1000 + Math.random() * 9000);
  return `FAC-${y}${m}${day}-${r}`;
}

export function genGarmentCode() {
  return `REF-${Math.floor(10000 + Math.random() * 90000)}`;
}

/** Livraison = lendemain (J+1) à 10h */
export function defaultPickupDate(from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d;
}

/** Tâches atelier = la veille de la livraison (= jour de la commande si livr. J+1) */
export function defaultTaskDate(deliveryDate) {
  const d = deliveryDate ? new Date(deliveryDate) : defaultPickupDate();
  d.setDate(d.getDate() - 1);
  d.setHours(8, 0, 0, 0);
  return d;
}

export function formatDateFR(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function garmentLifecycle(washCount, maxWashes) {
  const left = Math.max(0, maxWashes - washCount);
  const pct = maxWashes ? washCount / maxWashes : 0;
  if (left <= 0) return { status: 'hors_service', left, pct };
  if (pct >= 0.9 || left <= 5) return { status: 'critique', left, pct };
  if (pct >= 0.7 || left <= 15) return { status: 'attention', left, pct };
  return { status: 'ok', left, pct };
}

export function computeInvoiceTotals(processedItems = []) {
  let totalHT = 0;
  const lines = [];
  for (const it of processedItems) {
    const cat = CATALOG.find((c) => c.sku === it.sku);
    const qty = Number(it.qty) || 0;
    if (!cat || qty <= 0) continue;
    const unitPrice = cat.unitPrice;
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

/** Poids unitaire moyen (kg) par pièce — estimation catalogue */
const WEIGHT_PER_PIECE = {
  'DB-STD': 0.6, 'TB-STD': 0.8, 'ST-STD': 0.25, 'SB-STD': 0.45,
  'TO-CAR': 0.15, 'TO-REC': 0.18, 'DR-STD': 0.5, 'DH-STD': 0.55,
  'HC-STD': 0.9, 'TAB-CU': 0.35, 'STAB': 0.12, 'NAP-STD': 0.7,
  'HV-GIL': 0.4, 'HV-PAN': 0.6, 'HV-VES': 0.7, 'HV-BAN': 0.1,
};

/**
 * Estime le poids (kg) une fois les données saisies par l'opérateur.
 * - lignes unit === 'kg' : qty ajoutée telle quelle
 * - lignes unit === 'piece' : qty × poids unitaire catalogue
 * Accepte processedItems, items, ou tableau mixte.
 */
export function estimateWeight(items = []) {
  if (!Array.isArray(items) || items.length === 0) return 0;
  let kg = 0;
  for (const it of items) {
    const qty = Number(it.qty) || 0;
    if (qty <= 0) continue;
    if (it.unit === 'kg' || it.machineType === 'lave_linge' || it.machineType === 'sechoir') {
      kg += qty;
      continue;
    }
    const cat = CATALOG.find((c) => c.sku === it.sku);
    const unitKg = WEIGHT_PER_PIECE[it.sku] || cat?.weightKg || 0.3;
    kg += qty * unitKg;
  }
  return Math.round(kg * 10) / 10;
}
