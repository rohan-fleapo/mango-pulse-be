import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto';

export class GetUsersByCreatorDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by user name (partial match, case-insensitive)',
    example: 'John',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Filter by user email (partial match, case-insensitive)',
    example: 'john@example.com',
  })
  @IsOptional()
  @IsString()
  email?: string;
}
