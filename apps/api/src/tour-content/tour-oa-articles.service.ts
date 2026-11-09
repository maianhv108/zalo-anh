import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { TourContentService } from './tour-content.service';
import { PrismaService } from '../prisma/prisma.service';
import { ZaloPostStatus, AuditAction } from '@prisma/client';
import { TourContentPlanItem, DriveImageItem } from './dto/tour-content.dto';
import { TOUR_ARTICLE_BLUEPRINTS, generateArticleFromBlueprint } from './tour-article-templates';

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
  zaloArticleId?: string;
  zaloArticleUrl?: string;
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
    this.loadFromDisk();
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
      if (status === 'PENDING_APPROVAL') {
        // Tab Chờ Duyệt hiển thị toàn bộ bài chờ duyệt (cả bài mới và bài vừa sửa) để không bao giờ làm mất bài của người dùng
        all = all.filter((a) => a.status === 'PENDING_APPROVAL' || a.status === 'REVISED_PENDING');
      } else {
        all = all.filter((a) => a.status === status);
      }
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

    // Tự động xuất bản lên Zalo OA nếu có cấu hình Access Token
    if (process.env.ZALO_OA_ACCESS_TOKEN) {
      try {
        await this.publishToZaloOa(id);
      } catch (pubErr: any) {
        this.logger.warn(`Lỗi khi tự động đăng lên Zalo OA: ${pubErr.message}`);
      }
    }

    return this.articlesMap.get(id) || article;
  }

  /**
   * Lấy Access Token hợp lệ từ file lưu trữ hoặc môi trường
   */
  private getValidAccessToken(): string {
    try {
      const tokenPath = path.resolve('data/zalo-oa-token.json');
      if (fs.existsSync(tokenPath)) {
        const raw = fs.readFileSync(tokenPath, 'utf8');
        const tokenObj = JSON.parse(raw);
        if (tokenObj.accessToken) {
          return tokenObj.accessToken;
        }
      }
    } catch {}
    return process.env.ZALO_OA_ACCESS_TOKEN || '';
  }

  /**
   * Đăng bài viết trực tiếp lên Zalo Official Account qua OpenAPI v2
   */
  async publishToZaloOa(id: string): Promise<{ success: boolean; zaloArticleId?: string; zaloArticleUrl?: string; message?: string }> {
    const article = await this.findOne(id);
    const token = this.getValidAccessToken();
    if (!token) {
      return { success: false, message: 'Chưa cấu hình Zalo OA Access Token trong hệ thống' };
    }

    try {
      // 1. Phân tích nội dung và tách thành các khối body Zalo (text & image)
      const bodyBlocks: Array<{ type: 'text' | 'image'; content?: string; url?: string; caption?: string }> = [];
      const parts = article.content.split(/(\[HÌNH_ẢNH[^\]]+\])/g);
      let galleryIndex = 0;

      for (const part of parts) {
        if (!part.trim()) continue;
        const imgMatch = part.match(/\[HÌNH_ẢNH_\d+:\s*([^\]]+)\]/);
        if (imgMatch) {
          const caption = imgMatch[1].trim();
          const imgObj = article.galleryImages?.[galleryIndex] || article.coverImage;
          const imgUrl = imgObj?.thumbnailUrl || 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1000&q=80';
          bodyBlocks.push({
            type: 'image',
            url: imgUrl,
            caption: caption.slice(0, 200),
          });
          galleryIndex++;
        } else {
          bodyBlocks.push({
            type: 'text',
            content: part.trim(),
          });
        }
      }

      // 2. Chuẩn bị ảnh bìa
      const coverUrl = article.coverImage?.thumbnailUrl || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80';

      const payload = {
        type: 'normal',
        title: article.title.slice(0, 150),
        author: 'TourLuk Travel Official',
        cover: {
          cover_type: 'photo',
          photo_url: coverUrl,
          status: 'show',
        },
        description: (article.excerpt || article.title).slice(0, 300),
        body: bodyBlocks.length > 0 ? bodyBlocks : [{ type: 'text', content: article.content }],
        status: 'show', // Xuất bản công khai lên Zalo OA
        comment: 'show',
      };

      // 3. Gửi request tạo bài viết lên Zalo OpenAPI
      const res = await fetch('https://openapi.zalo.me/v2.0/article/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': token,
        },
        body: JSON.stringify(payload),
      });

      const resData = (await res.json()) as any;
      this.logger.log(`Zalo OA Create Article response for ${id}: ${JSON.stringify(resData)}`);

      if (resData.error !== 0 && !resData.data?.token) {
        throw new Error(resData.message || 'Lỗi từ Zalo API');
      }

      // 4. Lấy ID bài viết mới tạo bằng cách query article/getslice
      await new Promise((r) => setTimeout(r, 1500));
      const sliceRes = await fetch('https://openapi.zalo.me/v2.0/article/getslice?offset=0&limit=3&type=normal', {
        headers: { access_token: token },
      });
      const sliceData = (await sliceRes.json()) as any;
      const latestArticle = sliceData.data?.medias?.[0];

      const zaloArticleId = latestArticle?.id || resData.data?.token || 'pending';
      const pageId = process.env.ZALO_OA_ID || '4585991630126061653';
      const zaloArticleUrl = latestArticle?.link_view || `https://post.oa.zalo.me/d/${pageId}?id=${zaloArticleId}&pageId=${pageId}`;

      // 5. Cập nhật bài viết trong hệ thống
      article.status = 'PUBLISHED';
      article.publishedAt = new Date().toISOString();
      article.zaloArticleId = zaloArticleId;
      article.zaloArticleUrl = zaloArticleUrl;

      this.articlesMap.set(id, article);
      this.saveToDisk();

      this.logger.log(`🎉 ĐÃ ĐĂNG THÀNH CÔNG BÀI VIẾT ${id} LÊN ZALO OA! Link: ${zaloArticleUrl}`);
      return {
        success: true,
        zaloArticleId,
        zaloArticleUrl,
        message: 'Đã xuất bản bài viết thành công lên Zalo Official Account!',
      };
    } catch (e: any) {
      this.logger.error(`Lỗi khi đăng bài viết ${id} lên Zalo OA: ${e.message}`);
      return { success: false, message: e.message };
    }
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
   * Thay thế chuỗi con linh hoạt theo khoảng trắng và xuống dòng
   */
  private replaceSubstringFlexible(
    content: string,
    target: string,
    replacement: string,
  ): { success: boolean; newContent: string } {
    if (content.includes(target)) {
      return { success: true, newContent: content.replace(target, replacement) };
    }
    const trimmedTarget = target.trim();
    if (content.includes(trimmedTarget)) {
      return { success: true, newContent: content.replace(trimmedTarget, replacement) };
    }
    const escaped = trimmedTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    try {
      const regex = new RegExp(escaped, 'm');
      if (regex.test(content)) {
        return { success: true, newContent: content.replace(regex, replacement) };
      }
    } catch {}
    return { success: false, newContent: content };
  }

  /**
   * Bộ sinh thông minh viết lại đoạn văn bản được chọn theo phong cách du lịch TourLuk
   */
  private smartRewriteSegment(original: string, instruction: string | undefined, article: TourOaArticle): string {
    const instr = (instruction || '').trim();
    const lowerInstr = instr.toLowerCase();
    const dest = article.destination || 'nước Úc';
    const cleanOriginal = original.replace(/^[✨🌟💎👉⚡💖📌👨‍👩‍👧💡]+\s*/, '').trim();

    const isShorten = /ngắn|gọn|súc tích|bớt|tối giản|cô đọng/.test(lowerInstr);
    const isEngaging = /hấp dẫn|lôi cuốn|cuốn hút|ấn tượng|mạnh mẽ|sôi động|cháy|hào hứng/.test(lowerInstr);
    const isEmotional = /cảm xúc|chạm|tâm sự|ấm áp|gần gũi|nhẹ nhàng|tình cảm|sâu lắng/.test(lowerInstr);
    const isService = /dịch vụ|tiện ích|tourluk|chuyên nghiệp|uy tín|hỗ trợ|cam kết|chu đáo|tận tâm/.test(lowerInstr);
    const isPrice = /giá|chi phí|tiền|ưu đãi|khuyến mãi|tiết kiệm|minh bạch|phí/.test(lowerInstr);
    const isFamily = /gia đình|người lớn|trẻ em|ông bà|bố mẹ|an toàn|sức khỏe|chậm/.test(lowerInstr);

    // Nếu người dùng gõ yêu cầu cụ thể riêng (custom prompt)
    if (instr && !isShorten && !isEngaging && !isEmotional && !isService && !isPrice && !isFamily) {
      return `✨ ${cleanOriginal}\n\n👉 [Biên tập theo yêu cầu: "${instr}"] Từng điểm dừng chân và dịch vụ đều được TourLuk chăm chút kỹ lưỡng, đảm bảo đáp ứng trọn vẹn mong đợi của quý khách!`;
    }

    if (isShorten) {
      const firstSentence = cleanOriginal.split(/[.!?]\s+/)[0] || cleanOriginal;
      return `⚡ ${firstSentence.trim()} — Mọi chi tiết đã sẵn sàng để bạn tận hưởng trọn vẹn vẻ đẹp ${dest}!`;
    }

    if (isEngaging) {
      return `🌟 ${cleanOriginal}\n\nĐừng chỉ ngắm nhìn qua màn hình, hãy để từng làn gió mát lành và khung cảnh kỳ vĩ của ${dest} đánh thức mọi giác quan trong chuyến đi tuyệt vời này cùng TourLuk!`;
    }

    if (isEmotional) {
      return `💖 ${cleanOriginal}\n\nBởi sau tất cả, những chuyến đi cùng người thương yêu mới chính là món quà vô giá đọng lại mãi theo năm tháng. TourLuk trân quý từng nụ cười hạnh phúc của bạn trên mọi cung đường.`;
    }

    if (isService) {
      return `💎 ${cleanOriginal}\n\n✅ Cam kết vàng từ TourLuk Travel: Lịch trình tinh gọn không mua sắm gượng ép, hướng dẫn viên nhiệt tình như người nhà, hỗ trợ thủ tục từ A-Z trọn gói và minh bạch.`;
    }

    if (isPrice) {
      return `💡 ${cleanOriginal}\n\n🎁 Chi phí công khai, cam kết không phát sinh phụ phí ẩn. Ưu đãi độc quyền qua Zalo OA: Giảm ngay 1.500.000đ khi đăng ký nhóm từ 3 người trở lên!`;
    }

    if (isFamily) {
      return `👨‍👩‍👧 ${cleanOriginal}\n\n🛡️ Thiết kế hoàn hảo cho cả gia đình có người cao tuổi và trẻ nhỏ: Xe đưa đón êm ái, nhịp tham quan thong thả, thực đơn phù hợp và đội ngũ luôn túc trực hỗ trợ chu đáo.`;
    }

    return `✨ ${cleanOriginal}\n\n(Đoạn văn đã được AI viết lại trôi chảy, súc tích và giàu sức truyền cảm hơn cho khách du lịch).`;
  }

  /**
   * Viết lại một đoạn văn bản được bôi đen (tô đen) bằng AI
   */
  async regenerateSelectedText(
    id: string,
    selectedText: string,
    instruction?: string,
  ): Promise<{ article: TourOaArticle; originalText: string; rewrittenText: string; message: string }> {
    const article = await this.findOne(id);
    const original = (selectedText || '').trim();

    if (!original) {
      throw new BadRequestException('Vui lòng cung cấp đoạn văn bản cần viết lại');
    }

    // 1. Sinh đoạn văn bản mới bằng AI thông minh
    const rewrittenText = this.smartRewriteSegment(original, instruction, article);

    // 2. Thay thế đoạn văn bản cũ bằng đoạn mới trong article.content
    const replaceResult = this.replaceSubstringFlexible(article.content, original, rewrittenText);
    if (!replaceResult.success) {
      this.logger.warn(`Không tìm thấy đoạn văn bản chính xác trong bài ${id}, thử ghép theo cụm từ đầu...`);
      const firstChunk = original.slice(0, 30).trim();
      if (firstChunk && article.content.includes(firstChunk)) {
        article.content = article.content.replace(firstChunk, `${rewrittenText}\n`);
      } else {
        article.content = `${article.content}\n\n${rewrittenText}`;
      }
    } else {
      article.content = replaceResult.newContent;
    }

    // 3. Cập nhật thông tin sửa đổi và lịch sử
    const now = new Date().toISOString();
    const revNumber = (article.revisionCount || 0) + 1;
    const historyItem: RevisionHistoryItem = {
      revisionNumber: revNumber,
      requestedAt: now,
      requestedNote: `Sửa đoạn tô đen: "${original.slice(0, 50)}..." ${instruction ? `-> Yêu cầu: "${instruction}"` : ''}`,
      revisedAt: now,
      revisedSummary: `Đã viết lại đoạn văn bản bằng AI: ${instruction || 'Tối ưu văn phong lôi cuốn'}`,
    };

    article.excerpt = article.content.slice(0, 160) + '...';
    article.status = 'REVISED_PENDING';
    article.lastRevisionNote = instruction || `Sửa đoạn: "${original.slice(0, 40)}..."`;
    article.revisionCount = revNumber;
    article.revisionHistory = [historyItem, ...(article.revisionHistory || [])];
    article.updatedAt = now;

    this.articlesMap.set(id, article);
    this.saveToDisk();

    this.logger.log(`✨ Đã viết lại thành công đoạn văn bản trong bài viết ${id} theo yêu cầu: "${instruction || 'Tự động'}"`);

    return {
      article,
      originalText: original,
      rewrittenText,
      message: 'Đã viết lại đoạn văn bản thành công!',
    };
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
   * Bộ máy biên soạn nội dung bài viết Zalo OA chuẩn phong cách TourLuk bám sát Google Sheet
   * Tùy độ dài để bố trí 1 ảnh (bài ngắn) hoặc 2-3 ảnh (bài dài) xen kẽ hợp lý
   */
  private composeFullArticle(
    item: TourContentPlanItem,
    coverImage?: any,
    galleryImages: any[] = [],
  ): { hook: string; content: string } {
    const blueprint = TOUR_ARTICLE_BLUEPRINTS[item.id];
    if (blueprint) {
      return generateArticleFromBlueprint(blueprint, coverImage, galleryImages);
    }

    // Fallback nếu không tìm thấy blueprint
    const hook = `🌟 Khám phá nước Úc trọn vẹn và an tâm cùng TourLuk Travel!`;
    const content = `${hook}\n\n${item.brief}\n\n👉 ${item.cta}`;
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
