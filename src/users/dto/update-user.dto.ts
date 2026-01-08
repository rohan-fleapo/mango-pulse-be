import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'TagMango platform integration ID',
    example: 'tm_12345',
  })
  @IsOptional()
  @IsString()
  tagMangoId?: string;

  @ApiPropertyOptional({
    description: 'User roles array',
    example: ['user', 'coach'],
    enum: ['user', 'coach'],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsIn(['user', 'coach'], { each: true })
  roles?: ('user' | 'coach')[];
}
