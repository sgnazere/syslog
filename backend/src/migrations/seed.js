require('dotenv').config();
const bcrypt    = require('bcryptjs');
const { query } = require('../config/database');

async function seed() {
  console.log('🌱 Seed SysLog — adapté à la vraie base de données...');
  const hash = await bcrypt.hash('Admin1234!', 12);

  // ── Comptes users (table users) ──────────────────────────────
  // Le compte admin@logistec.com existe déjà dans votre base
  const newUsers = [
    { nom: 'GNAZERE',   prenom: 'Serge',  email: 'serge@ong.ci',  role: 'manager' },
    { nom: 'Kouassi',   prenom: 'Konan',  email: 'konan@ong.ci',  role: 'user'    },
    { nom: 'Diallo',    prenom: 'Ama',    email: 'ama@ong.ci',     role: 'manager' },
    { nom: 'Bamba',     prenom: 'Adjoua', email: 'adjoua@ong.ci',  role: 'user'    },
  ];
  for (const u of newUsers) {
    await query(
      `INSERT INTO users (nom, prenom, email, password, role)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (email) DO NOTHING`,
      [u.nom, u.prenom, u.email, hash, u.role]
    );
    console.log(`  ✓ ${u.email}`);
  }

  console.log('\n✅ Seed terminé.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Comptes disponibles :');
  console.log('  admin@logistec.com  → Admin1234! (admin, déjà en base)');
  console.log('  serge@ong.ci        → Admin1234! (manager)');
  console.log('  konan@ong.ci        → Admin1234! (user)');
  console.log('  ama@ong.ci          → Admin1234! (manager)');
  console.log('  adjoua@ong.ci       → Admin1234! (user)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n⚠️  Le mot de passe du compte admin@logistec.com est en $2y$ (PHP).');
  console.log('   bcryptjs est compatible — le login fonctionnera directement.');
  process.exit(0);
}

seed().catch(e => { console.error('❌', e.message); process.exit(1); });
