Page({
  data: {
    loading: false
  },

  onLoad() {
    console.log('登录页面加载')

    // 如果已经登录，直接跳转到首页
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      wx.switchTab({
        url: '/pages/courses/index'
      })
    }
  },

  handleWechatLogin() {
    wx.showLoading({
      title: '登录中...'
    })

    // 模拟微信登录流程
    setTimeout(() => {
      wx.hideLoading()

      // 模拟获取用户信息
      const userInfo = {
        id: 'user_' + Date.now(),
        nickName: '微信用户',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wechat',
        openId: 'oXXXXXX',
        createTime: new Date().toISOString()
      }

      // 保存用户信息到本地存储和全局数据
      wx.setStorageSync('userInfo', userInfo)
      const app = getApp()
      if (app) {
        app.setUserInfo(userInfo)
      }

      wx.showToast({
        title: '登录成功',
        icon: 'success',
        duration: 1500
      })

      // 延迟跳转，让用户看到成功提示
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/courses/index'
        })
      }, 500)
    }, 1500)
  }
})
