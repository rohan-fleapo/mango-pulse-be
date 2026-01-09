import { Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';
import { Database, Tables } from '../types/supabase';
import {
  CreateUserDto,
  GetUsersByCreatorDto,
  GetUsersResponseDto,
  ImportUsersDto,
  UpdateUserDto,
} from './dto';

@Injectable()
export class UsersService {
  private supabase: SupabaseClient<Database>;

  constructor(private supabaseService: SupabaseService) {
    this.supabase = this.supabaseService.getAdminClient();
  }

  /**
   * Maps a database user record to UserResponseDto format
   */
  private mapUserToResponse(user: Tables<'users'>) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      tagMangoId: user.tag_mango_id,
      role: user.role,
      phone: user.phone,
      isOnboarded: user.is_onboarded,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  async updateUser(input: { id: string; data: UpdateUserDto }) {
    const updateData: Record<string, unknown> = {};
    if (input.data.tagMangoId !== undefined) {
      updateData.tag_mango_id = input.data.tagMangoId;
    }
    if (input.data.role !== undefined) {
      updateData.role = input.data.role;
    }
    if (input.data.name !== undefined) {
      updateData.name = input.data.name;
    }
    if (input.data.phone !== undefined) {
      updateData.phone = input.data.phone;
    }
    if (input.data.isOnboarded !== undefined) {
      updateData.is_onboarded = input.data.isOnboarded;
    }

    const { error } = await this.supabase
      .from('users')
      .update(updateData)
      .eq('id', input.id);

    if (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }

    return { message: 'ok' };
  }

  async getCreators() {
    const { data, error } = await this.supabase
      .from('users')
      .select(
        'id, email, name, tag_mango_id, role, created_at, updated_at, phone, is_onboarded',
      )
      .eq('role', 'creator')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch creators: ${error.message}`);
    }

    const users = (data ?? []) as Tables<'users'>[];

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      tagMangoId: user.tag_mango_id,
      role: user.role,
      phone: user.phone,
      isOnboarded: user.is_onboarded,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }));
  }

  async creatorAddUser(input: CreateUserDto, creatorId: string) {
    const { email, name, phone, tagMangoId } = input;

    // Check if user exists
    const { data: existingUser } = await this.supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const tempPassword = crypto.randomBytes(16).toString('hex');

    const { data, error } = await this.supabase
      .from('users')
      .insert({
        email,
        name,
        phone: phone || null,
        tag_mango_id: tagMangoId || null,
        creator_id: creatorId,
        role: 'member',
        password: tempPassword,
      })
      .select(
        'id, email, name, tag_mango_id, role, created_at, updated_at, phone, is_onboarded',
      )
      .single();

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    const createdUser = data as Tables<'users'>;

    // Update creator onboarding status
    // Update creator onboarding status
    await this.updateCreator(creatorId, { isOnboarded: true });

    return this.mapUserToResponse(createdUser);
  }

  async importUsers(input: ImportUsersDto, creatorId: string) {
    const { users } = input;

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const user of users) {
      try {
        const tempPassword = crypto.randomBytes(16).toString('hex');

        // Check if user exists
        const { data: existingUser } = await this.supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .eq('creator_id', creatorId)
          .single();

        if (existingUser) {
          // Update existing user (don't touch password)
          const { error: updateError } = await this.supabase
            .from('users')
            .update({
              name: user.name,
              phone: user.phone || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingUser.id);

          if (updateError) throw updateError;
        } else {
          // Insert new user
          const { error: insertError } = await this.supabase
            .from('users')
            .insert({
              email: user.email,
              name: user.name,
              phone: user.phone || null,
              creator_id: creatorId,
              role: 'member',
              password: tempPassword,
            });

          if (insertError) throw insertError;
        }

        results.success++;
      } catch (error: any) {
        results.failed++;
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Failed to import ${user.email}: ${errorMessage}`);
      }
    }

    if (results.success > 0) {
      if (results.success > 0) {
        await this.updateCreator(creatorId, { isOnboarded: true });
      }
    }

    return results;
  }
  async getUsersList(
    creatorId: string,
    query: GetUsersByCreatorDto,
  ): Promise<GetUsersResponseDto> {
    const { page = 1, limit = 10, name, email } = query;
    const offset = (page - 1) * limit;

    let queryBuilder = this.supabase
      .from('users')
      .select('*', { count: 'exact' })
      .eq('creator_id', creatorId);

    if (name) {
      queryBuilder = queryBuilder.ilike('name', `%${name}%`);
    }

    if (email) {
      queryBuilder = queryBuilder.ilike('email', `%${email}%`);
    }

    const { data, count, error } = await queryBuilder
      .is('deleted_at', null)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    const users = (data ?? []) as Tables<'users'>[];
    const total = count ?? 0;

    return {
      users: users.map((u) => this.mapUserToResponse(u)),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async softDeleteUser(creatorId: string, userId: string) {
    const { data: user, error: fetchError } = await this.supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .eq('creator_id', creatorId)
      .single();

    if (fetchError || !user) {
      throw new Error(
        'User not found or you do not have permission to delete this user',
      );
    }

    const { error } = await this.supabase
      .from('users')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to soft delete user: ${error.message}`);
    }

    return { message: 'User deleted successfully' };
  }

  private async updateCreator(creatorId: string, data: UpdateUserDto) {
    const updateData: Record<string, unknown> = {};
    if (data.tagMangoId !== undefined) {
      updateData.tag_mango_id = data.tagMangoId;
    }
    if (data.role !== undefined) {
      updateData.role = data.role;
    }
    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.phone !== undefined) {
      updateData.phone = data.phone;
    }
    if (data.isOnboarded !== undefined) {
      updateData.is_onboarded = data.isOnboarded;
    }

    const { error } = await this.supabase
      .from('users')
      .update(updateData)
      .eq('id', creatorId);

    if (error) {
      throw new Error(`Failed to update creator: ${error.message}`);
    }
  }
}
