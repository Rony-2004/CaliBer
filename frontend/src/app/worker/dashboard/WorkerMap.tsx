"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Polyline,
  CircleMarker,
} from "react-leaflet";
import L, { LatLngExpression, LatLngBounds } from "leaflet";
import { useEffect, useMemo } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useMapEvent } from "react-leaflet";

interface WorkerMapProps {
  workerPosition: LatLngExpression;
  clientPosition: LatLngExpression | null;
  route: LatLngExpression[] | null;
  onMapClick?: (latlng: { lat: number; lng: number }) => void;
}

export default function WorkerMap({
  workerPosition,
  clientPosition,
  route,
  onMapClick,
}: WorkerMapProps) {
  const workerIcon = useMemo(
    () =>
      L.divIcon({
        className: "worker-location-icon",
        html: renderToStaticMarkup(
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "24px",
              height: "24px",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: "rgba(59, 130, 246, 0.25)",
                animation: "pulse-ring 2s ease-out infinite",
              }}
            ></div>
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: "#3b82f6",
                border: "2px solid #fff",
              }}
            ></div>
          </div>
        ),
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
    []
  );

  const clientIcon = useMemo(
    () =>
      new L.Icon({
        iconUrl:
          "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
    []
  );

  // Calculate route distance and ETA
  const routeInfo = useMemo(() => {
    if (!route || route.length < 2) return null;

    let totalDistance = 0;
    for (let i = 1; i < route.length; i++) {
      const prev = route[i - 1] as [number, number];
      const curr = route[i] as [number, number];
      const lat1 = (prev[0] * Math.PI) / 180;
      const lat2 = (curr[0] * Math.PI) / 180;
      const deltaLat = ((curr[0] - prev[0]) * Math.PI) / 180;
      const deltaLng = ((curr[1] - prev[1]) * Math.PI) / 180;

      const a =
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1) *
          Math.cos(lat2) *
          Math.sin(deltaLng / 2) *
          Math.sin(deltaLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      totalDistance += 6371 * c; // Earth's radius in km
    }

    const etaMinutes = Math.round(totalDistance * 3); // Assume 20 km/h average speed

    return {
      distance: totalDistance.toFixed(1),
      eta: etaMinutes,
    };
  }, [route]);

  // Debug route data
  console.log("🗺️ WorkerMap received route:", route);
  console.log("🗺️ Route type:", typeof route);
  console.log("🗺️ Route length:", route?.length);
  if (route && route.length > 0) {
    console.log("🗺️ First route coordinate:", route[0]);
    console.log("🗺️ Last route coordinate:", route[route.length - 1]);
    console.log(
      "🗺️ Route coordinates format check:",
      route.every((coord) => Array.isArray(coord) && coord.length === 2)
    );
  }

  // Add this component to handle map clicks
  function MapClickHandler({
    onMapClick,
  }: {
    onMapClick: (latlng: { lat: number; lng: number }) => void;
  }) {
    useMapEvent("click", (e) => {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    return null;
  }

  // Guard against undefined workerPosition
  if (
    !workerPosition ||
    !Array.isArray(workerPosition) ||
    workerPosition.length !== 2
  ) {
    return (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f3f4f6",
        }}
      >
        <p>Loading map...</p>
      </div>
    );
  }

  // Create a unique key for the map to prevent reuse errors
  const workerPosStr = Array.isArray(workerPosition)
    ? `${workerPosition[0]}-${workerPosition[1]}`
    : "unknown";
  const clientPosStr =
    clientPosition && Array.isArray(clientPosition)
      ? `${clientPosition[0]}-${clientPosition[1]}`
      : "no-client";
  const routeStr = route ? route.length.toString() : "0";
  const mapKey = `${workerPosStr}-${clientPosStr}-${routeStr}`;

  // Validate route before rendering
  const validRoute =
    route &&
    route.length > 0 &&
    route.every(
      (coord) =>
        Array.isArray(coord) &&
        coord.length === 2 &&
        typeof coord[0] === "number" &&
        typeof coord[1] === "number"
    );

  console.log("🗺️ Valid route for rendering:", validRoute);
  if (validRoute) {
    console.log("🗺️ Rendering polyline with coordinates:", route);
  }

  return (
    <MapContainer
      key={mapKey}
      center={workerPosition}
      zoom={19}
      style={{ height: "100%", width: "100%" }}
    >
      {onMapClick && <MapClickHandler onMapClick={onMapClick} />}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {/* Blue dot for worker location */}
      <Marker position={workerPosition} icon={workerIcon}>
        <Popup>Your Location</Popup>
      </Marker>
      {/* Blue dot for job location (clientPosition) */}
      {clientPosition && (
        <CircleMarker
          center={clientPosition}
          radius={10}
          pathOptions={{
            color: "#2563eb",
            fillColor: "#2563eb",
            fillOpacity: 1,
          }}
        />
      )}
      {/* Main route polyline */}
      {validRoute && (
        <Polyline
          positions={route}
          color="#2563eb"
          weight={12}
          opacity={1}
          lineCap="round"
          lineJoin="round"
        />
      )}
      {/* Route Info Overlay */}
      {routeInfo && validRoute && (
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "white",
            color: "#2563eb",
            padding: "8px 18px",
            borderRadius: "20px",
            fontWeight: 600,
            fontSize: "16px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            zIndex: 1000,
            border: "2px solid #2563eb",
          }}
        >
          🚗 {routeInfo.distance} km &nbsp; | &nbsp; ⏱ {routeInfo.eta} min
        </div>
      )}
    </MapContainer>
  );
}
