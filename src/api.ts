import { Dataset, Example, VerificationRequest, WebSocketMessage } from './types'

const API_BASE_URL = 'http://localhost:8000'
const WS_URL = 'ws://localhost:8000/ws'

export async function fetchDatasets(): Promise<Dataset[]> {
  const response = await fetch(`${API_BASE_URL}/datasets`)
  if (!response.ok) {
    throw new Error('Failed to fetch datasets')
  }
  return response.json()
}

export async function fetchExamples(datasetId: string): Promise<Example[]> {
  const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}/examples`)
  if (!response.ok) {
    throw new Error('Failed to fetch examples')
  }
  return response.json()
}

export function verifyFact(request: VerificationRequest, onMessage: (message: WebSocketMessage) => void): WebSocket {
  const ws = new WebSocket(WS_URL)

  ws.onopen = () => {
    ws.send(JSON.stringify(request))
  }

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data) as WebSocketMessage
    onMessage(message)
  }

  ws.onerror = () => {
    onMessage({ type: 'error', message: 'WebSocket error occurred' })
  }

  return ws
}