const SUPABASE_URL = 'https://zpcijrbchnejpupgapcr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwY2lqcmJjaG5lanB1cGdhcGNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMzI2MzIsImV4cCI6MjA5MzkwODYzMn0.bgYeWIvdjwnBcPGJb3JAlqSmpW18p2Mkxf_R6P1Sz0k';

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
