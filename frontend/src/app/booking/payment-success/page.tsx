'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { useUser } from '@clerk/nextjs';
import { FiCheckCircle, FiLoader } from 'react-icons/fi';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { user } = useUser();
  const [isProcessing, setIsProcessing] = useState(true);
  const [workerId, setWorkerId] = useState<string | null>(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      showToast('Invalid payment session', 'error');
      router.push('/');
      return;
    }

    // Simulate processing payment and finding worker
    const processPayment = async () => {
      try {
        console.log('Processing payment success for session:', sessionId);
        showToast('Payment successful! Finding a worker for you...', 'success');
        
        // In a real app, you would verify the payment with Stripe here
        // const response = await fetch('/api/stripe/verify-payment', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ sessionId })
        // });
        // const { verified, amount, serviceName } = await response.json();
        
        // Simulate API call to verify payment and assign worker
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Simulate worker assignment (in real app, this would come from your backend)
        const mockWorkerId = `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setWorkerId(mockWorkerId);
        
        showToast('Worker assigned! Redirecting to tracking...', 'success');
        
        // Redirect to tracking page after a short delay
        setTimeout(() => {
          router.push(`/job-tracking?workerId=${mockWorkerId}&paymentMethod=online&sessionId=${sessionId}`);
        }, 1500);
        
      } catch (error) {
        console.error('Error processing payment:', error);
        showToast('Error processing payment. Please contact support.', 'error');
        router.push('/');
      } finally {
        setIsProcessing(false);
      }
    };

    processPayment();
  }, [sessionId, router, showToast]);

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-white mt-28 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-6">
            <FiCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Payment Successful!</h1>
            <p className="text-gray-600 mb-6">Your payment has been processed successfully.</p>
          </div>
          
          <div className="flex items-center justify-center space-x-2 text-gray-600">
            <FiLoader className="w-5 h-5 animate-spin" />
            <span>Processing your booking and finding a worker...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white mt-28 flex items-center justify-center">
      <div className="text-center">
        <FiCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Booking Confirmed!</h1>
        <p className="text-gray-600 mb-6">Your worker has been assigned and is on the way.</p>
        <p className="text-sm text-gray-500">Redirecting to tracking page...</p>
      </div>
    </div>
  );
} 