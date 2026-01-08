import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, Roles } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import {
  MessageResponseDto,
  UserResponseDto,
} from '../common/dto/response.dto';
import { UpdateUserDto } from './dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('creator')
  @ApiOperation({
    summary: 'List all users',
    description: 'Get a list of all users (Creator only)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of users retrieved successfully',
    type: [UserResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Creator role required' })
  async findAll(): Promise<UserResponseDto[]> {
    return this.usersService.findAll();
  }

  @Get('creators')
  @ApiOperation({
    summary: 'List all creators',
    description: 'Get a list of all users with creator role',
  })
  @ApiResponse({
    status: 200,
    description: 'List of creators retrieved successfully',
    type: [UserResponseDto],
  })
  async getCreators(): Promise<UserResponseDto[]> {
    return this.usersService.getCreators();
  }

  @Get('profile')
  @ApiOperation({
    summary: 'Get own profile',
    description: 'Get the profile of the currently authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    type: UserResponseDto,
  })
  async getProfile(
    @CurrentUser('id') userId: string,
  ): Promise<UserResponseDto> {
    return this.usersService.findOne({ id: userId });
  }

  @Get(':id')
  @Roles('creator')
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Get a specific user by their ID (Creator only)',
  })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.findOne({ id });
  }

  @Patch('profile')
  @ApiOperation({
    summary: 'Update own profile',
    description: 'Update the profile of the currently authenticated user',
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: UserResponseDto,
  })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() input: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update({ id: userId, data: input });
  }

  @Patch(':id')
  @Roles('creator')
  @ApiOperation({
    summary: 'Update user by ID',
    description: 'Update a specific user by their ID (Creator only)',
  })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id') id: string,
    @Body() input: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update({ id, data: input });
  }

  @Delete(':id')
  @Roles('creator')
  @ApiOperation({
    summary: 'Delete user',
    description: 'Delete a user by their ID (Creator only)',
  })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id') id: string): Promise<MessageResponseDto> {
    return this.usersService.remove({ id });
  }
}
