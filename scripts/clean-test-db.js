const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'showup.db');
const db = new DatabaseSync(dbPath);

console.log('[DB Clean] Purging test message artifacts from database...');

const testPatterns = [
  "message LIKE '[TEST]%'",
  "message LIKE 'Pesan Rate Limit%'",
  "message LIKE 'Pesan Impor%'",
  "message LIKE 'Semangat RealTime Test%'",
  "message LIKE 'Pesan Terkena Filter%'",
  "message LIKE '%[ID: %'",
  "message LIKE '%https://spam-link-test.com%'",
  "message LIKE '%testing routing note%'",
  "message LIKE 'Ayo semangat pelari live!%'",
  "message LIKE '%Sampai jumpa di garis akhir!%'",
  "name LIKE '[TEST]%'",
  "name LIKE 'Tester%'",
  "name LIKE 'Kawan Antigravity%'",
  "name LIKE 'Pelari Cepat%'",
  "name LIKE 'Budi Test%'",
  "name LIKE 'Flagged Sender%'",
  "name LIKE 'Live Runner Cheer%'",
  "name LIKE 'MultiLine Tester%'",
  "name LIKE 'Archive Guard Test%'",
];

const deleteQuery = `DELETE FROM messages WHERE ${testPatterns.join(' OR ')};`;
db.exec(deleteQuery);

// Ensure archive mode is reset to false
db.prepare("UPDATE settings SET value = 'false' WHERE key = 'is_archived';").run();

const countResult = db.prepare('SELECT count(*) as count FROM messages;').get();
console.log(`[DB Clean] Cleaned test artifacts. Remaining messages: ${countResult.count}`);

// If table has fewer than 10 messages, re-seed with standard approved messages
if (countResult.count < 10) {
  console.log('[DB Clean] Re-seeding standard Indonesian cheer messages...');
  const SEEDS = [
    { name: 'Maya & Teman-teman', is_anonymous: 0, message: 'Semangat terus ya, kamu pasti bisa lewatin ini! Percaya sama prosesmu. 🌟', minutesAgo: 10, likes: 24 },
    { name: 'Anonim', is_anonymous: 1, message: 'Jangan lupa napas, nikmati setiap prosesnya! Kamu sudah melangkah sejauh ini dan itu luar biasa.', minutesAgo: 22, likes: 38 },
    { name: 'Budi Pratama', is_anonymous: 0, message: 'Bangga banget liat perjuanganmu sampai di titik ini! Terus melangkah dengan kepala tegak ya!', minutesAgo: 45, likes: 31 },
    { name: 'Anonim', is_anonymous: 1, message: 'Gaspol! Doa terbaik dari sini selalu menyertaimu. Semesta mendukung niat baikmu! ✨', minutesAgo: 70, likes: 45 },
    { name: 'Dinda', is_anonymous: 0, message: 'Istirahat sebentar nggak apa-apa kok, yang penting jangan menyerah. Kamu berharga banget!', minutesAgo: 95, likes: 52 },
    { name: 'Sahabat Setia', is_anonymous: 0, message: 'Setiap langkah kecilmu itu berarti besar. Jangan pernah ragu sama potensi luar biasa dalam dirimu!', minutesAgo: 130, likes: 27 },
    { name: 'Anonim', is_anonymous: 1, message: 'Hari ini mungkin terasa berat, tapi ingat kamu jauh lebih kuat dari apa yang kamu kira! 💪', minutesAgo: 180, likes: 41 },
    { name: 'Samir', is_anonymous: 0, message: 'Ingat alasan kenapa kamu pertama kali memulai. Kami semua bangga dan terus mendukungmu!', minutesAgo: 230, likes: 33 },
    { name: 'Siti A.', is_anonymous: 0, message: 'Pelan-pelan asal jalan terus. Hasil manis dan kebahagiaan sedang menunggumu di depan.', minutesAgo: 290, likes: 49 },
    { name: 'Anonim', is_anonymous: 1, message: 'Kirim peluk hangat dan energi positif buat kamu hari ini! Kamu hebat dan tak tergantikan. 💛', minutesAgo: 350, likes: 29 },
    { name: 'Arif K.', is_anonymous: 0, message: 'Gagal coba lagi, lelah rehat dulu. Yang terpenting kamu sudah berani melangkah hari ini!', minutesAgo: 420, likes: 39 },
    { name: 'Anonim', is_anonymous: 1, message: 'Semua usaha, keringat, dan doamu nggak akan ada yang sia-sia. Tetap tersenyum ya! 🌻', minutesAgo: 490, likes: 46 },
    { name: 'Dimas & Rara', is_anonymous: 0, message: 'Tunjukkan yang terbaik hari ini! Jangan biarkan keraguan kecil menghalangi langkah besarmu.', minutesAgo: 580, likes: 32 },
    { name: 'Anonim', is_anonymous: 1, message: 'Tarik napas panjang, hembuskan perlahan. Kamu pasti bisa menyelesaikan apa yang sudah kamu mulai!', minutesAgo: 690, likes: 35 },
    { name: 'Keluarga Besar', is_anonymous: 0, message: 'Melihat kegigihanmu membuat kami semua kagum dan terinspirasi. Terus bersinar ya!', minutesAgo: 790, likes: 54 },
    { name: 'Anonim', is_anonymous: 1, message: 'Fokus pada hari ini, selangkah demi selangkah. Jangan khawatir berlebihan tentang hari esok.', minutesAgo: 890, likes: 37 },
    { name: 'Reza', is_anonymous: 0, message: 'Senyum lebar-lebar! Hari ini adalah panggung pembuktian untuk dirimu sendiri. Kamu juara! 🚀', minutesAgo: 980, likes: 43 },
    { name: 'Anonim', is_anonymous: 1, message: 'Kamu nggak berjuang sendirian, ada banyak doa baik yang selalu mengiringi langkahmu di setiap detik.', minutesAgo: 1100, likes: 63 },
    { name: 'Nora', is_anonymous: 0, message: 'Apapun hasilnya nanti, kamu sudah memberikan yang paling maksimal. Bangga banget sama kamu! 👏', minutesAgo: 1250, likes: 48 },
    { name: 'Zack', is_anonymous: 0, message: 'Kamu sudah berhasil melewati masa-masa tersulitmu di masa lalu, dan kamu pasti bisa melewatinya lagi!', minutesAgo: 1380, likes: 30 },
  ];

  const insertStmt = db.prepare(`
    INSERT INTO messages (id, unique_id, name, is_anonymous, message, created_at, likes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'approved');
  `);

  const chars = '0123456789abcdef';
  function getUid() {
    let hex = '';
    for (let i = 0; i < 4; i++) hex += chars[Math.floor(Math.random() * chars.length)];
    return 'su-' + hex;
  }

  const now = Date.now();
  for (const item of SEEDS) {
    const id = crypto.randomUUID();
    const uid = getUid();
    const createdAt = new Date(now - item.minutesAgo * 60 * 1000).toISOString();
    insertStmt.run(id, uid, item.name, item.is_anonymous, item.message, createdAt, item.likes);
  }

  const finalCount = db.prepare('SELECT count(*) as count FROM messages;').get();
  console.log(`[DB Clean] Seeding complete. Total messages: ${finalCount.count}`);
}

