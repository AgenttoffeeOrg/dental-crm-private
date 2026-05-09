/**
 * @jest-environment node
 *
 * Phase 2b.2.a.2 — media-store helpers.
 *
 * Each helper has a focused suite below. We mock `fetch` and the Supabase
 * client at the module boundary so no real network / DB / storage calls
 * happen during tests.
 */

import {
  downloadTwilioMedia,
  uploadMediaToStorage,
  persistMessageMedia,
  processInboundMediaItems,
  extensionFor,
  TwilioMediaDownloadError,
  MAX_MEDIA_BYTES,
  DOWNLOAD_TIMEOUT_MS,
} from '../media-store'

const TENANT_ID = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'
const ACTIVITY_ID = '8a61ce9c-affa-4543-8e69-e4bbe23e2464'
const CONTACT_ID = 'a0ac5939-35af-4789-af73-4f92e63e9764'
const TOUCHPOINT_ID = '62e06d0b-1e54-43b1-9a3e-1e06e2385e60'
const MESSAGE_SID = 'SMe54eaab4f39986f887d98ace25733ad5'

const ORIGINAL_FETCH = global.fetch
const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  process.env.TWILIO_ACCOUNT_SID = 'ACtestaccountsid'
  process.env.TWILIO_AUTH_TOKEN = 'test-auth-token'
})

afterEach(() => {
  global.fetch = ORIGINAL_FETCH
  process.env = { ...ORIGINAL_ENV }
  jest.restoreAllMocks()
})

// -----------------------------------------------------------------------------
// extensionFor
// -----------------------------------------------------------------------------

describe('extensionFor', () => {
  it('maps known WhatsApp content types to canonical extensions', () => {
    expect(extensionFor('image/jpeg')).toBe('jpg')
    expect(extensionFor('image/png')).toBe('png')
    expect(extensionFor('audio/ogg')).toBe('ogg')
    expect(extensionFor('audio/mpeg')).toBe('mp3')
    expect(extensionFor('video/mp4')).toBe('mp4')
    expect(extensionFor('application/pdf')).toBe('pdf')
  })

  it('strips charset suffix and lowercases before lookup', () => {
    expect(extensionFor('IMAGE/JPEG; charset=binary')).toBe('jpg')
  })

  it('falls back to bin for unknown / empty content types', () => {
    expect(extensionFor('application/x-something-weird')).toBe('bin')
    expect(extensionFor('')).toBe('bin')
  })
})

// -----------------------------------------------------------------------------
// downloadTwilioMedia
// -----------------------------------------------------------------------------

function buildResponse(opts: {
  status?: number
  contentType?: string
  contentLength?: string | null
  body?: ArrayBuffer
}): Response {
  const status = opts.status ?? 200
  const headers = new Headers()
  if (opts.contentType) headers.set('content-type', opts.contentType)
  if (opts.contentLength !== null && opts.contentLength !== undefined) {
    headers.set('content-length', opts.contentLength)
  }
  return {
    ok: status >= 200 && status < 300,
    status,
    headers,
    arrayBuffer: () => Promise.resolve(opts.body ?? new ArrayBuffer(0)),
  } as unknown as Response
}

