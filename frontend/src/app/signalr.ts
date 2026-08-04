import * as signalR from '@microsoft/signalr'

const STORAGE_KEY = 'dineflow_auth'

let connection: signalR.HubConnection | null = null
let startPromise: Promise<void> | null = null

export function getSignalRConnection(): signalR.HubConnection {
  if (!connection) {
    connection = new signalR.HubConnectionBuilder()
      .withUrl('https://localhost:44385/hubs/orders', {
        // SignalR WebSocket transport cannot send Authorization headers;
        // the server reads this token from ?access_token= in the query string.
        accessTokenFactory: () => {
          try {
            const raw = localStorage.getItem(STORAGE_KEY)
            return raw ? ((JSON.parse(raw) as { token?: string }).token ?? '') : ''
          } catch {
            return ''
          }
        },
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build()
  }
  return connection
}

// Shared promise so concurrent callers all wait for the same start() call
export function startSignalRConnection(): Promise<void> {
  const conn = getSignalRConnection()
  if (conn.state === signalR.HubConnectionState.Connected) return Promise.resolve()
  if (!startPromise) {
    startPromise = conn.start().finally(() => { startPromise = null })
  }
  return startPromise
}
