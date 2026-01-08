import {Button, Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useState} from 'react'
import {supabase} from '@/client/supabase'
import {getCurrentUser} from '@/db/api'
import {useAuthStore} from '@/store/auth'

export default function Profile() {
  const [loading, setLoading] = useState(false)
  const {user, setUser, clearUser} = useAuthStore()

  // 检查登录状态
  const checkAuth = useCallback(async () => {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      Taro.setStorageSync('loginRedirectPath', 'pages/profile/index')
      Taro.navigateTo({url: '/pages/login/index'})
      return false
    }
    setUser(currentUser)
    return true
  }, [setUser])

  useDidShow(() => {
    checkAuth()
  })

  // 退出登录
  const handleLogout = useCallback(async () => {
    Taro.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: async (res) => {
        if (res.confirm) {
          setLoading(true)
          try {
            await supabase.auth.signOut()
            clearUser()
            Taro.clearStorageSync()
            Taro.showToast({title: '已退出登录', icon: 'success'})
            setTimeout(() => {
              Taro.navigateTo({url: '/pages/login/index'})
            }, 500)
          } catch (error) {
            console.error('退出登录失败:', error)
            Taro.showToast({title: '退出失败，请稍后重试', icon: 'none'})
          } finally {
            setLoading(false)
          }
        }
      }
    })
  }, [clearUser])

  // 查看预约规则
  const showBookingRules = useCallback(() => {
    Taro.showModal({
      title: '预约规则说明',
      content:
        '1. 每个课程需在预约截止时间前完成预约\n2. 预约成功后可在截止时间前取消\n3. 超过截止时间无法取消预约\n4. 课程名额有限，先到先得\n5. 请准时参加已预约的课程',
      showCancel: false,
      confirmText: '我知道了'
    })
  }, [])

  if (!user) {
    return (
      <View className="min-h-screen bg-gradient-bg flex items-center justify-center">
        <Text className="text-muted-foreground">加载中...</Text>
      </View>
    )
  }

  return (
    <View className="min-h-screen bg-gradient-bg">
      <ScrollView scrollY style={{height: '100vh'}}>
        {/* 用户信息卡片 */}
        <View className="p-6">
          <View className="bg-gradient-primary rounded-3xl p-6 shadow-lg">
            <View className="flex items-center gap-4 mb-6">
              {/* 头像 */}
              <View className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-md">
                {user.avatar_url ? (
                  <Image src={user.avatar_url} mode="aspectFill" className="w-20 h-20 rounded-full" />
                ) : (
                  <View className="i-mdi-account-circle text-5xl text-primary" />
                )}
              </View>

              {/* 用户信息 */}
              <View className="flex-1">
                <Text className="text-xl font-bold text-white mb-1 break-keep">
                  {user.nickname || user.username || '用户'}
                </Text>
                {user.role === 'admin' && (
                  <View className="inline-block bg-white/20 px-3 py-1 rounded-full">
                    <Text className="text-white text-xs font-semibold">管理员</Text>
                  </View>
                )}
              </View>
            </View>

            {/* 用户详细信息 */}
            <View className="space-y-2">
              {user.username && (
                <View className="flex items-center gap-2">
                  <View className="i-mdi-account text-white text-base" />
                  <Text className="text-white text-sm">用户名：{user.username}</Text>
                </View>
              )}
              {user.email && !user.email.includes('@miaoda.com') && !user.email.includes('@wechat.login') && (
                <View className="flex items-center gap-2">
                  <View className="i-mdi-email text-white text-base" />
                  <Text className="text-white text-sm break-keep">邮箱：{user.email}</Text>
                </View>
              )}
              {user.phone && (
                <View className="flex items-center gap-2">
                  <View className="i-mdi-phone text-white text-base" />
                  <Text className="text-white text-sm">手机：{user.phone}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* 功能菜单 */}
        <View className="px-6 pb-6 space-y-3">
          {/* 我的预约 */}
          <View
            className="bg-card rounded-2xl p-4 shadow-elegant flex items-center justify-between"
            onClick={() => Taro.switchTab({url: '/pages/my-bookings/index'})}>
            <View className="flex items-center gap-3">
              <View className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <View className="i-mdi-calendar-check text-primary text-2xl" />
              </View>
              <View>
                <Text className="text-base font-semibold text-foreground">我的预约</Text>
                <Text className="text-xs text-muted-foreground">查看预约记录</Text>
              </View>
            </View>
            <View className="i-mdi-chevron-right text-muted-foreground text-2xl" />
          </View>

          {/* 预约规则 */}
          <View
            className="bg-card rounded-2xl p-4 shadow-elegant flex items-center justify-between"
            onClick={showBookingRules}>
            <View className="flex items-center gap-3">
              <View className="w-12 h-12 bg-info/10 rounded-xl flex items-center justify-center">
                <View className="i-mdi-information text-info text-2xl" />
              </View>
              <View>
                <Text className="text-base font-semibold text-foreground">预约规则</Text>
                <Text className="text-xs text-muted-foreground">了解预约须知</Text>
              </View>
            </View>
            <View className="i-mdi-chevron-right text-muted-foreground text-2xl" />
          </View>

          {/* 关于我们 */}
          <View className="bg-card rounded-2xl p-4 shadow-elegant">
            <View className="flex items-center gap-3 mb-3">
              <View className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                <View className="i-mdi-information-outline text-accent text-2xl" />
              </View>
              <View>
                <Text className="text-base font-semibold text-foreground">关于我们</Text>
                <Text className="text-xs text-muted-foreground">体育课预约系统</Text>
              </View>
            </View>
            <View className="pl-15">
              <Text className="text-sm text-muted-foreground leading-relaxed break-keep">
                为您提供便捷的体育课程预约服务，让运动成为生活的一部分。支持多种运动类型，专业教练指导，助您健康生活每一天。
              </Text>
            </View>
          </View>

          {/* 退出登录 */}
          <View className="pt-4">
            <Button
              className="w-full bg-destructive text-white py-4 rounded-xl break-keep text-base font-semibold shadow-lg"
              size="default"
              onClick={loading ? undefined : handleLogout}>
              {loading ? '退出中...' : '退出登录'}
            </Button>
          </View>
        </View>

        {/* 版权信息 */}
        <View className="pb-8 px-6">
          <Text className="text-center text-xs text-muted-foreground">© 2026 体育课预约系统</Text>
        </View>
      </ScrollView>
    </View>
  )
}
