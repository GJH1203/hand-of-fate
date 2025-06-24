import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Test proxy is working',
    url: request.url,
    headers: Object.fromEntries(request.headers.entries())
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return NextResponse.json({ 
    message: 'POST proxy is working',
    received: body
  });
}