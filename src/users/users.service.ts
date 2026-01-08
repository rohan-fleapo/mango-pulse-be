import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { Tables } from '../types/supabase';
import { UpdateUserDto } from './dto';

@Injectable()
export class UsersService {
  constructor(private supabaseService: SupabaseService) {}

  async findAll() {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, tag_mango_id, role, created_at, updated_at')
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
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }));
  }

  async findOne(input: { id: string }) {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, tag_mango_id, role, created_at, updated_at')
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
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  async findByEmail(input: { email: string }) {
    const supabase = this.supabaseService.getAdminClient();

    const { data } = await supabase
      .from('users')
      .select('id, email, name, tag_mango_id, role, created_at, updated_at')
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
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  async findByTagMangoId(input: { tagMangoId: string }) {
    const supabase = this.supabaseService.getAdminClient();

    const { data } = await supabase
      .from('users')
      .select('id, email, name, tag_mango_id, role, created_at, updated_at')
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

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', input.id)
      .select('id, email, name, tag_mango_id, role, created_at, updated_at')
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
      .select('id, email, name, tag_mango_id, role, created_at, updated_at')
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
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }));
  }
}
