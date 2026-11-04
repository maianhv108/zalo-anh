import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import { DriveImageItem } from './dto/tour-content.dto';
import { GoogleAuthService } from './google-auth.service';

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);

  // Thư mục gốc "HÌNH ẢNH" được cung cấp trong yêu cầu
  public readonly rootFolderId = '1uQ9VqyonDHn7VKMtAOlkK3VUCewtn7mo';

  // Danh mục 8 thư mục khu vực trong HÌNH ẢNH
  public readonly regionFolders: Record<string, string> = {
    'Sydney': '1vRcVoGh7vohENiWir1BmeRzaUDb5KZWD',
    'New South Wales': '1Zm3vR9O5I1k7iAGTFZeU04UFaVGzH9Q0',
    'Victoria': '1wkGyW6Q-N-uAJTXJTcwr6iQe3ozQRhub',
    'Queensland': '11fMvFgJxMJuCn9OxV_1NZ5WHWDY_FIbY',
    'South Australia': '11HmP8kN69tIqS9oKOTOkiOyGLGLjKqZj',
    'Tasmania': '1LB7Lkt3fsfi23yergQ-AEsPsjpMJaIY8',
    'Western Australia': '1Ln_YEYcRNF5-rLfcVpBGBtWv8Ceq0vX0',
    'Northern Territory': '1PrsrrxYhDtraukOJH8OFtx7M2KB65tmn',
  };

  private cachedImages: { images: DriveImageItem[]; fetchedAt: number } | null = null;
  private readonly cacheTtlMs = 15 * 60 * 1000; // 15 phút

  constructor(private googleAuthService: GoogleAuthService) {}

  /**
   * Trích xuất danh sách file ảnh từ một thư mục Google Drive
   * Ưu tiên qua Google Drive API v3 chính thức khi có Service Account
   */
  private async fetchFolderFiles(folderName: string, folderId: string): Promise<DriveImageItem[]> {
    const driveClient = this.googleAuthService.getDriveClient();

    // 1. Thử gọi qua Google Drive API v3 chính thức
    if (driveClient) {
      try {
        const res = await driveClient.files.list({
          q: `'${folderId}' in parents and trashed = false and mimeType contains 'image/'`,
          fields: 'files(id, name, mimeType, size, webViewLink, thumbnailLink)',
          pageSize: 100,
        });

        const files = (res.data.files || []).map((f) => ({
          id: f.id || '',
          name: f.name || '',
          mimeType: f.mimeType || 'image/jpeg',
          size: f.size ? Number(f.size) : undefined,
          webViewLink: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
          thumbnailUrl: f.thumbnailLink || `https://lh3.googleusercontent.com/d/${f.id}=w800`,
          folderId,
          folderName,
          region: folderName,
        }));

        if (files.length > 0) {
          return files;
        }
      } catch (err: any) {
        this.logger.warn(`Lỗi Google Drive API v3 cho thư mục ${folderName}: ${err.message}. Đang thử fallback...`);
      }
    }

    // 2. Chế độ Fallback: đọc qua HTTP nếu thư mục có link chia sẻ
    return new Promise((resolve) => {
      const url = `https://drive.google.com/drive/folders/${folderId}`;
      https
        .get(url, (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            const marker = "window['_DRIVE_ivd'] = '";
            const idx = data.indexOf(marker);
            if (idx === -1) {
              resolve([]);
              return;
            }
            try {
              const endIdx = data.indexOf("';", idx + marker.length);
              const rawEscaped = data.substring(idx + marker.length, endIdx);
              const unescaped = rawEscaped.replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) =>
                String.fromCharCode(parseInt(hex, 16)),
              );
              const parsed = JSON.parse(unescaped);
              const items = parsed[0] || [];
              const files: DriveImageItem[] = [];

              for (const item of items) {
                const id = item[0];
                const name = item[2];
                const mime = item[3];
                const size = item[13] || undefined;

                if (mime && mime.startsWith('image/')) {
                  files.push({
                    id,
                    name,
                    mimeType: mime,
                    size,
                    webViewLink: `https://drive.google.com/file/d/${id}/view`,
                    thumbnailUrl: `https://lh3.googleusercontent.com/d/${id}=w800`,
                    folderId,
                    folderName,
                    region: folderName,
                  });
                }
              }
              resolve(files);
            } catch (e: any) {
              this.logger.warn(`Lỗi bóc tách ảnh cho thư mục ${folderName}: ${e.message}`);
              resolve([]);
            }
          });
        })
        .on('error', (err) => {
          this.logger.warn(`Lỗi HTTP kết nối thư mục ${folderName}: ${err.message}`);
          resolve([]);
        });
    });
  }

  /**
   * Lấy toàn bộ ảnh từ tất cả các thư mục khu vực trong HÌNH ẢNH
   */
  public async getAllImages(forceRefresh = false): Promise<DriveImageItem[]> {
    const now = Date.now();
    if (!forceRefresh && this.cachedImages && now - this.cachedImages.fetchedAt < this.cacheTtlMs) {
      return this.cachedImages.images;
    }

    this.logger.log('Bắt đầu đồng bộ danh mục ảnh từ Google Drive HÌNH ẢNH...');
    const allImages: DriveImageItem[] = [];

    // Duyệt qua từng khu vực
    for (const [regionName, folderId] of Object.entries(this.regionFolders)) {
      try {
        const files = await this.fetchFolderFiles(regionName, folderId);
        allImages.push(...files);
      } catch (err: any) {
        this.logger.warn(`Không thể lấy ảnh từ ${regionName}: ${err.message}`);
      }
    }

    this.cachedImages = { images: allImages, fetchedAt: now };
    this.logger.log(`✅ Đã đồng bộ thành công ${allImages.length} ảnh thực tế từ 8 khu vực Google Drive`);
    return allImages;
  }

  /**
   * Lấy danh sách ảnh thuộc riêng một khu vực
   */
  public async getImagesByRegion(region: string): Promise<DriveImageItem[]> {
    const all = await this.getAllImages();
    return all.filter((img) => img.region.toLowerCase() === region.toLowerCase());
  }

  /**
   * Lấy danh sách cây thư mục để phục vụ duyệt thủ công
   */
  public async getFolderList() {
    const all = await this.getAllImages();
    const folderMap: Record<string, { folderId: string; folderName: string; count: number }> = {};

    for (const [name, id] of Object.entries(this.regionFolders)) {
      folderMap[name] = {
        folderId: id,
        folderName: name,
        count: all.filter((img) => img.folderName === name).length,
      };
    }

    return Object.values(folderMap);
  }

  /**
   * Kiểm tra tình trạng kết nối Google Drive và kiểm tra xem Google Drive API đã bật chưa
   */
  public async checkStatus() {
    const authStatus = this.googleAuthService.getStatus();
    const driveClient = this.googleAuthService.getDriveClient();

    // 1. Nếu có Service Account, kiểm tra API chính thức
    if (authStatus.isConfigured && driveClient) {
      try {
        // Kiểm tra quyền truy cập thư mục gốc "HÌNH ẢNH"
        const folderRes = await driveClient.files.get({
          fileId: this.rootFolderId,
          fields: 'id, name, mimeType',
        });

        const all = await this.getAllImages(false);

        return {
          connected: true,
          authMode: 'SERVICE_ACCOUNT' as const,
          apiEnabled: true,
          clientEmail: authStatus.clientEmail,
          projectId: authStatus.projectId,
          folderId: this.rootFolderId,
          folderName: folderRes.data.name || 'HÌNH ẢNH',
          totalRegions: Object.keys(this.regionFolders).length,
          totalFiles: all.length,
          lastCheckedAt: new Date().toISOString(),
          message: `Đã kết nối thành công qua Google Drive API v3 chính thức (Service Account: ${authStatus.clientEmail}). Đọc dữ liệu riêng tư an toàn 100%.`,
        };
      } catch (err: any) {
        const errMsg = err.message || '';
        let isApiDisabled = errMsg.includes('has not been used') || errMsg.includes('disabled');
        let isPermissionDenied = errMsg.includes('File not found') || errMsg.includes('permission') || errMsg.includes('The caller does not have permission');

        let helpMessage = `Lỗi API Google Drive: ${errMsg}`;
        if (isApiDisabled) {
          helpMessage = `⚠️ Google Drive API chưa được BẬT trong dự án Google Cloud "${authStatus.projectId}". Hãy vào mục "Enabled APIs & services" và bấm BẬT Google Drive API.`;
        } else if (isPermissionDenied) {
          helpMessage = `⚠️ Thư mục Google Drive "HÌNH ẢNH" (ID: ${this.rootFolderId}) chưa được chia sẻ cho Service Account "${authStatus.clientEmail}". Hãy mở thư mục HÌNH ẢNH, bấm Share (Chia sẻ) và thêm email trên với quyền Viewer.`;
        }

        return {
          connected: false,
          authMode: 'SERVICE_ACCOUNT' as const,
          apiEnabled: !isApiDisabled,
          clientEmail: authStatus.clientEmail,
          projectId: authStatus.projectId,
          folderId: this.rootFolderId,
          folderName: 'HÌNH ẢNH',
          totalRegions: Object.keys(this.regionFolders).length,
          totalFiles: 0,
          lastCheckedAt: new Date().toISOString(),
          message: helpMessage,
          rawError: errMsg,
        };
      }
    }

    // 2. Chế độ Fallback công khai
    try {
      const all = await this.getAllImages(false);
      return {
        connected: all.length > 0,
        authMode: 'PUBLIC_READ' as const,
        apiEnabled: false,
        clientEmail: null,
        projectId: null,
        folderId: this.rootFolderId,
        folderName: 'HÌNH ẢNH',
        totalRegions: Object.keys(this.regionFolders).length,
        totalFiles: all.length,
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
        folderId: this.rootFolderId,
        folderName: 'HÌNH ẢNH',
        totalRegions: 0,
        totalFiles: 0,
        lastCheckedAt: new Date().toISOString(),
        message: `Chưa thể kết nối tới Google Drive: ${err.message}`,
      };
    }
  }
}
