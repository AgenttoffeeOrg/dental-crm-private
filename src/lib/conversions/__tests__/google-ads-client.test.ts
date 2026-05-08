/**
 * @jest-environment node
 *
 * Phase 2b.1.b.1 — unit tests for GoogleAdsClient (mocked fetch).
 */

import {
  GoogleAdsClient,
  ADS_API_VERSION,
  GoogleAdsApiError,
  GoogleOAuthRevokedError,
  hashEmail,
  hashPhone,
  formatGoogleAdsTimestamp,
  type GoogleAdsConfig,
} from '../google-ads-client'
import { encryptIntegrationCredential, _resetCachedKeyForTests } from '@/lib/crypto/integration-credentials'

const ORIGINAL_ENV = { ...process.env }

function freshConfig(overrides: Partial<GoogleAdsConfig> = {}): GoogleAdsConfig {
  return {
    customer_id: '1675268286',
    login_customer_id: '9374708799',
    conversion_action_resource_name: 'customers/1675268286/conversionActions/7600535419',
    oauth_refresh_token_encrypted: encryptIntegrationCredential('fake_refresh_token_xyz'),
    ...overrides,
  }
}

beforeEach(() => {
  process.env.INTEGRATION_CREDENTIAL_KEY = Buffer.alloc(32, 4).toString('base64')
  process.env.GOOGLE_OAUTH_CLIENT_ID = 'test_client_id'
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'test_client_secret'
  process.env.GOOGLE_ADS_DEVELOPER_TOKEN = 'test_dev_token'
  _resetCachedKeyForTests()
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  _resetCachedKeyForTests()
  jest.restoreAllMocks()
})

describe('hash helpers', () => {
  it('hashEmail lowercases and trims before SHA-256', () => {
    const a = hashEmail('Sarah.Test@Example.com')
    const b = hashEmail('  sarah.test@example.com  ')
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
  })

  it('hashPhone strips non-digit characters but keeps leading +', () => {
    const a = hashPhone('+44 7700 900100')
    const b = hashPhone('+447700900100')
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
  })

  it('hashPhone is different for different numbers', () => {
    expect(hashPhone('+447700900100')).not.toBe(hashPhone('+447700900101'))
  })
})

describe('formatGoogleAdsTimestamp', () => {
  it('formats UTC timestamp as YYYY-MM-DD HH:MM:SS+00:00', () => {
    const d = new Date('2026-05-06T07:08:09.123Z')
    expect(formatGoogleAdsTimestamp(d)).toBe('2026-05-06 07:08:09+00:00')
  })

  it('zero-pads single-digit components', () => {
    const d = new Date('2026-01-02T03:04:05Z')
    expect(formatGoogleAdsTimestamp(d)).toBe('2026-01-02 03:04:05+00:00')
  })
})

