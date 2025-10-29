// supabase.js

import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

import { decode as atob, encode as btoa } from 'base-64';
if (!global.atob) global.atob = atob;
if (!global.btoa) global.btoa = btoa;

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://pfixukibsdgasmvehutm.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmaXh1a2lic2RnYXNtdmVodXRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3MjE3MzMsImV4cCI6MjA3MzI5NzczM30.W_2KjGBncbFfuznHwbUbrru_efvMA3AIIITaR2obCjk";

// ✅ Prevent import of ws/realtime modules (CRITICAL)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    realtime: {
      enabled: false,
    },
  },
});
