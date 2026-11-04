// Diffusion vers l'interface, par Server-Sent Events.
const clients = new Set()
let onEmpty = null
let onFirstClient = null

export function setClientListeners(listeners) {
  onEmpty = listeners.onEmpty
  onFirstClient = listeners.onFirstClient
}

export function broadcast(channel, payload) {
  const data = `data: ${JSON.stringify({ channel, payload })}\n\n`
  for (const res of clients) {
    res.write(data)
  }
}

export function addClient(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-store',
    Connection: 'keep-alive'
  })
  res.write(': ok\n\n')
  clients.add(res)
  onFirstClient?.()
  const keepAlive = setInterval(() => res.write(': ping\n\n'), 25000)
  res.on('close', () => {
    clearInterval(keepAlive)
    clients.delete(res)
    if (clients.size === 0) {
      onEmpty?.()
    }
  })
}

export function clientCount() {
  return clients.size
}
