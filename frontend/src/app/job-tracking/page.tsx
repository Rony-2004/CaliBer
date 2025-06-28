"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useJobTracking } from "@/lib/jobTracking";
import LiveTrackingMap from "../components/LiveTrackingMap";
import EnhancedTrackingDisplay from "../components/EnhancedTrackingDisplay";
import {
  FiMapPin,
  FiPhone,
  FiClock,
  FiUser,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiMaximize2,
} from "react-icons/fi";
import Image from "next/image";
import mockWorkers from "../booking/services/mockWorkers";

const JobTrackingPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    currentJob,
    assignedWorker,
    isJobAccepted,
    isTrackingActive,
    workerLocation,
    lastLocationUpdate,
    isSocketConnected,
    connectSocket,
    error,
    clearError,
  } = useJobTracking();

  const [viewMode, setViewMode] = useState<"map" | "details" | "both">("both");

  const jobId = searchParams.get("jobId");
  const workerId = searchParams.get("workerId");

  useEffect(() => {
    // Connect to socket for real-time updates
    connectSocket();
    // Join user room for job updates (if needed)
  }, [connectSocket]);

  // Format time
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Calculate ETA (simple calculation)
  const calculateETA = () => {
    if (!workerLocation || !currentJob) return null;

    // Simple distance calculation (Haversine formula would be better)
    const latDiff = Math.abs(workerLocation.lat - currentJob.lat);
    const lngDiff = Math.abs(workerLocation.lng - currentJob.lng);
    const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111; // Rough km conversion

    // Assume average speed of 20 km/h in city
    const etaMinutes = Math.round(distance * 3);
    return etaMinutes;
  };

  // --- MOCK DATA for UI DEMO (replace with real data as needed) ---
  const mockService = {
    name: "Plumbing Repair",
    provider: "Alex Johnson",
    bookingTime: "Today, 2:00 PM",
    status: "In Progress",
    eta: 15,
    orderId: "#65123456789",
  };

  if (!currentJob && workerId) {
    return (
      <div className="min-h-screen bg-white pt-24">
        {/* Main Content: Map left, Details right */}
        <div className="max-w-6xl mx-auto px-2 sm:px-4 mt-8 mb-16 flex flex-col md:flex-row gap-8 min-h-[60vh]">
          {/* Map Section */}
          <div className="flex-1 bg-white rounded-xl shadow overflow-hidden flex items-stretch min-h-[300px] md:min-h-[400px]">
            <Image src="/Assets/mocks/map-mock.png" alt="Map" width={900} height={600} className="w-full h-60 md:h-full object-cover" />
          </div>

          {/* Details Section */}
          <div className="flex-1 flex flex-col gap-6 min-w-0">
            {/* Status Card */}
            <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-2">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-lg">Service in Progress</span>
                <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">En Route</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: "70%" }} />
              </div>
              <span className="text-gray-600 text-sm">Estimated arrival <span className="text-blue-600 font-semibold">{mockService.eta} minutes</span></span>
            </div>
            {/* Service Details */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <span>Service Details</span>
              </h2>
              <div className="text-sm text-gray-700 space-y-2">
                <div className="flex justify-between"><span>Order ID</span><span className="font-mono font-semibold">{mockService.orderId}</span></div>
                <div className="flex justify-between"><span>Service</span><span className="font-semibold">{mockService.name}</span></div>
                <div className="flex justify-between"><span>Booking Time</span><span className="font-semibold">{mockService.bookingTime}</span></div>
                <div className="flex justify-between"><span>Status</span><span className="font-semibold">{mockService.status}</span></div>
              </div>
            </div>
            {/* Worker Details */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <FiUser className="w-5 h-5 text-gray-600" />
                <span>Worker Details</span>
              </h2>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                  <Image 
                    src={mockWorkers[0].avatar} 
                    alt={mockWorkers[0].name}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 text-lg">{mockWorkers[0].name}</h3>
                  <p className="text-gray-600 text-sm">{mockWorkers[0].description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-yellow-500 text-sm">★★★★☆</span>
                    <span className="text-gray-500 text-sm">4.0 (120 reviews)</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button 
                  className="flex-1 flex items-center justify-center gap-1.5 bg-yellow-500 border border-black text-white py-1 px-2.5 rounded-md font-medium transition-colors duration-200 hover:bg-yellow-600 text-xs"
                  onClick={() => {
                    // Navigate to chat page
                    router.push(`/chat?workerId=${mockWorkers[0].id}&workerName=${encodeURIComponent(mockWorkers[0].name)}`);
                  }}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Message
                </button>
                <button 
                  className="flex-1 flex items-center justify-center gap-1.5 bg-yellow-500 border border-black text-white py-1 px-2.5 rounded-md font-medium transition-colors duration-200 hover:bg-yellow-600 text-xs"
                  onClick={() => {
                    // Initiate phone call
                    const phoneNumber = mockWorkers[0].phone || '+1234567890';
                    window.open(`tel:${phoneNumber}`, '_self');
                  }}
                >
                  <FiPhone className="w-3 h-3" />
                  Call
                </button>
              </div>
            </div>
            {/* Payment Details */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <span>Payment Details</span>
              </h2>
              <div className="text-sm text-gray-700 space-y-2">
                <div className="flex justify-between"><span>Amount</span><span className="font-semibold">₹499</span></div>
                <div className="flex justify-between"><span>Payment Method</span><span className="font-semibold">Online (UPI)</span></div>
                <div className="flex justify-between"><span>Status</span><span className="font-semibold text-green-600">Paid</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-24 pb-32">
      {/* Status Card */}
      <div className="max-w-2xl mx-auto px-4 mt-6">
        <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-2">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-lg">Service in Progress</span>
            <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">En Route</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: "70%" }} />
          </div>
          <span className="text-gray-600 text-sm">Estimated arrival <span className="text-blue-600 font-semibold">{mockService.eta} minutes</span></span>
        </div>
      </div>

      {/* Map Section */}
      <div className="max-w-4xl mx-auto px-4 mt-8">
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <Image src="/Assets/mocks/map-mock.png" alt="Map" width={900} height={300} className="w-full h-72 object-cover" />
        </div>
      </div>

      {/* Details and Benefits */}
      <div className="max-w-4xl mx-auto px-4 mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Service Details */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <span>Service Details</span>
          </h2>
          <div className="text-sm text-gray-700 space-y-2">
            <div className="flex justify-between"><span>Order ID</span><span className="font-mono font-semibold">{mockService.orderId}</span></div>
            <div className="flex justify-between"><span>Service</span><span className="font-semibold">{mockService.name}</span></div>
            <div className="flex justify-between"><span>Booking Time</span><span className="font-semibold">{mockService.bookingTime}</span></div>
            <div className="flex justify-between"><span>Status</span><span className="font-semibold">{mockService.status}</span></div>
          </div>
        </div>
        {/* Worker Details */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <FiUser className="w-5 h-5 text-gray-600" />
            <span>Worker Details</span>
          </h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
              <Image 
                src={mockWorkers[0].avatar} 
                alt={mockWorkers[0].name}
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-800 text-lg">{mockWorkers[0].name}</h3>
              <p className="text-gray-600 text-sm">{mockWorkers[0].description}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-yellow-500 text-sm">★★★★☆</span>
                <span className="text-gray-500 text-sm">4.0 (120 reviews)</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button 
              className="flex-1 flex items-center justify-center gap-1.5 bg-yellow-500 border border-black text-white py-1 px-2.5 rounded-md font-medium transition-colors duration-200 hover:bg-yellow-600 text-xs"
              onClick={() => {
                // Navigate to chat page
                router.push(`/chat?workerId=${mockWorkers[0].id}&workerName=${encodeURIComponent(mockWorkers[0].name)}`);
              }}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Message
            </button>
            <button 
              className="flex-1 flex items-center justify-center gap-1.5 bg-yellow-500 border border-black text-white py-1 px-2.5 rounded-md font-medium transition-colors duration-200 hover:bg-yellow-600 text-xs"
              onClick={() => {
                // Initiate phone call
                const phoneNumber = mockWorkers[0].phone || '+1234567890';
                window.open(`tel:${phoneNumber}`, '_self');
              }}
            >
              <FiPhone className="w-3 h-3" />
              Call
            </button>
          </div>
        </div>
        {/* Payment Details */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <span>Payment Details</span>
          </h2>
          <div className="text-sm text-gray-700 space-y-2">
            <div className="flex justify-between"><span>Amount</span><span className="font-semibold">₹499</span></div>
            <div className="flex justify-between"><span>Payment Method</span><span className="font-semibold">Online (UPI)</span></div>
            <div className="flex justify-between"><span>Status</span><span className="font-semibold text-green-600">Paid</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobTrackingPage;
