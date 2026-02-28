import { fetch } from '../../utils/fetch'
import type { TokenResponse } from './codecs'

const client_id = import.meta.env.VITE_TIDAL_ID as string
const client_secret = import.meta.env.VITE_TIDAL_SECRET as string

export const requestToken = async (): Promise<TokenResponse> => {

  const response = await fetch({
    method: 'POST',
    url: `https://auth.tidal.com/v1/oauth2/token`,
    urlParameters: {
      grant_type: 'client_credentials',
      client_id: client_id,
      client_secret: client_secret,
    },
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })

  const data = typeof response === 'string' ? JSON.parse(response) : response

  if (!data.access_token) {
    throw new Error('Failed to get access token')
  }
  return data as TokenResponse
}