import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { UserDto } from '../users/dto';
import { AnalyticsService } from './analytics.service';
import {
  ActivityStatsDto,
  AnalyticsQueryDto,
  EngagementStatsDto,
  FeedbackStatsDto,
} from './dto';

@ApiTags('Analytics')
@ApiBearerAuth('JWT-auth')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @ApiResponse({ type: EngagementStatsDto })
  @Get('engagement')
  @Roles('creator')
  async getEngagementStats(
    @CurrentUser() user: UserDto,
    @Query() query: AnalyticsQueryDto,
  ): Promise<EngagementStatsDto> {
    return this.analyticsService.getEngagementStats({ user, query });
  }

  @ApiResponse({ type: FeedbackStatsDto })
  @Get('feedback')
  @Roles('creator')
  async getFeedbackStats(
    @CurrentUser() user: UserDto,
    @Query() query: AnalyticsQueryDto,
  ): Promise<FeedbackStatsDto> {
    return this.analyticsService.getFeedbackStats({ user, query });
  }

  @ApiResponse({ type: ActivityStatsDto })
  @Get('activity')
  @Roles('creator')
  async getActivityStats(
    @CurrentUser() user: UserDto,
    @Query() query: AnalyticsQueryDto,
  ): Promise<ActivityStatsDto> {
    return this.analyticsService.getActivityStats({ user, query });
  }
}
