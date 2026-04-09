import client from './client'
import type { Testimonial } from '../types'

export const getTestimonials = () =>
  client.get<Testimonial[]>('/api/testimonials')

export const toggleTestimonial = (id: number) =>
  client.patch<Testimonial>(`/api/testimonials/${id}/toggle`)
