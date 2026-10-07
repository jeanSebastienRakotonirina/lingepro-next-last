/** Construction HTML documents selon rôle (prix ou quantités seules) */

export function buildOrderHtml(o, { showPrices = false } = {}) {
  const addr = o.deliveryAddress || {};
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const req = (o.requestedItems || []).map((i) => {
    const q = i.requestedQty ? ` — qté ind. ${i.requestedQty}` : '';
    return `<li>${i.name}${q}</li>`;
  }).join('') || '<li>—</li>';
  const proc = (o.processedItems || [])
    .map((i) => {
      if (showPrices && i.lineHT != null) {
        return `<tr><td>${i.name}</td><td>${i.qty}</td><td>${i.unit || ''}</td><td>${Number(i.unitPrice || 0).toFixed(2)}</td><td>${Number(i.lineHT || 0).toFixed(2)}</td></tr>`;
      }
      return `<tr><td>${i.name}</td><td>${i.qty}</td><td>${i.unit || ''}</td><td>${i.machine || '—'}</td></tr>`;
    })
    .join('');
  let prices = '';
  if (showPrices) {
    prices = `
      <h3>Totaux</h3>
      <p>HT : <strong>${Number(o.totalHT || 0).toFixed(2)} €</strong>
      · TVA 20 % : <strong>${Number(o.totalTVA || 0).toFixed(2)} €</strong>
      · TTC : <strong>${Number(o.totalTTC || 0).toFixed(2)} €</strong></p>
      <p class="muted">Paiement : ${o.paymentStatus || 'unpaid'}${o.paypalOrderId ? ' · ' + o.paypalOrderId : ''}</p>`;
  }
  const procHead = showPrices
    ? '<tr><th>Article</th><th>Qté</th><th>Unité</th><th>P.U. HT</th><th>HT</th></tr>'
    : '<tr><th>Article</th><th>Qté</th><th>Unité</th><th>Machine</th></tr>';
  return `
    <img class="logo" src="${origin}/logo-texteau.png" alt="Text'eau" onerror="this.style.display='none'"/>
    <h1>Commande ${o.number}</h1>
    <p>${o.clientName || ''}<br/>${addr.street || ''}<br/>${addr.postalCode || ''} ${addr.city || ''}</p>
    <p>Statut : <strong>${o.status}</strong> · Mode : ${o.orderMode || 'checkbox'}</p>
    <p><strong>Date commande :</strong> ${o.createdAt ? new Date(o.createdAt).toLocaleDateString('fr-FR') : '—'}</p>
    <p><strong>Atelier (veille) :</strong> ${o.taskDueDate ? new Date(o.taskDueDate).toLocaleDateString('fr-FR') : '—'}</p>
    <p><strong>Livraison (lendemain) :</strong> ${o.pickupDate ? new Date(o.pickupDate).toLocaleDateString('fr-FR') : '—'}</p>
    ${o.ecoScore != null ? `<p class="muted">Score éco : ${o.ecoScore}/100</p>` : ''}
    <h3>Produits demandés</h3><ul>${req}</ul>
    ${proc ? `<h3>Quantités traitées</h3><table><thead>${procHead}</thead><tbody>${proc}</tbody></table>` : ''}
    ${prices}
    <p class="muted">BL : ${o.deliveryNumber || '—'} · Facture : ${showPrices ? o.invoiceNumber || '—' : '—'}</p>
  `;
}

export function buildDeliveryHtml(d) {
  const a = d.address || {};
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const rows = (d.items || [])
    .map((i) => `<tr><td>${i.name || ''}</td><td>${i.qty ?? ''}</td><td>${i.unit === 'kg' ? 'kg' : 'pièce(s)'}</td><td>${i.machine || '—'}</td></tr>`)
    .join('') || '<tr><td colspan="4">—</td></tr>';
  return `
    <img class="logo" src="${origin}/logo-texteau.png" alt="Text'eau" onerror="this.style.display='none'"/>
    <h1>Bon de livraison ${d.number}</h1>
    <p class="muted">Document quantités — sans tarifs</p>
    <p>Commande : ${d.orderNumber || ''}</p>
    <p><strong>${d.clientName || ''}</strong><br/>${a.street || ''}<br/>${a.postalCode || ''} ${a.city || ''}</p>
    <p><strong>Date document :</strong> ${d.createdAt ? new Date(d.createdAt).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')}</p>
    <p><strong>Livraison prévue :</strong> ${d.scheduledDate ? new Date(d.scheduledDate).toLocaleDateString('fr-FR') : '—'}</p>
    <table>
      <thead><tr><th>Article traité</th><th>Quantité</th><th>Unité</th><th>Machine</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${d.notes ? `<p>Notes : ${d.notes}</p>` : ''}
    <p style="margin-top:40px">Signature client : ________________</p>
  `;
}

