import { Injectable, Logger } from '@nestjs/common';
import {
  TourContentPlanItem,
  DriveImageItem,
  RecommendedImage,
  TourImageRecommendationResult,
} from './dto/tour-content.dto';

interface RegionProfile {
  name: string;
  isCity: boolean;
  parentState?: string;
  keywords: string[];
}

@Injectable()
export class TourMatcherService {
  private readonly logger = new Logger(TourMatcherService.name);

  // Danh mục định nghĩa khu vực, thành phố và từ khóa địa danh nhận diện
  private readonly regionProfiles: Record<string, RegionProfile> = {
    'Sydney': {
      name: 'Sydney',
      isCity: true,
      parentState: 'New South Wales',
      keywords: [
        'sydney',
        'bondi',
        'circular quay',
        'the rocks',
        'rocks',
        'martin place',
        'coogee',
        'manly',
        'darling harbour',
        'opera house',
        'opera',
        'harbour bridge',
      ],
    },
    'New South Wales': {
      name: 'New South Wales',
      isCity: false,
      keywords: [
        'new south wales',
        'nsw',
        'blue mountains',
        'katoomba',
        'jervis bay',
        'shoalhaven',
        'kosciuszko',
        'crackenback',
        'pambula',
        'beowa',
        'hunter valley',
        'byron bay',
      ],
    },
    'Victoria': {
      name: 'Victoria',
      isCity: false,
      keywords: [
        'victoria',
        'vic',
        'melbourne',
        'halls gap',
        'grampians',
        'great ocean road',
        'yarra',
        'phillip island',
        'mornington',
        'lorrella',
        'st kilda',
      ],
    },
    'Queensland': {
      name: 'Queensland',
      isCity: false,
      keywords: [
        'queensland',
        'qld',
        'brisbane',
        'gold coast',
        'cairns',
        'port douglas',
        'great barrier reef',
        'bollon',
        'outback',
        'whitsundays',
        'daintree',
      ],
    },
    'South Australia': {
      name: 'South Australia',
      isCity: false,
      keywords: [
        'south australia',
        'adelaide',
        'barossa',
        'angaston',
        'flinders ranges',
        'blinman',
        'deep creek',
        'clare valley',
        'fleurieu',
        'kangaroo island',
      ],
    },
    'Tasmania': {
      name: 'Tasmania',
      isCity: false,
      keywords: [
        'tasmania',
        'hobart',
        'bruny island',
        'bay of fires',
        'launceston',
        'cradle mountain',
        'arthurs seat',
        'frecynet',
      ],
    },
    'Western Australia': {
      name: 'Western Australia',
      isCity: false,
      keywords: [
        'western australia',
        'wa',
        'perth',
        'pinnacles',
        'nambung',
        'cape leeuwin',
        'augusta',
        'coral coast',
        'fremantle',
        'rottnest',
        'margaret river',
      ],
    },
    'Northern Territory': {
      name: 'Northern Territory',
      isCity: false,
      keywords: [
        'northern territory',
        'nt',
        'darwin',
        'uluru',
        'kata tjuta',
        'yulara',
        'alice springs',
        'arnhem land',
        'yirrkala',
        'kakadu',
      ],
    },
  };

