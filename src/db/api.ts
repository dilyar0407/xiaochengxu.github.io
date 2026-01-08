// 数据库API封装
import {supabase} from '@/client/supabase'
import type {BookCourseResult, Booking, BookingWithCourse, CancelBookingResult, Course, Profile} from './types'

// ==================== 用户相关 ====================

/**
 * 获取当前登录用户信息
 */
export async function getCurrentUser(): Promise<Profile | null> {
  const {
    data: {user}
  } = await supabase.auth.getUser()
  if (!user) return null

  const {data, error} = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()

  if (error) {
    console.error('获取用户信息失败:', error)
    return null
  }

  return data
}

/**
 * 根据ID获取用户信息
 */
export async function getUserById(userId: string): Promise<Profile | null> {
  const {data, error} = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()

  if (error) {
    console.error('获取用户信息失败:', error)
    return null
  }

  return data
}

// ==================== 课程相关 ====================

/**
 * 获取所有课程列表
 */
export async function getAllCourses(): Promise<Course[]> {
  const {data, error} = await supabase.from('courses').select('*').order('start_time', {ascending: true})

  if (error) {
    console.error('获取课程列表失败:', error)
    return []
  }

  return data || []
}

/**
 * 根据运动类型筛选课程
 */
export async function getCoursesBySportType(sportType: string): Promise<Course[]> {
  const {data, error} = await supabase
    .from('courses')
    .select('*')
    .eq('sport_type', sportType)
    .order('start_time', {ascending: true})

  if (error) {
    console.error('获取课程列表失败:', error)
    return []
  }

  return data || []
}

/**
 * 根据ID获取课程详情
 */
export async function getCourseById(courseId: string): Promise<Course | null> {
  const {data, error} = await supabase.from('courses').select('*').eq('id', courseId).maybeSingle()

  if (error) {
    console.error('获取课程详情失败:', error)
    return null
  }

  return data
}

/**
 * 获取所有运动类型
 */
export async function getSportTypes(): Promise<string[]> {
  const {data, error} = await supabase.from('courses').select('sport_type').order('sport_type', {ascending: true})

  if (error) {
    console.error('获取运动类型失败:', error)
    return []
  }

  // 去重
  const types = [...new Set(data?.map((item) => item.sport_type) || [])]
  return types
}

// ==================== 预约相关 ====================

/**
 * 预约课程
 */
export async function bookCourse(userId: string, courseId: string): Promise<BookCourseResult> {
  const {data, error} = await supabase.rpc('book_course', {
    p_user_id: userId,
    p_course_id: courseId
  })

  if (error) {
    console.error('预约课程失败:', error)
    return {success: false, message: '预约失败，请稍后重试'}
  }

  return data as BookCourseResult
}

/**
 * 取消预约
 */
export async function cancelBooking(bookingId: string, userId: string): Promise<CancelBookingResult> {
  const {data, error} = await supabase.rpc('cancel_booking', {
    p_booking_id: bookingId,
    p_user_id: userId
  })

  if (error) {
    console.error('取消预约失败:', error)
    return {success: false, message: '取消失败，请稍后重试'}
  }

  return data as CancelBookingResult
}

/**
 * 获取用户的所有预约记录
 */
export async function getUserBookings(userId: string): Promise<BookingWithCourse[]> {
  const {data, error} = await supabase
    .from('bookings')
    .select(
      `
      *,
      course:courses(*)
    `
    )
    .eq('user_id', userId)
    .order('created_at', {ascending: false})

  if (error) {
    console.error('获取预约记录失败:', error)
    return []
  }

  return (data || []) as BookingWithCourse[]
}

/**
 * 检查用户是否已预约某课程
 */
export async function checkUserBooking(userId: string, courseId: string): Promise<Booking | null> {
  const {data, error} = await supabase
    .from('bookings')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .in('status', ['confirmed', 'pending'])
    .maybeSingle()

  if (error) {
    console.error('检查预约状态失败:', error)
    return null
  }

  return data
}

/**
 * 根据状态获取用户预约记录
 */
export async function getUserBookingsByStatus(userId: string, status: string): Promise<BookingWithCourse[]> {
  const {data, error} = await supabase
    .from('bookings')
    .select(
      `
      *,
      course:courses(*)
    `
    )
    .eq('user_id', userId)
    .eq('status', status)
    .order('created_at', {ascending: false})

  if (error) {
    console.error('获取预约记录失败:', error)
    return []
  }

  return (data || []) as BookingWithCourse[]
}
