import { Controller, Get, Post, Put, Param, Query, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TourContentService } from './tour-content.service';
import { TourOaArticlesService } from './tour-oa-articles.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Kế hoạch Tour & Đề xuất Ảnh Drive (Tour Content & Google Drive Matching)')
@Controller('tour-content')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TourContentController {
  constructor(
    private tourContentService: TourContentService,
    private tourOaArticlesService: TourOaArticlesService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Kiểm tra trạng thái kết nối Google Sheets và Google Drive' })
  async getStatus() {
    return this.tourContentService.getOverallStatus();
  }

  @Get('plan')
  @ApiOperation({ summary: 'Lấy toàn bộ danh sách kế hoạch tour 3 tháng từ Google Sheets' })
  async getTourPlan() {
    return this.tourContentService.getTourPlan();
  }

  @Get('recommend/:tourId')
  @ApiOperation({ summary: 'Lấy thông tin tour và danh sách ảnh Google Drive được đề xuất theo quy tắc' })
  async getTourRecommendation(@Param('tourId') tourId: string) {
    return this.tourContentService.getTourRecommendation(tourId);
  }

  @Post('selection/:tourId')
  @ApiOperation({ summary: 'Admin lưu/duyệt danh sách ảnh được chọn cho tour' })
  async saveSelection(@Param('tourId') tourId: string, @Body('imageIds') imageIds: string[]) {
    return this.tourContentService.saveTourImageSelection(tourId, imageIds || []);
  }

  @Get('drive/folders')
  @ApiOperation({ summary: 'Lấy danh mục các thư mục khu vực trong Google Drive HÌNH ẢNH' })
  async getDriveFolders() {
    return this.tourContentService.getDriveFolders();
  }

  @Get('drive/images')
  @ApiOperation({ summary: 'Lấy danh sách ảnh trong một thư mục khu vực để admin chọn thủ công' })
  async getDriveImages(@Query('region') region: string) {
    return this.tourContentService.getDriveImagesByRegion(region || 'Sydney');
  }

  // =========================================================================
  // 📝 BÀI VIẾT ZALO OA (WORKFLOW: CHỜ DUYỆT / CHỜ DUYỆT LẠI / ĐÃ DUYỆT ĐĂNG BÀI)
  // =========================================================================

  @Get('articles')
  @ApiOperation({ summary: 'Lấy danh sách bài viết Zalo OA theo tab (PENDING_APPROVAL, REVISED_PENDING, APPROVED, ALL)' })
  async getArticles(@Query('status') status?: string, @Query('search') search?: string) {
    return this.tourOaArticlesService.findAll(status, search);
  }

  @Get('articles/:tourId')
  @ApiOperation({ summary: 'Lấy chi tiết 1 bài viết Zalo OA và demo' })
  async getArticleById(@Param('tourId') tourId: string) {
    return this.tourOaArticlesService.findOne(tourId);
  }

  @Post('articles/:tourId/approve')
  @ApiOperation({ summary: 'Chị/Admin bấm Duyệt bài viết -> Chuyển sang Đã duyệt đăng bài và tự động xuất bản lên Zalo OA' })
  async approveArticle(@Param('tourId') tourId: string, @Req() req: any) {
    const userId = req.user?.id;
    return this.tourOaArticlesService.approveArticle(tourId, userId);
  }

  @Post('articles/:tourId/publish-oa')
  @ApiOperation({ summary: 'Đăng trực tiếp bài viết lên Zalo Official Account qua API' })
  async publishArticleToOa(@Param('tourId') tourId: string) {
    return this.tourOaArticlesService.publishToZaloOa(tourId);
  }

  @Post('articles/:tourId/regenerate-selection')
  @ApiOperation({ summary: 'Viết lại đoạn văn bản được bôi đen (tô đen) bằng AI' })
  async regenerateSelection(
    @Param('tourId') tourId: string,
    @Body('selectedText') selectedText: string,
    @Body('instruction') instruction?: string,
  ) {
    return this.tourOaArticlesService.regenerateSelectedText(tourId, selectedText, instruction);
  }

  @Post('articles/:tourId/request-revision')
  @ApiOperation({ summary: 'Chị/Admin yêu cầu sửa bài -> Tự động sửa và chuyển sang Chờ duyệt lại' })
  async requestRevision(
    @Param('tourId') tourId: string,
    @Body('revisionNote') revisionNote: string,
    @Body('instructions') instructions?: string,
  ) {
    return this.tourOaArticlesService.requestRevision(tourId, revisionNote || 'Yêu cầu chỉnh sửa bài viết', instructions);
  }

  @Put('articles/:tourId')
  @ApiOperation({ summary: 'Cập nhật trực tiếp nội dung bài viết' })
  async updateArticle(@Param('tourId') tourId: string, @Body() updateData: any) {
    return this.tourOaArticlesService.updateArticle(tourId, updateData);
  }

  @Post('articles/generate-all')
  @ApiOperation({ summary: 'Tạo hoặc biên soạn lại toàn bộ 12 bài viết từ Google Sheet & Drive' })
  async generateAllArticles() {
    return this.tourOaArticlesService.generateAllArticles();
  }
}

