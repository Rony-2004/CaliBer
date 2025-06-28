# Job Creation Flow

This document explains how job creation works when users book services in the Hexafall application.

## Overview

When a user clicks "Book Now" with either COD (Cash on Delivery) or online payment, the system automatically creates a job in the backend database. The job creation process is integrated into the booking flow and happens before payment processing.

## Job Data Structure

The job data sent to the backend follows this structure:

```json
{
  "userId": "4361bf93-f740-4296-a163-65986b17d342",
  "workerId": "a1b2c3d4-e5f6-7890-abcd-1234567890ef", // Optional, assigned later
  "description": "Fix leaking kitchen sink and pipe fitting",
  "location": "Area I, New Town, Bidhannagar, North 24 Parganas, West Bengal, 700162, India",
  "lat": 22.5726,
  "lng": 88.3639,
  "specializations": "mechanic",
  "status": "pending",
  "bookedFor": "2024-07-15T14:30:00.000Z",
  "durationMinutes": 45
}
```

## Flow Diagram

```
User clicks "Book Now"
         ↓
   Validate user & location
         ↓
   Create job in backend
         ↓
   Payment method selected?
         ↓
   ┌─────────────────┬─────────────────┐
   │   Online Payment│   Cash on Delivery│
   │                 │                 │
   │ 1. Create job   │ 1. Create job   │
   │ 2. Stripe payment│ 2. Assign worker│
   │ 3. Success page │ 3. Worker page  │
   │ 4. Tracking     │ 4. Tracking     │
   └─────────────────┴─────────────────┘
```

## Implementation Details

### 1. Job Service (`frontend/src/lib/jobService.ts`)

The job service provides functions to interact with the backend job API:

- `createJob(jobData)` - Creates a new job
- `getJobById(jobId)` - Retrieves job by ID
- `updateJobStatus(jobId, status)` - Updates job status
- `getUserJobs(userId)` - Gets all jobs for a user
- `mapServiceCategoryToSpecialization(category)` - Maps service category to job specialization
- `createJobDescription(serviceName, description)` - Creates job description

### 2. Booking Flow (`frontend/src/app/booking/services/page.tsx`)

The booking handler now includes job creation:

```typescript
const handleBooking = useCallback(
  async () => {
    // 1. Validate user and get user data
    const userData = await getOrCreateUserByEmail(userEmail, {
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumbers?.[0]?.phoneNumber,
    });

    // 2. Get current location
    const locationData = await getCurrentLocationWithAddress();

    // 3. Create job data
    const jobData: JobData = {
      userId: userData.id,
      specializations: mapServiceCategoryToSpecialization(
        currentService.category
      ),
      description: createJobDescription(
        currentService.name,
        currentService.description
      ),
      location: address || locationData.address,
      lat: locationData.lat,
      lng: locationData.lng,
      status: "pending",
      bookedFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      durationMinutes: parseDurationToMinutes(currentService.duration),
    };

    // 4. Create job in backend
    const createdJob = await createJob(jobData);

    // 5. Handle payment method
    if (selectedPaymentMethod === "online") {
      // Redirect to Stripe payment
    } else {
      // Assign worker and redirect
    }
  },
  [
    /* dependencies */
  ]
);
```

### 3. Payment Success Page (`frontend/src/app/booking/payment-success/page.tsx`)

The payment success page now fetches and displays job details:

```typescript
// Fetch job data if jobId is provided
if (jobId) {
  const job = await getJobById(jobId);
  if (job) {
    setJobData(job);
  }
}
```

### 4. Worker Assignment (`frontend/src/app/booking/worker-assigned/page.tsx`)

The worker assignment page passes the job ID to the tracking page:

```typescript
const trackingUrl = jobId
  ? `/job-tracking?workerId=${workerId}&paymentMethod=${paymentMethod}&jobId=${jobId}`
  : `/job-tracking?workerId=${workerId}&paymentMethod=${paymentMethod}`;
```

## Backend API

### Job Creation Endpoint

- **URL**: `POST /api/v1/jobs`
- **Expected Data**: JobData interface
- **Response**: Created job object

### Job Schema Validation

The backend validates job data using Zod schema:

```typescript
export const jobSchema = z.object({
  userId: z.string({ message: "User ID is required" }),
  workerId: z.string({ message: "Worker ID is required" }).optional(),
  specializations: z.enum([
    "plumber",
    "electrician",
    "carpenter",
    "mechanic",
    "mens_grooming",
    "women_grooming",
  ]),
  description: z
    .string()
    .min(10, { message: "Description must be at least 10 characters" }),
  location: z.string({ message: "Location is required" }),
  lat: z.number({ message: "Latitude is required" }),
  lng: z.number({ message: "Longitude is required" }),
  status: z
    .enum(["pending", "confirmed", "in_progress", "completed", "cancelled"])
    .default("pending"),
  bookedFor: z.string().optional(),
  durationMinutes: z.number().int().positive(),
});
```

## Service Category Mapping

The system automatically maps service categories to job specializations:

```typescript
const categoryMap = {
  "Plumbing Services": "plumber",
  "Electrical Services": "electrician",
  "Carpenter Services": "carpenter",
  "Mechanic Services": "mechanic",
  "Grooming Services": "mens_grooming",
  "Beauty Services": "women_grooming",
  "Hair Services": "mens_grooming",
  "Massage Services": "mens_grooming",
  "Cleaning Services": "plumber",
  "Appliance Repair": "electrician",
  "Painting Services": "carpenter",
  "Pest Control": "plumber",
};
```

## Error Handling

The system handles various error scenarios:

1. **User not found**: Creates user in backend first
2. **Location unavailable**: Uses provided address or defaults
3. **Job creation fails**: Shows error message and allows retry
4. **Payment fails**: Job remains in database with pending status
5. **Network errors**: Comprehensive error logging and user feedback

## Testing

To test the job creation flow:

1. **Sign in** with Clerk
2. **Select a service** from the services page
3. **Choose payment method** (COD or online)
4. **Click "Book Now"**
5. **Check backend** - Verify job appears in database
6. **Check frontend** - Verify job details in success/tracking pages

## Environment Variables

Make sure these environment variables are set:

```env
# Frontend
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000

# Backend
DATABASE_URL=your_database_url
REDIS_URL=your_redis_url
```

## Monitoring

The system includes comprehensive logging:

- Job creation logs with detailed data
- Error tracking and reporting
- Performance monitoring
- User action tracking

## Security

- **Data validation**: Zod schema validation on backend
- **User authentication**: Clerk integration
- **Location verification**: GPS coordinates validation
- **Error sanitization**: Safe error messages to users

## Future Enhancements

1. **Real-time job updates** via WebSocket
2. **Job scheduling** with calendar integration
3. **Worker availability** checking
4. **Job cancellation** functionality
5. **Rating and review** system
6. **Job history** and analytics
