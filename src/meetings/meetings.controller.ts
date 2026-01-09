import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from 'src/auth/decorators';
import { JwtAuthGuard, RolesGuard } from 'src/auth/guards';
import { UserDto } from 'src/users/dto';
import {
  CreateMeetingInput,
  CreateMeetingOutput,
  DeleteMeetingInput,
  DeleteMeetingOutput,
  GetMeetingDetailOutput,
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

  @Get(':id')
  @ApiResponse({ status: 200, type: GetMeetingDetailOutput })
  async getMeeting(@Param('id') id: string): Promise<GetMeetingDetailOutput> {
    return this.meetingsService.getMeeting(id);
  }

  @Post()
  @ApiResponse({ status: 201, type: CreateMeetingOutput })
  createMeeting(
    @Body() input: CreateMeetingInput,
    @CurrentUser() user: UserDto,
  ): Promise<CreateMeetingOutput> {
    return this.meetingsService.createMeeting({ ...input, creatorId: user.id });
  }

  @Get()
  @ApiResponse({ status: 200, type: GetMeetingsOutput })
  getMeetings(
    @Query() input: GetMeetingsInput,
    @CurrentUser() user: UserDto,
  ): Promise<GetMeetingsOutput> {
    return this.meetingsService.getMeetings({ ...input, creatorId: user.id });
  }

  @Patch()
  @ApiResponse({ status: 200, type: UpdateMeetingOutput })
  updateMeeting(
    @Body() input: UpdateMeetingInput,
  ): Promise<UpdateMeetingOutput> {
    return this.meetingsService.updateMeeting(input);
  }

  @Delete()
  @ApiResponse({ status: 200, type: DeleteMeetingOutput })
  deleteMeeting(
    @Query() input: DeleteMeetingInput,
  ): Promise<DeleteMeetingOutput> {
    return this.meetingsService.deleteMeeting(input);
  }
}
