export async function verifySpotifyPlaylist(access_token, playlist_id, user_id) {
  try {
    const res = await fetch(
      "https://pfixukibsdgasmvehutm.supabase.co/functions/v1/spotify-verified-playlist",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token, playlist_id, user_id }),
      }
    );
    if (!res.ok) throw new Error("Verification failed");
    const data = await res.json();
    return data; // result could be { verified: true } or similar
  } catch (err) {
    console.error("Error verifying Spotify playlist:", err);
    return null;
  }
}
