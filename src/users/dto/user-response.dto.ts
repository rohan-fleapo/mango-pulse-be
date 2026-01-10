import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Tables } from '../../types/supabase';

export class UserResponseDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  email: string;

  @ApiPropertyOptional({
    description: 'TagMango platform integration ID',
    example: 'tm_12345',
    nullable: true,
  })
  tagMangoId: string | null;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'User phone number',
    example: '+919876543210',
    nullable: true,
  })
  phone: string | null;

  @ApiProperty({
    description: 'User role',
    example: 'creator',
    enum: ['member', 'creator', 'user', 'coach'],
  })
  role: Tables<'users'>['role'];

  @ApiPropertyOptional({
    description: 'Whether the user has completed onboarding',
    example: false,
    default: false,
    nullable: true,
  })
  isOnboarded: boolean | null;

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2026-01-08T10:00:00.000Z',
  })
  createdAt: string;

  @ApiPropertyOptional({
    description: 'Last update timestamp',
    example: '2026-01-08T10:00:00.000Z',
  })
  updatedAt?: string;

  @ApiPropertyOptional()
  isPro?: boolean;
}