describe('GoogleAdsClient.getAccessToken', () => {
  it('POSTs to oauth2.googleapis.com/token with grant_type=refresh_token and returns access_token', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: 'ya29.test', expires_in: 3599, scope: 's', token_type: 'Bearer' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const client = new GoogleAdsClient(freshConfig())
    const token = await client.getAccessToken()
    expect(token).toBe('ya29.test')

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe('https://oauth2.googleapis.com/token')
    expect((init as RequestInit).method).toBe('POST')
    const body = String((init as RequestInit).body)
    expect(body).toContain('grant_type=refresh_token')
    expect(body).toContain('client_id=test_client_id')
    expect(body).toContain('client_secret=test_client_secret')
    expect(body).toContain('refresh_token=fake_refresh_token_xyz')
  })

  it('caches the access token across calls (no second fetch)', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: 'ya29.cached', expires_in: 3599, scope: 's', token_type: 'Bearer' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const client = new GoogleAdsClient(freshConfig())
    await client.getAccessToken()
    await client.getAccessToken()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('throws on non-200 token-endpoint response (does NOT include the refresh token in error message)', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('{"error":"invalid_grant","error_description":"Token has been expired or revoked."}', {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    const client = new GoogleAdsClient(freshConfig())
    await expect(client.getAccessToken()).rejects.toThrow(/HTTP 400/)
    await expect(client.getAccessToken()).rejects.not.toThrow(/fake_refresh_token_xyz/)
  })
})

describe('GoogleAdsClient.uploadClickConversion', () => {
  function arrangeTokenAndUpload(uploadResponse: { status: number; body: string }) {
    return jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'ya29.x', expires_in: 3599, scope: 's', token_type: 'Bearer' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(uploadResponse.body, {
          status: uploadResponse.status,
          headers: { 'Content-Type': 'application/json' },
        })
      )
  }

  it('builds the correct URL, headers, and body for a basic conversion', async () => {
    const fetchSpy = arrangeTokenAndUpload({ status: 200, body: JSON.stringify({ results: [{}] }) })

    const client = new GoogleAdsClient(freshConfig())
    const result = await client.uploadClickConversion({
      gclid: 'TEST_GCLID_001',
      conversion_date_time: '2026-05-06 12:00:00+00:00',
      email: 'sarah@example.com',
      phone_e164: '+447700900100',
      order_id: 'deal-uuid:Lead',
      currency_code: 'GBP',
    })

    expect(result.ok).toBe(true)
    expect(result.http_status).toBe(200)

    const uploadCall = fetchSpy.mock.calls[1]
    const uploadUrl = uploadCall[0]
    const uploadInit = uploadCall[1] as RequestInit

    expect(uploadUrl).toBe(
      `https://googleads.googleapis.com/${ADS_API_VERSION}/customers/1675268286:uploadClickConversions`
    )

    const hdrs = uploadInit.headers as Record<string, string>
    expect(hdrs.Authorization).toBe('Bearer ya29.x')
    expect(hdrs['developer-token']).toBe('test_dev_token')
    expect(hdrs['login-customer-id']).toBe('9374708799')

    const parsedBody = JSON.parse(String(uploadInit.body)) as {
      partialFailure: boolean
      validateOnly: boolean
      conversions: Array<{
        gclid: string
        conversionAction: string
        conversionDateTime: string
        currencyCode?: string
        orderId?: string
        userIdentifiers?: Array<{ hashedEmail?: string; hashedPhoneNumber?: string }>
      }>
    }
    expect(parsedBody.partialFailure).toBe(true)
    expect(parsedBody.validateOnly).toBe(false)
    const conv = parsedBody.conversions[0]
    expect(conv.gclid).toBe('TEST_GCLID_001')
    expect(conv.conversionAction).toBe('customers/1675268286/conversionActions/7600535419')
    expect(conv.conversionDateTime).toBe('2026-05-06 12:00:00+00:00')
    expect(conv.currencyCode).toBe('GBP')
    expect(conv.orderId).toBe('deal-uuid:Lead')
    expect(conv.userIdentifiers).toEqual([
      { hashedEmail: hashEmail('sarah@example.com') },
      { hashedPhoneNumber: hashPhone('+447700900100') },
    ])
  })

  it('omits login-customer-id header when not configured', async () => {
    const fetchSpy = arrangeTokenAndUpload({ status: 200, body: JSON.stringify({ results: [{}] }) })

    const cfg = freshConfig({ login_customer_id: null })
    const client = new GoogleAdsClient(cfg)
    await client.uploadClickConversion({
      gclid: 'g',
      conversion_date_time: '2026-05-06 12:00:00+00:00',
    })

    const hdrs = (fetchSpy.mock.calls[1][1] as RequestInit).headers as Record<string, string>
    expect(hdrs['login-customer-id']).toBeUndefined()
  })

  it('returns failure with HTTP status on 4xx', async () => {
    arrangeTokenAndUpload({ status: 400, body: '{"error":{"code":400,"message":"Invalid argument"}}' })
    const client = new GoogleAdsClient(freshConfig())
    const result = await client.uploadClickConversion({ gclid: 'g', conversion_date_time: '2026-05-06 12:00:00+00:00' })
    expect(result.ok).toBe(false)
    expect(result.http_status).toBe(400)
    expect(result.error_message).toBe('HTTP 400')
    expect(result.response_excerpt).toContain('Invalid argument')
  })

  it('treats partialFailureError as a failure even on HTTP 200', async () => {
    arrangeTokenAndUpload({
      status: 200,
      body: JSON.stringify({
        partialFailureError: { code: 3, message: 'gclid not associated with conversion action' },
        results: [{}],
      }),
    })
    const client = new GoogleAdsClient(freshConfig())
    const result = await client.uploadClickConversion({ gclid: 'bad', conversion_date_time: '2026-05-06 12:00:00+00:00' })
    expect(result.ok).toBe(false)
    expect(result.http_status).toBe(200)
    expect(result.error_message).toBe('gclid not associated with conversion action')
  })

  it('returns http_status=0 when GOOGLE_ADS_DEVELOPER_TOKEN is missing', async () => {
    delete process.env.GOOGLE_ADS_DEVELOPER_TOKEN
    const client = new GoogleAdsClient(freshConfig())
    const result = await client.uploadClickConversion({ gclid: 'g', conversion_date_time: '2026-05-06 12:00:00+00:00' })
    expect(result.ok).toBe(false)
    expect(result.http_status).toBe(0)
    expect(result.error_message).toMatch(/GOOGLE_ADS_DEVELOPER_TOKEN/)
  })

  it('returns failure when fetch throws', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'ya29.x', expires_in: 3599, scope: 's', token_type: 'Bearer' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockRejectedValueOnce(new Error('ECONNRESET'))

    const client = new GoogleAdsClient(freshConfig())
    const result = await client.uploadClickConversion({ gclid: 'g', conversion_date_time: '2026-05-06 12:00:00+00:00' })
    expect(result.ok).toBe(false)
    expect(result.http_status).toBe(0)
    expect(result.error_message).toMatch(/ECONNRESET/)
  })

  it('omits userIdentifiers when neither email nor phone is provided', async () => {
    const fetchSpy = arrangeTokenAndUpload({ status: 200, body: '{}' })
    const client = new GoogleAdsClient(freshConfig())
    await client.uploadClickConversion({ gclid: 'g', conversion_date_time: '2026-05-06 12:00:00+00:00' })
    const parsedBody = JSON.parse(String((fetchSpy.mock.calls[1][1] as RequestInit).body)) as {
      conversions: Array<{ userIdentifiers?: unknown }>
    }
    expect(parsedBody.conversions[0].userIdentifiers).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Phase 2b.1.b.2 — list methods used by the Settings UI customer / conversion-action pickers.
// ---------------------------------------------------------------------------

describe('GoogleAdsClient.listAccessibleCustomers', () => {
  function arrangeTokenAndList(body: { status: number; body: string }) {
    return jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'ya29.x', expires_in: 3599, scope: 's', token_type: 'Bearer' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(body.body, {
          status: body.status,
          headers: { 'Content-Type': 'application/json' },
        })
      )
  }

  it('GETs customers:listAccessibleCustomers with the right URL + headers and parses the response', async () => {
    const fetchSpy = arrangeTokenAndList({
      status: 200,
      body: JSON.stringify({
        resourceNames: ['customers/1675268286', 'customers/1234567890'],
      }),
    })

    const client = new GoogleAdsClient(freshConfig())
    const result = await client.listAccessibleCustomers()

    expect(result).toEqual([
      { customer_id: '1675268286', resource_name: 'customers/1675268286' },
      { customer_id: '1234567890', resource_name: 'customers/1234567890' },
    ])

    const [url, init] = fetchSpy.mock.calls[1]
    expect(url).toBe(
      `https://googleads.googleapis.com/${ADS_API_VERSION}/customers:listAccessibleCustomers`
    )
    expect((init as RequestInit).method).toBe('GET')
    const hdrs = (init as RequestInit).headers as Record<string, string>
    expect(hdrs.Authorization).toBe('Bearer ya29.x')
    expect(hdrs['developer-token']).toBe('test_dev_token')
    // listAccessibleCustomers does NOT take a login-customer-id header,
    // even when one is configured. Verify we don't accidentally set one.
    expect(hdrs['login-customer-id']).toBeUndefined()
  })

  it('throws GoogleOAuthRevokedError on 401', async () => {
    arrangeTokenAndList({ status: 401, body: '{"error":"invalid_grant"}' })
    const client = new GoogleAdsClient(freshConfig())
    await expect(client.listAccessibleCustomers()).rejects.toBeInstanceOf(
      GoogleOAuthRevokedError
    )
  })

  it('throws GoogleAdsApiError on non-401 4xx (status + excerpt preserved)', async () => {
    arrangeTokenAndList({ status: 403, body: 'PERMISSION_DENIED — long body that should be truncated to 500 chars max'.repeat(20) })
    const client = new GoogleAdsClient(freshConfig())
    try {
      await client.listAccessibleCustomers()
      fail('expected GoogleAdsApiError')
    } catch (e) {
      expect(e).toBeInstanceOf(GoogleAdsApiError)
      const ge = e as GoogleAdsApiError
      expect(ge.httpStatus).toBe(403)
      expect(ge.responseExcerpt.length).toBeLessThanOrEqual(500)
      expect(ge.responseExcerpt).toContain('PERMISSION_DENIED')
    }
  })
})

describe('GoogleAdsClient.listConversionActions', () => {
  // Full GAQL is asserted character-for-character so a copy-paste edit can't
  // silently change the filter.
  const EXPECTED_QUERY =
    "SELECT conversion_action.id, conversion_action.resource_name, " +
    "conversion_action.name, conversion_action.category, " +
    "conversion_action.status FROM conversion_action WHERE " +
    "conversion_action.status = 'ENABLED' AND " +
    "conversion_action.category = 'LEAD'"

  function arrangeTokenAndSearch(body: { status: number; body: string }) {
    return jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'ya29.x', expires_in: 3599, scope: 's', token_type: 'Bearer' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(body.body, {
          status: body.status,
          headers: { 'Content-Type': 'application/json' },
        })
      )
  }

  it('POSTs the right URL, headers, and GAQL body; parses results into typed shape', async () => {
    const fetchSpy = arrangeTokenAndSearch({
      status: 200,
      body: JSON.stringify({
        results: [
          {
            conversionAction: {
              id: '7600535419',
              resourceName: 'customers/1675268286/conversionActions/7600535419',
              name: 'Lead (test)',
              category: 'LEAD',
              status: 'ENABLED',
            },
          },
        ],
      }),
    })

    const client = new GoogleAdsClient(freshConfig())
    const result = await client.listConversionActions('1675268286', '9374708799')

    expect(result).toEqual([
      {
        id: '7600535419',
        resource_name: 'customers/1675268286/conversionActions/7600535419',
        name: 'Lead (test)',
        category: 'LEAD',
        status: 'ENABLED',
      },
    ])

    const [url, init] = fetchSpy.mock.calls[1]
    expect(url).toBe(
      `https://googleads.googleapis.com/${ADS_API_VERSION}/customers/1675268286/googleAds:search`
    )
    expect((init as RequestInit).method).toBe('POST')
    const hdrs = (init as RequestInit).headers as Record<string, string>
    expect(hdrs.Authorization).toBe('Bearer ya29.x')
    expect(hdrs['developer-token']).toBe('test_dev_token')
    expect(hdrs['login-customer-id']).toBe('9374708799')
    expect(hdrs['Content-Type']).toBe('application/json')

    const parsedBody = JSON.parse(String((init as RequestInit).body)) as { query: string }
    expect(parsedBody.query).toBe(EXPECTED_QUERY)
  })

  it('omits the login-customer-id header when loginCustomerId not provided', async () => {
    const fetchSpy = arrangeTokenAndSearch({
      status: 200,
      body: JSON.stringify({ results: [] }),
    })
    const client = new GoogleAdsClient(freshConfig())
    await client.listConversionActions('1675268286')
    const hdrs = (fetchSpy.mock.calls[1][1] as RequestInit).headers as Record<string, string>
    expect(hdrs['login-customer-id']).toBeUndefined()
  })

  it('throws GoogleOAuthRevokedError on 401', async () => {
    arrangeTokenAndSearch({ status: 401, body: '{"error":"invalid_grant"}' })
    const client = new GoogleAdsClient(freshConfig())
    await expect(client.listConversionActions('1675268286')).rejects.toBeInstanceOf(
      GoogleOAuthRevokedError
    )
  })

  it('throws GoogleAdsApiError on non-401 4xx', async () => {
    arrangeTokenAndSearch({ status: 400, body: '{"error":{"code":400,"message":"Invalid GAQL"}}' })
    const client = new GoogleAdsClient(freshConfig())
    try {
      await client.listConversionActions('1675268286')
      fail('expected GoogleAdsApiError')
    } catch (e) {
      expect(e).toBeInstanceOf(GoogleAdsApiError)
      expect((e as GoogleAdsApiError).httpStatus).toBe(400)
    }
  })

  it('reuses getAccessToken — both list methods share the cache (one token fetch for both)', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'ya29.x', expires_in: 3599, scope: 's', token_type: 'Bearer' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ resourceNames: ['customers/1'] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ results: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

    const client = new GoogleAdsClient(freshConfig())
    await client.listAccessibleCustomers()
    await client.listConversionActions('1')

    // 1 token + 2 list calls = 3 total. Token endpoint hit only once.
    expect(fetchSpy).toHaveBeenCalledTimes(3)
    expect(fetchSpy.mock.calls[0][0]).toBe('https://oauth2.googleapis.com/token')
  })
})
