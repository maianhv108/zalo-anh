export interface TourContentPlanItem {
  id: string; // e.g. "ZA-001"
  month: string; // "Tháng 1"
  stage: string; // "Nhận biết"
  week: string; // "Tuần 1"
  publishDate: string; // "24/09/2026"
  suggestedTime: string; // "11:30"
  targetAudience: string; // "Cả 3 nhóm khách"
  contentRole: string; // "Giá trị"
  pillar: string; // "Cẩm Nang Úc"
  destination: string; // "Toàn nước Úc", "Sydney / NSW", etc.
  format: string; // "Zalo OA bài viết/broadcast"
  title: string; // "TourLuk giúp người Việt khám phá Úc dễ hiểu hơn như thế nào?"
  brief: string; // "Giới thiệu định vị Úc Dễ Hiểu Cùng TourLuk..."
  cta: string; // "Mở cẩm nang và lưu lại"
  imageSourceRequirement: string; // "Hình thật ưu tiên + đồ họa"
  imageSuggestions: string; // "Hero image thật tại Toàn nước Úc..."
  keywords?: string; // Col U: Từ khóa / Chủ đề
  kpi?: string; // Col V: KPI chính
  verificationSource?: string; // Col W: Nguồn kiểm chứng
  usageRights?: string; // Col X: Quyền sử dụng
  status: string; // "Chưa bắt đầu"
}

export interface DriveImageItem {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  webViewLink: string;
  thumbnailUrl: string;
  folderId: string;
  folderName: string;
  region: string;
}

export type MatchConfidence = 'HIGH' | 'MEDIUM' | 'NEEDS_REVIEW';

export interface RecommendedImage {
  file: DriveImageItem;
  score: number;
  confidence: MatchConfidence;
  statusLabel: 'Khớp chính xác địa điểm' | 'Khớp khu vực / thành phố' | 'Ảnh tiêu biểu toàn quốc' | 'Cần kiểm tra';
  reason: string;
  isHeroCandidate: boolean;
  isSelected?: boolean;
}

export interface TourImageRecommendationResult {
  tour: TourContentPlanItem;
  matchedImages: RecommendedImage[];
  selectedImageIds: string[];
  summary: {
    primaryFolder: string;
    fallbackFolder?: string;
    totalMatched: number;
    highConfidenceCount: number;
    status: 'CONFIDENT' | 'NEEDS_REVIEW';
  };
}

export interface GoogleConnectionStatusDto {
  sheets: {
    connected: boolean;
    authMode: 'SERVICE_ACCOUNT' | 'API_KEY' | 'PUBLIC_READ' | 'NOT_CONFIGURED';
    spreadsheetId: string;
    sheetName: string;
    rowCount: number;
    lastCheckedAt: string;
    message: string;
  };
  drive: {
    connected: boolean;
    authMode: 'SERVICE_ACCOUNT' | 'API_KEY' | 'PUBLIC_READ' | 'NOT_CONFIGURED';
    folderId: string;
    folderName: string;
    totalRegions: number;
    totalFiles: number;
    lastCheckedAt: string;
    message: string;
  };
  overallReady: boolean;
  instructions: string[];
}

