// functions/spotify-refresh/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SPOTIFY_CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID")!;
const SPOTIFY_CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    const { user_id } = await req.json();
    if (!user_id) return new Response(JSON.stringify({ error: "Missing user_id" }), { status: 400 });

    // read refresh token from users table
    const { data: userRow, error: selectErr } = await supabase
      .from("users")
      .select("spotify_refresh_token")
      .eq("id", user_id)
      .maybeSingle();

    if (selectErr || !userRow) {
      console.error("User fetch error:", selectErr);
      return new Response(JSON.stringify({ error: "Failed to read user refresh token" }), { status: 500 });
    }

    const refresh_token = userRow.spotify_refresh_token;
    if (!refresh_token) return new Response(JSON.stringify({ error: "No refresh token available" }), { status: 400 });

    // Call Spotify token endpoint to refresh
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`),
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token,
      }).toString(),
    });

    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error("Spotify refresh error:", tokenJson);
      return new Response(JSON.stringify({ error: tokenJson.error || "Refresh failed" }), { status: 400 });
    }

    const access_token = tokenJson.access_token;
    const new_refresh_token = tokenJson.refresh_token || refresh_token; // spotify may omit
    const expires_in = tokenJson.expires_in || 3600;
    const expires_at = new Date(Date.now() + (expires_in * 1000)).toISOString();

    // Save updated tokens
    const { error: updateErr } = await supabase
      .from("users")
      .update({
        spotify_access_token: access_token,
        spotify_refresh_token: new_refresh_token,
        spotify_token_expires_at: expires_at,
        spotify_connected: true,
      })
      .eq("id", user_id);

    if (updateErr) {
      console.error("Supabase update error:", updateErr);
      return new Response(JSON.stringify({ error: "Failed to save refreshed tokens" }), { status: 500 });
    }

    return new Response(JSON.stringify({ access_token, expires_at }), { status: 200, headers: { "Content-Type": "application/json" } });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message || "Unexpected error" }), { status: 500 });
  }
});
