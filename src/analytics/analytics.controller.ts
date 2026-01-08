import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { AnalyticsResponseDto } from './dto';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth('JWT-auth')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('stats')
  @Roles('creator')
  @ApiOperation({
    summary: 'Get analytics stats',
    description: 'Get general statistics about users and platform usage (Creator only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Analytics stats retrieved successfully',
    type: AnalyticsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Creator role required' })
  async getStats(): Promise<AnalyticsResponseDto> {
    return this.analyticsService.getStats();
  }
}
