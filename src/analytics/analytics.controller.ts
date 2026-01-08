import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
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

  @Get('engagement')
  @Roles('creator')
  @ApiOperation({
    summary: 'Get engagement statistics',
    description:
      'Get statistics about meeting engagements including interest levels, attendance, and ratings (Creator only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Engagement stats retrieved successfully',
    type: EngagementStatsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Creator role required',
  })
  async getEngagementStats(
    @Query() query: AnalyticsQueryDto,
  ): Promise<EngagementStatsDto> {
    return this.analyticsService.getEngagementStats(query);
  }

  @Get('feedback')
  @Roles('creator')
  @ApiOperation({
    summary: 'Get feedback statistics',
    description:
      'Get statistics about meeting feedbacks including ratings and interest in next meetings (Creator only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Feedback stats retrieved successfully',
    type: FeedbackStatsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Creator role required',
  })
  async getFeedbackStats(
    @Query() query: AnalyticsQueryDto,
  ): Promise<FeedbackStatsDto> {
    return this.analyticsService.getFeedbackStats(query);
  }

  @Get('activity')
  @Roles('creator')
  @ApiOperation({
    summary: 'Get activity statistics',
    description:
      'Get statistics about meeting activities including session duration and active users (Creator only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Activity stats retrieved successfully',
    type: ActivityStatsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Creator role required',
  })
  async getActivityStats(
    @Query() query: AnalyticsQueryDto,
  ): Promise<ActivityStatsDto> {
    return this.analyticsService.getActivityStats(query);
  }
}
