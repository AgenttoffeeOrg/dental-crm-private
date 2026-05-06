/* global window, document, console, fetch, URL, CustomEvent */
/* DentalCRM booking widget loader
 *
 * Practice integration (default, floating button):
 *   <script src="https://your-crm-domain.com/widget.js" data-slug="acmedental" async></script>
 *
 * Advanced integration (manual / inline mount):
 *   <script src="https://your-crm-domain.com/widget.js" data-slug="acmedental" data-mode="manual" async></script>
 *   <script>
 *     window.addEventListener('DentalCRMWidgetReady', function (ev) {
 *       var d = ev.detail
 *       window.DentalCRMWidget.mount(
 *         document.getElementById('widget-inline'),
 *         d.config,
 *         d.apiBase
 *       )
 *     })
 *   </script>
 *
 * The loader:
 *   1. reads the slug + (optional) data-base / data-mode attributes off its own
 *      <script> tag
 *   2. fetches the widget config from /api/widget/config?slug=…
 *   3. lazy-loads the widget bundle (window.DentalCRMWidget.mount)
 *   4. in default ("auto") mode, mounts a host <div> with a Shadow DOM at the
 *      bottom of <body> and renders the React widget into it
 *   5. in "manual" mode, skips auto-mounting and instead dispatches a
 *      `DentalCRMWidgetReady` event on `window` with `detail: { slug, config,
 *      apiBase }`. Consumers can then call `window.DentalCRMWidget.mount` on
 *      whichever container element they choose.
 *
 * Self-contained so it has no build step of its own.
 */
(function () {
  'use strict'

  function findScript() {
    if (document.currentScript) return document.currentScript
    var scripts = document.querySelectorAll('script[src*="widget.js"]')
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (!scripts[i].hasAttribute('data-dcrm-processed')) return scripts[i]
    }
    return scripts[scripts.length - 1] || null
  }

  function parseMode(raw) {
    var mode = (raw || 'auto').toLowerCase()
    if (mode === 'auto' || mode === 'manual') return mode
    console.warn('[DentalCRM Widget] Unknown data-mode="' + raw + '", falling back to "auto"')
    return 'auto'
  }

  function deriveApiBase(script) {
    var explicit = script.getAttribute('data-base')
    if (explicit) return explicit
    try {
      return new URL(script.src).origin
    } catch (err) {
      console.error('[DentalCRM Widget] Could not derive API base from script src', err)
      return null
    }
  }

  function readOptions(script) {
    var slug = script.getAttribute('data-slug')
    if (!slug) {
      console.error('[DentalCRM Widget] Missing data-slug attribute on loader script')
      return null
    }
    var apiBase = deriveApiBase(script)
    if (!apiBase) return null
    return { slug: slug, mode: parseMode(script.getAttribute('data-mode')), apiBase: apiBase }
  }

  function isBundleReady() {
    return Boolean(
      window.DentalCRMWidget && typeof window.DentalCRMWidget.mount === 'function'
    )
  }

  function loadBundle(apiBase, onReady) {
    if (isBundleReady()) {
      onReady()
      return
    }
    var existing = document.querySelector('script[data-dentalcrm-bundle="1"]')
    if (existing) {
      existing.addEventListener('load', onReady, { once: true })
      existing.addEventListener(
        'error',
        function () {
          console.error('[DentalCRM Widget] Failed to load widget bundle (existing tag)')
        },
        { once: true }
      )
      return
    }
    var bundle = document.createElement('script')
    bundle.src = apiBase + '/widget-bundle.js'
    bundle.async = true
    bundle.crossOrigin = 'anonymous'
    bundle.setAttribute('data-dentalcrm-bundle', '1')
    bundle.onload = function () {
      if (isBundleReady()) {
        onReady()
      } else {
        console.error('[DentalCRM Widget] Bundle loaded but mount() unavailable')
      }
    }
    bundle.onerror = function () {
      console.error('[DentalCRM Widget] Failed to load widget bundle from', bundle.src)
    }
    document.head.appendChild(bundle)
  }

  function createShadowHost(slug) {
    if (document.querySelector('div#dentalcrm-widget-host[data-slug="' + slug + '"]')) {
      return null
    }
    var host = document.createElement('div')
    host.id = 'dentalcrm-widget-host'
    host.setAttribute('data-slug', slug)
    host.style.cssText = 'all:initial;position:relative;z-index:2147483647;'
    document.body.appendChild(host)
    try {
      return host.attachShadow({ mode: 'open' })
    } catch (err) {
      // Fallback: mount directly if Shadow DOM is unavailable (very old browsers).
      console.warn('[DentalCRM Widget] Shadow DOM unavailable, mounting in light DOM', err)
      return host
    }
  }

  function autoMount(opts, config) {
    var shadow = createShadowHost(opts.slug)
    if (!shadow) return
    loadBundle(opts.apiBase, function () {
      try {
        window.DentalCRMWidget.mount(shadow, config, opts.apiBase)
      } catch (err) {
        console.error('[DentalCRM Widget] Mount failed', err)
      }
    })
  }

  function dispatchReady(opts, config) {
    loadBundle(opts.apiBase, function () {
      try {
        var ev = new CustomEvent('DentalCRMWidgetReady', {
          detail: { slug: opts.slug, config: config, apiBase: opts.apiBase },
        })
        window.dispatchEvent(ev)
      } catch (err) {
        console.error('[DentalCRM Widget] Failed to dispatch ready event', err)
      }
    })
  }

  function fetchConfig(opts) {
    return fetch(opts.apiBase + '/api/widget/config?slug=' + encodeURIComponent(opts.slug), {
      method: 'GET',
      credentials: 'omit',
      mode: 'cors',
    }).then(function (res) {
      if (!res.ok) throw new Error('Widget config request failed: ' + res.status)
      return res.json()
    })
  }

  function start(opts) {
    fetchConfig(opts)
      .then(function (config) {
        if (opts.mode === 'manual') dispatchReady(opts, config)
        else autoMount(opts, config)
      })
      .catch(function (err) {
        console.error('[DentalCRM Widget]', err)
      })
  }

  function bootstrap() {
    var script = findScript()
    if (!script) {
      console.error('[DentalCRM Widget] Could not find loader script tag')
      return
    }
    if (script.hasAttribute('data-dcrm-processed')) return
    script.setAttribute('data-dcrm-processed', '1')

    var opts = readOptions(script)
    if (!opts) return

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        start(opts)
      })
    } else {
      start(opts)
    }
  }

  bootstrap()
})()
