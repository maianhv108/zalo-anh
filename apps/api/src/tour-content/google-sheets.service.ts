import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import { TourContentPlanItem } from './dto/tour-content.dto';
import { GoogleAuthService } from './google-auth.service';

@Injectable()
export class GoogleSheetsService {
  private readonly logger = new Logger(GoogleSheetsService.name);

  // Spreadsheet ID & GID được cung cấp trong yêu cầu
  public readonly spreadsheetId = '1QeSKAO3ugvLGp8_Sii6ZQX_6DrYrMozG06eeDr8kN0M';
  public readonly sheetGid = '122891847';
  public readonly sheetName = 'Zalo OA';

  private cachedPlan: { items: TourContentPlanItem[]; fetchedAt: number } | null = null;
  private readonly cacheTtlMs = 5 * 60 * 1000; // 5 phút

  constructor(private googleAuthService: GoogleAuthService) {}

  /**
   * Phân tích cú pháp CSV thuần (khi dùng chế độ fallback)
   */
  private parseCsvRows(text: string): string[][] {
    const lines: string[][] = [];
    let row: string[] = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const next = text[i + 1];

      if (c === '"') {
        if (inQuotes && next === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        row.push(cur.trim());
        cur = '';
      } else if ((c === '\r' || c === '\n') && !inQuotes) {
        if (c === '\r' && next === '\n') i++;
        row.push(cur.trim());
        cur = '';
        if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
          lines.push(row);
        }
        row = [];
      } else {
        cur += c;
      }
    }
    if (cur.length > 0 || row.length > 0) {
      row.push(cur.trim());
      lines.push(row);
    }
    return lines;
  }

  /**
   * Tải nội dung bảng tính: ưu tiên qua Google Sheets API v4 chính thức (Service Account)
   */
  public async getTourPlan(forceRefresh = false): Promise<TourContentPlanItem[]> {
    const now = Date.now();
    if (!forceRefresh && this.cachedPlan && now - this.cachedPlan.fetchedAt < this.cacheTtlMs) {
      return this.cachedPlan.items;
    }

    const sheetsClient = this.googleAuthService.getSheetsClient();

    // 1. Thử gọi qua Google Sheets API v4 chính thức nếu đã có Service Account
    if (sheetsClient) {
      try {
        this.logger.log(`Đang đọc Google Sheets qua API v4 chính thức (Service Account: ${this.googleAuthService.getStatus().clientEmail})...`);
        const res = await sheetsClient.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: `'${this.sheetName}'!A1:Z100`,
        });

        const rows = res.data.values || [];
        const items = this.parseRowsToTourItems(rows);

        if (items.length > 0) {
          this.cachedPlan = { items, fetchedAt: now };
          this.logger.log(`✅ Đã đồng bộ thành công ${items.length} kế hoạch tour qua Google Sheets API v4 (Xác thực an toàn)`);
          return items;
        }
      } catch (err: any) {
        this.logger.warn(`Lỗi khi gọi Google Sheets API v4 chính thức: ${err.message}. Đang thử fallback...`);
      }
    }

    // 2. Chế độ Fallback: đọc qua HTTP endpoint nếu link công khai
    try {
      const csvData = await this.fetchSheetCsv();
      const rows = this.parseCsvRows(csvData);
      const items = this.parseRowsToTourItems(rows);

      this.cachedPlan = { items, fetchedAt: now };
      this.logger.log(`✅ Đã đồng bộ thành công ${items.length} kế hoạch tour từ Google Sheet "${this.sheetName}" (Chế độ Fallback)`);
      return items;
    } catch (err: any) {
      this.logger.error(`Lỗi khi đọc dữ liệu Google Sheets: ${err.message}`);
      throw err;
    }
  }

  /**
   * Chuyển đổi mảng dòng thành danh sách TourContentPlanItem
   */
  private parseRowsToTourItems(rows: any[][]): TourContentPlanItem[] {
    const items: TourContentPlanItem[] = [];
    // Tiêu đề bắt đầu từ dòng 4 (index 3), dữ liệu bắt đầu từ dòng 5 (index 4)
    for (let i = 4; i < rows.length; i++) {
      const row = rows[i] || [];
      const id = String(row[0] || '').trim();
      if (!id || !id.startsWith('ZA-')) continue;

      items.push({
        id,
        month: String(row[1] || '').trim(),
        stage: String(row[2] || '').trim(),
        week: String(row[3] || '').trim(),
        publishDate: String(row[4] || '').trim(),
        suggestedTime: String(row[5] || '').trim(),
        targetAudience: String(row[6] || '').trim(),
        contentRole: String(row[7] || '').trim(),
        pillar: String(row[8] || '').trim(),
        destination: String(row[9] || '').trim(),
        format: String(row[10] || '').trim(),
        title: String(row[11] || '').trim(),
        brief: String(row[12] || '').trim(),
        cta: String(row[13] || '').trim(),
        imageSourceRequirement: String(row[14] || '').trim(),
        imageSuggestions: String(row[15] || '').trim(),
        keywords: String(row[20] || '').trim(),
        kpi: String(row[21] || '').trim(),
        verificationSource: String(row[22] || '').trim(),
        usageRights: String(row[23] || '').trim(),
        status: String(row[24] || 'Chưa bắt đầu').trim(),
      });
    }
    return items;
  }

  /**
   * Tải CSV từ Google Sheets GViz endpoint (chỉ hoạt động khi file có link chia sẻ)
   */
  private async fetchSheetCsv(): Promise<string> {
    const url = `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/gviz/tq?tqx=out:csv&gid=${this.sheetGid}`;
    return new Promise((resolve, reject) => {
      https
        .get(url, (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`Google Sheets HTTP ${res.statusCode}: ${res.statusMessage}`));
            return;
          }
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => resolve(data));
        })
        .on('error', reject);
    });
  }

  /**
   * Lấy chi tiết một tour theo mã ID (ví dụ: ZA-001)
   */
  public async getTourById(id: string): Promise<TourContentPlanItem | null> {
    const plan = await this.getTourPlan();
    return plan.find((t) => t.id === id) || null;
  }

  /**
   * Kiểm tra tình trạng kết nối Google Sheets và trạng thái API trên Google Cloud
   */
  public async checkStatus() {
    const authStatus = this.googleAuthService.getStatus();
    const sheetsClient = this.googleAuthService.getSheetsClient();

    // 1. Nếu có Service Account, kiểm tra API chính thức
    if (authStatus.isConfigured && sheetsClient) {
      try {
        const res = await sheetsClient.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: `'${this.sheetName}'!A1:B10`,
        });
        const rows = res.data.values || [];

        return {
          connected: true,
          authMode: 'SERVICE_ACCOUNT' as const,
          apiEnabled: true,
          clientEmail: authStatus.clientEmail,
          projectId: authStatus.projectId,
          spreadsheetId: this.spreadsheetId,
          sheetName: this.sheetName,
          rowCount: (await this.getTourPlan()).length,
          lastCheckedAt: new Date().toISOString(),
          message: `Đã kết nối thành công qua Google Sheets API v4 chính thức (Service Account: ${authStatus.clientEmail}). Đọc dữ liệu riêng tư an toàn 100%.`,
        };
      } catch (err: any) {
        const errMsg = err.message || '';
        let isApiDisabled = errMsg.includes('has not been used') || errMsg.includes('disabled');
        let isPermissionDenied = errMsg.includes('permission') || errMsg.includes('The caller does not have permission');

        let helpMessage = `Lỗi API Google Sheets: ${errMsg}`;
        if (isApiDisabled) {
          helpMessage = `⚠️ Google Sheets API chưa được BẬT trong dự án Google Cloud "${authStatus.projectId}". Hãy vào mục "Enabled APIs & services" và bấm BẬT Google Sheets API.`;
        } else if (isPermissionDenied) {
          helpMessage = `⚠️ Service Account "${authStatus.clientEmail}" chưa được cấp quyền xem Google Sheets này. Hãy mở bảng tính, bấm Share (Chia sẻ) và thêm email trên với quyền Viewer.`;
        }

        return {
          connected: false,
          authMode: 'SERVICE_ACCOUNT' as const,
          apiEnabled: !isApiDisabled,
          clientEmail: authStatus.clientEmail,
          projectId: authStatus.projectId,
          spreadsheetId: this.spreadsheetId,
          sheetName: this.sheetName,
          rowCount: 0,
          lastCheckedAt: new Date().toISOString(),
          message: helpMessage,
          rawError: errMsg,
        };
      }
    }

    // 2. Chế độ Fallback công khai
    try {
      const items = await this.getTourPlan(true);
      return {
        connected: true,
        authMode: 'PUBLIC_READ' as const,
        apiEnabled: false,
        clientEmail: null,
        projectId: null,
        spreadsheetId: this.spreadsheetId,
        sheetName: this.sheetName,
        rowCount: items.length,
        lastCheckedAt: new Date().toISOString(),
        message: `Đang chạy ở chế độ Fallback (Link công khai). Chưa kích hoạt Service Account có xác thực.`,
      };
    } catch (err: any) {
      return {
        connected: false,
        authMode: 'NOT_CONFIGURED' as const,
        apiEnabled: false,
        clientEmail: null,
        projectId: null,
        spreadsheetId: this.spreadsheetId,
        sheetName: this.sheetName,
        rowCount: 0,
        lastCheckedAt: new Date().toISOString(),
        message: `Chưa thể kết nối tới Google Sheets: ${err.message}`,
      };
    }
  }
}
