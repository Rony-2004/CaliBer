"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "../cart/cartContext";
import { getOrCreateUserByEmail } from "@/lib/userService";
import { useUser, useSignIn } from '@clerk/nextjs';
import {
  BookingProgress,
  ButtonLoader,
  PageLoadAnimation,
  PulsingDots,
} from "@/components/LoadingAnimations";
import {
  getCurrentLocationWithAddress,
  formatAddress,
} from "@/lib/addressService";
import { ModernInput, ModernButton } from "@/components/ModernUI";
import mockWorkers from './mockWorkers';
import { ALL_SERVICES, type ServiceDetails } from "@/lib/services";

// Use the shared service details instead of duplicating
const SERVICE_DETAILS: Record<string, ServiceDetails> = ALL_SERVICES;

// Memoized function to parse duration to minutes
const parseDurationToMinutes = (duration: string): number => {
  const timeMatch = duration.match(/(\d+)-(\d+)\s*(min|hour|h)/);
  if (!timeMatch) return 60; // Default to 60 minutes

  const [, minStr, maxStr, unit] = timeMatch;
  const min = parseInt(minStr);
  const max = parseInt(maxStr);

  if (unit === "hour" || unit === "h") {
    return Math.round(((min + max) / 2) * 60);
  } else {
    return Math.round((min + max) / 2);
  }
};

const ServiceBookingPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToCart, cart } = useCart();
  const { user, isSignedIn, isLoaded } = useUser();
  const { signIn } = useSignIn();

  // State management
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<string>("");
  const [coupon, setCoupon] = useState<string>("");
  const [couponApplied, setCouponApplied] = useState<boolean>(false);
  const [discount, setDiscount] = useState<number>(0);
  const [isBookingConfirmed, setIsBookingConfirmed] = useState<boolean>(false);
  const [nearbyWorkerCount, setNearbyWorkerCount] = useState<number | null>(
    null
  );
  const [assignedWorker, setAssignedWorker] = useState<any>(null);
  const [showWorkerModal, setShowWorkerModal] = useState(false);

  // Loading states for cool animations
  const [bookingStage, setBookingStage] = useState<
    | "idle"
    | "initiating"
    | "getting-location"
    | "creating-user"
    | "creating-job"
    | "redirecting"
  >("idle");
  const [isPageLoading, setIsPageLoading] = useState<boolean>(true);

  // Address state
  const [address, setAddress] = useState<string>("");
  const [addressLoading, setAddressLoading] = useState<boolean>(true);
  const [addressError, setAddressError] = useState<string>("");

  // Get service name from URL params
  const serviceName = searchParams.get("service");

  // Page load animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 1500); // Show loading animation for 1.5 seconds

    return () => clearTimeout(timer);
  }, []);

  // Show loading while Clerk is loading user data
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-white mt-28 flex items-center justify-center">
        <PageLoadAnimation />
      </div>
    );
  }

  // Show sign-in prompt if user is not signed in
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-white mt-28 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Sign In Required</h2>
          <p className="text-gray-600 mb-6">Please sign in to book this service.</p>
          <button
            onClick={() => signIn()}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
          >
            Sign In to Continue
          </button>
        </div>
      </div>
    );
  }

  // Fetch address on mount
  useEffect(() => {
    let isMounted = true;
    setAddressLoading(true);
    getCurrentLocationWithAddress()
      .then((loc) => {
        if (isMounted) {
          setAddress(formatAddress(loc.address));
          setAddressLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setAddressError(
            "Could not fetch address automatically. Please enter manually."
          );
          setAddressLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Memoize current service to prevent unnecessary re-renders
  const currentService = useMemo(() => {
    if (!serviceName || !SERVICE_DETAILS[serviceName]) {
      return SERVICE_DETAILS["Haircut"]; // Default service
    }
    return SERVICE_DETAILS[serviceName];
  }, [serviceName]);

  // Memoize cart check to prevent unnecessary re-renders
  const isInCart = useMemo(() => {
    return cart.some(
      (item) =>
        item.name === currentService.name &&
        item.category === currentService.category
    );
  }, [cart, currentService.name, currentService.category]);

  // Memoize final price calculation
  const finalPrice = useMemo(() => {
    return currentService.price - discount;
  }, [currentService.price, discount]);

  // New state for job data
  const [jobDataForBooking, setJobDataForBooking] = useState<any>(null);
  const [userDataForBooking, setUserDataForBooking] = useState<any>(null);

  // Optimized booking handler with useCallback and cool animations
  const handleBooking = useCallback(async () => {
    console.log("🚀 [BOOKING] Starting booking process...");
    console.log("👤 [BOOKING] User:", user);
    console.log("💳 [BOOKING] Payment method:", selectedPaymentMethod);
    console.log("📍 [BOOKING] Address:", address);

    // Check if user is signed in
    if (!isSignedIn || !user) {
      console.log("❌ [BOOKING] User not signed in, redirecting to sign in...");
      try {
        await signIn();
      } catch (err) {
        console.error("❌ [BOOKING] Sign-in failed:", err);
        alert("Please sign in to continue with booking.");
      }
      return;
    }

    // Check if user has email (with better error handling)
    const userEmail = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress;
    if (!userEmail) {
      console.error("❌ [BOOKING] No user email found");
      alert("Email address not found. Please update your profile or sign in again.");
      return;
    }

    if (!("geolocation" in navigator)) {
      console.error("❌ [BOOKING] Geolocation not supported");
      alert("Geolocation is not supported by your browser.");
      return;
    }

    if (selectedPaymentMethod) {
      console.log("✅ [BOOKING] All checks passed, starting booking...");
      setIsBookingConfirmed(true);
      setBookingStage("initiating");

      try {
        // Simulate booking and assign a random worker
        const randomWorker = mockWorkers[Math.floor(Math.random() * mockWorkers.length)];
        setTimeout(() => {
          setIsBookingConfirmed(false);
          setBookingStage("idle");
          setAddress("");
          router.push(`/booking/worker-assigned?id=${randomWorker.id}`);
        }, 1500);
      } catch (error) {
        setIsBookingConfirmed(false);
        setBookingStage("idle");
      }
    }
  }, [
    user,
    isSignedIn,
    signIn,
    selectedPaymentMethod,
    currentService,
    router,
    address,
    finalPrice,
    discount,
    couponApplied,
    coupon,
  ]);

  // Handler for when workers are found
  const handleWorkerFound = (count: number) => {
    setNearbyWorkerCount(count);
  };

  // Optimized coupon handler with useCallback
  const handleApplyCoupon = useCallback(() => {
    if (coupon.trim().toUpperCase() === "USER25") {
      setDiscount(Math.round(currentService.price * 0.25));
      setCouponApplied(true);
    } else {
      setDiscount(0);
      setCouponApplied(false);
      alert("Invalid coupon code");
    }
  }, [coupon, currentService.price]);

  // Optimized cart handler with useCallback
  const handleAddToCart = useCallback(() => {
    if (!isInCart) {
      addToCart({
        name: currentService.name,
        price: currentService.price,
        category: currentService.category,
      });
    }
  }, [isInCart, addToCart, currentService]);

  // Show page loading animation
  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-white mt-28 flex items-center justify-center">
        <PageLoadAnimation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white mt-28">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-3xl">{currentService.icon}</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800 passion-one-black">
                  {currentService.name}
                </h1>
                <p className="text-gray-600 text-lg">
                  {currentService.category}
                </p>
              </div>
            </div>
            <button
              onClick={() => router.back()}
              className="bg-gray-100 hover:bg-gray-200 rounded-full p-3 transition-colors duration-200"
            >
              <svg
                className="w-6 h-6 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-8 md:flex-row">
          {/* Left Column - Service Details */}
          <div className="space-y-6">
            {/* Service Information */}
            <div className="rounded-xl p-8">
              <h2 className="text-2xl font-bold mb-6 passion-one-black text-gray-800">
                Service Details
              </h2>
              <div className="space-y-6">
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Duration:</span>
                  <span className="font-semibold text-gray-800">
                    {currentService.duration}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Price:</span>
                  <span className="font-bold text-3xl text-yellow-600">
                    ₹{currentService.price}
                  </span>
                </div>
                <div className="pt-3">
                  <span className="text-gray-600 font-medium block mb-2">
                    Description:
                  </span>
                  <p className="text-gray-800 leading-relaxed">
                    {currentService.description}
                  </p>
                </div>
              </div>
              <button
                className={`mt-6 w-full py-3 rounded-xl font-semibold text-lg transition-all duration-200 ${
                  isInCart
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg hover:shadow-xl"
                }`}
                onClick={handleAddToCart}
                disabled={isInCart}
              >
                {isInCart ? (
                  <div className="flex items-center justify-center space-x-2">
                    <span>Added to Cart</span>
                    <PulsingDots />
                  </div>
                ) : (
                  "Add to Cart"
                )}
              </button>
            </div>
          </div>

          {/* Right Column - Booking Summary */}
          <div className="flex-1 min-w-[320px]">
            <div className="rounded-xl p-8 bg-gray-50">
              <h2 className="text-2xl font-bold mb-6 passion-one-black text-gray-800">
                Booking Summary
              </h2>
              
              {/* User Info */}
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-green-800">Signed in as</div>
                    <div className="text-sm text-green-700">
                      {user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || 'Loading...'}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Address Input */}
              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">
                  Your Address
                </label>
                <ModernInput
                  value={address}
                  onChange={setAddress}
                  placeholder="Enter your address"
                  icon={null}
                  disabled={addressLoading}
                  error={addressError}
                  className="mb-2"
                />
                {addressLoading && (
                  <div className="text-yellow-600 text-sm flex items-center gap-2 animate-pulse">
                    <span>Fetching your address...</span>
                  </div>
                )}
                {addressError && (
                  <div className="text-red-500 text-sm mt-1">
                    {addressError}
                  </div>
                )}
              </div>
              {/* Coupon Input */}
              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">
                  Apply Coupon
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                    className="flex-1 p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-gray-800"
                    placeholder="Enter coupon code"
                    disabled={couponApplied}
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={couponApplied}
                    className={`px-4 py-2 rounded-lg border-2 font-semibold transition-colors duration-200 ${
                      couponApplied
                        ? "bg-green-200 border-green-400 text-green-800 cursor-not-allowed"
                        : "bg-white border-black text-black hover:bg-[#fdc700]"
                    }`}
                  >
                    {couponApplied ? "Applied" : "Apply"}
                  </button>
                </div>
                {couponApplied && (
                  <p className="text-green-600 text-sm mt-2">
                    Coupon applied! 25% discount
                  </p>
                )}
              </div>

              {/* Payment Method */}
              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">
                  Payment Method
                </label>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer p-3 border-2 border-gray-200 rounded-lg hover:border-yellow-500 transition-colors duration-200">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cash"
                      checked={selectedPaymentMethod === "cash"}
                      onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                      className="text-yellow-500 focus:ring-yellow-500"
                    />
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                          ></path>
                        </svg>
                      </div>
                      <div>
                        <span className="font-medium text-gray-800">
                          Cash on Delivery
                        </span>
                        <p className="text-xs text-gray-500">
                          Pay when service is completed
                        </p>
                      </div>
                    </div>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer p-3 border-2 border-gray-200 rounded-lg hover:border-yellow-500 transition-colors duration-200">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="online"
                      checked={selectedPaymentMethod === "online"}
                      onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                      className="text-yellow-500 focus:ring-yellow-500"
                    />
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                          ></path>
                        </svg>
                      </div>
                      <div>
                        <span className="font-medium text-gray-800">
                          Online Payment
                        </span>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs text-gray-500">
                            Pay securely with
                          </span>
                          <div className="flex items-center gap-1">
                            <div className="w-6 h-4 bg-orange-500 rounded text-white text-xs flex items-center justify-center font-bold">
                              G
                            </div>
                            <div className="w-6 h-4 bg-purple-500 rounded text-white text-xs flex items-center justify-center font-bold">
                              P
                            </div>
                            <div className="w-6 h-4 bg-blue-500 rounded text-white text-xs flex items-center justify-center font-bold">
                              P
                            </div>
                            <div className="w-6 h-4 bg-green-500 rounded text-white text-xs flex items-center justify-center font-bold">
                              U
                            </div>
                            <div className="w-6 h-4 bg-gray-600 rounded text-white text-xs flex items-center justify-center font-bold">
                              C
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Service Price:</span>
                  <span className="font-semibold">₹{currentService.price}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount:</span>
                    <span>-₹{discount}</span>
                  </div>
                )}
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-yellow-600">₹{finalPrice}</span>
                  </div>
                </div>
              </div>

              {/* Book Now Button */}
              <ModernButton
                onClick={handleBooking}
                disabled={
                  !selectedPaymentMethod ||
                  isBookingConfirmed ||
                  addressLoading ||
                  !address
                }
                loading={isBookingConfirmed}
                className="w-full py-4 mt-2"
              >
                {isBookingConfirmed ? "Looking for worker near you..." : "Book Now"}
              </ModernButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceBookingPage;
