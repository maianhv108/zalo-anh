import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { TourContentService } from './tour-content.service';
import { PrismaService } from '../prisma/prisma.service';
import { ZaloPostStatus, AuditAction } from '@prisma/client';
import { TourContentPlanItem, DriveImageItem } from './dto/tour-content.dto';

export type TourOaArticleStatus = 'PENDING_APPROVAL' | 'REVISED_PENDING' | 'APPROVED' | 'PUBLISHED';

export interface RevisionHistoryItem {
  revisionNumber: number;
  requestedAt: string;
  requestedNote: string;
  revisedAt: string;
  revisedSummary: string;
}

export interface TourOaArticle {
  id: string; // e.g. "ZA-001"
  tourId: string;
  month: string;
  stage: string;
  week: string;
  publishDate: string;
  suggestedTime: string;
  targetAudience: string;
  contentRole: string;
  pillar: string;
  destination: string;
  format: string;
  title: string;
  hook: string;
  brief: string;
  cta: string;
  keywords: string;
  content: string;
  excerpt: string;
  status: TourOaArticleStatus;
  coverImage?: {
    id: string;
    name: string;
    thumbnailUrl: string;
    webViewLink: string;
    region: string;
  };
  galleryImages: Array<{
    id: string;
    name: string;
    thumbnailUrl: string;
    webViewLink: string;
    region: string;
  }>;
  revisionHistory: RevisionHistoryItem[];
  revisionCount: number;
  lastRevisionNote?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  publishedAt?: string;
  zaloOaPostId?: string;
}

@Injectable()
export class TourOaArticlesService {
  private readonly logger = new Logger(TourOaArticlesService.name);
  private readonly storageFilePath = path.resolve('data/tour-oa-articles.json');
  private articlesMap: Map<string, TourOaArticle> = new Map();

