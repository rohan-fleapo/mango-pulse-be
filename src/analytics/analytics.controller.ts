import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { UserDto } from '../users/dto';
import { AnalyticsService } from './analytics.service';
import {
  ActivityAnalyticsOutput,
  AiInsightsOutput,
  AnalyticsQueryDto,
  MeetingDetailsAnalyticsOutput,
} from './dto';
import { GetMeetingsStatsOutput } from './dto/meeting-stats.dto';

@ApiTags('Analytics')
@ApiBearerAuth('JWT-auth')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @ApiResponse({ type: GetMeetingsStatsOutput })
  @Get('meetings-stats')
  @Roles('creator')
  async getMeetingsStats(
    @CurrentUser() user: UserDto,
    @Query() query: AnalyticsQueryDto,
  ): Promise<GetMeetingsStatsOutput> {
    return this.analyticsService.getMeetingsStats({ user, query });
  }

  @ApiResponse({ type: AiInsightsOutput })
  @Get('ai-insights')
  @Roles('creator')
  async getAiInsights(
    @CurrentUser() user: UserDto,
    @Query() query: AnalyticsQueryDto,
  ): Promise<AiInsightsOutput> {
    return this.analyticsService.getAiInsights({ user, query });
  }

  @ApiResponse({ type: ActivityAnalyticsOutput })
  @Get('meeting/:meetingId')
  @Roles('creator')
  async getActivityAnalytics(
    @Param('meetingId') meetingId: string,
    @CurrentUser() user: UserDto,
  ): Promise<ActivityAnalyticsOutput> {
    return this.analyticsService.getActivityAnalytics({ meetingId, user });
  }

  @ApiResponse({ type: MeetingDetailsAnalyticsOutput })
  @Get('meeting/:meetingId/details')
  @Roles('creator')
  async getMeetingAnalyticsDetails(
    @Param('meetingId') meetingId: string,
    @CurrentUser() user: UserDto,
  ): Promise<MeetingDetailsAnalyticsOutput> {
    return this.analyticsService.getMeetingAnalyticsDetails({
      meetingId,
      user,
    });
  }
}
