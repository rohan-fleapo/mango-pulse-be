import { Database } from '../../types/supabase';

export class UserDto
  implements
    Pick<
      Database['public']['Tables']['users']['Row'],
      'id' | 'email' | 'role'
    >
{
  id: string;
  email: string;
  role: 'member' | 'creator';
  creatorId: string;
}
