/**
 * Thin wrapper around Google Maps Platform's Distance Matrix API, used by the
 * routing solvers (Field Service Routing, Pickup & Delivery Routing) to get
 * real drive-time and distance estimates between locations.
 *
 * Server-side only — GOOGLE_MAPS_API_KEY is read from the environment and is
 * never sent to the client.
 *
 * If the key is missing, the API call fails, or an individual origin/
 * destination pair has no route, this degrades gracefully to a haversine
 * (straight-line) distance at an assumed average road speed rather than
 * failing the whole solve — a routing plan with slightly-off estimates is
 * far more useful than no plan at all.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MatrixResult {
  durationMinutes: number[][]; // [from][to] drive time in minutes
  distanceKm: number[][]; // [from][to] distance in km
  source: "google" | "estimated";
}

const FALLBACK_SPEED_KMH = 40;
// Google's Distance Matrix API caps requests at 25 origins x 25 destinations
// (and 100 elements per server-side key per second on standard plans) — keep
// tiles comfortably under that.
const CHUNK = 10;

function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function fallbackMatrix(points: LatLng[]): MatrixResult {
  const n = points.length;
  const distanceKm: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const durationMinutes: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const km = haversineKm(points[i], points[j]);
      distanceKm[i][j] = km;
      // +10% to loosely approximate real road routing vs a straight line.
      durationMinutes[i][j] = ((km * 1.1) / FALLBACK_SPEED_KMH) * 60;
    }
  }
  return { durationMinutes, distanceKm, source: "estimated" };
}

/**
 * Fetches a full origin x destination duration/distance matrix for the given
 * points (index order is preserved — matrix[i][j] is the trip from
 * points[i] to points[j]).
 */
export async function getDistanceMatrix(points: LatLng[]): Promise<MatrixResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || points.length === 0) return fallbackMatrix(points);

  const n = points.length;
  const durationMinutes: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const distanceKm: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  try {
    for (let oi = 0; oi < n; oi += CHUNK) {
      const originsChunk = points.slice(oi, oi + CHUNK);
      for (let di = 0; di < n; di += CHUNK) {
        const destChunk = points.slice(di, di + CHUNK);
        const origins = originsChunk.map((p) => `${p.lat},${p.lng}`).join("|");
        const destinations = destChunk.map((p) => `${p.lat},${p.lng}`).join("|");
        const url =
          `https://maps.googleapis.com/maps/api/distancematrix/json?` +
          `origins=${encodeURIComponent(origins)}&destinations=${encodeURIComponent(destinations)}` +
          `&units=metric&key=${apiKey}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Distance Matrix API HTTP ${res.status}`);
        const data = await res.json();
        if (data.status !== "OK") throw new Error(`Distance Matrix API status ${data.status}`);

        interface DMElement { status: string; duration?: { value: number }; distance?: { value: number } }
        interface DMRow { elements: DMElement[] }
        (data.rows as DMRow[]).forEach((row, ri) => {
          row.elements.forEach((el, ci) => {
            const gi = oi + ri;
            const gj = di + ci;
            if (el.status === "OK" && el.duration && el.distance) {
              durationMinutes[gi][gj] = el.duration.value / 60;
              distanceKm[gi][gj] = el.distance.value / 1000;
            } else {
              const km = haversineKm(points[gi], points[gj]);
              distanceKm[gi][gj] = km;
              durationMinutes[gi][gj] = ((km * 1.1) / FALLBACK_SPEED_KMH) * 60;
            }
          });
        });
      }
    }
    return { durationMinutes, distanceKm, source: "google" };
  } catch {
    return fallbackMatrix(points);
  }
}
