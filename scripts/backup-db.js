/**
 * Script tự động sao lưu cơ sở dữ liệu PostgreSQL cho Sales Zalo CRM
 * Hỗ trợ chạy định kỳ qua Cron (Linux) hoặc Task Scheduler (Windows).
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const BACKUP_DIR = path.join(ROOT_DIR, 'data', 'backups');

function loadEnv() {
  const envPath = path.join(ROOT_DIR, '.env');
  const env = { ...process.env };
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!env[key]) env[key] = val;
      }
    }
  }
  return env;
}

function parseDbUrl(url) {
  // postgresql://user:pass@host:port/dbname?schema=public
  try {
    const u = new URL(url);
    return {
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      host: u.hostname || 'localhost',
      port: u.port || '5432',
      database: u.pathname.replace(/^\//, ''),
    };
  } catch {
    return {
      user: 'postgres',
      password: 'Password@123',
      host: 'localhost',
      port: '5432',
      database: 'sales_zalo_dev',
    };
  }
}

function cleanOldBackups(retentionDays = 14) {
  if (!fs.existsSync(BACKUP_DIR)) return;
  const now = Date.now();
  const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;
  const files = fs.readdirSync(BACKUP_DIR);
  let deletedCount = 0;

  for (const f of files) {
    if (!f.endsWith('.sql') && !f.endsWith('.sql.gz')) continue;
    const fullPath = path.join(BACKUP_DIR, f);
    try {
      const stats = fs.statSync(fullPath);
      if (now - stats.mtimeMs > maxAgeMs) {
        fs.unlinkSync(fullPath);
        deletedCount++;
      }
    } catch {}
  }
  if (deletedCount > 0) {
    console.log(`[Backup] Đã dọn dẹp ${deletedCount} bản sao lưu cũ hơn ${retentionDays} ngày.`);
  }
}

async function runBackup() {
  const env = loadEnv();
  const dbConfig = parseDbUrl(env.DATABASE_URL || 'postgresql://postgres:Password@123@localhost:5432/sales_zalo_dev');

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `sales_zalo_backup_${timestamp}.sql`;
  const backupFilePath = path.join(BACKUP_DIR, backupFileName);

  console.log(`[Backup] Bắt đầu sao lưu cơ sở dữ liệu "${dbConfig.database}" lúc ${new Date().toLocaleString('vi-VN')}...`);

  let backupSuccess = false;

  // Cách 1: Thử qua Docker container nếu postgres đang chạy trong Docker
  try {
    const dockerCmd = `docker exec sales_zalo_postgres pg_dump -U ${dbConfig.user} -d ${dbConfig.database} -F p > "${backupFilePath}"`;
    execSync(dockerCmd, { stdio: 'pipe' });
    if (fs.existsSync(backupFilePath) && fs.statSync(backupFilePath).size > 100) {
      backupSuccess = true;
      console.log('[Backup] Đã tạo bản sao lưu thành công qua Docker container!');
    }
  } catch (dockerErr) {
    // Không chạy trong Docker hoặc container tên khác
  }

  // Cách 2: Thử qua pg_dump cục bộ nếu Cách 1 không dùng được
  if (!backupSuccess) {
    try {
      const pgDumpPaths = [
        'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
        'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe',
        'C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe',
        'C:\\Program Files\\PostgreSQL\\16\\pgAdmin 4\\runtime\\pg_dump.exe',
        '/usr/bin/pg_dump',
        '/usr/local/bin/pg_dump',
        'pg_dump',
      ];
      let pgDumpBin = 'pg_dump';
      for (const p of pgDumpPaths) {
        if (p !== 'pg_dump' && fs.existsSync(p)) {
          pgDumpBin = p;
          break;
        }
      }

      const dumpCmd = `"${pgDumpBin}" -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -F p -f "${backupFilePath}"`;
      execSync(dumpCmd, {
        env: { ...process.env, PGPASSWORD: dbConfig.password },
        stdio: 'pipe',
      });
      if (fs.existsSync(backupFilePath) && fs.statSync(backupFilePath).size > 100) {
        backupSuccess = true;
        console.log('[Backup] Đã tạo bản sao lưu thành công qua pg_dump cục bộ!');
      }
    } catch (pgErr) {
      console.warn(`[Backup] pg_dump gặp lỗi: ${pgErr.message}`);
    }
  }

  if (backupSuccess) {
    const sizeKb = (fs.statSync(backupFilePath).size / 1024).toFixed(1);
    console.log(`✅ Bản sao lưu đã lưu tại: ${backupFilePath} (${sizeKb} KB)`);
    cleanOldBackups(14);
  } else {
    console.error('❌ Không thể thực hiện sao lưu. Vui lòng kiểm tra Docker hoặc pg_dump trên máy chủ.');
  }
}

runBackup().catch(console.error);
