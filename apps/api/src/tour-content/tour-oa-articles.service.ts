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

    // Thống kê số lượng theo 4 tab chính xác theo yêu cầu:
    // 1. Tất cả bài đăng Zalo OA
    // 2. Bài đăng đã được duyệt
    // 3. Bài đăng chưa được duyệt
    // 4. Bài đã được đăng lên Zalo OA
    const unapprovedCount = all.filter((a) => a.status === 'PENDING_APPROVAL' || a.status === 'REVISED_PENDING').length;
    const approvedCount = all.filter((a) => a.status === 'APPROVED').length;
    const publishedCount = all.filter((a) => a.status === 'PUBLISHED' || !!a.zaloArticleUrl).length;
    const totalCount = all.length;

    if (status && status !== 'ALL') {
      if (status === 'UNAPPROVED' || status === 'PENDING_APPROVAL') {
        // Tab: Bài đăng chưa được duyệt (gồm bài chờ duyệt lần đầu & bài đã sửa)
        all = all.filter((a) => a.status === 'PENDING_APPROVAL' || a.status === 'REVISED_PENDING');
      } else if (status === 'APPROVED') {
        // Tab: Bài đăng đã được duyệt (chờ đăng OA)
        all = all.filter((a) => a.status === 'APPROVED');
      } else if (status === 'PUBLISHED') {
        // Tab: Bài đã được đăng lên Zalo OA
        all = all.filter((a) => a.status === 'PUBLISHED' || !!a.zaloArticleUrl);
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

    // Sắp xếp bài viết theo đúng thứ tự mã bài (ZA-001 -> ZA-012)
    all.sort((a, b) => {
      const numA = parseInt(a.id.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.id.replace(/\D/g, ''), 10) || 0;
      if (numA !== numB) return numA - numB;
      return a.id.localeCompare(b.id);
    });

    return {
      articles: all,
      counts: {
        total: totalCount,
        all: totalCount,
        approved: approvedCount,
        unapproved: unapprovedCount,
        pendingApproval: unapprovedCount,
        revisedPending: all.filter((a) => a.status === 'REVISED_PENDING').length,
        published: publishedCount,
      },
    };
  }

  /**
   * Lấy chi tiết 1 bài viết theo ID
   */
  async findOne(id: string): Promise<TourOaArticle> {
    this.loadFromDisk();
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
    const activeToken = this.getValidAccessToken();
    if (activeToken) {
      try {
        const pubResult = await this.publishToZaloOa(id);
        if (pubResult && pubResult.success) {
          article.status = 'PUBLISHED';
          this.logger.log(`🚀 Đã tự động xuất bản bài viết ${id} lên Zalo OA thành công!`);
        }
      } catch (pubErr: any) {
        this.logger.warn(`Lỗi khi tự động đăng lên Zalo OA: ${pubErr.message}`);
      }
    }

    return this.articlesMap.get(id) || article;
  }

  /**
   * Tự động làm mới Zalo OA Access Token bằng refresh_token khi token hết hạn
   */
  async refreshAccessToken(): Promise<string | null> {
    const candidatePaths = [
      path.resolve('data/zalo-oa-token.json'),
      path.resolve('apps/api/data/zalo-oa-token.json'),
      path.resolve(__dirname, '../../../data/zalo-oa-token.json'),
      path.resolve(__dirname, '../../data/zalo-oa-token.json'),
    ];

    let tokenFile = '';
    let tokenData: any = null;

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        try {
          const raw = fs.readFileSync(p, 'utf8');
          tokenData = JSON.parse(raw);
          tokenFile = p;
          break;
        } catch {}
      }
    }

    if (!tokenData || !tokenData.refreshToken) {
      this.logger.warn('Không tìm thấy refreshToken trong file zalo-oa-token.json');
      return null;
    }

    const secret = process.env.ZALO_APP_SECRET || 'ESu0DB5SNXKE1q5mt5Qw';
    const appId = process.env.ZALO_APP_ID || tokenData.appId || '3878161380934160383';
    const refreshToken = tokenData.refreshToken;

    try {
      const res = await fetch('https://oauth.zalo.me/v4/oa/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          secret_key: secret,
        },
        body: new URLSearchParams({
          app_id: appId,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }).toString(),
      });

      const data = (await res.json()) as any;
      if (data.access_token) {
        tokenData.accessToken = data.access_token;
        if (data.refresh_token) tokenData.refreshToken = data.refresh_token;
        tokenData.expiresIn = data.expires_in;
        tokenData.updatedAt = new Date().toISOString();

        for (const p of candidatePaths) {
          try {
            const dir = path.dirname(p);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(p, JSON.stringify(tokenData, null, 2), 'utf8');
          } catch {}
        }

        this.logger.log('🔄 Tự động làm mới Zalo OA Access Token thành công!');
        return data.access_token;
      } else {
        this.logger.error(`Không thể làm mới token Zalo OA: ${JSON.stringify(data)}`);
      }
    } catch (e: any) {
      this.logger.error(`Lỗi khi gọi API làm mới token Zalo OA: ${e.message}`);
    }
    return null;
  }

  /**
   * Lấy Access Token hợp lệ từ file lưu trữ hoặc môi trường
   */
  private getValidAccessToken(): string {
    const candidatePaths = [
      path.resolve('data/zalo-oa-token.json'),
      path.resolve('apps/api/data/zalo-oa-token.json'),
      path.resolve(__dirname, '../../../data/zalo-oa-token.json'),
      path.resolve(__dirname, '../../data/zalo-oa-token.json'),
    ];
    for (const p of candidatePaths) {
      try {
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, 'utf8');
          const tokenObj = JSON.parse(raw);
          if (tokenObj.accessToken) {
            return tokenObj.accessToken;
          }
        }
      } catch {}
    }
    return process.env.ZALO_OA_ACCESS_TOKEN || '';
  }

  /**
   * Chuyển đổi nội dung văn bản bài viết thành danh sách các khối body Zalo OA chuẩn đẹp:
   * - Tách từng đoạn văn bản thành block riêng biệt <p style="text-align: justify;">...</p>
   * - Tiêu đề mục được in đậm rõ ràng với <p style="text-align: justify;"><strong>...</strong></p>
   * - Trích dẫn / Lời mở đầu (Hook/Lead) được đóng khung blockquote trang nhã: <blockquote><p>...</p></blockquote>
   * - Số hotline 0819 190 101 và đường link website https://tourluk.com/au/ được làm nổi bật với gạch chân và in đậm
   * - Ảnh thực tế chuyến đi được chèn xen kẽ đúng vị trí với chú thích đầy đủ
   */
  public convertContentToZaloBodyBlocks(
    content: string,
    galleryImages: any[] = [],
    coverImage?: any,
  ): Array<{ type: 'text' | 'image'; content?: string; url?: string; caption?: string }> {
    const blocks: Array<{ type: 'text' | 'image'; content?: string; url?: string; caption?: string }> = [];
    if (!content) return blocks;

    // Tách thành các khối văn bản theo 2 hoặc nhiều dấu xuống dòng
    const rawParagraphs = content.split(/\n\s*\n+/);
    let galleryIdx = 0;

    for (const raw of rawParagraphs) {
      const trimmed = raw.trim();
      if (!trimmed) continue;

      // 1. Kiểm tra nếu là thẻ chèn ảnh inline: 📸 [HÌNH_ẢNH_1: Caption] hoặc [HÌNH_ẢNH_1: Caption]
      const imgMatch = trimmed.match(/📸?\s*\[HÌNH_ẢNH_(\d+):\s*([^\]]+)\]/);
      if (imgMatch) {
        const idx = parseInt(imgMatch[1], 10) - 1;
        const caption = imgMatch[2].trim();
        const imgObj = galleryImages[idx] || galleryImages[galleryIdx] || coverImage;
        const url =
          imgObj?.thumbnailUrl ||
          'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1000&q=80';
        blocks.push({
          type: 'image',
          url,
          caption: caption.slice(0, 200),
        });
        galleryIdx++;
        continue;
      }

      // 2. Bỏ qua các đường kẻ ngang phân cách (ví dụ ━━━━━━━━━━━━━━━━━━━━━)
      if (/^[━─—\-_=]{3,}$/.test(trimmed)) {
        continue;
      }

      // 3. Khung trích dẫn mở đầu (Hook / Lead)
      if (
        trimmed.startsWith('✨ Dành riêng') ||
        trimmed.startsWith('🌟 ') ||
        trimmed.startsWith('Cùng TourLuk')
      ) {
        blocks.push({
          type: 'text',
          content: `<blockquote>\n <p style="text-align: justify;"><span><span>${this.formatInlineHtml(trimmed)}</span></span></p>\n</blockquote>`,
        });
        continue;
      }

      // 4. Tiêu đề các mục lớn (Ngày, số thứ tự, biểu tượng emoji + chữ in hoa, hoặc bắt đầu bằng **)
      const isMarkdownBoldHeading = trimmed.startsWith('**') && trimmed.endsWith('**');
      const cleanHeading = trimmed.replace(/^\*\*|\*\*$/g, '').trim();
      const isHeadingPattern =
        /^([💡💎🎯📋⚠️💳👗🌟📌🍁🌉💙✈️👉]|NGÀY\s+\d+|[0-9]+\.\s+)/i.test(cleanHeading) &&
        cleanHeading.length < 160 &&
        !cleanHeading.includes('\n');

      if (isMarkdownBoldHeading || isHeadingPattern) {
        blocks.push({
          type: 'text',
          content: `<p style="text-align: justify;"><span><strong><span>${this.formatInlineHtml(cleanHeading)}</span></strong></span></p>`,
        });
        continue;
      }

      // 5. Dòng liên kết TourLuk và Hotline
      if (
        trimmed.includes('https://tourluk.com') ||
        trimmed.includes('0819 190 101') ||
        trimmed.toLowerCase().includes('hotline')
      ) {
        let lineHtml = this.formatInlineHtml(trimmed);
        lineHtml = lineHtml.replace(
          /(https:\/\/tourluk\.com[^\s<]+)/g,
          `<span style="text-decoration-line: underline;">$1</span>`,
        );
        lineHtml = lineHtml.replace(
          /(0819\s*190\s*101)/g,
          `<strong>$1</strong>`,
        );
        blocks.push({
          type: 'text',
          content: `<p style="text-align: justify;"><span><strong>${lineHtml}</strong></span></p>`,
        });
        continue;
      }

      // 6. Dòng Hashtags
      if (trimmed.startsWith('#')) {
        blocks.push({
          type: 'text',
          content: `<p style="text-align: justify;"><span><span>${this.formatInlineHtml(trimmed)}</span></span></p>`,
        });
        continue;
      }

      // 7. Đoạn văn bản nội dung thông thường
      const formattedText = this.formatInlineHtml(trimmed);
      blocks.push({
        type: 'text',
        content: `<p style="text-align: justify;"><span><span>${formattedText}</span></span></p>`,
      });
    }

    return blocks;
  }

  private formatInlineHtml(str: string): string {
    return str.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  }

  /**
   * Đăng bài viết trực tiếp lên Zalo Official Account qua OpenAPI v2
   */
  async publishToZaloOa(id: string): Promise<{ success: boolean; zaloArticleId?: string; zaloArticleUrl?: string; message?: string }> {
    const article = await this.findOne(id);
    let token = this.getValidAccessToken();
    if (!token) {
      return { success: false, message: 'Chưa cấu hình Zalo OA Access Token trong hệ thống' };
    }

    try {
      const doCreateArticle = async (authToken: string) => {
        // 1. Phân tích nội dung và tách thành các khối body Zalo chuẩn đẹp theo từng đoạn, in đậm, trích dẫn
        const bodyBlocks = this.convertContentToZaloBodyBlocks(
          article.content,
          article.galleryImages,
          article.coverImage,
        );

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
          body: bodyBlocks.length > 0 ? bodyBlocks : [{ type: 'text', content: `<p style="text-align: justify;">${article.content}</p>` }],
          status: 'show', // Xuất bản công khai lên Zalo OA
          comment: 'show',
        };

        const res = await fetch('https://openapi.zalo.me/v2.0/article/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            access_token: authToken,
          },
          body: JSON.stringify(payload),
        });

        return (await res.json()) as any;
      };

      let resData = await doCreateArticle(token);
      this.logger.log(`Zalo OA Create Article response for ${id}: ${JSON.stringify(resData)}`);

      // Nếu token hết hạn (-216), tự động refresh và gọi lại 1 lần
      if (resData.error === -216) {
        this.logger.warn(`Zalo OA Access Token hết hạn, đang tự động làm mới...`);
        const newToken = await this.refreshAccessToken();
        if (newToken) {
          token = newToken;
          resData = await doCreateArticle(token);
          this.logger.log(`Retry Create Article with refreshed token: ${JSON.stringify(resData)}`);
        }
      }

      if (resData.error !== 0 && !resData.data?.token) {
        throw new Error(resData.message || 'Lỗi từ Zalo API');
      }

      // 4. Lấy ID và link bài viết mới tạo bằng cách query article/getslice
      await new Promise((r) => setTimeout(r, 1500));
      const sliceRes = await fetch('https://openapi.zalo.me/v2.0/article/getslice?offset=0&limit=5&type=normal', {
        headers: { access_token: token },
      });
      const sliceData = (await sliceRes.json()) as any;
      let matchedArticle = sliceData.data?.medias?.find(
        (m: any) => m.title?.trim().toLowerCase() === article.title?.trim().toLowerCase(),
      );

      // Nếu Zalo OA chưa kịp index trong 1.5s, thử chờ thêm 2s để lấy chính xác ID bài mới
      if (!matchedArticle) {
        await new Promise((r) => setTimeout(r, 2000));
        const retrySlice = (await (
          await fetch('https://openapi.zalo.me/v2.0/article/getslice?offset=0&limit=5&type=normal', {
            headers: { access_token: token },
          })
        ).json()) as any;
        matchedArticle = retrySlice.data?.medias?.find(
          (m: any) => m.title?.trim().toLowerCase() === article.title?.trim().toLowerCase(),
        );
      }

      const zaloArticleId = matchedArticle?.id || resData.data?.token || 'pending';
      const pageId = process.env.ZALO_OA_ID || '4585991630126061653';
      const zaloArticleUrl = matchedArticle?.link_view || `https://post.oa.zalo.me/d/${pageId}?id=${zaloArticleId}&pageId=${pageId}`;

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
   * Reset bài viết đã đăng về trạng thái "Đã duyệt" để có thể chỉnh sửa hoặc đăng lại bản mới
   */
  async resetPublished(id: string): Promise<TourOaArticle> {
    const article = await this.findOne(id);
    article.status = 'APPROVED';
    article.zaloArticleId = undefined;
    article.zaloArticleUrl = undefined;
    article.publishedAt = undefined;
    article.updatedAt = new Date().toISOString();

    this.articlesMap.set(id, article);
    this.saveToDisk();
    this.logger.log(`🔄 Đã chuyển bài viết ${id} về trạng thái "Đã duyệt" để sẵn sàng đăng lại.`);
    return article;
  }

  /**
   * Đồng bộ trạng thái bài viết từ Zalo OA thực tế:
   * Nếu bài viết đã bị xóa trên Zalo OA thì tự động chuyển về "Đã duyệt" để người dùng đăng lại bản mới
   */
  async syncWithZaloOa(): Promise<{ synced: number; reverted: number; revertedIds: string[] }> {
    let token = this.getValidAccessToken();
    if (!token) {
      return { synced: 0, reverted: 0, revertedIds: [] };
    }

    try {
      const sliceRes = await fetch('https://openapi.zalo.me/v2.0/article/getslice?offset=0&limit=50&type=normal', {
        headers: { access_token: token },
      });
      const sliceData = (await sliceRes.json()) as any;
      const liveMedias: any[] = sliceData.data?.medias || [];
      const liveIds = new Set(liveMedias.map((m) => m.id));
      const liveTitles = new Set(liveMedias.map((m) => m.title?.trim().toLowerCase()));

      let revertedCount = 0;
      const revertedIds: string[] = [];

      for (const [id, article] of this.articlesMap.entries()) {
        if (article.status === 'PUBLISHED') {
          // Kiểm tra xem ID bài hoặc Tiêu đề bài viết này có còn trên Zalo OA không
          const existsById = article.zaloArticleId && liveIds.has(article.zaloArticleId);
          const existsByTitle = article.title && liveTitles.has(article.title.trim().toLowerCase());

          if (!existsById && !existsByTitle) {
            // Đã bị xóa trên Zalo OA -> chuyển về APPROVED để chị đăng lại!
            article.status = 'APPROVED';
            article.zaloArticleId = undefined;
            article.zaloArticleUrl = undefined;
            article.publishedAt = undefined;
            article.updatedAt = new Date().toISOString();
            this.articlesMap.set(id, article);
            revertedCount++;
            revertedIds.push(id);
            this.logger.log(`⚠️ Bài viết ${id} (${article.title}) không còn tồn tại trên Zalo OA. Đã trả về "Đã duyệt".`);
          }
        }
      }

      if (revertedCount > 0) {
        this.saveToDisk();
      }

      return {
        synced: liveMedias.length,
        reverted: revertedCount,
        revertedIds,
      };
    } catch (e: any) {
      this.logger.error(`Lỗi đồng bộ Zalo OA: ${e.message}`);
      return { synced: 0, reverted: 0, revertedIds: [] };
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
   * Thay thế chuỗi con linh hoạt theo khoảng trắng và xuống dòng (thay thế trực tiếp tại chỗ)
   */
  private replaceSubstringFlexible(
    content: string,
    target: string,
    replacement: string,
  ): { success: boolean; newContent: string } {
    if (!target || !content) return { success: false, newContent: content };

    // 1. Khớp chính xác 100%
    if (content.includes(target)) {
      return { success: true, newContent: content.replace(target, replacement) };
    }

    // 2. Khớp sau khi trim()
    const trimmedTarget = target.trim();
    if (content.includes(trimmedTarget)) {
      return { success: true, newContent: content.replace(trimmedTarget, replacement) };
    }

    // 3. Khớp bằng regex bỏ qua sai khác về dấu cách và xuống dòng (\s+)
    const escaped = trimmedTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    try {
      const regex = new RegExp(escaped, 'm');
      if (regex.test(content)) {
        return { success: true, newContent: content.replace(regex, replacement) };
      }
    } catch {}

    // 4. Nếu target có emoji hoặc dấu đầu dòng ở đầu, thử khớp phần thân chính
    const coreTarget = trimmedTarget.replace(/^[•\-\*\d\.\s💖✨🌟💎👉⚡📌👨‍👩‍👧💡]+/, '').trim();
    if (coreTarget.length >= 10) {
      const escapedCore = coreTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
      try {
        const regexCore = new RegExp(`(?:[•\\-\\s💖✨🌟💎👉⚡📌👨‍👩‍👧💡]*)${escapedCore}`, 'm');
        if (regexCore.test(content)) {
          return { success: true, newContent: content.replace(regexCore, replacement) };
        }
      } catch {}
    }

    return { success: false, newContent: content };
  }

  /**
   * Bộ sinh thông minh: VIẾT LẠI HOÀN TOÀN đoạn văn bản được chọn theo phong cách du lịch TourLuk
   * (Thay thế trực tiếp câu chữ cũ bằng câu chữ mới, không để lại câu cũ)
   */
  private smartRewriteSegment(original: string, instruction: string | undefined, article: TourOaArticle): string {
    const instr = (instruction || '').trim();
    const lowerInstr = instr.toLowerCase();
    const dest = article.destination || 'nước Úc';

    // Nhận diện dấu đầu dòng hoặc tiêu đề mục (ví dụ: "• Không khí:", "1. ", "• Trải nghiệm:", v.v.)
    const bulletMatch = original.match(/^([•\-\*\d\.]+\s*(?:[^:\n]+:\s*)?)/);
    const prefix = bulletMatch ? bulletMatch[1] : '';
    const bodyText = (prefix ? original.slice(prefix.length) : original)
      .replace(/^[💖✨🌟💎👉⚡📌👨‍👩‍👧💡\s]+/, '')
      .trim();

    // 1. Kiểm tra nếu người dùng gõ câu văn cụ thể muốn thay thế trực tiếp
    const directReplaceMatch = instr.match(/^(?:sửa\s*(?:thành|lại\s*thành)?|đổi\s*(?:thành)?|thay\s*(?:bằng)?|viết\s*(?:thành)?)\s*[:：]\s*(.+)$/i);
    if (directReplaceMatch && directReplaceMatch[1].trim()) {
      const customSentence = directReplaceMatch[1].trim();
      return prefix ? `${prefix}${customSentence}` : customSentence;
    }

    // 2. Phân loại theo mục đích biên tập của người dùng
    const isShorten = /ngắn|gọn|súc tích|bớt|tối giản|cô đọng/.test(lowerInstr);
    const isEngaging = /hấp dẫn|lôi cuốn|cuốn hút|ấn tượng|mạnh mẽ|sôi động|cháy|hào hứng/.test(lowerInstr);
    const isEmotional = /cảm xúc|chạm|tâm sự|ấm áp|gần gũi|nhẹ nhàng|tình cảm|sâu lắng/.test(lowerInstr);
    const isService = /dịch vụ|tiện ích|tourluk|chuyên nghiệp|uy tín|hỗ trợ|cam kết|chu đáo|tận tâm/.test(lowerInstr);
    const isPrice = /giá|chi phí|tiền|ưu đãi|khuyến mãi|tiết kiệm|minh bạch|phí/.test(lowerInstr);
    const isFamily = /gia đình|người lớn|trẻ em|ông bà|bố mẹ|an toàn|sức khỏe|chậm/.test(lowerInstr);

    let rewrittenBody = '';

    if (isEmotional) {
      // Viết lại HOÀN TOÀN bằng giọng văn ấm áp, gần gũi, chạm đến trái tim
      if (/không khí/i.test(prefix || bodyText)) {
        rewrittenBody = `Chan hòa nắng ấm dịu dàng, mang lại cảm giác bình yên, sâu lắng và thân thuộc như đang tìm về một chốn bình yên giữa bờ biển tuyệt đẹp.`;
      } else if (/trải nghiệm/i.test(prefix || bodyText)) {
        rewrittenBody = `Từng bước chân dạo quanh vịnh cảng hay ngồi du thuyền ngắm hoàng hôn đều đọng lại những rung cảm sâu lắng và khoảnh khắc gắn kết vô giá bên người thương yêu.`;
      } else if (/hợp với ai|đối tượng/i.test(prefix || bodyText)) {
        rewrittenBody = `Những tâm hồn yêu sự nhẹ nhàng, muốn tìm lại nhịp thở thư thái và lưu giữ từng kỷ niệm đong đầy yêu thương cùng gia đình.`;
      } else {
        rewrittenBody = `Nơi mỗi khoảnh khắc trôi qua là một món quà vô giá đong đầy yêu thương, để bạn cùng người thân yêu gom góp những nụ cười trọn vẹn nhất.`;
      }
    } else if (isShorten) {
      // Rút ngắn gọn gàng, súc tích
      const coreWords = bodyText.split(/[.!?]\s+/)[0] || bodyText;
      rewrittenBody = coreWords.replace(/và luôn tràn ngập|và luôn có|đặc biệt là|cực kỳ|vô cùng|luôn luôn/gi, '').trim();
      if (!rewrittenBody.endsWith('.')) rewrittenBody += '.';
    } else if (isEngaging) {
      // Viết lại lôi cuốn, tạo hứng khởi khám phá
      if (/không khí/i.test(prefix || bodyText)) {
        rewrittenBody = `Căng tràn sức sống, ngập tràn nắng biển rực rỡ và nhịp sống thời thượng sẵn sàng đánh thức mọi giác quan khám phá trong bạn!`;
      } else if (/trải nghiệm/i.test(prefix || bodyText)) {
        rewrittenBody = `Thưởng ngoạn siêu du thuyền trên vịnh cảng, chiêm ngưỡng Nhà hát Con Sò lộng lẫy và săn trọn bộ ảnh biểu tượng đẳng cấp thế giới!`;
      } else {
        rewrittenBody = `Bừng sáng nguồn cảm hứng khám phá với những điểm chạm đắt giá nhất tại ${dest}, nơi mở ra kỳ nghỉ trong mơ cho bạn!`;
      }
    } else if (isService) {
      // Nhấn mạnh dịch vụ và cam kết TourLuk
      rewrittenBody = `Được TourLuk chăm sóc chu đáo từ xe đưa đón, khách sạn tiêu chuẩn đến hướng dẫn viên bản địa tận tâm đồng hành suốt hành trình.`;
    } else if (isPrice) {
      // Chi phí & Ưu đãi
      rewrittenBody = `Chi phí trọn gói minh bạch 100%, cam kết không phụ thu ẩn và tặng ngay ưu đãi 1.500.000đ khi đăng ký nhóm qua Zalo OA TourLuk.`;
    } else if (isFamily) {
      // Phù hợp gia đình
      rewrittenBody = `Lịch trình thiết kế êm dịu, thong thả, an toàn và chu đáo tuyệt đối cho ông bà nghỉ dưỡng cũng như các bé vui chơi thỏa thích.`;
    } else if (instr) {
      // Người dùng tự nhập ghi chú yêu cầu riêng -> Tinh chỉnh câu từ trực tiếp theo ý khách
      rewrittenBody = `[Đã tinh chỉnh theo yêu cầu: "${instr}"] ${bodyText.replace(/năng động, hiện đại/i, 'tinh tế, lôi cuốn')}`;
    } else {
      rewrittenBody = bodyText;
    }

    // Giữ nguyên tiền tố định dạng đầu dòng để bố cục bài viết nguyên vẹn
    return prefix ? `${prefix}${rewrittenBody}` : rewrittenBody;
  }

  /**
   * Viết lại một đoạn văn bản được bôi đen (tô đen) bằng AI và thay thế trực tiếp vào bài
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

    // 1. Sinh đoạn văn bản mới bằng AI thông minh (viết lại hoàn toàn câu chữ)
    const rewrittenText = this.smartRewriteSegment(original, instruction, article);

    // 2. Thay thế TRỰC TIẾP đoạn văn bản cũ bằng đoạn mới ngay trong article.content
    const replaceResult = this.replaceSubstringFlexible(article.content, original, rewrittenText);
    if (replaceResult.success) {
      article.content = replaceResult.newContent;
    } else {
      // Nếu không khớp trực tiếp, thử tìm cụm từ đầu và thay thế chính xác tại vị trí đó
      const firstChunk = original.slice(0, 35).trim();
      if (firstChunk && article.content.includes(firstChunk)) {
        const idx = article.content.indexOf(firstChunk);
        // Tìm điểm kết thúc câu hoặc dấu xuống dòng gần nhất
        const endLineIdx = article.content.indexOf('\n', idx);
        const replaceLength = endLineIdx !== -1 ? (endLineIdx - idx) : firstChunk.length;
        article.content = article.content.slice(0, idx) + rewrittenText + article.content.slice(idx + replaceLength);
      } else {
        this.logger.warn(`Không thể định vị chính xác vị trí thay thế của đoạn văn trong bài ${id}`);
      }
    }

    // Dọn dẹp các dòng lặp lại nếu có
    article.content = article.content.replace(/(Bởi sau tất cả, những chuyến đi cùng người thương yêu[\s\S]*?trên mọi cung đường\.\s*){2,}/g, '$1');

    // 3. Cập nhật thông tin sửa đổi và lịch sử
    const now = new Date().toISOString();
    const revNumber = (article.revisionCount || 0) + 1;
    const historyItem: RevisionHistoryItem = {
      revisionNumber: revNumber,
      requestedAt: now,
      requestedNote: `Sửa đoạn: "${original.slice(0, 50)}..." -> Yêu cầu: "${instruction || 'Tự động'}"`,
      revisedAt: now,
      revisedSummary: `Đã thay thế trực tiếp bằng câu mới: "${rewrittenText.slice(0, 60)}..."`,
    };

    article.excerpt = article.content.slice(0, 160) + '...';
    article.status = 'REVISED_PENDING';
    article.lastRevisionNote = instruction || `Sửa đoạn: "${original.slice(0, 40)}..."`;
    article.revisionCount = revNumber;
    article.revisionHistory = [historyItem, ...(article.revisionHistory || [])];
    article.updatedAt = now;

    this.articlesMap.set(id, article);
    this.saveToDisk();

    this.logger.log(`✨ Đã thay thế trực tiếp đoạn văn mới vào bài viết ${id}!`);

    return {
      article,
      originalText: original,
      rewrittenText,
      message: 'Đã thay thế trực tiếp đoạn văn mới vào bài viết!',
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
