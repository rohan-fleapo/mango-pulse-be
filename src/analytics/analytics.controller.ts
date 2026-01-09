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
  MeetViewPercentageGraphOutput,
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
  async getDashboardOverview(
    @CurrentUser() user: UserDto,
    @Query() query: AnalyticsQueryDto,
  ): Promise<GetMeetingsStatsOutput> {
    return this.analyticsService.getMeetingsStats({ user, query });
  }

  @ApiResponse({ type: AiInsightsOutput })
  @Get('ai-insights')
  @Roles('creator')
  async getMeetingsAiInsights(
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
    console.log('meetingId', meetingId);
    console.log('user', user);
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

  @ApiResponse({ type: MeetViewPercentageGraphOutput, isArray: true })
  @Get('meeting/:meetingId/view-percentage')
  @Roles('creator')
  async getMeetViewPercentageGraph(
    @Param('meetingId') meetingId: string,
    @CurrentUser() user: UserDto,
  ): Promise<MeetViewPercentageGraphOutput[]> {
    return this.analyticsService.getMeetViewPercentageGraph({
      meetingId,
      user,
    });
  }
}
