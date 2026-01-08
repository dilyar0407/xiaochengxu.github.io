Page({
  data: {
    bookings: []
  },

  onLoad() {
    console.log('我的预约页面加载')
    this.loadBookings()
  },

  onShow() {
    // 每次显示页面时重新加载预约数据
    this.loadBookings()
  },

  loadBookings() {
    // 从本地存储获取预约数据
    const bookings = wx.getStorageSync('userBookings') || []

    // 如果没有预约数据，显示示例数据
    if (bookings.length === 0) {
      const demoBookings = [
        {
          id: '1',
          course: {
            id: '1',
            name: '瑜伽基础课程',
            sport_type: '瑜伽',
            start_time: '2026-01-06T09:00:00',
            end_time: '2026-01-06T10:00:00',
            location: '健身房A区',
            teacher: '张老师',
            total_slots: 20,
            booked_slots: 12
          },
          status: 'confirmed',
          created_at: '2026-01-05T10:00:00'
        },
        {
          id: '2',
          course: {
            id: '3',
            name: '游泳初级班',
            sport_type: '游泳',
            start_time: '2026-01-06T14:00:00',
            end_time: '2026-01-06T15:00:00',
            location: '游泳馆',
            teacher: '王老师',
            total_slots: 10,
            booked_slots: 2
          },
          status: 'confirmed',
          created_at: '2026-01-05T14:00:00'
        }
      ]
      this.processBookings(demoBookings)
    } else {
      this.processBookings(bookings)
    }
  },

  processBookings(bookings) {
    const processedBookings = bookings.map(booking => {
      const startTime = this.formatTime(booking.course.start_time)
      const endTime = this.formatTime(booking.course.end_time)
      return {
        ...booking,
        course: {
          ...booking.course,
          startTimeFormatted: startTime,
          endTimeFormatted: endTime
        }
      }
    })
    this.setData({bookings: processedBookings})
  },

  formatTime(dateStr) {
    const date = new Date(dateStr)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours().toString().padStart(2, '0')
    const minute = date.getMinutes().toString().padStart(2, '0')
    return `${month}月${day}日 ${hour}:${minute}`
  },

  goToCourseDetail(e) {
    const courseId = e.currentTarget.dataset.id
    wx.navigateTo({url: `/pages/course-detail/index?id=${courseId}`})
  },

  cancelBooking(e) {
    const bookingId = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认取消',
      content: '确定要取消这个预约吗？',
      confirmText: '取消预约',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '取消中...'
          })

          // 从本地存储中移除该预约
          setTimeout(() => {
            wx.hideLoading()

            // 获取当前预约列表
            let bookings = wx.getStorageSync('userBookings') || []
            // 过滤掉要取消的预约
            bookings = bookings.filter(item => item.id !== bookingId)
            // 更新本地存储
            wx.setStorageSync('userBookings', bookings)

            // 更新页面显示
            this.processBookings(bookings)

            wx.showToast({
              title: '取消成功',
              icon: 'success'
            })
          }, 1000)
        }
      }
    })
  }
})
