import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

export class WhatsAppMessageTextDto {
  @ApiProperty()
  @IsString()
  body: string;
}

export class WhatsAppButtonReplyDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  title: string;
}

export class WhatsAppInteractiveDto {
  @ApiProperty()
  @IsString()
  type: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => WhatsAppButtonReplyDto)
  button_reply?: WhatsAppButtonReplyDto;
}

export class WhatsAppMessageDto {
  @ApiProperty()
  @IsString()
  from: string;

  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  timestamp: string;

  @ApiProperty()
  @IsString()
  type: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => WhatsAppMessageTextDto)
  text?: WhatsAppMessageTextDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => WhatsAppInteractiveDto)
  interactive?: WhatsAppInteractiveDto;
}

export class WhatsAppContactDto {
  @ApiProperty()
  profile: {
    name: string;
  };

  @ApiProperty()
  @IsString()
  wa_id: string;
}

export class WhatsAppStatusErrorDto {
  @ApiProperty()
  code: number;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;
}

export class WhatsAppStatusDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  status: string;

  @ApiProperty()
  @IsString()
  timestamp: string;

  @ApiProperty()
  @IsString()
  recipient_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WhatsAppStatusErrorDto)
  errors?: WhatsAppStatusErrorDto[];
}

export class WhatsAppMetadataDto {
  @ApiProperty()
  @IsString()
  display_phone_number: string;

  @ApiProperty()
  @IsString()
  phone_number_id: string;
}

export class WhatsAppValueDto {
  @ApiProperty()
  @IsString()
  messaging_product: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => WhatsAppMetadataDto)
  metadata: WhatsAppMetadataDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WhatsAppContactDto)
  contacts?: WhatsAppContactDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WhatsAppMessageDto)
  messages?: WhatsAppMessageDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WhatsAppStatusDto)
  statuses?: WhatsAppStatusDto[];
}

export class WhatsAppChangeDto {
  @ApiProperty()
  @ValidateNested()
  @Type(() => WhatsAppValueDto)
  value: WhatsAppValueDto;

  @ApiProperty()
  @IsString()
  field: string;
}

export class WhatsAppEntryDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WhatsAppChangeDto)
  changes: WhatsAppChangeDto[];
}

export class WhatsAppMetadata {
  @IsString()
  display_phone_number: string;

  @IsString()
  phone_number_id: string;
}
export class WhatsAppButtonReply {
  @IsString()
  id: string;

  @IsString()
  title: string;
}

export class WhatsAppProfile {
  @IsString()
  name: string;
}

export class WhatsAppText {
  @IsString()
  body: string;
}

export class WhatsAppInteractive {
  @IsString()
  type: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => WhatsAppButtonReply)
  button_reply?: WhatsAppButtonReply;
}

export class WhatsAppContact {
  @ValidateNested()
  @Type(() => WhatsAppProfile)
  profile: WhatsAppProfile;

  @IsString()
  wa_id: string;
}

export class WhatsAppMessage {
  @IsString()
  from: string;

  @IsString()
  id: string;

  @IsString()
  timestamp: string;

  @IsString()
  type: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => WhatsAppText)
  text?: WhatsAppText;

  @IsOptional()
  @ValidateNested()
  @Type(() => WhatsAppInteractive)
  interactive?: WhatsAppInteractive;
}

export class WhatsAppWebhookData {
  @IsString()
  messaging_product: string;

  @ValidateNested()
  @Type(() => WhatsAppMetadata)
  metadata: WhatsAppMetadata;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WhatsAppContact)
  contacts?: WhatsAppContact[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WhatsAppMessage)
  messages?: WhatsAppMessage[];

  @IsString()
  field: string;
}

export class WhatsAppWebhookInput {
  @ValidateNested()
  @Type(() => WhatsAppWebhookData)
  data: WhatsAppWebhookData;
}
