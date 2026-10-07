import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Order, User, Task, Delivery, Invoice } from '@/lib/models';
import { getSession, isAdmin, isStaff, canSeePrices } from '@/lib/auth';
import { CATALOG, genOrderNumber, defaultPickupDate, defaultTaskDate } from '@/lib/catalog';
import { createTasksFromOrder, recordQuantities, generateDeliveryAndInvoice } from '@/lib/automation';

function publicOrder(order, session) {
  const o = typeof order.toObject === 'function' ? order.toObject() : { ...order };
  if (!canSeePrices(session)) {
    delete o.totalHT;
    delete o.totalTVA;
    delete o.totalTTC;
  }
  return o;
}

export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  await connectDB();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (id) {
    const order = await Order.findById(id).lean();
    if (!order) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    if (session.role === 'client' && order.clientId.toString() !== session.id) {
      return NextResponse.json({ error: 'Interdit' }, { status: 403 });
    }
    return NextResponse.json({ order: publicOrder(order, session) });
  }

  const filter = session.role === 'client' ? { clientId: session.id } : {};
  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(200).lean();
  return NextResponse.json({ orders: orders.map((o) => publicOrder(o, session)) });
}

/** Client (ou staff) : commande = cases cochées, sans quantités */
export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  await connectDB();
  const body = await req.json();

  let clientId = session.id;
  let client = await User.findById(session.id);
  if (isStaff(session) && body.clientId) {
    client = await User.findById(body.clientId);
    clientId = client?._id;
  }
  if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 400 });

  const skus = body.skus || body.requestedSkus || [];
  const requestedItems = [];
  for (const sku of skus) {
    const cat = CATALOG.find((c) => c.sku === sku);
    if (!cat) continue;
    const rq = (body.requestedQuantities || []).find((x) => x.sku === sku);
    requestedItems.push({
      sku: cat.sku,
      name: cat.name,
      category: cat.category,
      machineHint: cat.machineHint,
      unit: cat.unit || 'piece',
      requestedQty: rq ? Number(rq.qty) || undefined : undefined,
    });
  }
  if (!requestedItems.length) {
    return NextResponse.json({ error: 'Cochez au moins un produit' }, { status: 400 });
  }

  const addr = body.deliveryAddress || client.address || {};
  const order = await Order.create({
    number: genOrderNumber(),
    clientId,
    clientName: client.name,
    clientEmail: client.email,
    deliveryAddress: {
      street: addr.street || '',
      postalCode: addr.postalCode || '',
      city: addr.city || '',
    },
    requestedItems,
    processedItems: [],
    status: 'pending',
    notes: body.notes || '',
    express: !!body.express,
    orderMode: body.orderMode === 'quantities' ? 'quantities' : 'checkbox',
    promoCode: body.promoCode || '',
    pickupDate: body.pickupDate ? new Date(body.pickupDate) : defaultPickupDate(),
    taskDueDate: defaultTaskDate(body.pickupDate ? new Date(body.pickupDate) : defaultPickupDate()),
  });

  await createTasksFromOrder(order);

  return NextResponse.json(
    {
      order: publicOrder(order, session),
      message: 'Commande enregistrée — tâches atelier créées. L’opérateur saisira les quantités traitées.',
    },
    { status: 201 }
  );
}

