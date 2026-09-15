import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icons (known Leaflet+React quirk)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Red marker icon for tourist attractions
const redIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl:
    "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const TripMap = ({ lat, lng, label, places = [] }) => {
  if (typeof lat !== "number" || typeof lng !== "number") return null;

  return (
    <div className="rounded overflow-hidden border border-gray-200">
      <MapContainer
        center={[lat, lng]}
        zoom={11}
        style={{ height: "320px", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Destination marker (blue) */}
        <Marker position={[lat, lng]}>
          <Popup>{label}</Popup>
        </Marker>

        {/* Attraction markers (red) */}
        {places.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={redIcon}>
            <Popup>
              <strong>{p.name}</strong>
              <br />
              <span style={{ fontSize: 12, color: "#666" }}>{p.type}</span>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default TripMap;