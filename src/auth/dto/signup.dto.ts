import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class SignUpDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'User password (minimum 6 characters)',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({
    description: 'TagMango platform integration ID',
    example: 'tm_12345',
  })
  @IsOptional()
  @IsString()
  tagMangoId?: string;
}