  constructor(
    private tourContentService: TourContentService,
    private prisma: PrismaService,
  ) {
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.storageFilePath)) {
        const raw = fs.readFileSync(this.storageFilePath, 'utf8');
        const list: TourOaArticle[] = JSON.parse(raw);
        this.articlesMap.clear();
        list.forEach((art) => this.articlesMap.set(art.id, art));
        this.logger.log(`📁 Đã nạp ${this.articlesMap.size} bài viết Zalo OA từ bộ lưu trữ.`);
      }
    } catch (e: any) {
      this.logger.warn(`Không thể nạp bài viết từ file: ${e.message}`);
    }
  }

  private saveToDisk() {
    try {
      const dir = path.dirname(this.storageFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const list = Array.from(this.articlesMap.values());
      fs.writeFileSync(this.storageFilePath, JSON.stringify(list, null, 2), 'utf8');
    } catch (e: any) {
      this.logger.error(`Lỗi khi lưu bài viết Zalo OA xuống file: ${e.message}`);
    }
  }

  /**
   * Lấy danh sách bài viết kèm bộ lọc tab: PENDING_APPROVAL, REVISED_PENDING, APPROVED, ALL
   */
  async findAll(status?: string, search?: string) {
    // Nếu chưa có bài nào được sinh, tự động sinh từ Sheet + Drive
    if (this.articlesMap.size === 0) {
      await this.generateAllArticles();
    }

    let all = Array.from(this.articlesMap.values());

    // Thống kê số lượng theo từng tab
    const pendingApprovalCount = all.filter((a) => a.status === 'PENDING_APPROVAL').length;
    const revisedPendingCount = all.filter((a) => a.status === 'REVISED_PENDING').length;
    const approvedCount = all.filter((a) => a.status === 'APPROVED' || a.status === 'PUBLISHED').length;

    if (status && status !== 'ALL') {
      all = all.filter((a) => a.status === status);
    }

    if (search) {
      const q = search.toLowerCase();
      all = all.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.hook.toLowerCase().includes(q) ||
          a.destination.toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q) ||
          a.keywords.toLowerCase().includes(q),
      );
    }

    // Sắp xếp: bài mới sửa hoặc mới tạo lên đầu
    all.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return {
      articles: all,
      counts: {
        total: this.articlesMap.size,
        pendingApproval: pendingApprovalCount,
        revisedPending: revisedPendingCount,
        approved: approvedCount,
      },
    };
  }

  /**
   * Lấy chi tiết 1 bài viết theo ID
   */
  async findOne(id: string): Promise<TourOaArticle> {
    if (this.articlesMap.size === 0) {
      await this.generateAllArticles();
    }
    const article = this.articlesMap.get(id);
    if (!article) {
      throw new NotFoundException(`Không tìm thấy bài viết với mã ${id}`);
    }
    return article;
  }

  /**
   * Duyệt bài viết -> Chuyển sang phần "Đã duyệt đăng bài"
   */
  async approveArticle(id: string, userId?: string): Promise<TourOaArticle> {
    const article = await this.findOne(id);
    const now = new Date().toISOString();

    article.status = 'APPROVED';
    article.approvedAt = now;
    article.updatedAt = now;

    // Đồng bộ vào cơ sở dữ liệu ZaloOaPost (Prisma)
    try {
      const dbUser = userId
        ? await this.prisma.user.findUnique({ where: { id: userId } })
        : await this.prisma.user.findFirst();

      if (dbUser) {
        const post = await this.prisma.zaloOaPost.create({
          data: {
            title: article.title,
            excerpt: article.excerpt,
            content: article.content,
            coverUrl: article.coverImage?.thumbnailUrl || article.coverImage?.webViewLink || null,
            category: 'TOUR',
            author: 'TourLuk Travel Official',
            status: ZaloPostStatus.DRAFT,
            isAiGenerated: true,
            aiPrompt: `Tự động tạo từ Google Sheets kế hoạch tour: ${article.id} - ${article.title}`,
            createdById: dbUser.id,
          },
        });
        article.zaloOaPostId = post.id;

        await this.prisma.auditLog.create({
          data: {
            userId: dbUser.id,
            action: AuditAction.CREATE_CAMPAIGN,
            resource: 'ZALO_OA_POST',
            resourceId: post.id,
            details: `Duyệt bài viết Zalo OA từ Google Sheet: ${article.id} - "${article.title}"`,
          },
        }).catch(() => {});
      }
    } catch (e: any) {
      this.logger.warn(`Không thể đồng bộ vào bảng ZaloOaPost: ${e.message}`);
    }

    this.articlesMap.set(id, article);
    this.saveToDisk();

    this.logger.log(`✅ Đã DUYỆT thành công bài viết ${id}. Chuyển sang danh mục "Đã duyệt đăng bài".`);
    return article;
  }

  /**
   * Yêu cầu sửa bài -> Tự động sửa theo ghi chú phản hồi của khách và chuyển sang "Chờ duyệt lại"
   */
  async requestRevision(id: string, revisionNote: string, instructions?: string): Promise<TourOaArticle> {
    const article = await this.findOne(id);
    const now = new Date().toISOString();

    // 1. Tự động tinh chỉnh nội dung bài viết theo yêu cầu sửa đổi
    const revisedContent = this.applySmartRevision(article, revisionNote, instructions);

    // 2. Ghi nhận lịch sử sửa đổi
    const revNumber = (article.revisionCount || 0) + 1;
    const historyItem: RevisionHistoryItem = {
      revisionNumber: revNumber,
      requestedAt: now,
      requestedNote: revisionNote,
      revisedAt: now,
      revisedSummary: `Đã cập nhật bài viết lần ${revNumber} theo yêu cầu: "${revisionNote}"`,
    };

    article.content = revisedContent;
    article.excerpt = revisedContent.slice(0, 160) + '...';
    article.status = 'REVISED_PENDING';
    article.lastRevisionNote = revisionNote;
    article.revisionCount = revNumber;
    article.revisionHistory = [historyItem, ...(article.revisionHistory || [])];
    article.updatedAt = now;

    this.articlesMap.set(id, article);
    this.saveToDisk();

    this.logger.log(`🔄 Đã sửa xong bài viết ${id} theo yêu cầu của admin. Chuyển sang "Chờ duyệt lại".`);
    return article;
  }

  /**
   * Cập nhật nội dung thủ công từ admin
   */
  async updateArticle(id: string, updateData: Partial<TourOaArticle>): Promise<TourOaArticle> {
    const article = await this.findOne(id);
    const now = new Date().toISOString();

    if (updateData.title) article.title = updateData.title;
    if (updateData.hook) article.hook = updateData.hook;
    if (updateData.content) {
      article.content = updateData.content;
      article.excerpt = updateData.content.slice(0, 160) + '...';
    }
    if (updateData.coverImage) article.coverImage = updateData.coverImage;
    if (updateData.galleryImages) article.galleryImages = updateData.galleryImages;

    article.updatedAt = now;
    this.articlesMap.set(id, article);
    this.saveToDisk();

    return article;
  }

  /**
   * Tạo hoặc Viết Lại Toàn Bộ 12 Bài Viết Hoàn Chỉnh từ Sheet & Drive
   */
  async generateAllArticles(): Promise<TourOaArticle[]> {
    this.logger.log('🚀 Bắt đầu tự động soạn thảo 12 bài viết Zalo OA từ Google Sheets & Google Drive...');

    // 1. Đọc dữ liệu từ Google Sheets
    const planItems = await this.tourContentService.getTourPlan();

    // 2. Với mỗi tour, tìm ảnh từ Google Drive và biên soạn nội dung Zalo OA hoàn chỉnh
    for (const item of planItems) {
      // Tìm các ảnh đề xuất cho tour này
      const rec = await this.tourContentService.getTourRecommendation(item.id);
      const topImages = (rec.matchedImages || []).slice(0, 5).map((m) => ({
        id: m.file.id,
        name: m.file.name,
        thumbnailUrl: m.file.thumbnailUrl,
        webViewLink: m.file.webViewLink,
        region: m.file.region,
      }));

      const coverImage = topImages[0];
      const galleryImages = topImages.slice(1);

      // Biên soạn nội dung bài viết Zalo OA hoàn chỉnh
      const { hook, content } = this.composeFullArticle(item, coverImage, galleryImages);

      const existing = this.articlesMap.get(item.id);

      const article: TourOaArticle = {
        id: item.id,
        tourId: item.id,
        month: item.month,
        stage: item.stage,
        week: item.week,
        publishDate: item.publishDate,
        suggestedTime: item.suggestedTime,
        targetAudience: item.targetAudience,
        contentRole: item.contentRole,
        pillar: item.pillar,
        destination: item.destination,
        format: item.format,
        title: item.title,
        hook,
        brief: item.brief,
        cta: item.cta,
        keywords: item.keywords || `Điểm đến: ${item.destination}; Phân khúc: ${item.targetAudience}`,
        content,
        excerpt: content.slice(0, 160) + '...',
        status: existing?.status || 'PENDING_APPROVAL', // Mặc định vào Chờ duyệt
        coverImage,
        galleryImages,
        revisionHistory: existing?.revisionHistory || [],
        revisionCount: existing?.revisionCount || 0,
        lastRevisionNote: existing?.lastRevisionNote,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.articlesMap.set(item.id, article);
    }

    this.saveToDisk();
    this.logger.log(`✅ Đã biên soạn hoàn chỉnh ${this.articlesMap.size} bài viết Zalo OA vào danh mục Chờ Duyệt!`);
    return Array.from(this.articlesMap.values());
  }

  /**
   * Bộ máy biên soạn nội dung bài viết Zalo OA chuẩn phong cách TourLuk
   */
  private composeFullArticle(
    item: TourContentPlanItem,
    coverImage?: any,
    galleryImages: any[] = [],
  ): { hook: string; content: string } {
    const title = item.title;
    const dest = item.destination;
    const brief = item.brief;
    const cta = item.cta || 'Mở cẩm nang và lưu lại';
    const keywords = item.keywords || '';
    const audience = item.targetAudience || 'Du khách Việt Nam';

    // 1. Tạo câu Hook thu hút
    let hook = '';
    if (item.id === 'ZA-001') {
      hook = `🌟 Bạn ấp ủ giấc mơ khám phá nước Úc nhưng lo lắng thủ tục phức tạp, chi phí mập mờ và lịch trình quá tải? Đã đến lúc trải nghiệm du lịch hoàn toàn khác biệt cùng TourLuk!`;
    } else if (item.id === 'ZA-002') {
      hook = `✈️ Chỉ còn vài ngày nữa là khởi hành sang xứ sở chuột túi nhưng bạn vẫn chưa rõ quy định hải quan Úc, tiền tệ hay di chuyển? Lưu ngay cẩm nang kiểm tra thực tế này!`;
    } else if (item.id === 'ZA-003') {
      hook = `👨‍👩‍👧‍👦 Đi Sydney cùng cả gia đình có bố mẹ lớn tuổi và trẻ nhỏ: Làm sao để vừa check-in đủ các biểu tượng nổi tiếng vừa giữ sức khỏe thoải mái cho cả nhà?`;
    } else if (item.id === 'ZA-004') {
      hook = `🏙️ Sydney hoa lệ bên vịnh biển lộng gió hay Melbourne cổ kính ngập tràn văn hóa cà phê: Thành phố nào sẽ là điểm dừng chân lý tưởng nhất cho bạn?`;
    } else if (item.id === 'ZA-005') {
      hook = `🏖️ Trốn cái lạnh mùa đông, đón nắng ấm rực rỡ tại Queensland: Nên chọn Brisbane êm đềm bên sông hay thiên đường biển Gold Coast sôi động?`;
    } else if (item.id === 'ZA-006') {
      hook = `🦘 Nếu bạn đã đi quen bờ Đông nước Úc, hãy để Perth (Tây Úc) chinh phục bạn với làn nước biển xanh ngọc, đàn Quokka đáng yêu và khung cảnh thiên nhiên nguyên sơ!`;
    } else if (item.id === 'ZA-007') {
      hook = `❤️ "Chuyến đi tuyệt vời nhất không phải là đi được nhiều nơi nhất, mà là khi ông bà và các cháu đều có những nụ cười trọn vẹn suốt dọc đường."`;
    } else if (item.id === 'ZA-008') {
      hook = `🇦🇺 Người thân từ Việt Nam sang thăm nhưng bạn bận đi làm không thể đưa đi chơi cả tuần? Đừng lo, TourLuk đã có giải pháp tour linh hoạt đón tận nơi!`;
    } else if (item.id === 'ZA-009') {
      hook = `🦞 Đi Úc ăn gì đặc sản, mua quà gì chuẩn xịn không bị hớ và nên ghé những khu chợ nào náo nhiệt nhất? Cẩm nang ẩm thực & mua sắm không thể bỏ lỡ!`;
    } else if (item.id === 'ZA-010') {
      hook = `🗓️ Bạn có 5 ngày, 7 ngày hay 10 ngày cho chuyến đi Úc sắp tới? Đừng để thời gian trôi qua lãng phí với gợi ý phân bổ lịch trình tối ưu dưới đây.`;
    } else if (item.id === 'ZA-011') {
      hook = `💰 Đi tour Úc cần chuẩn bị ngân sách bao nhiêu? Phân tích chi tiết giá trọn gói, các khoản bao gồm và kinh nghiệm tránh chi phí ẩn khi đặt tour.`;
    } else {
      hook = `💡 12 kinh nghiệm xương máu được đúc kết từ hàng trăm chuyến đi thực tế của khách hàng TourLuk: Đọc kỹ trước khi đặt chân đến nước Úc!`;
    }

    // 2. Xây dựng thân bài viết Zalo OA hoàn chỉnh
    let content = `${hook}\n\n`;

    // Phần mở đầu: Giới thiệu thông tin tour & đối tượng
    content += `📍 ĐIỂM ĐẾN: ${dest.toUpperCase()}\n`;
    content += `🎯 PHÙ HỢP CHO: ${audience}\n`;
    content += `📅 LỊCH PHÁT SÓNG ĐỀ XUẤT: ${item.publishDate} lúc ${item.suggestedTime}\n\n`;

    content += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Phần nội dung chính triển khai theo Brief và lồng ghép Keywords
    content += `✨ NỘI DUNG NỔI BẬT DÀNH CHO BẠN:\n\n`;
    content += `${brief}\n\n`;

    // Thêm các điểm nhấn thực tế chi tiết theo từng tour
    if (dest.includes('Sydney')) {
      content += `🏛️ TRẢI NGHIỆM ĐIỂM NHẤN TẠI SYDNEY:\n`;
      content += `• Ngắm nhìn Nhà hát Con Sò (Sydney Opera House) và Cầu cảng Sydney Harbour từ góc nhìn Circular Quay tuyệt đẹp.\n`;
      content += `• Thong thả dạo bộ phố cổ The Rocks, thưởng thức cà phê ngắm vịnh.\n`;
      content += `• Khám phá bãi biển Bondi / Coogee cát trắng mịn màng với làn gió biển trong lành.\n`;
      content += `• Di chuyển tiện lợi: Xe đưa đón khách sạn trung tâm, không phải đi bộ quá sức đối với gia đình có người lớn tuổi.\n\n`;
    } else if (dest.includes('Melbourne')) {
      content += `🍁 TRẢI NGHIỆM ĐIỂM NHẤN TẠI MELBOURNE:\n`;
      content += `• Chiêm ngưỡng cung đường huyền thoại Great Ocean Road và cụm đá Mười Hai Tông Đồ (12 Apostles) kỳ vĩ.\n`;
      content += `• Lạc vào những con ngõ nghệ thuật Grafitti Lane và văn hóa cà phê đậm chất châu Âu.\n`;
      content += `• Ghé thăm vườn bách thảo Fitzroy Gardens xanh mát và ngôi nhà thuyền trưởng Cook cổ kính.\n`;
      content += `• Lưu ý thời tiết: Melbourne nổi tiếng với "4 mùa trong 1 ngày", bạn nên chuẩn bị thêm áo khoác nhẹ khi di chuyển.\n\n`;
    } else if (dest.includes('Perth')) {
      content += `🌊 TRẢI NGHIỆM ĐIỂM NHẤN TẠI TÂY ÚC (PERTH):\n`;
      content += `• Khám phá Đảo Rottnest bằng xe đạp / xe buýt sinh thái, chụp ảnh selfie cùng chú chuột túi Quokka siêu thân thiện.\n`;
      content += `• Chiêm ngưỡng toàn cảnh thành phố từ Công viên Kings Park – một trong những công viên nội đô lớn nhất thế giới.\n`;
      content += `• Du thuyền ngắm hoàng hôn trên sông Swan River êm đềm.\n`;
      content += `• Thưởng thức hải sản tươi rói tại bến cảng cổ kính Fremantle.\n\n`;
    } else if (dest.includes('Queensland') || dest.includes('Brisbane') || dest.includes('Gold Coast')) {
      content += `☀️ TRẢI NGHIỆM ĐIỂM NHẤN TẠI QUEENSLAND:\n`;
      content += `• Bờ biển Surfers Paradise dài bất tận với cát vàng và sóng xanh lý tưởng để nghỉ dưỡng.\n`;
      content += `• Thành phố Brisbane trẻ trung, dạo bước khu văn hóa South Bank và ngắm sông bằng phà CityCat.\n`;
      content += `• Thiên đường giải trí công viên chủ đề (Theme Parks) cực kỳ hấp dẫn cho các bé và gia đình.\n\n`;
    } else {
      content += `💎 CAM KẾT CHẤT LƯỢNG TỪ TOURLUK TRAVEL:\n`;
      content += `✅ Lịch trình thông minh, ngắt nhịp khoa học giúp bạn tận hưởng trọn vẹn từng điểm đến.\n`;
      content += `✅ Hướng dẫn viên người Việt nhiệt huyết, chu đáo, am hiểu sâu sắc văn hóa và con người bản địa.\n`;
      content += `✅ Hỗ trợ toàn diện từ thủ tục Visa Úc, sim 4G, bảo hiểm du lịch đến điểm đón xe thuận tiện nhất.\n`;
      content += `✅ Minh bạch 100% về chi phí, không phụ thu bất ngờ, không ép mua sắm.\n\n`;
    }

    // Bổ sung chùm ảnh thực tế lấy từ Google Drive
    if (coverImage || galleryImages.length > 0) {
      content += `📸 HÌNH ẢNH THỰC TẾ TRONG BÀI VIẾT (Từ Google Drive TourLuk):\n`;
      if (coverImage) {
        content += `• [Ảnh bìa Hero]: ${coverImage.name} (Khu vực: ${coverImage.region})\n`;
      }
      galleryImages.forEach((img, idx) => {
        content += `• [Ảnh minh họa ${idx + 1}]: ${img.name} (${img.region})\n`;
      });
      content += `\n`;
    }

    content += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Phần Call To Action (CTA) chuẩn theo Sheet
    content += `👉 ${cta.toUpperCase()}\n`;
    content += `📲 Nhắn tin trực tiếp qua Zalo OA của TourLuk hoặc bấm nút "Quan tâm" ngay bên dưới để chuyên viên gửi trọn bộ thông tin và tư vấn miễn phí cho chuyến đi của bạn!\n\n`;

    // Hashtags chuẩn SEO
    content += `#TourLuk #DuLichUc #UcDeHieu #KhamPhaUc #${dest.replace(/[^a-zA-Z0-9]/g, '')} #ZaloOA #TourTronGoi`;

    return { hook, content };
  }

  /**
   * Tự động sửa bài viết theo yêu cầu của khách hàng/admin
   */
  private applySmartRevision(article: TourOaArticle, revisionNote: string, instructions?: string): string {
    let text = article.content;
    const note = revisionNote.toLowerCase();

    // 1. Nếu yêu cầu sửa về Giá / Chi phí / Khuyến mãi
    if (note.includes('giá') || note.includes('chi phí') || note.includes('tiền') || note.includes('khuyến mãi')) {
      const priceSection = `\n\n💡 THÔNG TIN CHI PHÍ & ƯU ĐÃI (Đã bổ sung theo yêu cầu):\n` +
        `• Báo giá trọn gói minh bạch, đã bao gồm vé tham quan chính, bảo hiểm du lịch quốc tế và xe đưa đón.\n` +
        `• Ưu đãi đặc quyền qua Zalo OA: Giảm ngay 1.000.000đ - 2.000.000đ khi đăng ký nhóm từ 3 người.\n` +
        `• Cam kết không phát sinh phụ phí ẩn dọc đường.\n`;
      text = text.replace(/👉 /, `${priceSection}\n👉 `);
    }

    // 2. Nếu yêu cầu sửa về Visa / Giấy tờ
    if (note.includes('visa') || note.includes('hồ sơ') || note.includes('thủ tục') || note.includes('giấy tờ')) {
      const visaSection = `\n\n🛂 LƯU Ý HỒ SƠ VISA ÚC (Đã bổ sung theo yêu cầu):\n` +
        `• Thủ tục xin Visa du lịch Úc diện 600 được TourLuk hướng dẫn chi tiết 1-1, tỷ lệ đậu cao.\n` +
        `• Khuyến nghị nộp hồ sơ trước ngày khởi hành tối thiểu 4 - 6 tuần để đảm bảo lịch trình thuận lợi.\n`;
      text = text.replace(/👉 /, `${visaSection}\n👉 `);
    }

    // 3. Nếu yêu cầu sửa về Người lớn tuổi / Trẻ em / Gia đình
    if (note.includes('người lớn') || note.includes('trẻ em') || note.includes('gia đình') || note.includes('sức khỏe')) {
      const familySection = `\n\n👨‍👩‍👧 LƯU Ý DÀNH CHO GIA ĐÌNH CÓ NGƯỜI LỚN TUỔI & TRẺ NHỎ:\n` +
        `• Lịch trình di chuyển nhẹ nhàng, thời gian nghỉ giữa các chặng hợp lý.\n` +
        `• Xe du lịch máy lạnh êm ái, đón trả tận sảnh khách sạn trung tâm.\n` +
        `• Bữa ăn chọn lọc phù hợp khẩu vị, luôn chuẩn bị nước uống và các tiện ích chu đáo.\n`;
      text = text.replace(/👉 /, `${familySection}\n👉 `);
    }

    // 4. Nếu yêu cầu sửa về Thời tiết / Trang phục
    if (note.includes('thời tiết') || note.includes('quần áo') || note.includes('mùa')) {
      const weatherSection = `\n\n⛅ KINH NGHIỆM THỜI TIẾT & TRANG PHỤC:\n` +
        `• Nước Úc có mùa ngược với Việt Nam (Mùa hè từ T12 - T2, Mùa thu T3 - T5, Mùa đông T6 - T8, Mùa xuân T9 - T11).\n` +
        `• Nên chuẩn bị trang phục nhiều lớp, giày thể thao êm chân và kem chống nắng khi tham quan ngoài trời.\n`;
      text = text.replace(/👉 /, `${weatherSection}\n👉 `);
    }

    // 5. Thêm ghi chú sửa đổi ở phần đầu hoặc cuối bài để làm rõ đã tiếp thu ý kiến
    const revisionBanner = `[CẬP NHẬT THEO YÊU CẦU: "${revisionNote}"]\n\n`;
    if (!text.startsWith('[CẬP NHẬT')) {
      text = revisionBanner + text;
    }

    return text;
  }
}
