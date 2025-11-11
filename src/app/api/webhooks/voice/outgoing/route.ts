import { NextRequest, NextResponse } from 'next/server'

function buildTwiml(params: URLSearchParams) {
  const message =
    params.get('prompt') ||
    'Thank you for calling from Dental Sales Coach. Please hold while we connect you.'

  const record = params.get('record') === 'true'
  const playChime = params.get('chime') !== 'false'

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${playChime ? '<Play>https://demo.twilio.com/docs/classic.mp3</Play>' : ''}
  <Say voice="Polly.Joanna">${message}</Say>
  ${record ? '<Record playBeep="true" timeout="120"/>' : '<Pause length="1"/>'}
  <Hangup/>
</Response>`
}

function respond(request: NextRequest) {
  const url = new URL(request.url)
  const twiml = buildTwiml(url.searchParams)

  return new NextResponse(twiml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'no-store',
    },
  })
}

export async function GET(request: NextRequest) {
  return respond(request)
}

export async function POST(request: NextRequest) {
  return respond(request)
}