describe('downloadTwilioMedia', () => {
  it('returns buffer + content-type + size on the happy path', async () => {
    const fakeBytes = new Uint8Array([1, 2, 3, 4]).buffer
    const fetchMock = jest.fn().mockResolvedValue(
      buildResponse({
        status: 200,
        contentType: 'image/jpeg',
        contentLength: '4',
        body: fakeBytes,
      })
    )
    global.fetch = fetchMock as unknown as typeof fetch

    const result = await downloadTwilioMedia('https://api.twilio.com/.../Media/MEa')

    expect(result.contentType).toBe('image/jpeg')
    expect(result.byteSize).toBe(4)
    expect(result.buffer.length).toBe(4)
    expect(result.buffer[0]).toBe(1)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, init] = fetchMock.mock.calls[0]
    const auth = init.headers.Authorization as string
    expect(auth.startsWith('Basic ')).toBe(true)
    const decoded = Buffer.from(auth.slice('Basic '.length), 'base64').toString()
    expect(decoded).toBe('ACtestaccountsid:test-auth-token')
  })

  it('throws auth when env vars are not configured', async () => {
    delete process.env.TWILIO_ACCOUNT_SID
    await expect(downloadTwilioMedia('https://x')).rejects.toMatchObject({
      reason: 'auth',
    })
  })

  it('throws timeout when the underlying fetch aborts', async () => {
    global.fetch = jest.fn().mockImplementation(() => {
      const err = new Error('aborted')
      err.name = 'AbortError'
      return Promise.reject(err)
    }) as unknown as typeof fetch

    await expect(downloadTwilioMedia('https://x')).rejects.toMatchObject({
      reason: 'timeout',
    })
  })

  it('throws auth on a 401 response', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(buildResponse({ status: 401 })) as unknown as typeof fetch
    await expect(downloadTwilioMedia('https://x')).rejects.toMatchObject({ reason: 'auth' })
  })

  it('throws not_found on a 404 response', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(buildResponse({ status: 404 })) as unknown as typeof fetch
    await expect(downloadTwilioMedia('https://x')).rejects.toMatchObject({ reason: 'not_found' })
  })

  it('throws network on a 500 response', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(buildResponse({ status: 500 })) as unknown as typeof fetch
    await expect(downloadTwilioMedia('https://x')).rejects.toMatchObject({ reason: 'network' })
  })

  it('throws too_large when content-length exceeds the cap', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      buildResponse({
        status: 200,
        contentType: 'image/jpeg',
        contentLength: String(MAX_MEDIA_BYTES + 1),
      })
    ) as unknown as typeof fetch
    await expect(downloadTwilioMedia('https://x')).rejects.toMatchObject({ reason: 'too_large' })
  })

  it('honours the documented timeout constant', () => {
    expect(DOWNLOAD_TIMEOUT_MS).toBe(10_000)
  })
})

// -----------------------------------------------------------------------------
// uploadMediaToStorage
// -----------------------------------------------------------------------------

function buildStorageClient(uploadResult: { error: { message?: string; statusCode?: string | number } | null }) {
  const upload = jest.fn().mockResolvedValue({ data: uploadResult.error ? null : { path: 'x' }, error: uploadResult.error })
  const from = jest.fn(() => ({ upload }))
  return {
    storage: { from },
    _upload: upload,
    _from: from,
  } as const
}

describe('uploadMediaToStorage', () => {
  const buffer = Buffer.from([1, 2, 3])

  it('uploads to the canonical path with upsert: false on the happy path', async () => {
    const client = buildStorageClient({ error: null })
    const result = await uploadMediaToStorage(client as never, {
      tenantId: TENANT_ID,
      activityId: ACTIVITY_ID,
      mediaIndex: 0,
      contentType: 'image/jpeg',
      buffer,
    })

    expect(result.alreadyExists).toBe(false)
    expect(result.storagePath).toBe(`${TENANT_ID}/${ACTIVITY_ID}/0.jpg`)
    expect(client._from).toHaveBeenCalledWith('message-media')
    expect(client._upload).toHaveBeenCalledWith(
      `${TENANT_ID}/${ACTIVITY_ID}/0.jpg`,
      buffer,
      expect.objectContaining({ contentType: 'image/jpeg', upsert: false })
    )
  })

  it('reports alreadyExists on a path collision (upsert: false)', async () => {
    const client = buildStorageClient({
      error: { message: 'The resource already exists', statusCode: '409' },
    })
    const result = await uploadMediaToStorage(client as never, {
      tenantId: TENANT_ID,
      activityId: ACTIVITY_ID,
      mediaIndex: 0,
      contentType: 'image/jpeg',
      buffer,
    })
    expect(result.alreadyExists).toBe(true)
    expect(result.storagePath).toBe(`${TENANT_ID}/${ACTIVITY_ID}/0.jpg`)
  })

  it('throws on non-collision errors', async () => {
    const client = buildStorageClient({
      error: { message: 'permission denied', statusCode: 403 },
    })
    await expect(
      uploadMediaToStorage(client as never, {
        tenantId: TENANT_ID,
        activityId: ACTIVITY_ID,
        mediaIndex: 0,
        contentType: 'image/jpeg',
        buffer,
      })
    ).rejects.toThrow(/uploadMediaToStorage failed/)
  })
})

