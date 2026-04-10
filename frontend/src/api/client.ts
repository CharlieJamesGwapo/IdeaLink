import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.response.use(
  (res) => res,
  (error) => Promise.reject(error)
)

export default client
