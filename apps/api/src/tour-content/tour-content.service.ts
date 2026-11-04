import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { GoogleSheetsService } from './google-sheets.service';
import { GoogleDriveService } from './google-drive.service';
import { TourMatcherService } from './tour-matcher.service';
import { GoogleAuthService } from './google-auth.service';
import { GoogleConnectionStatusDto, TourImageRecommendationResult } from './dto/tour-content.dto';

@Injectable()
export class TourContentService {
  private readonly logger = new Logger(TourContentService.name);
  private readonly selectionStoragePath = path.resolve('data/tour-selections.json');

  // Lưu trữ lựa chọn ảnh của admin theo từng tour ID
  private tourSelections: Record<string, string[]> = {};

  constructor(
    private googleAuthService: GoogleAuthService,
    private googleSheetsService: GoogleSheetsService,
    private googleDriveService: GoogleDriveService,
    private tourMatcherService: TourMatcherService,
  ) {
    this.loadSelectionsFromFile();
  }

  /**
   * Đọc bộ nhớ lưu trữ lựa chọn ảnh của admin
   */
  private loadSelectionsFromFile() {
    try {
      if (fs.existsSync(this.selectionStoragePath)) {
        const raw = fs.readFileSync(this.selectionStoragePath, 'utf8');
        this.tourSelections = JSON.parse(raw);
      }
    } catch (e: any) {
      this.logger.warn(`Không thể nạp dữ liệu tour selections: ${e.message}`);
      this.tourSelections = {};
    }
  }

  /**
   * Ghi lưu trữ lựa chọn ảnh của admin xuống file
   */
  private saveSelectionsToFile() {
    try {
      const dir = path.dirname(this.selectionStoragePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.selectionStoragePath, JSON.stringify(this.tourSelections, null, 2), 'utf8');
    } catch (e: any) {
      this.logger.error(`Lỗi ghi file tour selections: ${e.message}`);
    }
  }

  /**
   * Lấy tình trạng kết nối Google Sheets & Google Drive tổng thể
   */
  public async getOverallStatus(): Promise<any> {
    const authStatus = this.googleAuthService.getStatus();
    const [sheetsStatus, driveStatus] = await Promise.all([
      this.googleSheetsService.checkStatus(),
      this.googleDriveService.checkStatus(),
    ]);

    const instructions = [
      '1. Đặt file JSON tải từ Google Cloud vào thư mục secrets/ hoặc thư mục Downloads trên máy tính của bạn.',
      '2. Mở file .env tại thư mục gốc của dự án.',
      '3. Thêm dòng: GOOGLE_APPLICATION_CREDENTIALS="đường_dẫn_tới_file_json"',
      '   Ví dụ Windows: GOOGLE_APPLICATION_CREDENTIALS=C:/Users/ASUS/Downloads/tool-zalo-tourluk-xxxx.json',
      '4. Bật 2 API trên Google Cloud: "Google Sheets API" và "Google Drive API" trong mục "Enabled APIs & services".',
      '5. Mở file Sheets và Drive, bấm "Share" và cấp quyền "Viewer" cho email của Service Account.',
    ];

    return {
      auth: {
        isConfigured: authStatus.isConfigured,
        clientEmail: authStatus.clientEmail,
        projectId: authStatus.projectId,
        credentialsPath: authStatus.credentialsPath,
        scopes: authStatus.scopes,
        errorMessage: authStatus.errorMessage,
      },
      sheets: {
        connected: sheetsStatus.connected,
        authMode: sheetsStatus.authMode,
        apiEnabled: (sheetsStatus as any).apiEnabled,
        spreadsheetId: sheetsStatus.spreadsheetId,
        sheetName: sheetsStatus.sheetName,
        rowCount: sheetsStatus.rowCount,
        lastCheckedAt: sheetsStatus.lastCheckedAt,
        message: sheetsStatus.message,
      },
      drive: {
        connected: driveStatus.connected,
        authMode: driveStatus.authMode,
        apiEnabled: (driveStatus as any).apiEnabled,
        folderId: driveStatus.folderId,
        folderName: driveStatus.folderName,
        totalRegions: driveStatus.totalRegions,
        totalFiles: driveStatus.totalFiles,
        lastCheckedAt: driveStatus.lastCheckedAt,
        message: driveStatus.message,
      },
      overallReady: sheetsStatus.connected && driveStatus.connected,
      instructions,
    };
  }

  /**
   * Lấy danh sách toàn bộ kế hoạch tour từ Google Sheets
   */
  public async getTourPlan() {
    return this.googleSheetsService.getTourPlan();
  }

  /**
   * Lấy chi tiết một bài viết tour kèm danh sách ảnh được đề xuất từ Google Drive
   */
  public async getTourRecommendation(tourId: string): Promise<TourImageRecommendationResult> {
    const tour = await this.googleSheetsService.getTourById(tourId);
    if (!tour) {
      throw new Error(`Không tìm thấy bài viết tour với mã: ${tourId}`);
    }

    const allImages = await this.googleDriveService.getAllImages();
    const savedSelectedIds = this.tourSelections[tourId] || [];

    return this.tourMatcherService.matchImagesForTour(tour, allImages, savedSelectedIds);
  }

  /**
   * Lưu ảnh được admin duyệt/chọn cho tour
   */
  public async saveTourImageSelection(tourId: string, imageIds: string[]) {
    this.tourSelections[tourId] = imageIds;
    this.saveSelectionsToFile();
    return {
      success: true,
      tourId,
      selectedCount: imageIds.length,
      message: `Đã lưu thành công ${imageIds.length} ảnh được duyệt cho tour ${tourId}!`,
    };
  }

  /**
   * Lấy danh mục thư mục Drive để admin duyệt ảnh thủ công
   */
  public async getDriveFolders() {
    return this.googleDriveService.getFolderList();
  }

  /**
   * Lấy danh sách ảnh trong một thư mục khu vực
   */
  public async getDriveImagesByRegion(region: string) {
    return this.googleDriveService.getImagesByRegion(region);
  }
}

