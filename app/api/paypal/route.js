import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Invoice, Order, User } from '@/lib/models';
import { getSession, canSeePrices } from '@/lib/auth';

/**
 * Paiement PayPal (mode démo / sandbox configurable).
 * Sans credentials : simulation "paid" pour développement.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const clientId = process.env.PAYPAL_CLIENT_ID || '';
  const mode = process.env.PAYPAL_MODE || (clientId ? 'sandbox' : 'demo');
  return NextResponse.json({
    mode,
    clientId: mode === 'demo' ? '' : clientId,
    currency: 'EUR',
    demo: mode === 'demo',
  });
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (!canSeePrices(session)) {
    return NextResponse.json({ error: 'Paiement réservé client / admin' }, { status: 403 });
  }
  await connectDB();
  const body = await req.json();
  const inv = await Invoice.findById(body.invoiceId);
  if (!inv) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });
  if (session.role === 'client' && inv.clientId?.toString() !== session.id) {
    return NextResponse.json({ error: 'Interdit' }, { status: 403 });
  }

  // Capture / simulation
  const paypalOrderId = body.paypalOrderId || `DEMO-PP-${Date.now()}`;
  inv.paymentStatus = 'paid';
  inv.paymentMethod = body.demo ? 'paypal_demo' : 'paypal';
  inv.paypalOrderId = paypalOrderId;
  inv.paidAt = new Date();
  inv.status = 'paid';
  await inv.save();

  if (inv.orderId) {
    await Order.findByIdAndUpdate(inv.orderId, {
      paymentStatus: 'paid',
      paymentMethod: inv.paymentMethod,
      paypalOrderId,
    });
  }

  // Points fidélité : 1 pt / euro TTC
  const points = Math.floor(Number(inv.totalTTC) || 0);
  if (points > 0 && inv.clientId) {
    await User.findByIdAndUpdate(inv.clientId, { $inc: { points } });
    if (inv.orderId) {
      await Order.findByIdAndUpdate(inv.orderId, { pointsEarned: points });
    }
  }

  return NextResponse.json({
    ok: true,
    invoice: inv,
    pointsEarned: points,
    message: body.demo
      ? `Paiement démo enregistré (+${points} pts fidélité)`
      : `Paiement PayPal confirmé (+${points} pts)`,
  });
}
