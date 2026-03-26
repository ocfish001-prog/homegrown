import { createClient } from '@supabase/supabase-js';
const sb = createClient('https://wbzxfwlgldrobubcssoa.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indienhmd2xnbGRyb2J1YmNzc29hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ5Njc3NiwiZXhwIjoyMDkwMDcyNzc2fQ.a6Ghoy_6ybrR4TLsG3ZMAZPhQ1jxtu3RTl8zJxPseP4', {auth:{persistSession:false}});
const {count} = await sb.from('events').select('*',{count:'exact',head:true}).gte('startDate', new Date().toISOString());
const {data} = await sb.from('events').select('source').gte('startDate', new Date().toISOString());
const counts = {};
(data||[]).forEach(r => { counts[r.source] = (counts[r.source]||0)+1; });
console.log('Total upcoming:', count);
console.log(JSON.stringify(counts, null, 2));
