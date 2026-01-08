App({
  globalData: {
    userInfo: null
  },

  onLaunch() {
    console.log('App Launch')
    this.checkLoginStatus()
  },

  onShow() {
    console.log('App Show')
  },

  onHide() {
    console.log('App Hide')
  },

  // 检查登录状态
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo')

    // 检查是否是旧的头像URL（thirdwx），如果是则清除存储
    if (userInfo && userInfo.avatarUrl && userInfo.avatarUrl.includes('thirdwx.qlogo.cn')) {
      wx.removeStorageSync('userInfo')
      wx.reLaunch({
        url: '/pages/login/index'
      })
      return
    }

    if (!userInfo) {
      // 未登录，跳转到登录页
      wx.reLaunch({
        url: '/pages/login/index'
      })
    } else {
      // 已登录，保存到全局数据
      this.globalData.userInfo = userInfo
    }
  },

  // 保存用户信息
  setUserInfo(userInfo) {
    this.globalData.userInfo = userInfo
    wx.setStorageSync('userInfo', userInfo)
  },

  // 获取用户信息
  getUserInfo() {
    return this.globalData.userInfo
  },

  // 清除用户信息（退出登录）
  clearUserInfo() {
    this.globalData.userInfo = null
    wx.removeStorageSync('userInfo')
  }
})
