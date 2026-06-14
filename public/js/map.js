// map.js - simple helper to geocode a location string via Nominatim and show it using Leaflet
export async function geocodeLocation(location) {
  if (!location) return null;
  try {
    const q = encodeURIComponent(location);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.length === 0) return null;
    const item = data[0];
    return { lat: parseFloat(item.lat), lon: parseFloat(item.lon), display_name: item.display_name };
  } catch (err) {
    console.warn('Geocode failed', err);
    return null;
  }
}

export function showLocationOnMap({ lat, lon, display_name }, containerId = 'map-modal-container') {
  return new Promise((resolve) => {
    try {
      const container = document.getElementById(containerId);
      if (!container) return resolve(null);

      const mapContainer = document.createElement('div');
      mapContainer.style.width = '100%';
      mapContainer.style.height = '420px';
      mapContainer.style.borderRadius = '8px';
      mapContainer.className = 'leaflet-map-instance';
      container.innerHTML = '';
      container.appendChild(mapContainer);

      if (typeof L === 'undefined') {
        console.warn('Leaflet not loaded');
        return resolve(null);
      }

      const map = L.map(mapContainer).setView([lat, lon], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      const marker = L.marker([lat, lon]).addTo(map);
      marker.bindPopup(display_name || 'Seller location').openPopup();

      map.whenReady(() => {
        try {
          map.invalidateSize();
        } catch (err) {
          console.warn('Leaflet invalidateSize failed', err);
        }
      });

      resolve({ map, marker });
    } catch (err) {
      console.warn('Failed to show map', err);
      resolve(null);
    }
  });
}
