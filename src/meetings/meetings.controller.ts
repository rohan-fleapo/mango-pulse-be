import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators';
import { JwtAuthGuard, RolesGuard } from 'src/auth/guards';
import {
  CreateMeetingInput,
  CreateMeetingOutput,
  DeleteMeetingInput,
  DeleteMeetingOutput,
  GetMeetingsInput,
  GetMeetingsOutput,
  UpdateMeetingInput,
  UpdateMeetingOutput,
} from './dto';
import { MeetingsService } from './meetings.service';

@ApiTags('Meetings')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('creator')
@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post()
  createMeeting(
    @Body() input: CreateMeetingInput,
  ): Promise<CreateMeetingOutput> {
    console.log({ input });
    return this.meetingsService.createMeeting(input);
  }

  @Get()
  getMeetings(@Query() input: GetMeetingsInput): Promise<GetMeetingsOutput> {
    return this.meetingsService.getMeetings(input);
  }

  @Patch()
  updateMeeting(
    @Body() input: UpdateMeetingInput,
  ): Promise<UpdateMeetingOutput> {
    return this.meetingsService.updateMeeting(input);
  }

  @Delete()
  deleteMeeting(
    @Query() input: DeleteMeetingInput,
  ): Promise<DeleteMeetingOutput> {
    return this.meetingsService.deleteMeeting(input);
  }
}
