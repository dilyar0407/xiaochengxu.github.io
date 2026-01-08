// 数据库类型定义

export type UserRole = 'user' | 'admin'

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

export interface Profile {
  id: string
  username: string | null
  email: string | null
  phone: string | null
  openid: string | null
  nickname: string | null
  avatar_url: string | null
  role: UserRole
  created_at: string
}

export interface Course {
  id: string
  name: string
  sport_type: string
  teacher: string
  location: string
  start_time: string
  end_time: string
  total_slots: number
  booked_slots: number
  image_url: string | null
  description: string | null
  booking_deadline: string
  created_at: string
}

export interface Booking {
  id: string
  user_id: string
  course_id: string
  status: BookingStatus
  created_at: string
  cancelled_at: string | null
}

// 带课程信息的预约记录
export interface BookingWithCourse extends Booking {
  course: Course
}

// RPC函数返回类型
export interface BookCourseResult {
  success: boolean
  message: string
  booking_id?: string
}

export interface CancelBookingResult {
  success: boolean
  message: string
}
