import { NextRequest } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const pathString = path.join('/')
  
  try {
    const body = await request.text()
    
    console.log(`Proxying POST request to: ${BACKEND_URL}/${pathString}`)
    
    const response = await fetch(`${BACKEND_URL}/${pathString}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body,
    })
    
    const responseText = await response.text()
    console.log(`Backend response status: ${response.status}`)
    
    // Try to parse as JSON, if not return as text
    try {
      const data = JSON.parse(responseText)
      return Response.json(data, { status: response.status })
    } catch {
      return new Response(responseText, { 
        status: response.status,
        headers: { 'Content-Type': 'text/plain' }
      })
    }
  } catch (error) {
    console.error('Proxy error:', error)
    return Response.json(
      { error: 'Failed to connect to backend', details: error.message },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const pathString = path.join('/')
  
  try {
    const response = await fetch(`${BACKEND_URL}/${pathString}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    return Response.json(data, { status: response.status })
  } catch (error) {
    console.error('Proxy error:', error)
    return Response.json(
      { error: 'Failed to connect to backend' },
      { status: 500 }
    )
  }
}