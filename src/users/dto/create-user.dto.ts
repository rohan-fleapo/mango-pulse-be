import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

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
}
