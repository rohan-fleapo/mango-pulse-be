import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { SupabaseService } from '../supabase/supabase.service';
import { User } from '../types/supabase';
import { SignInDto, SignUpDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private supabaseService: SupabaseService,
    private jwtService: JwtService,
  ) {}

  async signUp(input: { input: SignUpDto }) {
    const { email, password, tagMangoId, roles } = input.input;
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

    // Create the user
    const { data, error } = await supabase
      .from('users')
      .insert({
        email,
        password: hashedPassword,
        tag_mango_id: tagMangoId ?? null,
        roles: roles ?? ['user'],
      })
      .select('id, email, tag_mango_id, roles, created_at')
      .single();

    if (error || !data) {
      throw new ConflictException(`Failed to create user: ${error?.message}`);
    }

    const createdUser = data as User;

    // Generate JWT token
    const token = this.generateToken({
      id: createdUser.id,
      email: createdUser.email,
      roles: createdUser.roles,
    });

    return {
      user: {
        id: createdUser.id,
        email: createdUser.email,
        tagMangoId: createdUser.tag_mango_id,
        roles: createdUser.roles,
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
      .single()) as { data: User | null; error: unknown };

    if (error || !data) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = data;

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const token = this.generateToken({
      id: user.id,
      email: user.email,
      roles: user.roles,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        tagMangoId: user.tag_mango_id,
        roles: user.roles,
        createdAt: user.created_at,
      },
      accessToken: token,
    };
  }

  private generateToken(input: {
    id: string;
    email: string;
    roles: ('user' | 'coach')[];
  }) {
    const payload = {
      sub: input.id,
      email: input.email,
      roles: input.roles,
    };

    return this.jwtService.sign(payload);
  }

  async validateUser(input: { userId: string }) {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('users')
      .select('id, email, tag_mango_id, roles, created_at')
      .eq('id', input.userId)
      .single();

    if (error || !data) {
      throw new UnauthorizedException('User not found');
    }

    const user = data as User;

    return {
      id: user.id,
      email: user.email,
      tagMangoId: user.tag_mango_id,
      roles: user.roles,
      createdAt: user.created_at,
    };
  }
}
