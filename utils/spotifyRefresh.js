export async function refreshSpotifyToken(refresh_token) {
  try {
    const res = await fetch(
      "https://pfixukibsdgasmvehutm.supabase.co/functions/v1/spotify-refresh",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token }),
      }
    );
    if (!res.ok) throw new Error("Failed to refresh token");
    const data = await res.json();
    return data.access_token;
  } catch (err) {
    console.error("Error refreshing Spotify token:", err);
    return null;
  }
}
