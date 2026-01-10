import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { SupabaseService } from '../supabase/supabase.service';
import { Tables } from '../types/supabase';
import { SignInDto, SignUpDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private supabaseService: SupabaseService,
    private jwtService: JwtService,
  ) {}

  async signUp(input: { input: SignUpDto }) {
    // console.log(input);
    const { email, password, tagMangoId, name } = input.input;
    const supabase = this.supabaseService.getAdminClient();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate ID for creator
    const id = uuidv4();

    // Create the user
    // Enforcing role = 'creator' and creator_id = id
    const { data, error } = await supabase
      .from('users')
      .insert({
        id,
        creator_id: id,
        email,
        name,
        password: hashedPassword,
        tag_mango_id: tagMangoId ?? null,
        role: 'creator',
        is_onboarded: false,
      })
      .select(
        'id, email, name, tag_mango_id, role, created_at, phone, is_onboarded',
      )
      .single();

    if (error) {
      throw new ConflictException(`Failed to create user: ${error?.message}`);
    }

    const createdUser = data as Tables<'users'>;

    // Generate JWT token
    const token = this.generateToken({
      id: createdUser.id,
      email: createdUser.email,
      role: createdUser.role,
      creatorId: createdUser.creator_id,
      isOnboarded: createdUser.is_onboarded,
    });

    return {
      user: {
        id: createdUser.id,
        email: createdUser.email,
        name: createdUser.name,
        tagMangoId: createdUser.tag_mango_id,
        role: createdUser.role,
        phone: createdUser.phone,
        isOnboarded: createdUser.is_onboarded,
        createdAt: createdUser.created_at,
      },
      accessToken: token,
    };
  }

  async signIn(input: { input: SignInDto }) {
    const { email, password } = input.input;
    const supabase = this.supabaseService.getAdminClient();

    // Find user by email
    const { data, error } = (await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()) as { data: Tables<'users'> | null; error: unknown };

    if (error || !data) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = data;

    // Verify role is creator
    if (user.role !== 'creator') {
      throw new UnauthorizedException('Only creators can sign in');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const token = this.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      creatorId: user.creator_id,
      isOnboarded: user.is_onboarded,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tagMangoId: user.tag_mango_id,
        role: user.role,
        phone: user.phone,
        isOnboarded: user.is_onboarded,
        createdAt: user.created_at,
      },
      accessToken: token,
    };
  }

  private generateToken(input: {
    id: string;
    email: string;
    role: Tables<'users'>['role'];
    creatorId: string;
    isOnboarded: boolean | null;
  }) {
    const payload = {
      sub: input.id,
      email: input.email,
      role: input.role,
      creatorId: input.creatorId,
      isOnboarded: input.isOnboarded,
    };

    return this.jwtService.sign(payload);
  }

  async validateUser(input: { userId: string }) {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('users')
      .select(
        'id, email, name, tag_mango_id, role, created_at, phone, is_onboarded, is_pro',
      )
      .eq('id', input.userId)
      .single();

    if (error) {
      throw new UnauthorizedException('User not found');
    }

    const user = data as Tables<'users'>;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      tagMangoId: user.tag_mango_id,
      role: user.role,
      phone: user.phone,
      isOnboarded: user.is_onboarded,
      isPro: user.is_pro,
      createdAt: user.created_at,
    };
  }
}
