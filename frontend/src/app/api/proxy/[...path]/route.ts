import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://134.199.238.66:8080';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const pathString = path.join('/');
  const url = `${BACKEND_URL}/${pathString}`;

  try {
    const response = await fetch(url, {
      headers: request.headers,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch from backend' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const pathString = path.join('/');
  const url = `${BACKEND_URL}/${pathString}`;

  console.log('Proxying POST request to:', url);

  try {
    const body = await request.json();
    console.log('Request body:', body);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get('content-type');
    console.log('Response status:', response.status);
    console.log('Response content-type:', contentType);

    // Check if response is JSON
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    } else {
      // If not JSON, read as text
      const text = await response.text();
      console.error('Non-JSON response:', text);
      
      // Check if it's an error page
      if (text.includes('Error Page') || response.status >= 400) {
        return NextResponse.json(
          { error: 'Backend error', details: text.substring(0, 200) },
          { status: response.status || 500 }
        );
      }
      
      return NextResponse.json(
        { error: 'Invalid response format', details: text.substring(0, 200) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from backend', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}