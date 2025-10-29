// functions/spotify-exchange/index.ts
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

    const body = await req.json();
    const { code, code_verifier, redirect_uri, user_id } = body || {};

    if (!code || !code_verifier || !redirect_uri || !user_id) {
      return new Response(JSON.stringify({ error: "Missing one of: code, code_verifier, redirect_uri, user_id" }), { status: 400 });
    }

    // Exchange authorization code for tokens (server-side)
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`),
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri,
        code_verifier,
      }).toString(),
    });

    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error("Spotify token error:", tokenJson);
      return new Response(JSON.stringify({ error: tokenJson.error_description || tokenJson.error || "Token exchange failed" }), { status: 400 });
    }

    const access_token = tokenJson.access_token;
    const refresh_token = tokenJson.refresh_token;
    const expires_in = tokenJson.expires_in; // seconds

    // Fetch Spotify profile
    const meRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const meJson = await meRes.json();
    if (!meRes.ok) {
      console.error("Spotify /me error:", meJson);
      return new Response(JSON.stringify({ error: "Failed to fetch Spotify profile" }), { status: 400 });
    }

    const spotify_user_id = meJson.id;
    const spotify_display_name = meJson.display_name || meJson.id;
    const spotify_url = meJson.external_urls?.spotify || null;
    const expires_at = new Date(Date.now() + (expires_in * 1000)).toISOString();

    // Persist into users table (use service role)
    const { error: upsertErr } = await supabase
      .from("users")
      .update({
        spotify_user_id,
        spotify_display_name,
        spotify_access_token: access_token,
        spotify_refresh_token: refresh_token,
        spotify_token_expires_at: expires_at,
        spotify_url,
        spotify_connected: true,
        spotify_verified: false,
      })
      .eq("id", user_id);

    if (upsertErr) {
      console.error("Supabase update error:", upsertErr);
      return new Response(JSON.stringify({ error: "Failed to save Spotify tokens" }), { status: 500 });
    }

    // Return minimal safe response
    return new Response(JSON.stringify({
      spotify_user_id,
      spotify_display_name,
      spotify_url,
      expires_at,
    }), { status: 200, headers: { "Content-Type": "application/json" } });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message || "Unexpected error" }), { status: 500 });
  }
});
