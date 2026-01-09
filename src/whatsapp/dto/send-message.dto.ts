import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class WhatsAppTemplateLanguageDto {
  @ApiProperty({ description: 'Language code', example: 'en_US' })
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class WhatsAppTemplateDto {
  @ApiProperty({ description: 'Template name', example: 'hello_world' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Language', type: WhatsAppTemplateLanguageDto })
  @ValidateNested()
  @Type(() => WhatsAppTemplateLanguageDto)
  language: WhatsAppTemplateLanguageDto;

  @ApiPropertyOptional({
    description: 'Optional template parameters',
    example: [{ type: 'text', text: 'John Doe' }],
    type: [Object],
  })
  @IsOptional()
  @IsArray()
  parameters?: any[];
}

export class SendWhatsAppTemplateDto {
  @ApiProperty({
    description: 'Recipient phone number with country code',
    example: '918961224567',
  })
  @IsString()
  @IsNotEmpty()
  to: string;

  @ApiProperty({ description: 'Messaging product', example: 'whatsapp' })
  @IsString()
  messaging_product: string = 'whatsapp';

  @ApiProperty({ description: 'Message type', example: 'template' })
  @IsString()
  type: string = 'template';

  @ApiProperty({ description: 'Template object', type: WhatsAppTemplateDto })
  @ValidateNested()
  @Type(() => WhatsAppTemplateDto)
  template: WhatsAppTemplateDto;
}

export class WhatsAppInteractiveButtonReplyDto {
  @ApiProperty({
    description: 'Button ID (used in webhook callback)',
    example: 'rating_1',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Button title (max 20 characters)',
    example: '1 ⭐',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  title: string;
}

export class WhatsAppInteractiveButtonDto {
  @ApiProperty({
    description: 'Button type',
    enum: ['reply'],
    example: 'reply',
  })
  @IsEnum(['reply'])
  type: string;

  @ApiProperty({
    description: 'Button reply object',
    type: WhatsAppInteractiveButtonReplyDto,
  })
  @ValidateNested()
  @Type(() => WhatsAppInteractiveButtonReplyDto)
  reply: WhatsAppInteractiveButtonReplyDto;
}

export class WhatsAppInteractiveActionDto {
  @ApiProperty({
    description: 'Interactive buttons (max 3)',
    type: [WhatsAppInteractiveButtonDto],
    example: [
      { type: 'reply', reply: { id: 'rating_1', title: '1 ⭐' } },
      { type: 'reply', reply: { id: 'rating_2', title: '2 ⭐' } },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WhatsAppInteractiveButtonDto)
  buttons: WhatsAppInteractiveButtonDto[];
}

export class WhatsAppInteractiveBodyDto {
  @ApiProperty({
    description: 'Message body text',
    example: '⭐ How was your experience today?\nPlease tap a rating:',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  text: string;
}

export class WhatsAppInteractiveDto {
  @ApiProperty({
    description: 'Interactive type',
    enum: ['button'],
    example: 'button',
  })
  @IsEnum(['button'])
  type: string;

  @ApiProperty({
    description: 'Interactive body',
    type: WhatsAppInteractiveBodyDto,
  })
  @ValidateNested()
  @Type(() => WhatsAppInteractiveBodyDto)
  body: WhatsAppInteractiveBodyDto;

  @ApiProperty({
    description: 'Interactive action',
    type: WhatsAppInteractiveActionDto,
  })
  @ValidateNested()
  @Type(() => WhatsAppInteractiveActionDto)
  action: WhatsAppInteractiveActionDto;
}

export class SendWhatsAppInteractiveDto {
  @ApiProperty({
    description: 'Recipient phone number with country code',
    example: '918961224567',
  })
  @IsString()
  @IsNotEmpty()
  to: string;

  @ApiProperty({ description: 'Messaging product', example: 'whatsapp' })
  @IsString()
  messaging_product: string = 'whatsapp';

  @ApiProperty({
    description: 'Message type',
    enum: ['interactive'],
    example: 'interactive',
  })
  @IsEnum(['interactive'])
  type: string = 'interactive';

  @ApiProperty({
    description: 'Interactive object',
    type: WhatsAppInteractiveDto,
  })
  @ValidateNested()
  @Type(() => WhatsAppInteractiveDto)
  interactive: WhatsAppInteractiveDto;
}
