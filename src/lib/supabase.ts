import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Upload voice message audio to Supabase Storage
export async function uploadVoiceMessage(userId: string, blob: Blob): Promise<string | null> {
  try {
    const fileName = `${userId}/voice_${Date.now()}.webm`;
    const { data, error } = await supabase.storage
      .from('voice-messages')
      .upload(fileName, blob, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'audio/webm',
      });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    // Return the file path (key) for later use with signed URLs
    return fileName;
  } catch (error) {
    console.error('Error uploading voice message:', error);
    return null;
  }
}