import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators';
import { ZoomParticipantDto, ZoomValidationDto, ZoomWebhookDto } from './dto';
import { ZoomService } from './zoom.service';

@ApiTags('Zoom')
@Controller('zoom')
export class ZoomController {
  private readonly logger = new Logger(ZoomController.name);

  constructor(private readonly zoomService: ZoomService) {}

  /**
   * Webhook endpoint for Zoom events
   */
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive Zoom webhook events',
    description: 'Endpoint for receiving Zoom meeting lifecycle events',
  })
  @ApiBody({ type: ZoomWebhookDto })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  handleWebhook(@Body() input: ZoomWebhookDto) {
    this.logger.log(`Received webhook: ${input.event}`);

    // Verify webhook signature (important for production)
    const isValid = this.zoomService.verifyWebhookSignature();

    if (!isValid) {
      this.logger.warn('Invalid webhook signature');
      return { status: 'invalid_signature' };
    }

    // Handle the webhook event
    return this.zoomService.handleWebhook({ webhookData: input });
  }

  /**
   * Endpoint to handle Zoom URL Validation
   */
  @Public()
  @Post('webhook/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate Zoom webhook URL',
    description: 'Endpoint for Zoom webhook URL validation challenge',
  })
  @ApiBody({ type: ZoomValidationDto })
  @ApiResponse({
    status: 200,
    description: 'Validation token echoed back',
  })
  validateWebhook(@Body() input: ZoomValidationDto) {
    if (input.payload?.plainToken) {
      return {
        plainToken: input.payload.plainToken,
        encryptedToken: input.payload.plainToken,
      };
    }

    return { status: 'ok' };
  }

  /**
   * Get participants for a specific meeting
   */
  @Get('meetings/:meetingId/participants')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get meeting participants',
    description: 'Get list of participants for a specific meeting',
  })
  @ApiParam({
    name: 'meetingId',
    description: 'Zoom meeting ID',
    example: '123456789',
  })
  @ApiResponse({
    status: 200,
    description: 'List of participants',
    type: [ZoomParticipantDto],
  })
  getMeetingParticipants(
    @Param('meetingId') meetingId: string,
  ): ZoomParticipantDto[] {
    return this.zoomService.getMeetingParticipants({ meetingId });
  }
}
