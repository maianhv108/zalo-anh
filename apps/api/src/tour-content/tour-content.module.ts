import { Module } from '@nestjs/common';
import { TourContentController } from './tour-content.controller';
import { TourContentService } from './tour-content.service';
import { GoogleSheetsService } from './google-sheets.service';
import { GoogleDriveService } from './google-drive.service';
import { TourMatcherService } from './tour-matcher.service';
import { GoogleAuthService } from './google-auth.service';
import { TourOaArticlesService } from './tour-oa-articles.service';

@Module({
  controllers: [TourContentController],
  providers: [
    GoogleAuthService,
    TourContentService,
    GoogleSheetsService,
    GoogleDriveService,
    TourMatcherService,
    TourOaArticlesService,
  ],
  exports: [TourContentService, GoogleAuthService, TourOaArticlesService],
})
export class TourContentModule {}

