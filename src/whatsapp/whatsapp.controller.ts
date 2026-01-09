import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators';
import { SendWhatsAppTemplateDto } from './dto/send-message.dto';
import { WhatsAppWebhookInput } from './dto/webhook.dto';
import { WhatsAppService } from './whatsapp.service';

@ApiTags('WhatsApp')
@Controller('whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(private readonly whatsAppService: WhatsAppService) {}

  /**
   * Send template message
   */
  @Public()
  @Post('send/template')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a template message via WhatsApp' })
  @ApiBody({ type: SendWhatsAppTemplateDto })
  @ApiResponse({
    status: 200,
    description: 'Template message sent successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async sendTemplateMessage(@Body() dto: SendWhatsAppTemplateDto) {
    return this.whatsAppService.sendTemplateMessage(dto);
  }

  /**
   * Webhook verification endpoint (GET)
   * Meta will call this endpoint to verify the webhook URL
   */
  @Public()
  @Get('webhook')
  @ApiOperation({ summary: 'Verify WhatsApp webhook (Meta verification)' })
  @ApiQuery({ name: 'hub.mode', description: 'Verification mode' })
  @ApiQuery({ name: 'hub.verify_token', description: 'Verification token' })
  @ApiQuery({ name: 'hub.challenge', description: 'Challenge string' })
  @ApiResponse({ status: 200, description: 'Webhook verified successfully' })
  @ApiResponse({ status: 403, description: 'Verification failed' })
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string | { error: string } {
    this.logger.log('Webhook verification request received');
    return this.whatsAppService.verifyWebhook(mode, token, challenge);
  }

  /**
   * Handle webhook events (POST)
   * Receives incoming messages and status updates from WhatsApp
   */
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive WhatsApp webhook events' })
  @ApiBody({ type: WhatsAppWebhookInput })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleWebhook(@Body() body: any): Promise<{ status: string }> {
    this.logger.log('Webhook event received');
    console.log(JSON.stringify(body));
    return this.whatsAppService.handleWebhook(body as WhatsAppWebhookInput);
  }
}
