import {Button, Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useState} from 'react'
import {getAllCourses, getCoursesBySportType, getCurrentUser, getSportTypes} from '@/db/api'
import type {Course} from '@/db/types'
import {useAuthStore} from '@/store/auth'

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [sportTypes, setSportTypes] = useState<string[]>([])
  const [selectedType, setSelectedType] = useState<string>('全部')
  const [loading, setLoading] = useState(false)
  const {user, setUser} = useAuthStore()

  // 检查登录状态
  const checkAuth = useCallback(async () => {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      Taro.setStorageSync('loginRedirectPath', 'pages/courses/index')
      Taro.navigateTo({url: '/pages/login/index'})
      return false
    }
    setUser(currentUser)
    return true
  }, [setUser])

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // 加载运动类型
      const types = await getSportTypes()
      setSportTypes(['全部', ...types])

      // 加载课程列表
      const courseList = await getAllCourses()
      setCourses(courseList)
    } catch (error) {
      console.error('加载数据失败:', error)
      Taro.showToast({title: '加载失败，请稍后重试', icon: 'none'})
    } finally {
      setLoading(false)
    }
  }, [])

  useDidShow(() => {
    checkAuth().then((isAuth) => {
      if (isAuth) {
        loadData()
      }
    })
  })

  // 筛选课程
  const handleFilterChange = useCallback(async (type: string) => {
    setSelectedType(type)
    setLoading(true)
    try {
      if (type === '全部') {
        const courseList = await getAllCourses()
        setCourses(courseList)
      } else {
        const courseList = await getCoursesBySportType(type)
        setCourses(courseList)
      }
    } catch (error) {
      console.error('筛选课程失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // 下拉刷新
  const handleRefresh = useCallback(async () => {
    await loadData()
    Taro.showToast({title: '刷新成功', icon: 'success', duration: 1000})
  }, [loadData])

  // 格式化时间
  const formatTime = useCallback((dateStr: string) => {
    const date = new Date(dateStr)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours().toString().padStart(2, '0')
    const minute = date.getMinutes().toString().padStart(2, '0')
    return `${month}月${day}日 ${hour}:${minute}`
  }, [])

  // 计算剩余名额状态
  const getSlotStatus = useCallback((course: Course) => {
    const remaining = course.total_slots - course.booked_slots
    if (remaining === 0) {
      return {text: '已满员', color: 'text-muted-foreground', bgColor: 'bg-muted'}
    }
    if (remaining <= 3) {
      return {text: `仅剩${remaining}个名额`, color: 'text-warning', bgColor: 'bg-warning/10'}
    }
    return {text: `剩余${remaining}个名额`, color: 'text-success', bgColor: 'bg-success/10'}
  }, [])

  // 跳转到课程详情
  const goToDetail = useCallback((courseId: string) => {
    Taro.navigateTo({url: `/pages/course-detail/index?id=${courseId}`})
  }, [])

  return (
    <View className="min-h-screen bg-gradient-bg">
      {/* 顶部筛选栏 */}
      <View className="bg-card px-4 py-3 shadow-sm">
        <View className="flex items-center gap-2 mb-2">
          <View className="i-mdi-filter-variant text-primary text-xl" />
          <Text className="text-base font-semibold text-foreground">运动类型</Text>
        </View>
        <ScrollView scrollX className="whitespace-nowrap">
          <View className="flex gap-2">
            {sportTypes.map((type) => (
              <View
                key={type}
                className={`inline-block px-4 py-2 rounded-full break-keep ${
                  selectedType === type ? 'bg-gradient-primary text-white' : 'bg-muted text-muted-foreground'
                }`}
                onClick={() => handleFilterChange(type)}>
                <Text className="text-sm font-medium">{type}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* 课程列表 */}
      <ScrollView
        scrollY
        className="flex-1"
        style={{height: 'calc(100vh - 120px)'}}
        refresherEnabled
        refresherTriggered={loading}
        onRefresherRefresh={handleRefresh}>
        <View className="p-4 space-y-4">
          {courses.length === 0 && !loading && (
            <View className="flex flex-col items-center justify-center py-20">
              <View className="i-mdi-calendar-remove text-6xl text-muted-foreground mb-4" />
              <Text className="text-muted-foreground">暂无课程</Text>
            </View>
          )}

          {courses.map((course) => {
            const slotStatus = getSlotStatus(course)
            return (
              <View
                key={course.id}
                className="bg-card rounded-2xl overflow-hidden shadow-elegant"
                onClick={() => goToDetail(course.id)}>
                {/* 课程图片 */}
                <View className="relative">
                  <Image src={course.image_url || ''} mode="aspectFill" className="w-full h-40" />
                  <View className="absolute top-3 left-3 bg-primary px-3 py-1 rounded-full">
                    <Text className="text-white text-xs font-semibold">{course.sport_type}</Text>
                  </View>
                  <View className={`absolute top-3 right-3 ${slotStatus.bgColor} px-3 py-1 rounded-full`}>
                    <Text className={`${slotStatus.color} text-xs font-semibold`}>{slotStatus.text}</Text>
                  </View>
                </View>

                {/* 课程信息 */}
                <View className="p-4">
                  <Text className="text-lg font-bold text-foreground mb-2 break-keep">{course.name}</Text>

                  <View className="space-y-2">
                    <View className="flex items-center gap-2">
                      <View className="i-mdi-clock-outline text-primary text-base" />
                      <Text className="text-sm text-muted-foreground">
                        {formatTime(course.start_time)} - {formatTime(course.end_time)}
                      </Text>
                    </View>

                    <View className="flex items-center gap-2">
                      <View className="i-mdi-map-marker text-primary text-base" />
                      <Text className="text-sm text-muted-foreground break-keep">{course.location}</Text>
                    </View>

                    <View className="flex items-center gap-2">
                      <View className="i-mdi-account-tie text-primary text-base" />
                      <Text className="text-sm text-muted-foreground">{course.teacher}</Text>
                    </View>
                  </View>

                  <View className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <View className="flex items-center gap-2">
                      <View className="i-mdi-account-group text-muted-foreground text-base" />
                      <Text className="text-sm text-muted-foreground">
                        {course.booked_slots}/{course.total_slots}人
                      </Text>
                    </View>
                    <Button
                      className="bg-gradient-primary text-white px-6 py-2 rounded-full break-keep text-sm"
                      size="mini"
                      onClick={(e) => {
                        e.stopPropagation()
                        goToDetail(course.id)
                      }}>
                      查看详情
                    </Button>
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
