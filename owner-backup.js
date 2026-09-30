import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../database.json');

/**
 * Helper format statistik database untuk caption dokumen backup
 */
export function getDbStats(db) {
  const chats = db.data?.chats || {};
  const users = db.data?.users || {};
  const totalChats = Object.keys(chats).length;
  const totalUsers = Object.keys(users).length;
  const totalActiveSewa = Object.values(chats).filter((c) => c.sewa?.active).length;

  let sizeKb = 0;
  if (fs.existsSync(dbPath)) {
    sizeKb = (fs.statSync(dbPath).size / 1024).toFixed(2);
  }

  let timeStr = '';
  try {
    timeStr = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date()) + ' WIB';
  } catch {
    timeStr = new Date().toLocaleString('id-ID');
  }

  return { totalChats, totalUsers, totalActiveSewa, sizeKb, timeStr };
}

/**
 * Kirim file database.json langsung ke chat target (Owner / Grup)
 */
export async function sendDatabaseBackup(sock, targetChat, quotedRaw = null) {
  if (!fs.existsSync(dbPath)) {
    throw new Error('File database.json tidak ditemukan!');
  }

  const dbBuffer = fs.readFileSync(dbPath);
  const now = new Date();
  const dateTag = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const fileName = `database_backup_${dateTag}.json`;

  const sizeKb = (dbBuffer.length / 1024).toFixed(2);
  let timeStr = '';
  try {
    timeStr = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(now) + ' WIB';
  } catch {
    timeStr = now.toLocaleString('id-ID');
  }

  const caption = `┌── [ 📦 BACKUP DATABASE BOT ]
│
├ Bot      : ${config.botName}
├ Waktu    : ${timeStr}
├ Ukuran   : ${sizeKb} KB
├ Format   : JSON (.json)
│
└── [ File backup siap disimpan untuk keamanan & restore ]`;

  const sendOptions = quotedRaw ? { quoted: quotedRaw } : {};
  return await sock.sendMessage(targetChat, {
    document: dbBuffer,
    mimetype: 'application/json',
    fileName,
    caption
  }, sendOptions);
}

export default {
  name: 'backup',
  command: ['backup', 'backupdb', 'savedb'],
  menu: ['backupdb'],
  category: 'owner',
  description: 'Mencadangkan dan mengirim file database.json bot ke chat (Khusus Owner)',
  owner: true,

  async execute({ vynaa, m, db }) {
    if (db?.saveSync) {
      db.saveSync();
    }

    try {
      await m.reply('⏳ Sedang memproses dan menyiapkan file backup database...');
      await sendDatabaseBackup(vynaa, m.chat, m.raw);
    } catch (err) {
      return m.reply(`⚠️ Gagal mencadangkan database: ${err.message}`);
    }
  }
};
