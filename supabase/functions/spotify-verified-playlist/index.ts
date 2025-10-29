// functions/spotify-verified-playlist/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SPOTIFY_CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID")!;
const SPOTIFY_CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function refreshIfNeeded(user_id: string, access_token: string | null, expires_at: string | null) {
  if (!expires_at || Date.now() > new Date(expires_at).getTime() - 60 * 1000) {
    // call refresh endpoint logic inline to avoid extra HTTP hop
    const { data: userRow } = await supabase.from("users").select("spotify_refresh_token").eq("id", user_id).maybeSingle();
    const refresh_token = userRow?.spotify_refresh_token;
    if (!refresh_token) throw new Error("No refresh token available");
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Authorization": "Basic " + btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`) },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token }).toString(),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) throw new Error("Refresh failed");
    const newAccess = tokenJson.access_token;
    const newRefresh = tokenJson.refresh_token || refresh_token;
    const expires_in = tokenJson.expires_in || 3600;
    const newExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    await supabase.from("users").update({
      spotify_access_token: newAccess,
      spotify_refresh_token: newRefresh,
      spotify_token_expires_at: newExpiresAt,
    }).eq("id", user_id);

    return newAccess;
  }
  return access_token!;
}

async function getPlaylistTrackIds(playlistId: string, accessToken: string) {
  const ids = new Set<string>();
  let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;
  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) throw new Error("Failed to fetch playlist tracks");
    const json = await res.json();
    for (const item of json.items || []) {
      if (item.track && item.track.id) ids.add(item.track.id);
    }
    url = json.next;
  }
  return ids;
}

async function getUserRecentlyPlayed(accessToken: string) {
  const res = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=50", { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error("Failed to fetch recently played");
  const json = await res.json();
  return (json.items || []).map((it: any) => ({ id: it.track?.id, played_at: it.played_at }));
}

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
    const { user_id, playlist_id } = await req.json();
    if (!user_id || !playlist_id) return new Response(JSON.stringify({ error: "Missing user_id or playlist_id" }), { status: 400 });

    // get tokens from users table
    const { data: userRow, error: selectErr } = await supabase.from("users").select("spotify_access_token, spotify_token_expires_at").eq("id", user_id).maybeSingle();
    if (selectErr || !userRow) return new Response(JSON.stringify({ error: "Failed to fetch user tokens" }), { status: 500 });

    let accessToken = userRow.spotify_access_token || null;
    const expiresAt = userRow.spotify_token_expires_at || null;

    // refresh if necessary
    accessToken = await refreshIfNeeded(user_id, accessToken, expiresAt);

    // fetch playlist ids and recent plays
    const playlistIds = await getPlaylistTrackIds(playlist_id, accessToken);
    const recent = await getUserRecentlyPlayed(accessToken);

    const matches = recent.filter((r) => playlistIds.has(r.id));
    const matched = matches.length > 0;

    if (matched) {
      await supabase.from("users").update({
        spotify_verified: true,
        spotify_verified_at: new Date().toISOString(),
      }).eq("id", user_id);
    }

    return new Response(JSON.stringify({ matched, matches }), { status: 200, headers: { "Content-Type": "application/json" } });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message || "Unexpected error" }), { status: 500 });
  }
});
