import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/clerk-react";
import socketManager from "@/lib/socket";
import polyline from "@mapbox/polyline";
import { CircleMarker, Polyline, Marker, Popup } from "react-leaflet";
import L from "leaflet";

const OPENROUTESERVICE_API_KEY =
  "5b3ce3597851110001cf62481ff50d5207c04a54bed84f87a78c203f"; // <-- Set your OpenRouteService API key here

export const useWorkerDashboard = () => {
  const router = useRouter();
  const { user } = useUser();

  // State
  const [theme, setTheme] = useState("light");
  const [isLive, setIsLive] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [locationError, setLocationError] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<
    "idle" | "incoming" | "accepted" | "in_progress" | "completed"
  >("idle");
  const [jobRequest, setJobRequest] = useState<any>(null);
  const [jobHistory, setJobHistory] = useState<any[]>([]);
  const [route, setRoute] = useState<[number, number][] | null>(null);
  const [countdownTime, setCountdownTime] = useState(0);
  const [earnings, setEarnings] = useState(0);
  const [timeWorked, setTimeWorked] = useState(0);
  const [jobsCompleted, setJobsCompleted] = useState(0);
  const [performance] = useState({ rating: 4.8, successRate: 96 });
  const [weeklyGoal, setWeeklyGoal] = useState({ target: 2000 });
  const [goalInput, setGoalInput] = useState("2000");
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [profile, setProfile] = useState({
    firstName: "Worker",
    imageUrl: null,
  });
  const [workerId, setWorkerId] = useState<string | null>(null);

  // Worker icon for the map
  const workerIcon = useMemo(
    () =>
      new L.Icon({
        iconUrl:
          "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
    []
  );

  // Job icon for the map
  const jobIcon = useMemo(
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

  // Fetch worker profile
  const fetchWorkerProfile = useCallback(async (workerId: string) => {
    try {
      // Replace with your actual API call
      const response = await fetch(
        `http://localhost:5000/api/v1/workers/${workerId}`
      );
      const data = await response.json();
      setProfile({
        firstName: data.firstName || "Worker",
        imageUrl: data.profilePicture || null,
      });
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    }
  }, []);

  const fetchWorkerId = useCallback(async (userEmail: string) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/v1/workers?email=${encodeURIComponent(
          userEmail
        )}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data.length > 0) {
          return data.data[0].id; // Database worker ID
        }
      }
      throw new Error("Worker not found");
    } catch (error) {
      console.error("Failed to fetch worker ID:", error);
      return null;
    }
  }, []);

  // Toggle theme
  const toggleTheme = useCallback(() => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("worker-theme", newTheme);
    document.documentElement.className =
      newTheme === "dark" ? "dark-theme" : "";
  }, [theme]);

  // Toggle live status
  const toggleLiveStatus = useCallback(async () => {
    if (!workerId) {
      console.error("Worker ID not available");
      return;
    }

    const newStatus = !isLive;
    let newLocation: { lat: number; lng: number } | null = null;

    try {
      // Get current location first
      if (newStatus) {
        setLocationError(null);
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
            });
          }
        );

        newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setLocation(newLocation);

        // Save location to liveLocations table
        try {
          await fetch(`http://localhost:5000/api/v1/live-locations`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              workerId: workerId,
              lat: newLocation.lat,
              lng: newLocation.lng,
            }),
          });
          console.log("✅ Location saved to database");
        } catch (locationError) {
          console.error("Failed to save location:", locationError);
        }
      }

      // API call to update availability
      const response = await fetch(
        `http://localhost:5000/api/v1/workers/${workerId}/availability`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isActive: newStatus,
            lat: newLocation?.lat || location?.lat,
            lng: newLocation?.lng || location?.lng,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to update availability");

      setIsLive(newStatus);
    } catch (error: any) {
      console.error("Error updating availability:", error);
      if (error.message?.includes("getCurrentPosition")) {
        setLocationError(
          "Could not get location. Please enable location services."
        );
        setIsLive(false);
      }
    }
  }, [isLive, location, workerId]);

  // Handle incoming job
  const handleNewJobBroadcast = useCallback((jobData: any) => {
    const newJobRequest = {
      id: jobData.id,
      distance: `${jobData.workerDistance?.toFixed(1) || "2.5"} km`,
      fare: jobData.fare || 500,
      title: jobData.description,
      clientLocation: [jobData.lat, jobData.lng] as [number, number],
      description: jobData.description,
      location: jobData.address || "Client Location",
      lat: jobData.lat,
      lng: jobData.lng,
      userId: jobData.userId,
      durationMinutes: jobData.durationMinutes || 60,
    };

    setJobRequest(newJobRequest);
    setJobStatus("incoming");
    setCountdownTime(120); // 2 minutes countdown

    const timer = setInterval(() => {
      setCountdownTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setJobStatus("idle");
          setJobRequest(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Fetch route from OpenRouteService
  const fetchRoute = async (
    origin: [number, number],
    destination: [number, number]
  ) => {
    try {
      console.log("🗺️ Fetching route from OpenRouteService...");
      console.log("Origin:", origin);
      console.log("Destination:", destination);

      // Create intermediate waypoints for a more realistic route
      const latDiff = destination[0] - origin[0];
      const lngDiff = destination[1] - origin[1];

      // Create 3-5 intermediate points to simulate road routing
      const waypoints = [];
      const numPoints = 4;

      for (let i = 1; i < numPoints; i++) {
        const progress = i / numPoints;
        // Add some randomness to simulate road curves
        const randomLat = (Math.random() - 0.5) * 0.002;
        const randomLng = (Math.random() - 0.5) * 0.002;

        waypoints.push([
          origin[0] + latDiff * progress + randomLat,
          origin[1] + lngDiff * progress + randomLng,
        ]);
      }

      const allCoordinates = [origin, ...waypoints, destination];
      console.log("🗺️ Route coordinates:", allCoordinates);

      const response = await fetch(
        `https://api.openrouteservice.org/v2/directions/driving-car`,
        {
          method: "POST",
          headers: {
            Authorization: OPENROUTESERVICE_API_KEY,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            coordinates: allCoordinates.map((coord) => [coord[1], coord[0]]), // [lng, lat]
            format: "json",
            instructions: false, // We don't need turn-by-turn instructions
            preference: "fastest", // Get the fastest route
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "❌ OpenRouteService API error:",
          response.status,
          errorText
        );

        // If API fails, create a realistic road-like route manually
        console.log("🗺️ Creating manual road-like route...");
        return createManualRoute(origin, destination);
      }

      const data = await response.json();
      console.log("🗺️ Route response:", data);

      if (data && data.routes && data.routes[0] && data.routes[0].geometry) {
        // Decode the polyline to get coordinates
        const polylineString = data.routes[0].geometry;
        console.log("🗺️ Polyline string:", polylineString);

        try {
          const routeCoords = polyline.decode(polylineString);
          console.log("🗺️ Route coordinates count:", routeCoords.length);
          console.log("🗺️ First 3 coordinates:", routeCoords.slice(0, 3));
          console.log("🗺️ Last 3 coordinates:", routeCoords.slice(-3));

          // Validate coordinates before returning
          if (
            routeCoords.length > 0 &&
            routeCoords.every(
              (coord) =>
                Array.isArray(coord) &&
                coord.length === 2 &&
                typeof coord[0] === "number" &&
                typeof coord[1] === "number" &&
                coord[0] >= -90 &&
                coord[0] <= 90 &&
                coord[1] >= -180 &&
                coord[1] <= 180
            )
          ) {
            console.log(
              "🗺️ Route coordinates are valid, returning:",
              routeCoords
            );
            return routeCoords as [number, number][];
          } else {
            console.log("❌ Route coordinates are invalid:", routeCoords);
            return createManualRoute(origin, destination);
          }
        } catch (decodeError) {
          console.error("❌ Failed to decode polyline:", decodeError);
          console.error("❌ Polyline string was:", polylineString);
          return createManualRoute(origin, destination);
        }
      }

      console.log("🗺️ No route found in response, creating manual route");
      return createManualRoute(origin, destination);
    } catch (error) {
      console.error("❌ Failed to fetch route:", error);
      return createManualRoute(origin, destination);
    }
  };

  // Create a manual road-like route when API fails
  const createManualRoute = (
    origin: [number, number],
    destination: [number, number]
  ) => {
    console.log("🗺️ Creating manual road-like route...");

    const latDiff = destination[0] - origin[0];
    const lngDiff = destination[1] - origin[1];
    const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

    // Create more points for longer distances
    const numPoints = Math.max(5, Math.floor(distance * 1000)); // More points for longer routes
    const route = [];

    for (let i = 0; i <= numPoints; i++) {
      const progress = i / numPoints;

      // Add road-like curves (slight deviations from straight line)
      const curveFactor = Math.sin(progress * Math.PI) * 0.0005;
      const randomFactor = (Math.random() - 0.5) * 0.0003;

      const lat = origin[0] + latDiff * progress + curveFactor + randomFactor;
      const lng = origin[1] + lngDiff * progress + curveFactor + randomFactor;

      route.push([lat, lng]);
    }

    console.log("🗺️ Manual route created with", route.length, "points");
    return route as [number, number][];
  };

  // Accept job
  const handleAcceptJob = useCallback(async () => {
    if (!jobRequest || !workerId) return;

    const socket = socketManager.getSocket();
    if (socket) {
      socket.emit("accept_job", {
        jobId: jobRequest.id,
        workerId: workerId,
      });
    }

    setJobStatus("accepted");
    if (
      location &&
      typeof location.lat === "number" &&
      typeof location.lng === "number" &&
      jobRequest &&
      Array.isArray(jobRequest.clientLocation) &&
      jobRequest.clientLocation.length === 2 &&
      typeof jobRequest.clientLocation[0] === "number" &&
      typeof jobRequest.clientLocation[1] === "number"
    ) {
      // Debug log to check coordinates
      // For best visibility, try client location lat: 22.6735289, lng: 88.3744036
      console.log("Setting route with:", [
        [location.lat, location.lng],
        [jobRequest.clientLocation[0], jobRequest.clientLocation[1]],
      ]);
      // Try both orders for clientLocation in case of backend swap
      setRoute([
        [location.lat, location.lng],
        [jobRequest.clientLocation[0], jobRequest.clientLocation[1]],
      ]);
      // Uncomment the following line if the above doesn't work:
      // setRoute([
      //   [location.lat, location.lng],
      //   [jobRequest.clientLocation[1], jobRequest.clientLocation[0]],
      // ]);
    } else {
      setRoute(null);
    }
  }, [jobRequest, workerId, location]);

  // Decline job
  const handleDeclineJob = useCallback(() => {
    if (!jobRequest || !workerId) return;

    const socket = socketManager.getSocket();
    if (socket) {
      socket.emit("decline_job", {
        jobId: jobRequest.id,
        workerId: workerId,
        reason: "Worker declined",
      });
    }

    setJobHistory((prev) => [{ ...jobRequest, status: "declined" }, ...prev]);
    setJobStatus("idle");
    setJobRequest(null);
    setRoute(null);
  }, [jobRequest, workerId]);

  // Complete job
  const handleCompleteJob = useCallback(() => {
    if (jobRequest) {
      setEarnings((prev) => prev + jobRequest.fare);
      setJobsCompleted((prev) => prev + 1);
      setJobHistory((prev) => [
        { ...jobRequest, status: "completed" },
        ...prev,
      ]);
    }
    setJobStatus("idle");
    setJobRequest(null);
    setRoute(null);
  }, [jobRequest]);

  // Goal management
  const handleSetGoal = useCallback(() => {
    const newTarget = parseInt(goalInput, 10);
    if (!isNaN(newTarget)) {
      setWeeklyGoal({ target: newTarget });
      setIsEditingGoal(false);
    }
  }, [goalInput]);

  // Initialize socket connection
  useEffect(() => {
    if (!user?.id) return;

    const socket = socketManager.getSocket();
    if (!socket) {
      console.log("❌ Socket not available for event listeners");
      return;
    }

    console.log("🔌 Setting up socket event listeners");
    socket.on("new_job_broadcast", (jobData) => {
      console.log("📨 Received job broadcast:", jobData);
      handleNewJobBroadcast(jobData);
    });
    socket.on("job_accepted_success", () => {
      console.log("✅ Job accepted successfully");
      setJobStatus("accepted");
      setJobRequest(null);
    });

    return () => {
      console.log("🔌 Cleaning up socket event listeners");
      socket.off("new_job_broadcast", handleNewJobBroadcast);
      socket.off("job_accepted_success");
    };
  }, [user?.id, handleNewJobBroadcast]);

  // Initialize socket connection
  useEffect(() => {
    if (!user?.primaryEmailAddress?.emailAddress) return;

    fetchWorkerId(user.primaryEmailAddress.emailAddress).then((dbWorkerId) => {
      if (dbWorkerId) {
        setWorkerId(dbWorkerId);
        fetchWorkerProfile(dbWorkerId); // Update profile fetch too
      }
    });
  }, [
    user?.primaryEmailAddress?.emailAddress,
    fetchWorkerId,
    fetchWorkerProfile,
  ]);

  // Time worked counter
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLive) {
      timer = setInterval(() => {
        setTimeWorked((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isLive]);

  // Initialize socket connection
  useEffect(() => {
    if (workerId) {
      const socket = socketManager.getSocket();
      if (socket) {
        console.log("🔌 Joining worker room:", workerId);
        socket.emit("join_worker_room", { workerId });
        console.log("✅ Worker room join request sent");
      } else {
        console.log("❌ Socket not available for worker room join");
      }
    }
  }, [workerId]);

  // Logout
  const handleLogout = useCallback(() => {
    localStorage.removeItem("userProfile");
    router.push("/");
  }, [router]);

  return {
    // State
    theme,
    isLive,
    location,
    locationError,
    jobStatus,
    jobRequest,
    jobHistory,
    route,
    countdownTime,
    earnings,
    timeWorked,
    jobsCompleted,
    performance,
    weeklyGoal,
    isEditingGoal,
    goalInput,
    profile,
    workerId,

    // Icons
    workerIcon,
    jobIcon,

    // Handlers
    toggleTheme,
    toggleLiveStatus,
    handleAcceptJob,
    handleDeclineJob,
    handleCompleteJob,
    handleSetGoal,
    setGoalInput,
    setIsEditingGoal,
    handleLogout,
    fetchWorkerProfile,
    fetchWorkerId,
  };
};

export function useDeviceHeading() {
  const [heading, setHeading] = useState(0);

  useEffect(() => {
    function handleOrientation(event: DeviceOrientationEvent) {
      // event.alpha is the compass heading in degrees (0 = north)
      if (event.alpha !== null) {
        setHeading(event.alpha);
      }
    }
    window.addEventListener(
      "deviceorientationabsolute",
      handleOrientation,
      true
    );
    window.addEventListener("deviceorientation", handleOrientation, true);

    return () => {
      window.removeEventListener(
        "deviceorientationabsolute",
        handleOrientation
      );
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, []);

  return heading;
}