// -----------------------------------------------------------------------------
// persistMessageMedia
// -----------------------------------------------------------------------------

function buildInsertClient(result: {
  data: { id: string } | null
  error: { code?: string; message?: string; details?: string } | null
}) {
  const single = jest.fn().mockResolvedValue(result)
  const select = jest.fn(() => ({ single }))
  const insert: jest.Mock<unknown, unknown[]> = jest.fn(() => ({ select }))
  const from = jest.fn(() => ({ insert }))
  return { from, _insert: insert } as const
}

function buildSelectClient(result: { data: { id: string } | null }) {
  const maybeSingle = jest.fn().mockResolvedValue({ data: result.data, error: null })
  const limit = jest.fn(() => ({ maybeSingle }))
  const eq2 = jest.fn(() => ({ limit }))
  const eq1 = jest.fn(() => ({ eq: eq2 }))
  const select = jest.fn(() => ({ eq: eq1 }))
  return { select, _eq1: eq1, _eq2: eq2 } as const
}

describe('persistMessageMedia', () => {
  const baseArgs = {
    tenantId: TENANT_ID,
    activityId: ACTIVITY_ID,
    contactId: CONTACT_ID,
    attributionTouchpointId: TOUCHPOINT_ID,
    externalMessageId: MESSAGE_SID,
    mediaIndex: 0,
    storageBucket: 'message-media',
    storagePath: `${TENANT_ID}/${ACTIVITY_ID}/0.jpg`,
    contentType: 'image/jpeg',
    byteSize: 12345,
    originalUrl: 'https://api.twilio.com/.../Media/MEa',
  }

  it('returns the inserted id on the happy path', async () => {
    const client = buildInsertClient({ data: { id: 'mm-1' }, error: null })
    const result = await persistMessageMedia(client as never, baseArgs)
    expect(result).toEqual({ messageMediaId: 'mm-1', alreadyPersisted: false })
    const insertPayload = client._insert.mock.calls[0]?.[0] as Record<string, unknown>
    expect(insertPayload.tenant_id).toBe(TENANT_ID)
    expect(insertPayload.activity_id).toBe(ACTIVITY_ID)
    expect(insertPayload.media_index).toBe(0)
    expect(insertPayload.byte_size).toBe(12345)
  })

  it('returns the existing row on unique violation (idempotent)', async () => {
    // First call: insert returns 23505. Second call: SELECT returns the existing row.
    const insertSingle = jest
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: '23505',
          message: 'duplicate key value violates unique constraint',
          details: 'Key (external_message_id, media_index)=(SM..., 0) already exists.',
        },
      })
    const selectClient = buildSelectClient({ data: { id: 'mm-existing' } })

    const client = {
      from: jest.fn((table: string) => {
        if (table !== 'message_media') throw new Error(`unexpected table ${table}`)
        // Distinguish insert path vs select path by which method is called next.
        return {
          insert: () => ({ select: () => ({ single: insertSingle }) }),
          select: selectClient.select,
        }
      }),
    }

    const result = await persistMessageMedia(client as never, baseArgs)
    expect(result).toEqual({ messageMediaId: 'mm-existing', alreadyPersisted: true })
  })

  it('throws on non-unique-violation insert errors', async () => {
    const client = buildInsertClient({
      data: null,
      error: { code: '23502', message: 'null value in column violates not-null constraint' },
    })
    await expect(persistMessageMedia(client as never, baseArgs)).rejects.toThrow(
      /persistMessageMedia failed/
    )
  })
})

// -----------------------------------------------------------------------------
// processInboundMediaItems
// -----------------------------------------------------------------------------

