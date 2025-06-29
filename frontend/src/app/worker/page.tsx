"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

import styles from "./worker.module.css";

const WorkerIntroAnimation = () => (
  <div className={styles.introContainer}>
    <div className={styles.introLogo}>
      <span className={styles.introLogoLetter}>W</span>
    </div>
  </div>
);

interface SimpleLoadingAnimationProps {
  loadingText: string;
  onAnimationComplete: () => void;
}

const SimpleLoadingAnimation = ({
  loadingText,
  onAnimationComplete,
}: SimpleLoadingAnimationProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            if (onAnimationComplete) {
              onAnimationComplete();
            }
          }, 500); // Small delay before redirect
          return 100;
        }
        return prev + 2; // Faster progress
      });
    }, 50);

    return () => clearInterval(interval);
  }, [onAnimationComplete]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        {/* Simple spinning loader */}
        <div className="mb-6">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-yellow-500 rounded-full animate-spin mx-auto"></div>
        </div>

        {/* Progress bar */}
        <div className="w-64 bg-gray-200 rounded-full h-2 mb-4 mx-auto">
          <div
            className="bg-yellow-500 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* Loading text */}
        <p className="text-gray-600 font-medium">
          {loadingText} {progress === 100 ? "Complete!" : `${progress}%`}
        </p>
      </div>
    </div>
  );
};

export default function WorkerGatewayPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [isClient, setIsClient] = useState(false);

  const [hasIntroPlayed, setHasIntroPlayed] = useState(false);

  // Set client flag and check sessionStorage
  useEffect(() => {
    setIsClient(true);
    const introPlayed = sessionStorage.getItem("introPlayed") === "true";
    setHasIntroPlayed(introPlayed);
  }, []);

  useEffect(() => {
    const handleFocus = () => window.location.reload();
    if (hasIntroPlayed) window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [hasIntroPlayed]);

  useEffect(() => {
    if (!hasIntroPlayed) {
      const introTimer = setTimeout(() => {
        sessionStorage.setItem("introPlayed", "true");
        setHasIntroPlayed(true);
      }, 2500);
      return () => clearTimeout(introTimer);
    }
  }, [hasIntroPlayed]);

  const handleRedirect = useCallback(() => {
    if (!user) return;
    console.log("Animation complete. Redirecting now...");
    localStorage.setItem("workerSessionActive", "true");
    const workerProfile = localStorage.getItem(`workerProfile_${user.id}`);

    if (workerProfile) {
      router.push("/worker/dashboard");
    } else {
      router.push(
        `/worker/onboarding?email=${encodeURIComponent(
          user.primaryEmailAddress?.emailAddress || ""
        )}`
      );
    }
  }, [user, router]);

  if (!hasIntroPlayed) {
    return <WorkerIntroAnimation />;
  }

  if (!isLoaded || user) {
    const text = user ? "Launching Worker Portal" : "Loading";
    return (
      <SimpleLoadingAnimation
        loadingText={text}
        onAnimationComplete={handleRedirect}
      />
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        <div className={styles.logo}>W</div>
        <h1 className={styles.title}>Worker Portal</h1>
        <p className={styles.subtitle}>
          Sign in or create an account to manage your profile and jobs.
        </p>
        <div className={styles.buttonContainer}>
          <button
            onClick={() => (window.location.href = "/")}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
