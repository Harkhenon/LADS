import { protocol, net } from 'electron'
import { pathToFileURL } from 'node:url'

const MEDIA_SCHEME = 'lads-media'
const SCHEME_PREFIX = `${MEDIA_SCHEME}://`

protocol.registerSchemesAsPrivileged([{ scheme: MEDIA_SCHEME, privileges: { stream: true } }])

export function registerMediaProtocol() {
  protocol.handle(MEDIA_SCHEME, (request) => {
    const filePath = decodeURIComponent(request.url.slice(SCHEME_PREFIX.length))
    return net.fetch(pathToFileURL(filePath).toString())
  })
}
