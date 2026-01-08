import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { User } from '../types/supabase';
import { UpdateUserDto } from './dto';

@Injectable()
export class UsersService {
  constructor(private supabaseService: SupabaseService) {}

  async findAll() {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('users')
      .select('id, email, tag_mango_id, roles, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    const users = (data ?? []) as User[];

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      tagMangoId: user.tag_mango_id,
      roles: user.roles,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }));
  }

  async findOne(input: { id: string }) {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('users')
      .select('id, email, tag_mango_id, roles, created_at, updated_at')
      .eq('id', input.id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`User with ID ${input.id} not found`);
    }

    const user = data as User;

    return {
      id: user.id,
      email: user.email,
      tagMangoId: user.tag_mango_id,
      roles: user.roles,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  async findByEmail(input: { email: string }) {
    const supabase = this.supabaseService.getAdminClient();

    const { data } = await supabase
      .from('users')
      .select('id, email, tag_mango_id, roles, created_at, updated_at')
      .eq('email', input.email)
      .single();

    if (!data) {
      return null;
    }

    const user = data as User;

    return {
      id: user.id,
      email: user.email,
      tagMangoId: user.tag_mango_id,
      roles: user.roles,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  async findByTagMangoId(input: { tagMangoId: string }) {
    const supabase = this.supabaseService.getAdminClient();

    const { data } = await supabase
      .from('users')
      .select('id, email, tag_mango_id, roles, created_at, updated_at')
      .eq('tag_mango_id', input.tagMangoId)
      .single();

    if (!data) {
      return null;
    }

    const user = data as User;

    return {
      id: user.id,
      email: user.email,
      tagMangoId: user.tag_mango_id,
      roles: user.roles,
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
    if (input.data.roles !== undefined) {
      updateData.roles = input.data.roles;
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', input.id)
      .select('id, email, tag_mango_id, roles, created_at, updated_at')
      .single();

    if (error || !data) {
      throw new Error(`Failed to update user: ${error?.message}`);
    }

    const updatedUser = data as User;

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      tagMangoId: updatedUser.tag_mango_id,
      roles: updatedUser.roles,
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

  async getCoaches() {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('users')
      .select('id, email, tag_mango_id, roles, created_at, updated_at')
      .contains('roles', ['coach'])
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch coaches: ${error.message}`);
    }

    const users = (data ?? []) as User[];

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      tagMangoId: user.tag_mango_id,
      roles: user.roles,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }));
  }
}
