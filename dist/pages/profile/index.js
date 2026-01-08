Page({
  data: {
    user: {
      id: '',
      name: '',
      avatar: ''
    }
  },

  onShow() {
    this.loadUserInfo()
  },

  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      // 检查是否是旧的头像URL，如果是则使用空值显示默认头像
      const avatarUrl = (userInfo.avatarUrl && !userInfo.avatarUrl.includes('thirdwx.qlogo.cn'))
        ? userInfo.avatarUrl
        : ''

      this.setData({
        user: {
          id: userInfo.id,
          name: userInfo.nickName,
          avatar: avatarUrl
        }
      })
    } else {
      // 未登录，跳转到登录页
      wx.reLaunch({
        url: '/pages/login/index'
      })
    }
  },

  onAvatarError() {
    // 头像加载失败，清除头像字段，显示默认头像
    this.setData({
      'user.avatar': ''
    })
  },

  goToMyBookings() {
    wx.switchTab({
      url: '/pages/my-bookings/index'
    })
  },

  handleLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      confirmText: '退出',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          // 清除用户信息
          wx.removeStorageSync('userInfo')

          const app = getApp()
          if (app) {
            app.clearUserInfo()
          }

          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })

          // 延迟跳转到登录页
          setTimeout(() => {
            wx.reLaunch({
              url: '/pages/login/index'
            })
          }, 500)
        }
      }
    })
  }
})