describe('processInboundMediaItems', () => {
  const baseArgs = {
    tenantId: TENANT_ID,
    activityId: ACTIVITY_ID,
    contactId: CONTACT_ID,
    attributionTouchpointId: TOUCHPOINT_ID,
    externalMessageId: MESSAGE_SID,
  }

  function buildHappyClient(): {
    client: object
    inserts: jest.Mock
  } {
    const insertSingle = jest.fn().mockImplementation(() =>
      Promise.resolve({ data: { id: `mm-${Math.random().toString(36).slice(2, 8)}` }, error: null })
    )
    const upload = jest.fn().mockResolvedValue({ data: { path: 'x' }, error: null })
    const client = {
      storage: { from: () => ({ upload }) },
      from: () => ({ insert: () => ({ select: () => ({ single: insertSingle }) }) }),
    }
    return { client, inserts: insertSingle }
  }

  it('returns no results and does not call fetch when mediaUrls is empty', async () => {
    const fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch
    const { client } = buildHappyClient()

    const results = await processInboundMediaItems(client as never, {
      ...baseArgs,
      mediaUrls: [],
    })
    expect(results).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('persists every item on the happy path with 3 items', async () => {
    const body = new Uint8Array([1, 2, 3]).buffer
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        buildResponse({ status: 200, contentType: 'image/jpeg', contentLength: '3', body })
      ) as unknown as typeof fetch

    const { client, inserts } = buildHappyClient()

    const results = await processInboundMediaItems(client as never, {
      ...baseArgs,
      mediaUrls: [
        { url: 'https://x/0', contentType: 'image/jpeg' },
        { url: 'https://x/1', contentType: 'image/jpeg' },
        { url: 'https://x/2', contentType: 'image/jpeg' },
      ],
    })

    expect(results).toHaveLength(3)
    for (let i = 0; i < 3; i++) {
      expect(results[i].mediaIndex).toBe(i)
      expect(results[i].status).toBe('persisted')
    }
    expect(inserts).toHaveBeenCalledTimes(3)
  })

  it('continues past per-item failures and returns mixed results', async () => {
    const okBody = new Uint8Array([1, 2, 3]).buffer
    const fetchMock = jest
      .fn()
      // item 0 → ok
      .mockResolvedValueOnce(
        buildResponse({ status: 200, contentType: 'image/jpeg', contentLength: '3', body: okBody })
      )
      // item 1 → 500 (network)
      .mockResolvedValueOnce(buildResponse({ status: 500 }))
      // item 2 → ok
      .mockResolvedValueOnce(
        buildResponse({ status: 200, contentType: 'image/jpeg', contentLength: '3', body: okBody })
      )
    global.fetch = fetchMock as unknown as typeof fetch

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    const { client } = buildHappyClient()

    const results = await processInboundMediaItems(client as never, {
      ...baseArgs,
      mediaUrls: [
        { url: 'https://x/0', contentType: 'image/jpeg' },
        { url: 'https://x/1', contentType: 'image/jpeg' },
        { url: 'https://x/2', contentType: 'image/jpeg' },
      ],
    })

    expect(results).toHaveLength(3)
    expect(results[0].status).toBe('persisted')
    expect(results[1].status).toBe('failed')
    expect(results[2].status).toBe('persisted')
    if (results[1].status === 'failed') {
      expect(results[1].reason).toMatch(/download:network/)
    }
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('does not throw out of the orchestrator even if every item fails', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(buildResponse({ status: 500 })) as unknown as typeof fetch
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    const { client } = buildHappyClient()

    const results = await processInboundMediaItems(client as never, {
      ...baseArgs,
      mediaUrls: [{ url: 'https://x/0', contentType: 'image/jpeg' }],
    })
    expect(results).toHaveLength(1)
    expect(results[0].status).toBe('failed')
    errorSpy.mockRestore()
  })
})

// -----------------------------------------------------------------------------
// TwilioMediaDownloadError
// -----------------------------------------------------------------------------

describe('TwilioMediaDownloadError', () => {
  it('preserves reason / status / contentLength', () => {
    const err = new TwilioMediaDownloadError('too_large', 'oversized', {
      status: 200,
      contentLength: 99_999_999,
    })
    expect(err.reason).toBe('too_large')
    expect(err.status).toBe(200)
    expect(err.contentLength).toBe(99_999_999)
    expect(err.name).toBe('TwilioMediaDownloadError')
  })
})
