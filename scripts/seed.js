require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lingepro';

const AddressSchema = new mongoose.Schema(
  { street: String, postalCode: String, city: String },
  { _id: false }
);

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: String,
  active: { type: Boolean, default: true },
  phone: String,
  address: AddressSchema,
  points: { type: Number, default: 0 },
});

const MOCK_USERS = [
  {
    name: "Martine Text'eau",
    email: 'martine@lingepro.fr',
    password: 'Demo123!',
    role: 'admin',
    phone: '02 98 00 00 01',
    address: { street: '1 rue du Linge', postalCode: '29000', city: 'Quimper' },
  },
  {
    name: 'Marc Opérateur',
    email: 'marc@lingepro.fr',
    password: 'Op1234!',
    role: 'operateur',
    phone: '02 98 00 00 02',
    address: { street: "12 avenue de l'Atelier", postalCode: '29000', city: 'Quimper' },
  },
  {
    name: 'Joss Livreur',
    email: 'joss@lingepro.fr',
    password: 'Drv123!',
    role: 'livreur',
    phone: '06 12 34 56 78',
    address: { street: '3 impasse des Livreurs', postalCode: '29000', city: 'Quimper' },
  },
  {
    name: 'Restaurant Le Gourmet',
    email: 'contact@legourmet.fr',
    password: 'Cli123!',
    role: 'client',
    phone: '02 98 11 22 33',
    address: { street: '15 place Terre-au-Duc', postalCode: '29000', city: 'Quimper' },
  },
  {
    name: 'Hôtel de la Baie',
    email: 'reception@hotelbaie.fr',
    password: 'Cli123!',
    role: 'client',
    phone: '02 98 44 55 66',
    address: { street: '8 boulevard de la Mer', postalCode: '29100', city: 'Douarnenez' },
  },
  {
    name: 'Clinique Ker Ys',
    email: 'linge@kery.fr',
    password: 'Cli123!',
    role: 'client',
    phone: '02 98 77 88 99',
    address: { street: '22 rue des Hôpitaux', postalCode: '29200', city: 'Brest' },
  },
  {
    name: 'Spa Océane',
    email: 'contact@spaoceane.fr',
    password: 'Cli123!',
    role: 'client',
    phone: '02 98 33 22 11',
    address: { street: '5 chemin des Dunes', postalCode: '29950', city: 'Bénodet' },
  },
];

/** Supprime les index obsolètes (ex. code_1) et recrée les index utiles */
async function fixIndexes(db) {
  const collections = ['orders', 'deliveries', 'invoices', 'garments', 'tasks', 'users'];

  for (const name of collections) {
    const exists = await db.listCollections({ name }).hasNext();
    if (!exists) {
      console.log(`  [skip] collection ${name} absente`);
      continue;
    }
    const col = db.collection(name);
    const indexes = await col.indexes();
    console.log(`  ${name}:`, indexes.map((i) => i.name).join(', '));

    // Index obsolètes à supprimer (ancien schéma)
    const obsolete = ['code_1', 'code_1_1'];
    for (const idxName of obsolete) {
      if (indexes.some((i) => i.name === idxName)) {
        try {
          await col.dropIndex(idxName);
          console.log(`  ✓ dropIndex ${name}.${idxName}`);
        } catch (e) {
          console.log(`  ! dropIndex ${name}.${idxName}: ${e.message}`);
        }
      }
    }

    // Nettoyer le champ code fantôme sur orders
    if (name === 'orders') {
      const r = await col.updateMany({ code: null }, { $unset: { code: '' } });
      if (r.modifiedCount) console.log(`  ✓ unset code null sur ${r.modifiedCount} order(s)`);
      await col.updateMany({ code: { $exists: true } }, { $unset: { code: '' } });
    }
  }

  // Index attendus
  try {
    await db.collection('orders').createIndex({ number: 1 }, { unique: true, name: 'number_1' });
    console.log('  ✓ orders.number unique');
  } catch (e) {
    console.log('  orders.number:', e.code === 85 || e.code === 86 ? 'déjà OK' : e.message);
  }
  try {
    await db.collection('deliveries').createIndex({ number: 1 }, { unique: true, name: 'number_1' });
    console.log('  ✓ deliveries.number unique');
  } catch (e) {
    console.log('  deliveries.number:', e.message);
  }
  try {
    await db.collection('invoices').createIndex({ number: 1 }, { unique: true, name: 'number_1' });
    console.log('  ✓ invoices.number unique');
  } catch (e) {
    console.log('  invoices.number:', e.message);
  }
  try {
    await db.collection('garments').createIndex({ code: 1 }, { unique: true, sparse: true, name: 'code_1' });
    console.log('  ✓ garments.code unique (sparse)');
  } catch (e) {
    console.log('  garments.code:', e.message);
  }
  try {
    await db.collection('users').createIndex({ email: 1 }, { unique: true, name: 'email_1' });
    console.log('  ✓ users.email unique');
  } catch (e) {
    console.log('  users.email:', e.message);
  }
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  console.log('— Fix indexes —');
  await fixIndexes(db);

  const User = mongoose.models.User || mongoose.model('User', UserSchema);
  await User.deleteMany({});

  for (const u of MOCK_USERS) {
    await User.create({
      name: u.name,
      email: u.email,
      password: await bcrypt.hash(u.password, 10),
      role: u.role,
      phone: u.phone,
      address: u.address,
      active: true,
      points: u.role === 'client' ? 50 : 0,
    });
  }

  console.log('\nSeed OK — utilisateurs mockés :');
  MOCK_USERS.forEach((u) =>
    console.log(`  ${u.email} / ${u.password}  →  ${u.address.street}, ${u.address.postalCode} ${u.address.city}`)
  );

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
