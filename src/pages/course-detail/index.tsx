import {Button, Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow, useLoad} from '@tarojs/taro'
import {useCallback, useEffect, useMemo, useState} from 'react'
import {bookCourse, checkUserBooking, getCourseById, getCurrentUser} from '@/db/api'
import type {Booking, Course} from '@/db/types'
import {useAuthStore} from '@/store/auth'

export default function CourseDetail() {
  const [course, setCourse] = useState<Course | null>(null)
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(false)
  const [courseId, setCourseId] = useState('')
  const {user, setUser} = useAuthStore()

  useLoad((options) => {
    if (options.id) {
      setCourseId(options.id)
    }
  })

  // 检查登录状态
  const checkAuth = useCallback(async () => {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      Taro.setStorageSync('loginRedirectPath', `pages/course-detail/index?id=${courseId}`)
      Taro.navigateTo({url: '/pages/login/index'})
      return false
    }
    setUser(currentUser)
    return true
  }, [courseId, setUser])

  // 加载课程详情
  const loadCourseDetail = useCallback(async () => {
    if (!courseId || !user) return

    setLoading(true)
    try {
      const courseData = await getCourseById(courseId)
      setCourse(courseData)

      // 检查是否已预约
      const bookingData = await checkUserBooking(user.id, courseId)
      setBooking(bookingData)
    } catch (error) {
      console.error('加载课程详情失败:', error)
      Taro.showToast({title: '加载失败，请稍后重试', icon: 'none'})
    } finally {
      setLoading(false)
    }
  }, [courseId, user])

  useDidShow(() => {
    checkAuth().then((isAuth) => {
      if (isAuth) {
        loadCourseDetail()
      }
    })
  })

  useEffect(() => {
    if (courseId && user) {
      loadCourseDetail()
    }
  }, [courseId, user, loadCourseDetail])

  // 格式化时间
  const formatTime = useCallback((dateStr: string) => {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hour = date.getHours().toString().padStart(2, '0')
    const minute = date.getMinutes().toString().padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}`
  }, [])

  // 计算剩余名额
  const remainingSlots = useMemo(() => {
    if (!course) return 0
    return course.total_slots - course.booked_slots
  }, [course])

  // 判断是否可以预约
  const canBook = useMemo(() => {
    if (!course || !user) return false
    if (booking) return false // 已预约
    if (remainingSlots <= 0) return false // 名额已满
    if (new Date() > new Date(course.booking_deadline)) return false // 预约已截止
    return true
  }, [course, user, booking, remainingSlots])

  // 获取按钮状态
  const getButtonStatus = useMemo(() => {
    if (!course) return {text: '加载中...', disabled: true, className: 'bg-muted'}
    if (booking) return {text: '已预约', disabled: true, className: 'bg-success'}
    if (remainingSlots <= 0) return {text: '名额已满', disabled: true, className: 'bg-muted'}
    if (new Date() > new Date(course.booking_deadline))
      return {text: '预约已截止', disabled: true, className: 'bg-muted'}
    return {text: '立即预约', disabled: false, className: 'bg-gradient-primary'}
  }, [course, booking, remainingSlots])

  // 预约课程
  const handleBook = useCallback(async () => {
    if (!user || !course || !canBook) return

    setLoading(true)
    try {
      const result = await bookCourse(user.id, course.id)
      if (result.success) {
        Taro.showToast({title: '预约成功', icon: 'success'})
        // 重新加载课程详情
        await loadCourseDetail()
      } else {
        Taro.showToast({title: result.message, icon: 'none'})
      }
    } catch (error) {
      console.error('预约失败:', error)
      Taro.showToast({title: '预约失败，请稍后重试', icon: 'none'})
    } finally {
      setLoading(false)
    }
  }, [user, course, canBook, loadCourseDetail])

  if (!course) {
    return (
      <View className="min-h-screen bg-gradient-bg flex items-center justify-center">
        <Text className="text-muted-foreground">加载中...</Text>
      </View>
    )
  }

  return (
    <View className="min-h-screen bg-gradient-bg">
      <ScrollView scrollY style={{height: '100vh'}}>
        {/* 课程图片 */}
        <View className="relative">
          <Image src={course.image_url || ''} mode="aspectFill" className="w-full h-64" />

          {/* 返回按钮 */}
          <View
            className="absolute top-4 left-4 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center"
            onClick={() => Taro.navigateBack()}>
            <View className="i-mdi-arrow-left text-white text-2xl" />
          </View>

          <View className="absolute top-4 right-4 bg-primary px-4 py-2 rounded-full shadow-lg">
            <Text className="text-white text-sm font-bold">{course.sport_type}</Text>
          </View>
        </View>

        {/* 课程基本信息 */}
        <View className="bg-card rounded-t-3xl -mt-6 relative z-10 p-6">
          <Text className="text-2xl font-bold text-foreground mb-4 break-keep">{course.name}</Text>

          {/* 名额状态 */}
          <View className="flex items-center justify-between mb-6 p-4 bg-gradient-card rounded-xl">
            <View className="flex items-center gap-2">
              <View className="i-mdi-account-group text-primary text-2xl" />
              <View>
                <Text className="text-sm text-muted-foreground">报名人数</Text>
                <Text className="text-lg font-bold text-foreground">
                  {course.booked_slots}/{course.total_slots}人
                </Text>
              </View>
            </View>
            <View
              className={`px-4 py-2 rounded-full ${
                remainingSlots === 0 ? 'bg-muted' : remainingSlots <= 3 ? 'bg-warning/10' : 'bg-success/10'
              }`}>
              <Text
                className={`text-sm font-semibold ${
                  remainingSlots === 0 ? 'text-muted-foreground' : remainingSlots <= 3 ? 'text-warning' : 'text-success'
                }`}>
                {remainingSlots === 0
                  ? '已满员'
                  : remainingSlots <= 3
                    ? `仅剩${remainingSlots}个`
                    : `剩余${remainingSlots}个`}
              </Text>
            </View>
          </View>

          {/* 课程详细信息 */}
          <View className="space-y-4 mb-6">
            <View className="flex items-start gap-3 p-4 bg-gradient-card rounded-xl">
              <View className="i-mdi-clock-outline text-primary text-xl mt-1" />
              <View className="flex-1">
                <Text className="text-sm text-muted-foreground mb-1">上课时间</Text>
                <Text className="text-base text-foreground break-keep">{formatTime(course.start_time)}</Text>
                <Text className="text-base text-foreground break-keep">至 {formatTime(course.end_time)}</Text>
              </View>
            </View>

            <View className="flex items-start gap-3 p-4 bg-gradient-card rounded-xl">
              <View className="i-mdi-map-marker text-primary text-xl mt-1" />
              <View className="flex-1">
                <Text className="text-sm text-muted-foreground mb-1">上课地点</Text>
                <Text className="text-base text-foreground break-keep">{course.location}</Text>
              </View>
            </View>

            <View className="flex items-start gap-3 p-4 bg-gradient-card rounded-xl">
              <View className="i-mdi-account-tie text-primary text-xl mt-1" />
              <View className="flex-1">
                <Text className="text-sm text-muted-foreground mb-1">授课老师</Text>
                <Text className="text-base text-foreground">{course.teacher}</Text>
              </View>
            </View>

            <View className="flex items-start gap-3 p-4 bg-gradient-card rounded-xl">
              <View className="i-mdi-calendar-clock text-primary text-xl mt-1" />
              <View className="flex-1">
                <Text className="text-sm text-muted-foreground mb-1">预约截止</Text>
                <Text className="text-base text-foreground break-keep">{formatTime(course.booking_deadline)}</Text>
              </View>
            </View>
          </View>

          {/* 课程描述 */}
          {course.description && (
            <View className="mb-6">
              <View className="flex items-center gap-2 mb-3">
                <View className="i-mdi-text-box-outline text-primary text-xl" />
                <Text className="text-lg font-semibold text-foreground">课程介绍</Text>
              </View>
              <View className="p-4 bg-gradient-card rounded-xl">
                <Text className="text-base text-muted-foreground leading-relaxed break-keep">{course.description}</Text>
              </View>
            </View>
          )}

          {/* 预约按钮 */}
          <View className="pb-6">
            <Button
              className={`w-full ${getButtonStatus.className} text-white py-5 rounded-xl break-keep text-lg font-bold shadow-lg`}
              size="default"
              onClick={loading || getButtonStatus.disabled ? undefined : handleBook}>
              {loading ? '处理中...' : getButtonStatus.text}
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
