import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators';
import {
  CreateZoomMeetingDto,
  UpdateZoomMeetingDto,
  ZoomCreateMeetingResponseDto,
  ZoomMeetingRecordingsResponseDto,
  ZoomParticipantDto,
  ZoomPastMeetingParticipantsResponseDto,
  ZoomValidationDto,
  ZoomWebhookDto,
} from './dto';
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
    description:
      'Endpoint for receiving Zoom meeting lifecycle events (meeting.started, meeting.ended, participant_joined, participant_left). This endpoint is public and should be configured in Zoom webhook settings.',
  })
  @ApiBody({ type: ZoomWebhookDto })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid webhook payload',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid webhook signature',
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
  @Public()
  @Get('meetings/:meetingId/participants')
  @ApiOperation({
    summary: 'Get meeting participants',
    description:
      'Get list of participants for a specific meeting. Returns participants tracked from webhook events.',
  })
  @ApiParam({
    name: 'meetingId',
    description: 'Zoom meeting ID',
    example: '123456789',
  })
  @ApiResponse({
    status: 200,
    description: 'List of participants retrieved successfully',
    type: [ZoomParticipantDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Meeting not found or no participants tracked',
  })
  getMeetingParticipants(
    @Param('meetingId') meetingId: string,
  ): ZoomParticipantDto[] {
    return this.zoomService.getMeetingParticipants({ meetingId });
  }

  @Public()
  @Post('/meeting')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a Zoom meeting',
    description:
      'Creates a new scheduled Zoom meeting for the specified user. The meeting can include invitees, video settings, waiting room, and other configurations.',
  })
  @ApiBody({ type: CreateZoomMeetingDto })
  @ApiResponse({
    status: 201,
    description: 'Meeting created successfully',
    type: ZoomCreateMeetingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Invalid meeting data or missing required fields',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Zoom user ID does not exist',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to create meeting in Zoom',
  })
  async createMeeting(
    @Body() createMeetingDto: CreateZoomMeetingDto,
  ): Promise<ZoomCreateMeetingResponseDto> {
    return this.zoomService.createMeeting(createMeetingDto);
  }

  /**
   * Update a Zoom meeting
   */
  @Public()
  @Patch('meetings/:meetingId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a Zoom meeting',
    description:
      'Updates an existing Zoom meeting. Only provided fields will be updated.',
  })
  @ApiParam({
    name: 'meetingId',
    description: 'Zoom meeting ID (numeric)',
    example: 85367388662,
    type: Number,
  })
  @ApiBody({ type: UpdateZoomMeetingDto })
  @ApiResponse({
    status: 200,
    description: 'Meeting updated successfully',
    type: ZoomCreateMeetingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid meeting data',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Meeting does not exist',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to update meeting in Zoom',
  })
  async updateMeeting(
    @Param('meetingId') meetingId: number,
    @Body() updateMeetingDto: UpdateZoomMeetingDto,
  ): Promise<string> {
    return this.zoomService.updateMeeting(meetingId, updateMeetingDto);
  }

  /**
   * Delete a Zoom meeting
   */
  @Public()
  @Delete('meetings/:meetingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a Zoom meeting',
    description:
      'Deletes an existing Zoom meeting. This action cannot be undone.',
  })
  @ApiParam({
    name: 'meetingId',
    description: 'Zoom meeting ID (numeric)',
    example: 85367388662,
    type: Number,
  })
  @ApiResponse({
    status: 204,
    description: 'Meeting deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Meeting does not exist',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to delete meeting in Zoom',
  })
  async deleteMeeting(@Param('meetingId') meetingId: number): Promise<void> {
    return this.zoomService.deleteMeeting(meetingId);
  }

  /**
   * Get past meeting participants
   */
  @Public()
  @Get('past_meetings/:meetingId/participants')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get past meeting participants',
    description:
      'Retrieves a list of participants from a past meeting with their join/leave times, duration, and status.',
  })
  @ApiParam({
    name: 'meetingId',
    description: 'Zoom meeting ID (numeric)',
    example: 85367388662,
    type: Number,
  })
  @ApiQuery({
    name: 'page_size',
    description: 'Number of records returned per page',
    required: false,
    example: 30,
    type: Number,
  })
  @ApiQuery({
    name: 'next_page_token',
    description: 'Next page token for pagination',
    required: false,
    example: '',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Past meeting participants retrieved successfully',
    type: ZoomPastMeetingParticipantsResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Meeting does not exist or is not a past meeting',
  })
  @ApiResponse({
    status: 500,
    description:
      'Internal server error - Failed to retrieve past meeting participants from Zoom',
  })
  async getPastMeetingParticipants(
    @Param('meetingId') meetingId: number,
    @Query('page_size') pageSize?: number,
    @Query('next_page_token') nextPageToken?: string,
  ): Promise<ZoomPastMeetingParticipantsResponseDto> {
    return this.zoomService.getPastMeetingParticipants(
      meetingId,
      pageSize || 30,
      nextPageToken,
    );
  }

  /**
   * Get meeting recordings
   */
  @Public()
  @Get('meetings/:meetingId/recordings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get meeting recordings',
    description:
      'Retrieves all recordings from a meeting including video, audio, and timeline files with download and play URLs.',
  })
  @ApiParam({
    name: 'meetingId',
    description: 'Zoom meeting ID (numeric)',
    example: 88086032604,
    type: Number,
  })
  @ApiQuery({
    name: 'include_fields',
    description: 'Comma-separated list of fields to include',
    required: false,
    example: 'a2f19f96-9294-4f51-8134-6f0eea108eb2',
    type: String,
  })
  @ApiQuery({
    name: 'ttl',
    description: 'Time to live for download URLs in days',
    required: false,
    example: 1,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Meeting recordings retrieved successfully',
    type: ZoomMeetingRecordingsResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Meeting does not exist or has no recordings',
  })
  @ApiResponse({
    status: 500,
    description:
      'Internal server error - Failed to retrieve meeting recordings from Zoom',
  })
  async getMeetingRecordings(
    @Param('meetingId') meetingId: number,
    @Query('include_fields') includeFields?: string,
    @Query('ttl') ttl?: number,
  ): Promise<ZoomMeetingRecordingsResponseDto> {
    return this.zoomService.getMeetingRecordings(
      meetingId,
      includeFields,
      ttl || 1,
    );
  }
}
