import mongoose from 'mongoose';

const AddressSchema = new mongoose.Schema(
  { street: { type: String, default: '' }, postalCode: { type: String, default: '' }, city: { type: String, default: '' } },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'operateur', 'livreur', 'client'], default: 'client' },
    active: { type: Boolean, default: true },
    phone: { type: String, default: '' },
    address: { type: AddressSchema, default: () => ({}) },
    points: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const RequestedItemSchema = new mongoose.Schema(
  { sku: String, name: String, category: String, machineHint: String, unit: { type: String, default: 'piece' }, requestedQty: Number },
  { _id: false }
);

const ProcessedItemSchema = new mongoose.Schema(
  {
    sku: String,
    name: String,
    qty: { type: Number, default: 0 },
    unit: { type: String, enum: ['piece', 'kg'], default: 'piece' },
    machine: String,
    machineType: String,
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    number: { type: String, unique: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    clientName: String,
    clientEmail: String,
    deliveryAddress: { type: AddressSchema, default: () => ({}) },
    requestedItems: [RequestedItemSchema],
    processedItems: [ProcessedItemSchema],
    totalHT: { type: Number, default: 0 },
    totalTVA: { type: Number, default: 0 },
    totalTTC: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'quantities_recorded', 'delivered', 'cancelled'],
      default: 'pending',
    },
    notes: String,
    express: { type: Boolean, default: false },
    orderMode: { type: String, enum: ['checkbox', 'quantities'], default: 'checkbox' }, // case à cocher ou avec quantités
    paymentStatus: { type: String, enum: ['unpaid', 'pending', 'paid', 'refunded'], default: 'unpaid' },
    paymentMethod: String,
    paypalOrderId: String,
    ecoScore: { type: Number, default: 0 },
    promoCode: String,
    pointsEarned: { type: Number, default: 0 },
    pickupDate: Date,
    taskDueDate: Date, // tâches la veille
    deliveryNumber: String,
    invoiceNumber: String,
    quantitiesRecordedAt: Date,
    quantitiesRecordedBy: String,
    deliveredAt: Date,
    cancelledAt: Date,
    cancelledBy: String,
  },
  { timestamps: true }
);

const TaskSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    orderNumber: String,
    clientName: String,
    requestedSkus: [String],
    requestedLabels: [String],
    type: { type: String, enum: ['traitement', 'lavage_kg', 'sechage_kg', 'calandre', 'foltext'], default: 'traitement' },
    label: String,
    status: { type: String, enum: ['todo', 'doing', 'done'], default: 'todo' },
    inputUnit: { type: String, enum: ['piece', 'kg'], default: 'piece' },
    notes: String,
    dueDate: Date, // veille de la livraison
  },
  { timestamps: true }
);

const DeliverySchema = new mongoose.Schema(
  {
    number: { type: String, unique: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    orderNumber: String,
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    clientName: String,
    address: { type: AddressSchema, default: () => ({}) },
    items: [{ sku: String, name: String, qty: Number, unit: String, machine: String }],
    status: { type: String, enum: ['planned', 'in_transit', 'delivered', 'cancelled'], default: 'planned' },
    scheduledDate: Date,
    deliveredAt: Date,
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String,
  },
  { timestamps: true }
);

const InvoiceLineSchema = new mongoose.Schema(
  { sku: String, name: String, qty: Number, unit: String, unitPrice: Number, lineHT: Number, lineTVA: Number, lineTTC: Number },
  { _id: false }
);

const InvoiceSchema = new mongoose.Schema(
  {
    number: { type: String, unique: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    clientName: String,
    clientEmail: String,
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    orderNumber: String,
    address: { type: AddressSchema, default: () => ({}) },
    items: [InvoiceLineSchema],
    totalHT: { type: Number, default: 0 },
    totalTVA: { type: Number, default: 0 },
    totalTTC: { type: Number, default: 0 },
    tvaRate: { type: Number, default: 0.2 },
    status: { type: String, enum: ['draft', 'sent', 'paid', 'cancelled'], default: 'sent' },
    paymentStatus: { type: String, enum: ['unpaid', 'pending', 'paid', 'refunded'], default: 'unpaid' },
    paymentMethod: String,
    paypalOrderId: String,
    paidAt: Date,
    notes: String,
  },
  { timestamps: true }
);

const TariffSchema = new mongoose.Schema(
  {
    sku: { type: String, unique: true, required: true },
    name: String,
    category: String,
    unitPrice: { type: Number, required: true },
    unit: { type: String, default: 'piece' },
    machineHint: String,
    needsIron: Boolean,
    needsFold: Boolean,
    isHV: Boolean,
    maxWashes: Number,
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const GarmentSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    clientName: String,
    type: String,
    label: String,
    maxWashes: { type: Number, default: 50 },
    washCount: { type: Number, default: 0 },
    status: { type: String, enum: ['ok', 'attention', 'critique', 'hors_service'], default: 'ok' },
    notes: String,
    retiredAt: Date,
    retiredReason: String,
  },
  { timestamps: true }
);

const MessageSchema = new mongoose.Schema(
  {
    fromId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fromName: String,
    toRole: { type: String, default: 'staff' },
    body: String,
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);
export const Task = mongoose.models.Task || mongoose.model('Task', TaskSchema);
export const Delivery = mongoose.models.Delivery || mongoose.model('Delivery', DeliverySchema);
export const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);
export const Garment = mongoose.models.Garment || mongoose.model('Garment', GarmentSchema);
export const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);
export const Tariff = mongoose.models.Tariff || mongoose.model('Tariff', TariffSchema);
