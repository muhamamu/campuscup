const SUPABASE_URL = 'https://fyvhbqtushmgrmekmgwg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5dmhicXR1c2htZ3JtZWttZ3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMzAxMDIsImV4cCI6MjEwMDkwNjEwMn0.aqAMJCm17uJ08ozIVjXC73kBcD3dHoRIDS_lKC9dzR4';

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
