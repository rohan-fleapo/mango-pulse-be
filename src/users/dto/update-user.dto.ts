import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsPhoneNumber, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'User phone number',
    example: '+919876543210',
  })
  @IsOptional()
  @IsPhoneNumber(null, {
    message:
      'Invalid phone number format. Must include a valid country code, e.g., +919876543210',
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'TagMango platform integration ID',
    example: 'tm_12345',
  })
  @IsOptional()
  @IsString()
  tagMangoId?: string;

  @ApiPropertyOptional({
    description: 'User full name',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'User role',
    example: 'creator',
    enum: ['member', 'creator'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['member', 'creator'])
  role?: 'member' | 'creator';
}
