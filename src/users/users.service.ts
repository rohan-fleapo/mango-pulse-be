import { Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';
import { Tables } from '../types/supabase';
import { ImportUsersDto, UpdateUserDto } from './dto';

@Injectable()
export class UsersService {
  constructor(private supabaseService: SupabaseService) {}

  async findAll() {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('users')
      .select(
        'id, email, name, tag_mango_id, role, created_at, updated_at, phone',
      )
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    const users = (data ?? []) as Tables<'users'>[];

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      tagMangoId: user.tag_mango_id,
      role: user.role,
      phone: user.phone,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }));
  }

  async findOne(input: { id: string }) {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('users')
      .select(
        'id, email, name, tag_mango_id, role, created_at, updated_at, phone',
      )
      .eq('id', input.id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`User with ID ${input.id} not found`);
    }

    const user = data as Tables<'users'>;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      tagMangoId: user.tag_mango_id,
      role: user.role,
      phone: user.phone,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  async findByEmail(input: { email: string }) {
    const supabase = this.supabaseService.getAdminClient();

    const { data } = await supabase
      .from('users')
      .select(
        'id, email, name, tag_mango_id, role, created_at, updated_at, phone',
      )
      .eq('email', input.email)
      .single();

    if (!data) {
      return null;
    }

    const user = data as Tables<'users'>;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      tagMangoId: user.tag_mango_id,
      role: user.role,
      phone: user.phone,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  async findByTagMangoId(input: { tagMangoId: string }) {
    const supabase = this.supabaseService.getAdminClient();

    const { data } = await supabase
      .from('users')
      .select(
        'id, email, name, tag_mango_id, role, created_at, updated_at, phone',
      )
      .eq('tag_mango_id', input.tagMangoId)
      .single();

    if (!data) {
      return null;
    }

    const user = data as Tables<'users'>;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      tagMangoId: user.tag_mango_id,
      role: user.role,
      phone: user.phone,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  async update(input: { id: string; data: UpdateUserDto }) {
    const supabase = this.supabaseService.getAdminClient();

    // Check if user exists first
    await this.findOne({ id: input.id });

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

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', input.id)
      .select(
        'id, email, name, tag_mango_id, role, created_at, updated_at, phone',
      )
      .single();

    if (error || !data) {
      throw new Error(`Failed to update user: ${error?.message}`);
    }

    const updatedUser = data as Tables<'users'>;

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      tagMangoId: updatedUser.tag_mango_id,
      role: updatedUser.role,
      phone: updatedUser.phone,
      createdAt: updatedUser.created_at,
      updatedAt: updatedUser.updated_at,
    };
  }

  async remove(input: { id: string }) {
    const supabase = this.supabaseService.getAdminClient();

    // Check if user exists first
    await this.findOne({ id: input.id });

    const { error } = await supabase.from('users').delete().eq('id', input.id);

    if (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }

    return { message: `User with ID ${input.id} deleted successfully` };
  }

  async getCreators() {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('users')
      .select(
        'id, email, name, tag_mango_id, role, created_at, updated_at, phone',
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
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }));
  }

  async importUsers(input: ImportUsersDto, creatorId: string) {
    const { users } = input;
    const supabase = this.supabaseService.getAdminClient();

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process users in chunks or one by one. One by one allows better error handling per user.
    // For bulk performance, we could map and upsert, but we need to generate passwords for new ones.

    // Let's iterate
    for (const user of users) {
      try {
        // Generate a random password for new users
        // Use a default strong password or random string
        const tempPassword = crypto.randomBytes(16).toString('hex');

        // Check if user exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .eq('creator_id', creatorId)
          .single();

        if (existingUser) {
          // Update existing user (don't touch password)
          const { error: updateError } = await supabase
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
          const { error: insertError } = await supabase.from('users').insert({
            email: user.email,
            name: user.name,
            phone: user.phone || null,
            creator_id: creatorId,
            role: 'member', // Fixed role as per requirement
            password: tempPassword, // In a real app, we'd hash this or use Supabase Auth Admin API
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

    return results;
  }
}
