import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOaPostDto } from './dto/create-oa-post.dto';
import { UpdateOaPostDto } from './dto/update-oa-post.dto';
import { AiGeneratePostDto } from './dto/ai-generate-post.dto';
import { ZaloPostStatus, AuditAction } from '@prisma/client';

@Injectable()
export class ZaloOaPostsService {
  private readonly logger = new Logger(ZaloOaPostsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Lấy danh sách bài viết Zalo OA kèm bộ lọc và thống kê
   */
  async findAll(query?: { status?: string; category?: string; search?: string }) {
    // 1. Kích hoạt quét tự động các bài hẹn giờ đã đến hạn
    await this.triggerAutoScheduler();

    const where: any = {};

    if (query?.status && query.status !== 'ALL') {
      where.status = query.status as ZaloPostStatus;
    }

    if (query?.category && query.category !== 'ALL') {
      where.category = query.category;
    }

    if (query?.search) {
      const q = query.search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { excerpt: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [posts, totalCount, publishedCount, scheduledCount, draftCount] = await Promise.all([
      this.prisma.zaloOaPost.findMany({
        where,
        include: {
          createdBy: {
            select: { id: true, name: true, code: true, avatarUrl: true },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
      }),
      this.prisma.zaloOaPost.count(),
      this.prisma.zaloOaPost.count({ where: { status: ZaloPostStatus.PUBLISHED } }),
      this.prisma.zaloOaPost.count({ where: { status: ZaloPostStatus.SCHEDULED } }),
      this.prisma.zaloOaPost.count({ where: { status: ZaloPostStatus.DRAFT } }),
    ]);

    // Thống kê tương tác
    const stats = {
      total: totalCount,
      published: publishedCount,
      scheduled: scheduledCount,
      draft: draftCount,
      totalViews: posts.reduce((sum, p) => sum + (p.viewsCount || 0), 0),
      totalShares: posts.reduce((sum, p) => sum + (p.sharesCount || 0), 0),
      totalLikes: posts.reduce((sum, p) => sum + (p.likesCount || 0), 0),
    };

    return {
      posts,
      stats,
    };
  }

  /**
   * Lấy chi tiết 1 bài viết
   */
  async findOne(id: string) {
    const post = await this.prisma.zaloOaPost.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, code: true, avatarUrl: true },
        },
      },
    });

    if (!post) {
      throw new NotFoundException(`Không tìm thấy bài viết Zalo OA với mã ${id}`);
    }

    return post;
  }