export async function PATCH(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  await connectDB();
  const body = await req.json();
  const order = await Order.findById(body.id);
  if (!order) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  // Annulation
  if (body.action === 'cancel') {
    const can =
      isStaff(session) ||
      (session.role === 'client' &&
        order.clientId.toString() === session.id &&
        ['pending', 'in_progress'].includes(order.status));
    if (!can) return NextResponse.json({ error: 'Annulation interdite' }, { status: 403 });
    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelledBy = session.name;
    await order.save();
    await Task.updateMany({ orderId: order._id }, { status: 'done' });
    return NextResponse.json({ order: publicOrder(order, session) });
  }

  // Opérateur : saisir quantités traitées (pièces / kg)
  if (body.action === 'record_quantities') {
    if (!isStaff(session) || session.role === 'livreur') {
      if (session.role !== 'admin' && session.role !== 'operateur') {
        return NextResponse.json({ error: 'Réservé opérateur / admin' }, { status: 403 });
      }
    }
    const items = [];
    for (const line of body.processedItems || []) {
      const cat = CATALOG.find((c) => c.sku === line.sku);
      const qty = Number(line.qty) || 0;
      if (!cat || qty <= 0) continue;
      items.push({
        sku: cat.sku,
        name: cat.name,
        qty,
        unit: line.unit === 'kg' ? 'kg' : 'piece',
        machine: line.machine || '',
        machineType: line.machineType || cat.machineHint || '',
      });
    }
    // kg machine lines (lavage/séchage globaux)
    for (const kg of body.kgEntries || []) {
      if (!kg.qty || kg.qty <= 0) continue;
      items.push({
        sku: kg.sku || 'KG-GENERIC',
        name: kg.name || (kg.machineType === 'sechoir' ? 'Séchage (kg)' : 'Lavage (kg)'),
        qty: Number(kg.qty),
        unit: 'kg',
        machine: kg.machine || '',
        machineType: kg.machineType || 'lave_linge',
      });
    }
    if (!items.length) {
      return NextResponse.json({ error: 'Saisissez au moins une quantité' }, { status: 400 });
    }
    await recordQuantities(order, items, session.name);
    return NextResponse.json({
      order: publicOrder(order, session),
      message: 'Quantités enregistrées. Vous pouvez marquer la commande comme livrée pour générer BL + facture.',
    });
  }

  // Livrer → BL + facture
  if (body.action === 'deliver') {
    if (!isStaff(session)) return NextResponse.json({ error: 'Interdit' }, { status: 403 });
    if (!order.processedItems?.length && order.status !== 'quantities_recorded') {
      return NextResponse.json({ error: 'Enregistrez d’abord les quantités traitées' }, { status: 400 });
    }
    if (order.status === 'delivered') {
      return NextResponse.json({ error: 'Déjà livrée' }, { status: 400 });
    }
    if (order.status === 'cancelled') {
      return NextResponse.json({ error: 'Commande annulée' }, { status: 400 });
    }
    const { delivery, invoice } = await generateDeliveryAndInvoice(order);
    return NextResponse.json({
      order: publicOrder(order, session),
      deliveryNumber: delivery.number,
      invoiceNumber: canSeePrices(session) ? invoice.number : undefined,
      message: 'Livraison enregistrée — bon de livraison et facture générés.',
    });
  }

  // Édition produits cochés (admin / client si pending)
  if (body.action === 'edit_request') {
    const can =
      isAdmin(session) ||
      (session.role === 'client' &&
        order.clientId.toString() === session.id &&
        order.status === 'pending');
    if (!can) return NextResponse.json({ error: 'Modification interdite' }, { status: 403 });
    const skus = body.skus || [];
    const requestedItems = [];
    for (const sku of skus) {
      const cat = CATALOG.find((c) => c.sku === sku);
      if (!cat) continue;
      requestedItems.push({
        sku: cat.sku,
        name: cat.name,
        category: cat.category,
        machineHint: cat.machineHint,
        unit: cat.unit || 'piece',
      });
    }
    if (!requestedItems.length) return NextResponse.json({ error: 'Au moins un produit' }, { status: 400 });
    order.requestedItems = requestedItems;
    if (body.deliveryAddress) {
      order.deliveryAddress = {
        street: body.deliveryAddress.street || '',
        postalCode: body.deliveryAddress.postalCode || '',
        city: body.deliveryAddress.city || '',
      };
    }
    if (body.notes !== undefined) order.notes = body.notes;
    await order.save();
    return NextResponse.json({ order: publicOrder(order, session) });
  }

  
  // Admin : édition complète (tous champs + quantités demandées)
  if (body.action === 'admin_full_edit') {
    if (!isAdmin(session)) return NextResponse.json({ error: 'Admin uniquement' }, { status: 403 });
    if (body.status) order.status = body.status;
    if (body.notes !== undefined) order.notes = body.notes;
    if (body.clientName !== undefined) order.clientName = body.clientName;
    if (body.orderMode) order.orderMode = body.orderMode;
    if (body.express !== undefined) order.express = !!body.express;
    if (body.promoCode !== undefined) order.promoCode = body.promoCode;
    if (body.pickupDate) order.pickupDate = new Date(body.pickupDate);
    if (body.deliveryAddress) {
      order.deliveryAddress = {
        street: body.deliveryAddress.street || '',
        postalCode: body.deliveryAddress.postalCode || '',
        city: body.deliveryAddress.city || '',
      };
    }
    if (Array.isArray(body.requestedItems) && body.requestedItems.length) {
      order.requestedItems = body.requestedItems.map((it) => ({
        sku: it.sku,
        name: it.name,
        category: it.category,
        machineHint: it.machineHint,
        unit: it.unit || 'piece',
        requestedQty: Number(it.requestedQty) || 0,
      }));
    }
    await order.save();
    return NextResponse.json({ order: publicOrder(order, session) });
  }

  // Admin / staff : édition de tous les champs simples
  if (isAdmin(session) || isStaff(session)) {
    if (body.status) order.status = body.status;
    if (body.notes !== undefined) order.notes = body.notes;
    if (body.clientName !== undefined && isAdmin(session)) order.clientName = body.clientName;
    if (body.pickupDate) {
      order.pickupDate = new Date(body.pickupDate);
    }
    if (body.deliveryAddress) {
      order.deliveryAddress = {
        street: body.deliveryAddress.street || '',
        postalCode: body.deliveryAddress.postalCode || '',
        city: body.deliveryAddress.city || '',
      };
    }
    await order.save();
  }

  return NextResponse.json({ order: publicOrder(order, session) });
}

export async function DELETE(req) {
  const session = await getSession();
  if (!isAdmin(session)) return NextResponse.json({ error: 'Admin uniquement' }, { status: 403 });
  await connectDB();
  const id = new URL(req.url).searchParams.get('id');
  await Task.deleteMany({ orderId: id });
  await Delivery.deleteMany({ orderId: id });
  await Invoice.deleteMany({ orderId: id });
  await Order.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
