import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { UserDto } from '../users/dto';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto';
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
}