  /**
   * Chuẩn hóa văn bản: xóa dấu tiếng Việt, chữ thường, bỏ ký tự đặc biệt
   */
  public normalizeText(text: string): string {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Kiểm tra xem file hoặc thư mục có nằm trong danh sách loại trừ không
   * (logo, font, quảng cáo, banner, video, clip)
   */
  public isBlacklisted(fileName: string): boolean {
    const norm = this.normalizeText(fileName);
    const blacklist = [
      'logo',
      'font',
      'fonts',
      'quang cao',
      'ads',
      'banner',
      'video',
      'clip',
      'mp4',
      'nhac',
      'sound',
      'icon',
      'favicon',
    ];
    return blacklist.some((term) => norm.includes(term));
  }

  /**
   * Tìm kiếm và đề xuất ảnh cho một bài viết/tour theo đúng quy tắc kinh doanh
   */
  public matchImagesForTour(
    tour: TourContentPlanItem,
    allImages: DriveImageItem[],
    savedSelectedIds: string[] = [],
  ): TourImageRecommendationResult {
    const normDest = this.normalizeText(tour.destination);
    const normTitle = this.normalizeText(tour.title);
    const normBrief = this.normalizeText(tour.brief);
    const normSug = this.normalizeText(tour.imageSuggestions);
    const combinedTourContext = `${normDest} ${normTitle} ${normBrief} ${normSug}`;

    // 1. Xác định khu vực mục tiêu chính và khu vực mở rộng
    let primaryRegion: string | null = null;
    let fallbackRegion: string | null = null;
    const isNationwide = normDest.includes('toan nuoc uc') || normDest.includes('toan quoc');

    if (normDest.includes('sydney')) {
      primaryRegion = 'Sydney';
      fallbackRegion = 'New South Wales';
    } else if (normDest.includes('melbourne') || normDest.includes('victoria')) {
      primaryRegion = 'Victoria';
    } else if (
      normDest.includes('brisbane') ||
      normDest.includes('gold coast') ||
      normDest.includes('queensland') ||
      normDest.includes('cairns')
    ) {
      primaryRegion = 'Queensland';
    } else if (normDest.includes('perth') || normDest.includes('western australia')) {
      primaryRegion = 'Western Australia';
    } else if (normDest.includes('adelaide') || normDest.includes('south australia')) {
      primaryRegion = 'South Australia';
    } else if (normDest.includes('tasmania') || normDest.includes('hobart')) {
      primaryRegion = 'Tasmania';
    } else if (normDest.includes('uluru') || normDest.includes('northern territory') || normDest.includes('darwin')) {
      primaryRegion = 'Northern Territory';
    } else if (normDest.includes('new south wales') || normDest.includes('nsw')) {
      primaryRegion = 'New South Wales';
    }

    // 2. Chấm điểm và lọc từng ảnh trong Google Drive
    const candidates: RecommendedImage[] = [];

    for (const img of allImages) {
      // Bỏ qua các file thuộc danh sách loại trừ
      if (this.isBlacklisted(img.name)) {
        continue;
      }

      const normFileName = this.normalizeText(img.name);
      let score = 0;
      let matchedReasonParts: string[] = [];
      let isPrimaryFolder = false;
      let isFallbackFolder = false;

      // Quy tắc cấp 1: Ưu tiên thư mục thành phố / địa điểm cụ thể
      if (primaryRegion && img.folderName.toLowerCase() === primaryRegion.toLowerCase()) {
        score += 45;
        isPrimaryFolder = true;
        matchedReasonParts.push(`Thuộc thư mục ưu tiên 1 (${primaryRegion})`);
      } else if (fallbackRegion && img.folderName.toLowerCase() === fallbackRegion.toLowerCase()) {
        // Quy tắc cấp 2: Mở rộng sang thư mục bang/khu vực tương ứng
        score += 25;
        isFallbackFolder = true;
        matchedReasonParts.push(`Thuộc thư mục khu vực mở rộng (${fallbackRegion})`);
      } else if (isNationwide) {
        // Quy tắc cho tour Toàn nước Úc: chọn lọc các điểm nhấn tiêu biểu
        score += 15;
      }

      // Quy tắc cấp 3: Đối chiếu tên địa danh trong tên file với ngữ cảnh tour
      const targetRegionProfile = primaryRegion ? this.regionProfiles[primaryRegion] : null;
      let specificSpotMatched: string | null = null;

      if (targetRegionProfile) {
        for (const kw of targetRegionProfile.keywords) {
          if (normFileName.includes(kw) && combinedTourContext.includes(kw)) {
            score += 30;
            specificSpotMatched = kw;
            break;
          } else if (normFileName.includes(kw)) {
            score += 15;
            if (!specificSpotMatched) specificSpotMatched = kw;
          }
        }
      }

      // Kiểm tra xem tên file có chứa trực tiếp từ ngữ trong Brief / Tiêu đề không
      const titleWords = normTitle.split(' ').filter((w) => w.length > 3);
      for (const w of titleWords) {
        if (normFileName.includes(w)) {
          score += 10;
          matchedReasonParts.push(`Khớp từ khóa "${w}" trong tiêu đề`);
          break;
        }
      }

      if (specificSpotMatched) {
        matchedReasonParts.push(`Nhận diện địa danh "${specificSpotMatched.toUpperCase()}" trong tên ảnh`);
      }

      // Tính toán mức độ tin cậy và gán nhãn
      let confidence: 'HIGH' | 'MEDIUM' | 'NEEDS_REVIEW' = 'NEEDS_REVIEW';
      let statusLabel: 'Khớp chính xác địa điểm' | 'Khớp khu vực / thành phố' | 'Ảnh tiêu biểu toàn quốc' | 'Cần kiểm tra' =
        'Cần kiểm tra';

      if (score >= 60 && isPrimaryFolder) {
        confidence = 'HIGH';
        statusLabel = 'Khớp chính xác địa điểm';
      } else if (score >= 35 && (isPrimaryFolder || isFallbackFolder)) {
        confidence = 'MEDIUM';
        statusLabel = 'Khớp khu vực / thành phố';
      } else if (isNationwide && score >= 15) {
        confidence = 'MEDIUM';
        statusLabel = 'Ảnh tiêu biểu toàn quốc';
        matchedReasonParts.push(`Ảnh cảnh quan thực tế đại diện cho nước Úc (${img.folderName})`);
      } else {
        confidence = 'NEEDS_REVIEW';
        statusLabel = 'Cần kiểm tra';
        matchedReasonParts.push('Độ liên quan chưa rõ ràng, cần admin xác nhận thủ công');
      }

      // Chỉ thêm nếu có điểm số hoặc khớp khu vực
      if (score > 0) {
        const isSelected = savedSelectedIds.includes(img.id);
        candidates.push({
          file: img,
          score,
          confidence,
          statusLabel,
          reason: matchedReasonParts.join(' • '),
          isHeroCandidate: score >= 55,
          isSelected,
        });
      }
    }

    // Sắp xếp theo điểm số giảm dần
    candidates.sort((a, b) => b.score - a.score);

    // Lấy top ứng viên (tối đa 12 ảnh phù hợp nhất)
    const topCandidates = candidates.slice(0, 12);

    const highCount = topCandidates.filter((c) => c.confidence === 'HIGH').length;
    const summaryStatus: 'CONFIDENT' | 'NEEDS_REVIEW' = highCount > 0 ? 'CONFIDENT' : 'NEEDS_REVIEW';

    return {
      tour,
      matchedImages: topCandidates,
      selectedImageIds: savedSelectedIds,
      summary: {
        primaryFolder: primaryRegion || 'Toàn nước Úc (Nhiều vùng)',
        fallbackFolder: fallbackRegion || undefined,
        totalMatched: topCandidates.length,
        highConfidenceCount: highCount,
        status: summaryStatus,
      },
    };
  }
}

