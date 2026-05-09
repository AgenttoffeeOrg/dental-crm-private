/**
 * Phase 2b.2.a.2 — `ActivityMedia` rendering tests.
 *
 * jsdom (the default Jest test environment) is used; we render the
 * component and assert on the resulting DOM via `data-testid` markers
 * so the layout / className details can evolve without breaking tests.
 */

import * as React from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

import { ActivityMedia, type ActivityMediaItem } from '../activity-media'

afterEach(cleanup)

const PHOTO: ActivityMediaItem = {
  id: 'mm-photo',
  contentType: 'image/jpeg',
  signedUrl: 'https://example.test/signed/photo.jpg?token=abc',
  byteSize: 123456,
  storagePath: 'tenant-1/activity-1/0.jpg',
}

const AUDIO: ActivityMediaItem = {
  id: 'mm-audio',
  contentType: 'audio/ogg',
  signedUrl: 'https://example.test/signed/audio.ogg?token=abc',
  byteSize: 5432,
  storagePath: 'tenant-1/activity-1/0.ogg',
}

const PDF: ActivityMediaItem = {
  id: 'mm-pdf',
  contentType: 'application/pdf',
  signedUrl: 'https://example.test/signed/doc.pdf?token=abc',
  byteSize: 987654,
  storagePath: 'tenant-1/activity-1/0.pdf',
}

const VIDEO: ActivityMediaItem = {
  id: 'mm-video',
  contentType: 'video/mp4',
  signedUrl: 'https://example.test/signed/clip.mp4?token=abc',
  byteSize: 1024 * 1024 * 3,
  storagePath: 'tenant-1/activity-1/0.mp4',
}

const UNKNOWN: ActivityMediaItem = {
  id: 'mm-unknown',
  contentType: 'application/x-something-weird',
  signedUrl: 'https://example.test/signed/thing.bin?token=abc',
  byteSize: 50,
  storagePath: 'tenant-1/activity-1/0.bin',
}

describe('ActivityMedia', () => {
  it('renders nothing when items is empty', () => {
    const { container } = render(<ActivityMedia items={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders an <img> with the signed URL for image content', () => {
    render(<ActivityMedia items={[PHOTO]} />)
    const wrapper = screen.getByTestId('activity-media-image')
    expect(wrapper).toBeInTheDocument()
    expect(wrapper).toHaveAttribute('href', PHOTO.signedUrl)
    const img = wrapper.querySelector('img')
    expect(img).not.toBeNull()
    expect(img).toHaveAttribute('src', PHOTO.signedUrl)
    expect(img).toHaveAttribute('loading', 'lazy')
  })

  it('renders an <audio controls> for audio content with preload="none"', () => {
    const { container } = render(<ActivityMedia items={[AUDIO]} />)
    expect(screen.getByTestId('activity-media-audio')).toBeInTheDocument()
    const audio = container.querySelector('audio')
    expect(audio).not.toBeNull()
    expect(audio).toHaveAttribute('src', AUDIO.signedUrl)
    expect(audio).toHaveAttribute('preload', 'none')
    expect(audio).toHaveAttribute('controls')
  })

  it('renders a download link for PDFs with size and filename', () => {
    render(<ActivityMedia items={[PDF]} />)
    const link = screen.getByTestId('activity-media-file')
    expect(link).toHaveAttribute('href', PDF.signedUrl)
    expect(link).toHaveAttribute('target', '_blank')
    // Filename derived from storage path
    expect(link.textContent).toContain('0.pdf')
    // Human-readable size (~964.5 KB)
    expect(link.textContent).toMatch(/KB|MB/)
  })

  it('renders a <video controls preload="none" playsInline> for video content', () => {
    const { container } = render(<ActivityMedia items={[VIDEO]} />)
    expect(screen.getByTestId('activity-media-video')).toBeInTheDocument()
    const video = container.querySelector('video')
    expect(video).not.toBeNull()
    expect(video).toHaveAttribute('src', VIDEO.signedUrl)
    expect(video).toHaveAttribute('preload', 'none')
    expect(video).toHaveAttribute('controls')
    // jsdom serialises playsInline as the `playsinline` attribute.
    expect(video?.hasAttribute('playsinline')).toBe(true)
  })

  it('falls back to the file-icon download for unknown content types', () => {
    render(<ActivityMedia items={[UNKNOWN]} />)
    expect(screen.getByTestId('activity-media-file')).toBeInTheDocument()
  })

  it('renders an "Media unavailable" placeholder when signedUrl is null', () => {
    render(
      <ActivityMedia
        items={[
          {
            ...PHOTO,
            signedUrl: null,
          },
        ]}
      />
    )
    const placeholder = screen.getByTestId('activity-media-unavailable')
    expect(placeholder).toBeInTheDocument()
    expect(placeholder.textContent).toContain('Media unavailable')
  })

  it('renders a vertical stack of mixed types in the order received', () => {
    render(<ActivityMedia items={[PHOTO, AUDIO, PDF]} />)
    const stack = screen.getByTestId('activity-media')
    const children = Array.from(stack.children)
    expect(children).toHaveLength(3)
    expect(children[0].getAttribute('data-testid')).toBe('activity-media-image')
    expect(children[1].getAttribute('data-testid')).toBe('activity-media-audio')
    expect(children[2].getAttribute('data-testid')).toBe('activity-media-file')
  })
})
