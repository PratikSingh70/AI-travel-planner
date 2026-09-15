// Returns a destination cover image URL.
// Uses Wikimedia Commons search (free, no API key).

export const getDestinationImage = async (destination) => {
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      destination
    )}%20travel&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url&iiurlwidth=1200&format=json&origin=*`;

    const res = await fetch(url, {
      headers: { "User-Agent": "AI-Travel-Planner-MCA/1.0" },
    });

    if (!res.ok) throw new Error("Image fetch failed");

    const data = await res.json();
    const pages = data?.query?.pages;
    if (!pages) return null;

    const first = Object.values(pages)[0];
    const imageUrl = first?.imageinfo?.[0]?.thumburl;
    return imageUrl || null;
  } catch (err) {
    console.error("Image service error:", err.message);
    return null;
  }
};