export function buildInvoiceHtml(inv) {
  const a = inv.address || {};
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const rows = (inv.items || [])
    .map(
      (i) =>
        `<tr><td>${i.name || ''}</td><td>${i.qty ?? ''}</td><td>${Number(i.unitPrice || 0).toFixed(2)}</td><td>${Number(i.lineHT || 0).toFixed(2)}</td><td>${Number(i.lineTVA || 0).toFixed(2)}</td><td>${Number(i.lineTTC || 0).toFixed(2)}</td></tr>`
    )
    .join('') || '<tr><td colspan="6">—</td></tr>';
  return `
    <img class="logo" src="${origin}/logo-texteau.png" alt="Text'eau" onerror="this.style.display='none'"/>
    <h1>Facture ${inv.number}</h1>
    <p>${inv.clientName || ''}<br/>${a.street || ''}<br/>${a.postalCode || ''} ${a.city || ''}</p>
    <p><strong>Date facture :</strong> ${inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')}</p>
    <p>Commande : ${inv.orderNumber || ''} · TVA ${((inv.tvaRate || 0.2) * 100).toFixed(0)} % · Statut : ${inv.status}</p>
    <p>Paiement : <strong>${inv.paymentStatus || inv.status}</strong>${inv.paypalOrderId ? ' · ' + inv.paypalOrderId : ''}</p>
    <table>
      <thead><tr><th>Article</th><th>Qté</th><th>P.U. HT</th><th>HT</th><th>TVA</th><th>TTC</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin-top:16px">
      <strong>Total HT :</strong> ${Number(inv.totalHT || 0).toFixed(2)} €<br/>
      <strong>TVA :</strong> ${Number(inv.totalTVA || 0).toFixed(2)} €<br/>
      <strong>Total TTC :</strong> ${Number(inv.totalTTC || 0).toFixed(2)} €
    </p>
    ${inv.notes ? `<p>Notes : ${inv.notes}</p>` : ''}
  `;
}

export function buildTaskSheetHtml(order, tasks = []) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const req = (order.requestedItems || []).map((i) => `<li>${i.name}${i.requestedQty ? ' (ind. ' + i.requestedQty + ')' : ''}</li>`).join('');
  const taskRows = tasks
    .map((t) => `<tr><td>${t.type}</td><td>${t.label}</td><td>${t.dueDate ? new Date(t.dueDate).toLocaleDateString('fr-FR') : '—'}</td><td>${t.status}</td></tr>`)
    .join('');
  return `
    <img class="logo" src="${origin}/logo-texteau.png" alt="Text'eau" onerror="this.style.display='none'"/>
    <h1>Fiche atelier — ${order.number}</h1>
    <p class="muted">Document quantités / tâches — sans tarifs</p>
    <p>Client : <strong>${order.clientName || ''}</strong></p>
    <p><strong>À traiter le (veille) :</strong> ${order.taskDueDate ? new Date(order.taskDueDate).toLocaleDateString('fr-FR') : '—'}</p>
    <p><strong>Livraison (lendemain) :</strong> ${order.pickupDate ? new Date(order.pickupDate).toLocaleDateString('fr-FR') : '—'}</p>
    <h3>Produits demandés</h3><ul>${req || '<li>—</li>'}</ul>
    <h3>Tâches</h3>
    <table>
      <thead><tr><th>Type</th><th>Libellé</th><th>Date</th><th>Statut</th></tr></thead>
      <tbody>${taskRows || '<tr><td colspan="4">—</td></tr>'}</tbody>
    </table>
    <h3>Saisie quantités (opérateur)</h3>
    <p class="muted">Reporter ci-dessous les pièces (Foltext / calandre) et kg (lave-linge / séchoir).</p>
  `;
}
