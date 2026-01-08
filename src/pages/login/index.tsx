import {Button, Input, Text, View} from '@tarojs/components'
import Taro, {getEnv, useLoad} from '@tarojs/taro'
import {useState} from 'react'
import {supabase} from '@/client/supabase'
import {getCurrentUser} from '@/db/api'
import {useAuthStore} from '@/store/auth'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [wechatLoading, setWechatLoading] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const {setUser} = useAuthStore()

  useLoad(() => {
    console.log('登录页加载')
  })

  // 用户名密码登录
  const handleLogin = async () => {
    if (!agreed) {
      Taro.showToast({title: '请先同意用户协议和隐私政策', icon: 'none'})
      return
    }

    if (!username.trim() || !password.trim()) {
      Taro.showToast({title: '请输入用户名和密码', icon: 'none'})
      return
    }

    // 验证用户名格式
    const usernameRegex = /^[a-zA-Z0-9_]+$/
    if (!usernameRegex.test(username)) {
      Taro.showToast({title: '用户名只能包含字母、数字和下划线', icon: 'none'})
      return
    }

    setLoading(true)

    try {
      const email = `${username}@miaoda.com`

      // 先尝试登录
      const {data: signInData, error: signInError} = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signInError) {
        // 如果登录失败，尝试注册
        if (signInError.message.includes('Invalid login credentials')) {
          const {data: signUpData, error: signUpError} = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                username
              }
            }
          })

          if (signUpError) {
            Taro.showToast({title: signUpError.message, icon: 'none'})
            return
          }

          if (signUpData.user) {
            // 注册成功，获取用户信息
            const userProfile = await getCurrentUser()
            if (userProfile) {
              setUser(userProfile)
              Taro.showToast({title: '注册成功', icon: 'success'})

              // 检查是否有重定向路径
              const redirectPath = Taro.getStorageSync('loginRedirectPath')
              if (redirectPath) {
                Taro.removeStorageSync('loginRedirectPath')
                const tabBarPages = ['pages/courses/index', 'pages/my-bookings/index', 'pages/profile/index']
                if (tabBarPages.includes(redirectPath)) {
                  setTimeout(() => {
                    Taro.switchTab({url: `/${redirectPath}`})
                  }, 500)
                } else {
                  setTimeout(() => {
                    Taro.navigateTo({url: `/${redirectPath}`})
                  }, 500)
                }
              } else {
                setTimeout(() => {
                  Taro.switchTab({url: '/pages/courses/index'})
                }, 500)
              }
            }
          }
        } else {
          Taro.showToast({title: signInError.message, icon: 'none'})
        }
      } else {
        // 登录成功
        const userProfile = await getCurrentUser()
        if (userProfile) {
          setUser(userProfile)
          Taro.showToast({title: '登录成功', icon: 'success'})

          // 检查是否有重定向路径
          const redirectPath = Taro.getStorageSync('loginRedirectPath')
          if (redirectPath) {
            Taro.removeStorageSync('loginRedirectPath')
            const tabBarPages = ['pages/courses/index', 'pages/my-bookings/index', 'pages/profile/index']
            if (tabBarPages.includes(redirectPath)) {
              setTimeout(() => {
                Taro.switchTab({url: `/${redirectPath}`})
              }, 500)
            } else {
              setTimeout(() => {
                Taro.navigateTo({url: `/${redirectPath}`})
              }, 500)
            }
          } else {
            setTimeout(() => {
              Taro.switchTab({url: '/pages/courses/index'})
            }, 500)
          }
        }
      }
    } catch (error) {
      console.error('登录错误:', error)
      Taro.showToast({title: '登录失败，请稍后重试', icon: 'none'})
    } finally {
      setLoading(false)
    }
  }

  // 微信授权登录
  const handleWechatLogin = async () => {
    if (!agreed) {
      Taro.showToast({title: '请先同意用户协议和隐私政策', icon: 'none'})
      return
    }

    if (getEnv() !== Taro.ENV_TYPE.WEAPP) {
      Taro.showToast({title: '微信授权登录请在小程序体验，网页端请使用用户名密码登录', icon: 'none'})
      return
    }

    setWechatLoading(true)

    try {
      const loginResult = await Taro.login()
      const {data, error} = await supabase.functions.invoke('wechat-miniprogram-login', {
        body: {code: loginResult?.code}
      })

      if (error) {
        const errorMsg = (await error?.context?.text?.()) || error.message
        Taro.showToast({title: errorMsg, icon: 'none'})
        return
      }

      const {data: session} = await supabase.auth.verifyOtp({
        token_hash: data.token,
        type: 'email'
      })

      if (session) {
        const userProfile = await getCurrentUser()
        if (userProfile) {
          setUser(userProfile)
          Taro.showToast({title: '登录成功', icon: 'success'})

          // 检查是否有重定向路径
          const redirectPath = Taro.getStorageSync('loginRedirectPath')
          if (redirectPath) {
            Taro.removeStorageSync('loginRedirectPath')
            const tabBarPages = ['pages/courses/index', 'pages/my-bookings/index', 'pages/profile/index']
            if (tabBarPages.includes(redirectPath)) {
              setTimeout(() => {
                Taro.switchTab({url: `/${redirectPath}`})
              }, 500)
            } else {
              setTimeout(() => {
                Taro.navigateTo({url: `/${redirectPath}`})
              }, 500)
            }
          } else {
            setTimeout(() => {
              Taro.switchTab({url: '/pages/courses/index'})
            }, 500)
          }
        }
      }
    } catch (error) {
      console.error('微信登录错误:', error)
      Taro.showToast({title: '登录失败，请稍后重试', icon: 'none'})
    } finally {
      setWechatLoading(false)
    }
  }

  return (
    <View className="min-h-screen bg-gradient-bg flex flex-col items-center justify-center p-6 relative">
      {/* 返回按钮 - 仅在有历史记录时显示 */}
      <View
        className="absolute top-6 left-6 w-10 h-10 bg-card rounded-full flex items-center justify-center shadow-md"
        onClick={() => {
          const pages = Taro.getCurrentPages()
          if (pages.length > 1) {
            Taro.navigateBack()
          }
        }}>
        <View className="i-mdi-arrow-left text-foreground text-2xl" />
      </View>

      <View className="w-full max-w-md">
        {/* Logo区域 */}
        <View className="flex flex-col items-center mb-12">
          <View className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mb-4 shadow-elegant">
            <View className="i-mdi-basketball text-5xl text-white" />
          </View>
          <Text className="text-3xl font-bold gradient-text mb-2">体育课预约</Text>
          <Text className="text-muted-foreground text-sm">健康生活，从运动开始</Text>
        </View>

        {/* 登录表单 */}
        <View className="bg-card rounded-2xl p-6 shadow-elegant mb-4">
          <Text className="text-lg font-semibold text-foreground mb-6">登录 / 注册</Text>

          <View className="mb-4">
            <Text className="text-sm text-muted-foreground mb-2">用户名</Text>
            <View className="bg-input rounded-xl border border-border px-4 py-3">
              <Input
                className="w-full text-foreground"
                style={{padding: 0, border: 'none', background: 'transparent'}}
                placeholder="请输入用户名"
                placeholderClass="text-muted-foreground"
                value={username}
                onInput={(e) => setUsername(e.detail.value)}
              />
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-sm text-muted-foreground mb-2">密码</Text>
            <View className="bg-input rounded-xl border border-border px-4 py-3">
              <Input
                className="w-full text-foreground"
                style={{padding: 0, border: 'none', background: 'transparent'}}
                password
                placeholder="请输入密码"
                placeholderClass="text-muted-foreground"
                value={password}
                onInput={(e) => setPassword(e.detail.value)}
              />
            </View>
          </View>

          <View className="flex items-center gap-2 mb-6" onClick={() => setAgreed(!agreed)}>
            <View
              className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                agreed ? 'bg-primary border-primary' : 'border-border'
              }`}>
              {agreed && <View className="i-mdi-check text-white text-sm" />}
            </View>
            <Text className="text-xs text-muted-foreground">我已阅读并同意《用户协议》和《隐私政策》</Text>
          </View>

          <Button
            className="w-full bg-primary text-white py-4 rounded-xl break-keep text-base font-semibold"
            size="default"
            onClick={loading ? undefined : handleLogin}>
            {loading ? '登录中...' : '登录 / 注册'}
          </Button>
        </View>

        {/* 微信登录 */}
        <View className="bg-card rounded-2xl p-6 shadow-elegant">
          <View className="flex items-center gap-2 mb-4">
            <View className="flex-1 h-px bg-border" />
            <Text className="text-xs text-muted-foreground">其他登录方式</Text>
            <View className="flex-1 h-px bg-border" />
          </View>

          <Button
            className="w-full bg-success text-white py-4 rounded-xl break-keep text-base font-semibold flex items-center justify-center gap-2"
            size="default"
            onClick={wechatLoading ? undefined : handleWechatLogin}>
            <View className="i-mdi-wechat text-xl" />
            {wechatLoading ? '登录中...' : '微信授权登录'}
          </Button>

          <Text className="text-xs text-muted-foreground text-center mt-3">仅支持微信小程序环境</Text>
        </View>
      </View>
    </View>
  )
}
