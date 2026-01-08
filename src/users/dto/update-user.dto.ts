import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
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
