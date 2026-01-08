import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
    description: 'User roles',
    example: ['user'],
    enum: ['user', 'coach'],
    isArray: true,
  })
  roles: ('user' | 'coach')[];

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
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'User information',
    type: UserResponseDto,
  })
  user: UserResponseDto;

  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;
}

export class MessageResponseDto {
  @ApiProperty({
    description: 'Response message',
    example: 'Operation completed successfully',
  })
  message: string;
}
