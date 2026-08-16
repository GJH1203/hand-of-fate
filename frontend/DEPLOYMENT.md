# Deployment Instructions for Card Game

## Backend Deployment

1. **Deploy your backend** to a cloud service (e.g., AWS EC2, DigitalOcean, Heroku)
2. **Ensure your backend is accessible** via a public URL (e.g., `https://your-backend.com`)
3. **Configure CORS** in your Spring Boot app to allow requests from your Vercel domain

## Frontend Deployment on Vercel

### Option 1: Direct Backend Connection (Recommended for Production)

1. In your Vercel project settings, add the environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.com
   ```

2. Your frontend will now make direct API calls to your backend.

### Option 2: Using Vercel Functions as Proxy (Alternative)

If you need to proxy requests through Vercel (e.g., to hide backend URL or handle CORS):

1. Create an API route in your Next.js app:

```typescript
// app/api/backend/[...path]/route.ts
import { NextRequest } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080'

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/')
  const body = await request.text()
  
  const response = await fetch(`${BACKEND_URL}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: body,
  })
  
  const data = await response.json()
  return Response.json(data, { status: response.status })
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/')
  
  const response = await fetch(`${BACKEND_URL}/${path}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  
  const data = await response.json()
  return Response.json(data, { status: response.status })
}
```

2. Add the environment variable in Vercel:
   ```
   BACKEND_URL=https://your-backend-url.com
   ```

## Current Issue Fix

Your current deployment is failing because:
1. The frontend is trying to reach `localhost:8080` which doesn't exist on Vercel
2. No backend URL is configured in environment variables

### Immediate Fix:

1. Deploy your backend to a public server
2. Add `NEXT_PUBLIC_API_URL` to your Vercel environment variables
3. Redeploy your frontend

### Backend CORS Configuration

Add this to your Spring Boot backend to allow requests from Vercel:

```java
@Configuration
public class CorsConfig {
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                    .allowedOrigins(
                        "http://localhost:3000",
                        "https://card-game-frontend-*.vercel.app",
                        "https://your-production-domain.com"
                    )
                    .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                    .allowedHeaders("*")
                    .allowCredentials(true);
            }
        };
    }
}
```