  /**
   * Tạo bài viết mới (hoặc Lưu Nháp, hoặc Lên Lịch Tự Động, hoặc Đăng Ngay)
   */
  async create(dto: CreateOaPostDto, userId: string) {
    let status = dto.status || ZaloPostStatus.DRAFT;
    let publishedAt: Date | null = null;
    let scheduledAt: Date | null = null;

    if (dto.scheduledAt) {
      scheduledAt = new Date(dto.scheduledAt);
      if (isNaN(scheduledAt.getTime())) {
        throw new BadRequestException('Thời gian hẹn giờ đăng bài không hợp lệ');
      }

      // Nếu ngày hẹn nhỏ hơn hoặc bằng hiện tại, chuyển sang đăng ngay
      if (scheduledAt <= new Date()) {
        status = ZaloPostStatus.PUBLISHED;
        publishedAt = new Date();
      } else {
        status = ZaloPostStatus.SCHEDULED;
      }
    } else if (status === ZaloPostStatus.PUBLISHED) {
      publishedAt = new Date();
    }

    // Mô phỏng số liệu tương tác ban đầu nếu đã xuất bản
    const initialViews = status === ZaloPostStatus.PUBLISHED ? Math.floor(Math.random() * 80) + 20 : 0;
    const initialLikes = status === ZaloPostStatus.PUBLISHED ? Math.floor(initialViews * 0.15) : 0;
    const initialShares = status === ZaloPostStatus.PUBLISHED ? Math.floor(initialViews * 0.05) : 0;

    const post = await this.prisma.zaloOaPost.create({
      data: {
        title: dto.title.trim(),
        excerpt: dto.excerpt?.trim() || dto.title.slice(0, 150),
        content: dto.content,
        coverUrl: dto.coverUrl || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
        category: dto.category || 'TOUR',
        author: dto.author || 'TourLuk Travel Official',
        status,
        scheduledAt,
        publishedAt,
        isAiGenerated: dto.isAiGenerated || false,
        aiPrompt: dto.aiPrompt || null,
        viewsCount: initialViews,
        likesCount: initialLikes,
        sharesCount: initialShares,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, code: true, avatarUrl: true },
        },
      },
    });

    // Ghi nhật ký hệ thống
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.CREATE_CAMPAIGN,
        resource: 'ZALO_OA_POST',
        resourceId: post.id,
        details: `Tạo bài viết Zalo OA: "${post.title}" (Trạng thái: ${post.status})`,
      },
    }).catch(() => {});

    return post;
  }

  /**
   * Cập nhật bài viết
   */
  async update(id: string, dto: UpdateOaPostDto, userId: string) {
    const existing = await this.findOne(id);

    let status = dto.status !== undefined ? dto.status : existing.status;
    let scheduledAt = existing.scheduledAt;
    let publishedAt = existing.publishedAt;

    if (dto.scheduledAt !== undefined) {
      if (dto.scheduledAt) {
        scheduledAt = new Date(dto.scheduledAt);
        if (scheduledAt <= new Date()) {
          status = ZaloPostStatus.PUBLISHED;
          publishedAt = new Date();
        } else {
          status = ZaloPostStatus.SCHEDULED;
        }
      } else {
        scheduledAt = null;
      }
    }

    if (status === ZaloPostStatus.PUBLISHED && !publishedAt) {
      publishedAt = new Date();
    }

    const updated = await this.prisma.zaloOaPost.update({
      where: { id },
      data: {
        title: dto.title !== undefined ? dto.title.trim() : existing.title,
        excerpt: dto.excerpt !== undefined ? dto.excerpt.trim() : existing.excerpt,
        content: dto.content !== undefined ? dto.content : existing.content,
        coverUrl: dto.coverUrl !== undefined ? dto.coverUrl : existing.coverUrl,
        category: dto.category !== undefined ? dto.category : existing.category,
        author: dto.author !== undefined ? dto.author : existing.author,
        status,
        scheduledAt,
        publishedAt,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, code: true, avatarUrl: true },
        },
      },
    });

    return updated;
  }

  /**
   * Đăng ngay lập tức một bài viết đang là Bản Nháp hoặc Chờ Hẹn Giờ
   */
  async publishNow(id: string, userId: string) {
    const existing = await this.findOne(id);

    const bonusViews = Math.floor(Math.random() * 50) + 15;
    const updated = await this.prisma.zaloOaPost.update({
      where: { id },
      data: {
        status: ZaloPostStatus.PUBLISHED,
        publishedAt: new Date(),
        scheduledAt: null,
        viewsCount: existing.viewsCount + bonusViews,
        likesCount: existing.likesCount + Math.floor(bonusViews * 0.15),
      },
      include: {
        createdBy: {
          select: { id: true, name: true, code: true, avatarUrl: true },
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.CONFIRM_CAMPAIGN,
        resource: 'ZALO_OA_POST',
        resourceId: id,
        details: `Xuất bản ngay bài viết Zalo OA: "${updated.title}"`,
      },
    }).catch(() => {});

    return updated;
  }

  /**
   * Xóa bài viết
   */
  async delete(id: string, userId: string) {
    const existing = await this.findOne(id);
    await this.prisma.zaloOaPost.delete({ where: { id } });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.CANCEL_CAMPAIGN,
        resource: 'ZALO_OA_POST',
        resourceId: id,
        details: `Xóa bài viết Zalo OA: "${existing.title}"`,
      },
    }).catch(() => {});

    return { success: true, message: `Đã xóa bài viết "${existing.title}" thành công` };
  }

  /**
   * Bộ quét tự động (Scheduler): Tự động phát hành các bài viết đã đến giờ hẹn
   */
  async triggerAutoScheduler() {
    try {
      const now = new Date();
      const duePosts = await this.prisma.zaloOaPost.findMany({
        where: {
          status: ZaloPostStatus.SCHEDULED,
          scheduledAt: { lte: now },
        },
      });

      if (duePosts.length > 0) {
        this.logger.log(`[Auto-Scheduler] Tìm thấy ${duePosts.length} bài viết Zalo OA đến giờ đăng tự động!`);
        for (const post of duePosts) {
          const views = Math.floor(Math.random() * 60) + 25;
          await this.prisma.zaloOaPost.update({
            where: { id: post.id },
            data: {
              status: ZaloPostStatus.PUBLISHED,
              publishedAt: now,
              viewsCount: views,
              likesCount: Math.floor(views * 0.18),
              sharesCount: Math.floor(views * 0.06),
            },
          });
          this.logger.log(`[Auto-Scheduler] ✅ Đã tự động xuất bản bài Zalo OA: "${post.title}"`);
        }
      }
    } catch (e: any) {
      this.logger.warn(`Lỗi khi quét lịch đăng bài tự động: ${e.message}`);
    }
  }

  /**
   * AI Viết Bài Tự Động 1-Click dành riêng cho TourLuk Travel
   */
  async aiGenerate(dto: AiGeneratePostDto) {
    const topic = dto.topic || 'TOUR_UC';
    const customPrompt = dto.customPrompt?.trim();

    // Dữ liệu mẫu các chủ đề du lịch TourLuk Travel
    const templates: Record<string, any> = {
      TOUR_UC: {
        title: '🇦🇺 TOUR ÚC MÙA XUÂN 2026: SYDNEY - MELBOURNE 6N5Đ TRỌN GÓI SIÊU HẤP DẪN',
        excerpt: 'Khám phá xứ sở chuột túi cùng TourLuk Travel! Chiêm ngưỡng Nhà hát Opera Sydney, rực rỡ sắc hoa mùa xuân Fitzroy Gardens và cung đường Great Ocean Road hùng vĩ.',
        category: 'TOUR',
        coverUrl: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1200&q=80', // Sydney Opera House
        content: `🌟 KHÁM PHÁ XỨ SỞ CHUỘT TÚI MÙA XUÂN CÙNG TOURLUK TRAVEL 🇦🇺

Mùa xuân nước Úc đang vẫy gọi với thời tiết mát mẻ lý tưởng, muôn hoa khoe sắc và những trải nghiệm thiên nhiên ngoạn mục! TourLuk hân hạnh giới thiệu hành trình trọn gói đỉnh cao:

✈️ LỊCH TRÌNH ĐIỂM NHẤN 6 NGÀY 5 ĐÊM:
• Ngày 1: TP.HCM / Hà Nội ✈️ Sydney — Check-in khách sạn 4 sao trung tâm.
• Ngày 2: Khám phá Cầu cảng Sydney Harbour, biểu tượng Nhà hát Opera House, dạo thuyền ngắm vịnh lãng mạn.
• Ngày 3: Chinh phục Dãy núi Blue Mountains kỳ vĩ, ngắm kỳ quan Ba Chị Em (Three Sisters), trải nghiệm cáp treo đáy kính.
• Ngày 4: Bay đến Melbourne — Thủ phủ văn hóa Úc, dạo bước khu vườn hoa Fitzroy rực rỡ, nhà thờ St. Patrick cổ kính.
• Ngày 5: Chuyến đi huyền thoại dọc Cung đường ven biển Great Ocean Road & Mười Hai Tông Đồ (12 Apostles).
• Ngày 6: Tự do mua sắm sâm Úc, mật ong Manuka, quà lưu niệm & Bay về Việt Nam.

💎 QUYỀN LỢI ĐẶC QUYỀN KHI ĐĂNG KÝ TẠI TOURLUK:
✅ Hỗ trợ trọn gói Visa Úc diện du lịch — Tỷ lệ đậu 99.5%, thủ tục tối giản, có nhân viên hướng dẫn 1-1.
✅ Bay hàng không quốc gia 4-5 sao (Vietnam Airlines / Qantas), hành lý 30kg khứ hồi.
✅ Khách sạn tiêu chuẩn quốc tế 4 sao trung tâm, buffet sáng mỗi ngày.
✅ Bữa ăn cao cấp: Bò Úc nướng sốt vang, lẩu hải sản tôm hùm, rượu vang bản địa.
✅ Tặng ngay bảo hiểm du lịch quốc tế quyền lợi đến 1.000.000.000 VNĐ.

🎁 ƯU ĐÃI ĐẶC BIỆT KHI LIÊN HỆ QUA ZALO OA:
👉 Giảm ngay 2.000.000đ/khách khi đăng ký theo nhóm từ 3 người.
👉 Tặng bộ quà tặng cao cấp TourLuk: Vali du lịch 24 inch + Sim 4G Úc không giới hạn.

📲 NHẮN TIN TRỰC TIẾP QUA ZALO OA HOẶC HOTLINE ĐỂ NHẬN LỊCH KHỞI HÀNH & BÁO GIÁ CHI TIẾT!
🌐 Website: tourluk.com | Hotline 24/7: 1900 6868
#TourLukTravel #TourUc #DuLichUc #Sydney #Melbourne #VisaUc #TourTronGoi`,
      },

      TOUR_AU: {
        title: '🏰 TOUR CHÂU ÂU 5 NƯỚC: PHÁP - THỤY SĨ - Ý - ĐỨC - HÀ LAN 10N9Đ CỔ KÍNH',
        excerpt: 'Chạm tay vào giấc mơ Châu Âu cùng TourLuk Travel! Dạo bước bên tháp Eiffel hoa lệ, lạc vào làng cổ Giethoorn thơ mộng và đỉnh núi tuyết Titlis Thụy Sĩ vĩnh cửu.',
        category: 'TOUR',
        coverUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80', // Paris Eiffel
        content: `✨ HÀNH TRÌNH CHÂU ÂU CỔ KÍNH — GIẤC MƠ NƯỚC PHÁP, THỤY SĨ & Ý 🇪🇺

Nếu có một chuyến đi nhất định phải đi một lần trong đời, đó chính là Châu Âu mùa đẹp nhất! Cùng TourLuk Travel viết nên câu chuyện cổ tích tại 5 quốc gia lãng mạn bậc nhất hành tinh:

🗺️ HÀNH TRÌNH 10 NGÀY 9 ĐÊM ĐI QUA CÁC THỦ PHỦ DANH TIẾNG:
🗼 PHÁP: Tháp Eiffel, Khải Hoàn Môn, Du thuyền sông Seine, Bảo tàng Louvre hoa lệ.
❄️ THỤY SĨ: Chinh phục đỉnh núi tuyết Titlis quanh năm tuyết trắng, dạo hồ Lucerne thanh bình, Cầu gỗ Chapel cổ kính.
🏛️ Ý: Đấu trường Colosseum La Mã, thánh đường Vatican, Venice - thành phố nổi lãng mạn trên mặt nước.
🌷 HÀ LAN: Làng cối xay gió Zaanse Schans, Làng cổ không lối đi xe Giethoorn xinh đẹp.
🏰 ĐỨC: Thành phố cổ Frankfurt, quảng trường Romerberg nguy nga.

👑 VÌ SAO KHÁCH HÀNG CHỌN TOURLUK TRAVEL:
✔️ Đội ngũ chuyên gia xử lý hồ sơ Visa Schengen kinh nghiệm 10+ năm, tỷ lệ đậu kỷ lục.
✔️ Trọn gói từ A-Z: Vé máy bay, Khách sạn 4 sao chuẩn Châu Âu, Xe du lịch VIP đưa đón.
✔️ Hướng dẫn viên suốt tuyến từ Việt Nam nhiệt tình, am hiểu văn hóa lịch sử bản địa.
✔️ Thực đơn phong phú kết hợp ẩm thực Âu tinh tế & món ăn Á quen thuộc.

💥 ƯU ĐÃI THÁNG NÀY:
Tặng voucher giảm giá 3.000.000đ khi liên hệ tư vấn và cọc tour trực tiếp qua kênh Zalo OA TourLuk!
Bấm nút nhắn tin Zalo OA ngay bên dưới để chuyên viên gửi ngay lịch trình ngày chi tiết!

#TourLukTravel #TourChauAu #DuLichChauAu #Phap #ThuySi #Y #VisaSchengen #ChauAu2026`,
      },

      TOUR_A: {
        title: '🍁 TOUR NHẬT BẢN MÙA LÁ ĐỎ: TOKYO - NÚI PHÚ SĨ - KYOTO - OSAKA 6N5Đ',
        excerpt: 'Đắm say sắc thu rực rỡ của xứ sở Phù Tang! Ngắm núi Phú Sĩ tuyết phủ, chiêm bái chùa Vàng Kinkakuji và trải nghiệm tắm suối khoáng nóng Onsen truyền thống.',
        category: 'TOUR',
        coverUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80', // Japan Mt Fuji
        content: `🍂 ĐẮM SAY MÙA LÁ ĐỎ NHẬT BẢN CÙNG TOURLUK TRAVEL 🇯🇵

Mùa thu Nhật Bản — thời điểm những rặng phong chuyển sang sắc đỏ rực lửa, hòa cùng nét trầm mặc của các ngôi đền nghìn năm tuổi tạo nên bức tranh thiên nhiên tuyệt mỹ!

🌸 ĐIỂM ĐẾN KHÔNG THỂ BỎ LỠ TRONG HÀNH TRÌNH:
• Tokyo: Tháp truyền hình Skytree, chùa cổ Asakusa Kannon, ngã tư Shibuya nhộn nhịp.
• Núi Phú Sĩ: Kỳ quan thiêng liêng của Nhật Bản, dạo quanh làng cổ Oshino Hakkai thanh bình.
• Trải nghiệm Onsen: Tắm suối nước khoáng nóng tự nhiên phục hồi sức khỏe & mặc Yukata truyền thống.
• Cố đô Kyoto: Rừng trúc Sagano thơ mộng, Chùa Vàng Kinkakuji dát vàng nguy nga.
• Osaka: Lâu đài Osaka cổ kính, thiên đường ẩm thực đường phố Dotonbori.

🍱 DỊCH VỤ ĐẲNG CẤP:
• Thưởng thức bò Kobe thượng hạng trứ danh, lẩu Shabu Shabu, Sushi & Sashimi tươi ngon.
• Bay thẳng cùng All Nippon Airways / Vietnam Airlines.
• Khách sạn 4 sao tiện nghi, vị trí trung tâm mua sắm.

🧧 Ưu đãi Zalo OA: Giảm ngay 1.500.000đ/khách cho 10 khách hàng đầu tiên đăng ký trong tuần này!
Nhắn tin cho TourLuk ngay để giữ chỗ khởi hành mùa thu!

#TourLukTravel #DuLichNhatBan #TourNhatBan #MuaLaDo #Tokyo #Kyoto #Osaka #PhuSi`,
      },

      PROMO: {
        title: '🔥 SIÊU BÃO ƯU ĐÃI: GIẢM ĐẾN 3.000.000Đ/KHÁCH KHI ĐĂNG KÝ TOUR NHÓM THÁNG NÀY!',
        excerpt: 'Chào đón mùa du lịch rực rỡ, TourLuk Travel tung chương trình khuyến mãi lớn nhất năm: Giảm sốc tiền mặt, tặng vali cao cấp và miễn phí phí xin Visa!',
        category: 'PROMOTION',
        coverUrl: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80', // Travel suitcase
        content: `🎉 SIÊU KHUYẾN MÃI THÁNG — DU LỊCH THẢ GA CÙNG TOURLUK TRAVEL ✈️

Nhằm tri ân quý khách hàng đã đồng hành cùng TourLuk Travel, chúng tôi gửi tặng chương trình tri ân KHỦNG NHẤT NĂM:

🎁 GÓI ƯU ĐÃI TRI ÂN DÀNH RIÊNG CHO KHÁCH HÀNG ZALO OA:
1️⃣ GIẢM TRỰC TIẾP TIỀN MẶT:
• Đăng ký nhóm từ 2 khách: Giảm ngay 1.000.000đ/khách.
• Đăng ký nhóm từ 4 khách: Giảm ngay 2.000.000đ/khách.
• Đăng ký nhóm từ 6 khách trở lên: Giảm đến 3.000.000đ/khách!

2️⃣ TẶNG BỘ QUÀ TẶNG DU LỊCH VIP:
• Vali kéo du lịch chống va đập TourLuk trị giá 1.800.000đ.
• Bình giữ nhiệt cao cấp + Gối cổ du lịch cao su non.
• Sim 4G quốc tế tốc độ cao sử dụng suốt chuyến đi.

3️⃣ HỖ TRỢ VISA DU LỊCH ĐẶC BIỆT:
• Miễn phí 100% phí dịch thuật công chứng hồ sơ Visa.
• Cam kết hoàn tiền 100% nếu hồ sơ không đạt điều kiện theo đánh giá của TourLuk.

⏰ Thời gian áp dụng: Từ nay đến hết ngày 30 tháng này (hoặc đến khi hết suất ưu đãi).
👉 ÁP DỤNG CHO TẤT CẢ CÁC TOUR: Úc, Châu Âu, Nhật Bản, Hàn Quốc, Đài Loan, Thái Lan, Bali...

📲 NHẤN NÚT "QUAN TÂM" & NHẮN TIN NGAY CHO TOURLUK TRÊN ZALO OA ĐỂ NHẬN MÃ GIẢM GIÁ ĐỘC QUYỀN!

#TourLukTravel #KhuyenMaiDuLich #TourGiaTot #GiamGiaTour #VoucherDuLich #DuLichGiaDinh`,
      },

      VISA: {
        title: '🛂 BÍ QUYẾT XIN VISA ÚC & CHÂU ÂU SCHENGEN ĐẬU 99.5% KHÔNG RỦI RO',
        excerpt: 'Bạn lo lắng về hồ sơ xin visa khó, không biết chuẩn bị tài chính và chứng minh công việc ra sao? Hãy để chuyên gia TourLuk Travel hướng dẫn chi tiết từ A-Z!',
        category: 'HANDBOOK',
        coverUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80', // Passport and visa
        content: `📘 CẨM NANG TOURLUK: BÍ QUYẾT XIN VISA DU LỊCH ÚC & CHÂU ÂU TỶ LỆ ĐẬU CAO NHẤT 🌟

Rất nhiều khách hàng chia sẻ nỗi băn khoăn: "Hộ chiếu trắng có xin được visa Úc không?", "Lương tiền mặt có xin được visa Châu Âu không?". 
Với kinh nghiệm xử lý hơn 10.000+ bộ hồ sơ thành công, TourLuk Travel xin gửi tới bạn 4 nguyên tắc vàng:

1️⃣ HỒ SƠ TÀI CHÍNH RÕ RÀNG, MINH BẠCH:
• Không cần số tiền quá lớn, quan trọng là nguồn gốc dòng tiền hợp lý qua sao kê ngân hàng 3-6 tháng.
• Bổ sung sổ đỏ nhà đất, đăng ký xe ô tô hoặc hợp đồng cho thuê tài sản nếu có để tăng điểm uy tín.

2️⃣ CHỨNG MINH CÔNG VIỆC VÀ MỐI RÀNG BUỘC CHẶT CHẼ TẠI VIỆT NAM:
• Hợp đồng lao động, đơn xin nghỉ phép đi du lịch có chữ ký doanh nghiệp, bảo hiểm xã hội (VssID).
• Nếu là chủ doanh nghiệp: Giấy phép kinh doanh và biên lai nộp thuế môn bài gần nhất.
• Sự ràng buộc gia đình: Đăng ký kết hôn, giấy khai sinh của con nhỏ.

3️⃣ LỊCH TRÌNH CHUYẾN ĐI CHI TIẾT & LOGIC (TourLuk hỗ trợ 100%):
• Vé máy bay khứ hồi, đặt phòng khách sạn tương ứng với lịch trình di chuyển từng ngày.
• Bảo hiểm du lịch quốc tế hợp lệ có mức bảo lãnh theo chuẩn Lãnh sự quán.

4️⃣ NỘP HỒ SƠ TRƯỚC NGÀY KHỞI HÀNH TỐI THIỂU 1.5 - 2 THÁNG:
• Tránh thời gian cao điểm xét duyệt kéo dài làm lỡ kế hoạch chuyến đi.

💎 TẠI SAO BẠN NÊN CHỌN DỊCH VỤ VISA CỦA TOURLUK TRAVEL:
✅ Đánh giá hồ sơ hoàn toàn MIỄN PHÍ trước khi nhận làm.
✅ Luyện phỏng vấn 1 kèm 1 với chuyên gia giàu kinh nghiệm.
✅ Chi phí trọn gói, minh bạch, cam kết không phát sinh.

👉 HÃY GỬI THÔNG TIN HỒ SƠ CỦA BẠN QUA HỘP THƯ ZALO OA ĐỂ ĐƯỢC CHUYÊN VIÊN TƯ VẤN NGAY HÔM NAY!

#TourLukTravel #VisaUc #VisaSchengen #VisaChauAu #KinhNghiemXinVisa #CamNangDuLich`,
      },
    };

    let result = templates[topic];

    // Nếu người dùng nhập custom prompt hoặc chọn chủ đề chưa có trong mẫu
    if (!result || customPrompt) {
      const pText = customPrompt || topic;
      result = {
        title: `✈️ KHÁM PHÁ HÀNH TRÌNH DU LỊCH TUYỆT VỜI CÙNG TOURLUK: ${pText.toUpperCase()}`,
        excerpt: `TourLuk Travel hân hạnh mang đến chương trình du lịch trọn gói đỉnh cao: ${pText}. Đăng ký ngay để nhận ưu đãi đặc quyền!`,
        category: 'TOUR',
        coverUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80',
        content: `🌟 TRẢI NGHIỆM KỲ NGHỈ ĐỈNH CAO CÙNG TOURLUK TRAVEL 🌍

Chủ đề chuyến đi: ${pText}

TourLuk Travel tự hào đồng hành cùng quý khách trên hành trình khám phá những danh lam thắng cảnh ngoạn mục, lưu giữ những kỷ niệm khó quên cùng gia đình và bạn bè!

✨ ĐIỂM NỔI BẬT CỦA CHUYẾN ĐI:
• Lịch trình thiết kế chuyên nghiệp, cân đối giữa tham quan, khám phá và nghỉ dưỡng thư thái.
• Hàng không tiêu chuẩn quốc tế, giờ bay thuận tiện.
• Khách sạn tiện nghi 4-5 sao trung tâm, dịch vụ chu đáo chuẩn quốc tế.
• Ẩm thực phong phú, thưởng thức trọn vẹn đặc sản địa phương.
• Hướng dẫn viên vui vẻ, tận tâm và giàu kinh nghiệm suốt tuyến.

🎁 ĐẶC QUYỀN KHI KẾT NỐI QUA ZALO OA:
👉 Giảm ngay từ 1.000.000đ - 2.000.000đ/khách khi đăng ký sớm.
👉 Hỗ trợ thủ tục trọn gói, tư vấn hồ sơ nhanh chóng 24/7.

📲 LIÊN HỆ NGAY HỘP THƯ ZALO OA ĐỂ NHẬN BÁO GIÁ VÀ GIỮ CHỖ TỐT NHẤT!
#TourLukTravel #DuLich #TourTronGoi #KhamPhaTheGioi`,
      };
    }

    return {
      success: true,
      data: result,
    };
  }
}
