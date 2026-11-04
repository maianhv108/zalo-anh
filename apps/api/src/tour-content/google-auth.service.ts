import { Injectable, Logger } from '@nestjs/common';
import { google, sheets_v4, drive_v3 } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

export interface GoogleAuthStatus {
  isConfigured: boolean;
  credentialsPath: string | null;
  clientEmail: string | null;
  projectId: string | null;
  scopes: string[];
  errorMessage?: string;
}

@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);

  public readonly scopes = [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/drive.readonly',
  ];

  private sheetsClient: sheets_v4.Sheets | null = null;
  private driveClient: drive_v3.Drive | null = null;
  private cachedAuthStatus: GoogleAuthStatus | null = null;

  constructor() {
    this.initAuth();
  }

  /**
   * Xác định đường dẫn file JSON Service Account từ biến môi trường
   */
  public getCredentialsPath(): string | null {
    const envPath =
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.GOOGLE_SERVICE_ACCOUNT_PATH;

    if (envPath && envPath.trim() !== '') {
      // Chuẩn hóa dấu phân cách thư mục trên Windows
      const cleanPath = envPath.trim().replace(/^['"]|['"]$/g, '');
      const resolved = path.isAbsolute(cleanPath)
        ? cleanPath
        : path.resolve(process.cwd(), cleanPath);
      return resolved;
    }

    // Các vị trí mặc định trong dự án nếu có
    const defaultLocations = [
      path.resolve(process.cwd(), 'secrets/google-service-account.json'),
      path.resolve(process.cwd(), 'data/credentials/service-account.json'),
    ];

    for (const loc of defaultLocations) {
      if (fs.existsSync(loc)) {
        return loc;
      }
    }

    return null;
  }

  /**
   * Khởi tạo kết nối Google Auth chính thức bằng Service Account
   */
  public initAuth(): GoogleAuthStatus {
    const credPath = this.getCredentialsPath();

    if (!credPath) {
      this.sheetsClient = null;
      this.driveClient = null;
      this.cachedAuthStatus = {
        isConfigured: false,
        credentialsPath: null,
        clientEmail: null,
        projectId: null,
        scopes: this.scopes,
        errorMessage: 'Chưa cấu hình biến môi trường GOOGLE_APPLICATION_CREDENTIALS hoặc file JSON không tồn tại.',
      };
      return this.cachedAuthStatus;
    }

    if (!fs.existsSync(credPath)) {
      this.sheetsClient = null;
      this.driveClient = null;
      this.cachedAuthStatus = {
        isConfigured: false,
        credentialsPath: credPath,
        clientEmail: null,
        projectId: null,
        scopes: this.scopes,
        errorMessage: `Không tìm thấy file khóa tại đường dẫn: ${credPath}`,
      };
      this.logger.warn(`Google Service Account JSON không tồn tại tại: ${credPath}`);
      return this.cachedAuthStatus;
    }

    try {
      // Đọc và kiểm tra cấu trúc JSON (tuyệt đối không in private_key ra console/log)
      const raw = fs.readFileSync(credPath, 'utf8');
      const parsed = JSON.parse(raw);

      if (!parsed.client_email || !parsed.private_key) {
        throw new Error('File JSON không hợp lệ: thiếu client_email hoặc private_key.');
      }

      const auth = new google.auth.GoogleAuth({
        keyFile: credPath,
        scopes: this.scopes,
      });

      this.sheetsClient = google.sheets({ version: 'v4', auth });
      this.driveClient = google.drive({ version: 'v3', auth });

      this.cachedAuthStatus = {
        isConfigured: true,
        credentialsPath: credPath,
        clientEmail: parsed.client_email,
        projectId: parsed.project_id || null,
        scopes: this.scopes,
      };

      this.logger.log(`✅ Đã cấu hình Google Service Account: ${parsed.client_email} (Project: ${parsed.project_id || 'N/A'})`);
      return this.cachedAuthStatus;
    } catch (err: any) {
      this.sheetsClient = null;
      this.driveClient = null;
      this.cachedAuthStatus = {
        isConfigured: false,
        credentialsPath: credPath,
        clientEmail: null,
        projectId: null,
        scopes: this.scopes,
        errorMessage: `Lỗi nạp file Service Account: ${err.message}`,
      };
      this.logger.error(`Lỗi nạp Service Account JSON: ${err.message}`);
      return this.cachedAuthStatus;
    }
  }

  public getSheetsClient(): sheets_v4.Sheets | null {
    return this.sheetsClient;
  }

  public getDriveClient(): drive_v3.Drive | null {
    return this.driveClient;
  }

  public getStatus(): GoogleAuthStatus {
    if (!this.cachedAuthStatus) {
      return this.initAuth();
    }
    return this.cachedAuthStatus;
  }
}

