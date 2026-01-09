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
import { MessageResponseDto } from '../common/dto/response.dto';
import {
  CreateUserDto,
  GetUsersByCreatorDto,
  GetUsersResponseDto,
  ImportUsersDto,
  UpdateUserDto,
  UserResponseDto,
} from './dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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

  @Get('list')
  @Roles('creator')
  @ApiOperation({
    summary: 'Get list of users for the creator',
    description:
      'Get a paginated list of users associated with the creator with optional filters',
  })
  @ApiResponse({
    status: 200,
    description: 'List of users retrieved successfully',
    type: GetUsersResponseDto,
  })
  async getUsersList(
    @Query() query: GetUsersByCreatorDto,
    @CurrentUser('id') userId: string,
  ): Promise<GetUsersResponseDto> {
    return this.usersService.getUsersList(userId, query);
  }

  @Post('add')
  @Roles('creator')
  @ApiOperation({
    summary: 'Add a new user',
    description: 'Add a single user to the platform (Creator only)',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: UserResponseDto,
  })
  async addUser(
    @Body() input: CreateUserDto,
    @CurrentUser('id') userId: string,
  ): Promise<UserResponseDto> {
    return this.usersService.creatorAddUser(input, userId);
  }

  @Post('import')
  @Roles('creator')
  @ApiOperation({
    summary: 'Import users from CSV data',
    description: 'Bulk import users (Creator only)',
  })
  @ApiBody({ type: ImportUsersDto })
  @ApiResponse({
    status: 201,
    description: 'Users import processed',
  })
  async importUsers(
    @Body() input: ImportUsersDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.usersService.importUsers(input, userId);
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
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(
    @Param('id') id: string,
    @Body() input: UpdateUserDto,
  ): Promise<MessageResponseDto> {
    return this.usersService.updateUser({ id, data: input });
  }

  @Delete(':id')
  @Roles('creator')
  @ApiOperation({
    summary: 'Delete a user',
    description:
      'Soft delete a user associated with the creator (Creator only)',
  })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully',
    type: MessageResponseDto,
  })
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser('id') creatorId: string,
  ): Promise<MessageResponseDto> {
    return this.usersService.softDeleteUser(creatorId, id);
  }
}
