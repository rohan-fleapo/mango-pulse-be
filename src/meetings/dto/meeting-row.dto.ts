import { Tables } from 'src/types/supabase';

export type MeetingRow = Tables<'meetings'> & {
  topic: string | null;
  recording_password?: string | null;
  meeting_id?: string | null;
};
