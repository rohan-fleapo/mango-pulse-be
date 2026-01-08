import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class DeleteMeetingInput {
  @ApiProperty({
    description: 'Meeting ID to delete (Database UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  meetingId: string;
}

export class DeleteMeetingOutput {
  @ApiProperty({
    description: 'Whether the deletion was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Meeting ID that was deleted',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  meetingId: string;
}
