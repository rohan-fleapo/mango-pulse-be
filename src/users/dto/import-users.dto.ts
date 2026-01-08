import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ImportUserItemDto {
  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User full name',
    example: 'Alice Smith',
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
}

export class ImportUsersDto {
  @ApiProperty({
    description: 'List of users to import',
    type: [ImportUserItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportUserItemDto)
  @IsNotEmpty()
  users: ImportUserItemDto[];
}
