import { Task, Delivery, Invoice, Garment } from './models';
import {
  genDeliveryNumber,
  genInvoiceNumber,
  defaultPickupDate,
  defaultTaskDate,
  computeInvoiceTotals,
  garmentLifecycle,
  CATALOG,
} from './catalog';

/** Commande client (cases cochées) → tâches opérateur */
export async function createTasksFromOrder(order) {
  const labels = (order.requestedItems || []).map((i) => i.name);
  const skus = (order.requestedItems || []).map((i) => i.sku);
  const deliveryDate = order.pickupDate ? new Date(order.pickupDate) : defaultPickupDate();
  const taskDue = defaultTaskDate(deliveryDate);
  // Persist on order
  order.taskDueDate = taskDue;
  order.pickupDate = deliveryDate;
  await order.save();

  const tasks = [
    {
      orderId: order._id,
      orderNumber: order.number,
      clientName: order.clientName,
      requestedSkus: skus,
      requestedLabels: labels,
      type: 'traitement',
      label: `Traiter ${order.number} — ${labels.slice(0, 4).join(', ')}${labels.length > 4 ? '…' : ''}`,
      status: 'todo',
      inputUnit: 'piece',
      dueDate: taskDue,
    },
    {
      orderId: order._id,
      orderNumber: order.number,
      clientName: order.clientName,
      requestedSkus: skus,
      requestedLabels: labels,
      type: 'lavage_kg',
      label: `Lavage (kg) — ${order.number}`,
      status: 'todo',
      inputUnit: 'kg',
      dueDate: taskDue,
    },
    {
      orderId: order._id,
      orderNumber: order.number,
      clientName: order.clientName,
      requestedSkus: skus,
      requestedLabels: labels,
      type: 'sechage_kg',
      label: `Séchage (kg) — ${order.number}`,
      status: 'todo',
      inputUnit: 'kg',
      dueDate: taskDue,
    },
    {
      orderId: order._id,
      orderNumber: order.number,
      clientName: order.clientName,
      requestedSkus: skus,
      requestedLabels: labels,
      type: 'calandre',
      label: `Calandre Girbau/Danube (pièces) — ${order.number}`,
      status: 'todo',
      inputUnit: 'piece',
      dueDate: taskDue,
    },
    {
      orderId: order._id,
      orderNumber: order.number,
      clientName: order.clientName,
      requestedSkus: skus,
      requestedLabels: labels,
      type: 'foltext',
      label: `Foltext pliage (pièces) — ${order.number}`,
      status: 'todo',
      inputUnit: 'piece',
      dueDate: taskDue,
    },
  ];

  await Task.insertMany(tasks);
  return tasks;
}

/** Opérateur valide les quantités traitées */
export async function recordQuantities(order, processedItems, operatorName) {
  const { totalHT, totalTVA, totalTTC } = computeInvoiceTotals(processedItems);
  order.processedItems = processedItems;
  order.totalHT = totalHT;
  order.totalTVA = totalTVA;
  order.totalTTC = totalTTC;
  order.status = 'quantities_recorded';
  order.quantitiesRecordedAt = new Date();
  order.quantitiesRecordedBy = operatorName || '';
  await order.save();
  await Task.updateMany({ orderId: order._id }, { status: 'done' });
  return { totalHT, totalTVA, totalTTC };
}

/** Livraison → BL sans tarifs + facture HT/TVA/TTC */
export async function generateDeliveryAndInvoice(order) {
  const blNumber = genDeliveryNumber();
  const invNumber = genInvoiceNumber();

  const blItems = (order.processedItems || []).map((i) => ({
    sku: i.sku,
    name: i.name,
    qty: i.qty,
    unit: i.unit || 'piece',
    machine: i.machine || '',
  }));

  const delivery = await Delivery.create({
    number: blNumber,
    orderId: order._id,
    orderNumber: order.number,
    clientId: order.clientId,
    clientName: order.clientName,
    address: order.deliveryAddress || {},
    items: blItems,
    status: 'delivered',
    scheduledDate: order.pickupDate || defaultPickupDate(), // livraison = lendemain
    deliveredAt: new Date(),
    notes: order.notes || '',
  });

  const { lines, totalHT, totalTVA, totalTTC, tvaRate } = computeInvoiceTotals(order.processedItems || []);

  const invoice = await Invoice.create({
    number: invNumber,
    clientId: order.clientId,
    clientName: order.clientName,
    clientEmail: order.clientEmail,
    orderId: order._id,
    orderNumber: order.number,
    address: order.deliveryAddress || {},
    items: lines,
    totalHT,
    totalTVA,
    totalTTC,
    tvaRate,
    status: 'sent',
    notes: order.notes || '',
  });

  order.status = 'delivered';
  order.deliveredAt = new Date();
  order.deliveryNumber = blNumber;
  order.invoiceNumber = invNumber;
  order.totalHT = totalHT;
  order.totalTVA = totalTVA;
  order.totalTTC = totalTTC;
  await order.save();

  const hvItems = (order.processedItems || []).filter((i) => {
    const c = CATALOG.find((x) => x.sku === i.sku);
    return c?.isHV && (i.qty || 0) > 0;
  });
  if (hvItems.length && order.clientId) {
    const garments = await Garment.find({ clientId: order.clientId, status: { $ne: 'hors_service' } });
    for (const g of garments) {
      g.washCount = (g.washCount || 0) + 1;
      const life = garmentLifecycle(g.washCount, g.maxWashes || 50);
      g.status = life.status;
      if (life.status === 'hors_service') {
        g.retiredAt = new Date();
        g.retiredReason = 'Limite de lavages atteinte';
      }
      await g.save();
    }
  }

  return { delivery, invoice };
}
