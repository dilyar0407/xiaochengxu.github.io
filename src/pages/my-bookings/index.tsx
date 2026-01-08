import {Button, Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useMemo, useState} from 'react'
import {cancelBooking, getCurrentUser, getUserBookings} from '@/db/api'
import type {BookingWithCourse} from '@/db/types'
import {useAuthStore} from '@/store/auth'

export default function MyBookings() {
  const [bookings, setBookings] = useState<BookingWithCourse[]>([])
  const [selectedTab, setSelectedTab] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const {user, setUser} = useAuthStore()

  // 检查登录状态
  const checkAuth = useCallback(async () => {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      Taro.setStorageSync('loginRedirectPath', 'pages/my-bookings/index')
      Taro.navigateTo({url: '/pages/login/index'})
      return false
    }
    setUser(currentUser)
    return true
  }, [setUser])

  // 加载预约记录
  const loadBookings = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      const bookingList = await getUserBookings(user.id)
      setBookings(bookingList)
    } catch (error) {
      console.error('加载预约记录失败:', error)
      Taro.showToast({title: '加载失败，请稍后重试', icon: 'none'})
    } finally {
      setLoading(false)
    }
  }, [user])

  useDidShow(() => {
    checkAuth().then((isAuth) => {
      if (isAuth) {
        loadBookings()
      }
    })
  })

  // 筛选预约记录
  const filteredBookings = useMemo(() => {
    if (selectedTab === 'all') return bookings
    return bookings.filter((booking) => booking.status === selectedTab)
  }, [bookings, selectedTab])

  // 格式化时间
  const formatTime = useCallback((dateStr: string) => {
    const date = new Date(dateStr)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hour = date.getHours().toString().padStart(2, '0')
    const minute = date.getMinutes().toString().padStart(2, '0')
    return `${month}-${day} ${hour}:${minute}`
  }, [])

  // 获取状态标签
  const getStatusTag = useCallback((status: string) => {
    switch (status) {
      case 'confirmed':
        return {text: '已预约', color: 'text-success', bgColor: 'bg-success/10'}
      case 'completed':
        return {text: '已完成', color: 'text-info', bgColor: 'bg-info/10'}
      case 'cancelled':
        return {text: '已取消', color: 'text-muted-foreground', bgColor: 'bg-muted'}
      case 'pending':
        return {text: '待确认', color: 'text-warning', bgColor: 'bg-warning/10'}
      default:
        return {text: '未知', color: 'text-muted-foreground', bgColor: 'bg-muted'}
    }
  }, [])

  // 取消预约
  const handleCancel = useCallback(
    async (bookingId: string, courseName: string, bookingDeadline: string) => {
      if (!user) return

      // 检查是否超过预约截止时间
      if (new Date() > new Date(bookingDeadline)) {
        Taro.showToast({title: '已超过预约截止时间，无法取消', icon: 'none'})
        return
      }

      Taro.showModal({
        title: '确认取消',
        content: `确定要取消预约"${courseName}"吗？`,
        success: async (res) => {
          if (res.confirm) {
            setLoading(true)
            try {
              const result = await cancelBooking(bookingId, user.id)
              if (result.success) {
                Taro.showToast({title: '取消成功', icon: 'success'})
                await loadBookings()
              } else {
                Taro.showToast({title: result.message, icon: 'none'})
              }
            } catch (error) {
              console.error('取消预约失败:', error)
              Taro.showToast({title: '取消失败，请稍后重试', icon: 'none'})
            } finally {
              setLoading(false)
            }
          }
        }
      })
    },
    [user, loadBookings]
  )

  // 查看详情
  const goToDetail = useCallback((courseId: string) => {
    Taro.navigateTo({url: `/pages/course-detail/index?id=${courseId}`})
  }, [])

  // 判断是否可以取消
  const canCancel = useCallback((booking: BookingWithCourse) => {
    if (booking.status !== 'confirmed' && booking.status !== 'pending') return false
    if (new Date() > new Date(booking.course.booking_deadline)) return false
    return true
  }, [])

  return (
    <View className="min-h-screen bg-gradient-bg">
      {/* 顶部标签栏 */}
      <View className="bg-card px-4 py-3 shadow-sm">
        <View className="flex gap-2">
          {[
            {key: 'all', label: '全部'},
            {key: 'confirmed', label: '已预约'},
            {key: 'completed', label: '已完成'},
            {key: 'cancelled', label: '已取消'}
          ].map((tab) => (
            <View
              key={tab.key}
              className={`flex-1 text-center py-2 rounded-full break-keep ${
                selectedTab === tab.key ? 'bg-gradient-primary text-white' : 'bg-muted text-muted-foreground'
              }`}
              onClick={() => setSelectedTab(tab.key)}>
              <Text className="text-sm font-medium">{tab.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 预约列表 */}
      <ScrollView scrollY style={{height: 'calc(100vh - 100px)'}}>
        <View className="p-4 space-y-4">
          {filteredBookings.length === 0 && !loading && (
            <View className="flex flex-col items-center justify-center py-20">
              <View className="i-mdi-calendar-blank text-6xl text-muted-foreground mb-4" />
              <Text className="text-muted-foreground">暂无预约记录</Text>
            </View>
          )}

          {filteredBookings.map((booking) => {
            const statusTag = getStatusTag(booking.status)
            return (
              <View key={booking.id} className="bg-card rounded-2xl overflow-hidden shadow-elegant">
                {/* 课程图片 */}
                <View className="relative">
                  <Image src={booking.course.image_url || ''} mode="aspectFill" className="w-full h-32" />
                  <View className="absolute top-3 left-3 bg-primary px-3 py-1 rounded-full">
                    <Text className="text-white text-xs font-semibold">{booking.course.sport_type}</Text>
                  </View>
                  <View className={`absolute top-3 right-3 ${statusTag.bgColor} px-3 py-1 rounded-full`}>
                    <Text className={`${statusTag.color} text-xs font-semibold`}>{statusTag.text}</Text>
                  </View>
                </View>

                {/* 预约信息 */}
                <View className="p-4">
                  <Text className="text-lg font-bold text-foreground mb-3 break-keep">{booking.course.name}</Text>

                  <View className="space-y-2 mb-4">
                    <View className="flex items-center gap-2">
                      <View className="i-mdi-clock-outline text-primary text-base" />
                      <Text className="text-sm text-muted-foreground">
                        {formatTime(booking.course.start_time)} - {formatTime(booking.course.end_time)}
                      </Text>
                    </View>

                    <View className="flex items-center gap-2">
                      <View className="i-mdi-map-marker text-primary text-base" />
                      <Text className="text-sm text-muted-foreground break-keep">{booking.course.location}</Text>
                    </View>

                    <View className="flex items-center gap-2">
                      <View className="i-mdi-account-tie text-primary text-base" />
                      <Text className="text-sm text-muted-foreground">{booking.course.teacher}</Text>
                    </View>

                    <View className="flex items-center gap-2">
                      <View className="i-mdi-calendar-check text-primary text-base" />
                      <Text className="text-sm text-muted-foreground">预约时间：{formatTime(booking.created_at)}</Text>
                    </View>
                  </View>

                  {/* 操作按钮 */}
                  <View className="flex gap-2">
                    <Button
                      className="flex-1 bg-muted text-foreground py-3 rounded-xl break-keep text-sm"
                      size="mini"
                      onClick={() => goToDetail(booking.course.id)}>
                      查看详情
                    </Button>
                    {canCancel(booking) && (
                      <Button
                        className="flex-1 bg-destructive text-white py-3 rounded-xl break-keep text-sm"
                        size="mini"
                        onClick={() => handleCancel(booking.id, booking.course.name, booking.course.booking_deadline)}>
                        取消预约
                      </Button>
                    )}
                  </View>
                </View>
              </View>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}
