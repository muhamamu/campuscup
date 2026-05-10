const SUPABASE_URL = 'https://zpciirbchnejpupgapcr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_b3XbVn4zL26XFCkgg7I5-Q_5J80jsWU';

let supabaseClient;
let isSupabaseReady = false;

function initSupabase() {
  return new Promise((resolve) => {
    if (isSupabaseReady && supabaseClient) {
      resolve(supabaseClient);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.onload = () => {
      if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        isSupabaseReady = true;
        resolve(supabaseClient);
      }
    };
    document.head.appendChild(script);
  });
}

async function getSupabase() {
  return await initSupabase();
}
