import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsUUID, ValidateNested } from 'class-validator';

/**
 * Validated user object
 */
export class ValidatedUser {
  @IsUUID()
  id: string;

  @IsNotEmpty()
  email: string;
}

/**
 * Input DTO for creating meeting engagements
 */
export class CreateMeetingEngagementsInput {
  @IsUUID()
  @IsNotEmpty()
  meetingId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ValidatedUser)
  @IsNotEmpty()
  validatedUsers: ValidatedUser[];
}
