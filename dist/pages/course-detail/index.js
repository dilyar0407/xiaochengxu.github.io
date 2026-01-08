Page({
  data: {
    course: null,
    courseId: ''
  },

  onLoad(options) {
    const courseId = options.id || '1'
    this.setData({courseId})
    this.loadCourseDetail(courseId)
  },

  loadCourseDetail(courseId) {
    // 模拟加载课程详情
    const courseData = {
      '1': {
        name: '瑜伽基础课程',
        sport_type: '瑜伽',
        description: '本课程适合初学者，通过专业指导，帮助学员掌握瑜伽的基本体式和呼吸方法，提高身体柔韧性和平衡能力。',
        start_time: '2026-01-06T09:00:00',
        end_time: '2026-01-06T10:00:00',
        location: '健身房A区',
        teacher: '张老师',
        total_slots: 20,
        booked_slots: 12,
        image_url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
        requirements: '请穿着舒适的运动服装，建议带瑜伽垫',
        price: '免费'
      },
      '2': {
        name: '有氧健身操',
        sport_type: '健身操',
        description: '充满活力的有氧健身操课程，通过动感的音乐和简单的动作，帮助学员燃烧脂肪，塑造完美身材。',
        start_time: '2026-01-06T10:30:00',
        end_time: '2026-01-06T11:30:00',
        location: '健身房B区',
        teacher: '李老师',
        total_slots: 15,
        booked_slots: 15,
        image_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
        requirements: '请穿着运动鞋和宽松的运动服装',
        price: '免费'
      },
      '3': {
        name: '游泳初级班',
        sport_type: '游泳',
        description: '适合游泳初学者的基础课程，教授正确的游泳姿势和技巧，让学员快速学会游泳。',
        start_time: '2026-01-06T14:00:00',
        end_time: '2026-01-06T15:00:00',
        location: '游泳馆',
        teacher: '王老师',
        total_slots: 10,
        booked_slots: 2,
        image_url: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&q=80',
        requirements: '请自备泳衣和泳帽，泳镜建议自备',
        price: '免费'
      }
    }

    const course = courseData[courseId] || courseData['1']

    const startTime = this.formatTime(course.start_time)
    const endTime = this.formatTime(course.end_time)
    const slotStatus = this.getSlotStatus(course)

    this.setData({
      course: {
        ...course,
        startTimeFormatted: startTime,
        endTimeFormatted: endTime,
        slotStatusText: slotStatus.text,
        slotStatusColor: slotStatus.color,
        slotStatusBgColor: slotStatus.bgColor
      }
    })
  },

  formatTime(dateStr) {
    const date = new Date(dateStr)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours().toString().padStart(2, '0')
    const minute = date.getMinutes().toString().padStart(2, '0')
    return `${month}月${day}日 ${hour}:${minute}`
  },

  getSlotStatus(course) {
    const remaining = course.total_slots - course.booked_slots
    if (remaining === 0) {
      return {text: '已满员', color: '#999999', bgColor: '#f5f5f5'}
    }
    if (remaining <= 3) {
      return {text: `仅剩${remaining}个名额`, color: '#ff6b00', bgColor: '#fff7e6'}
    }
    return {text: `剩余${remaining}个名额`, color: '#52c41a', bgColor: '#f6ffed'}
  },

  handleBooking() {
    if (!this.data.course) return

    const remaining = this.data.course.total_slots - this.data.course.booked_slots
    if (remaining === 0) {
      wx.showToast({
        title: '课程已满员',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '确认预约',
      content: `确定要预约"${this.data.course.name}"吗？`,
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '预约中...'
          })

          // 模拟预约
          setTimeout(() => {
            wx.hideLoading()

            // 获取现有预约列表
            let bookings = wx.getStorageSync('userBookings') || []

            // 检查是否已预约
            const alreadyBooked = bookings.find(b => b.course.id === this.data.courseId)
            if (alreadyBooked) {
              wx.showToast({
                title: '您已预约过此课程',
                icon: 'none'
              })
              return
            }

            // 添加新预约
            const newBooking = {
              id: 'booking_' + Date.now(),
              course: {
                ...this.data.course
              },
              status: 'confirmed',
              created_at: new Date().toISOString()
            }

            bookings.unshift(newBooking)
            wx.setStorageSync('userBookings', bookings)

            wx.showToast({
              title: '预约成功',
              icon: 'success'
            })

            // 延迟跳转
            setTimeout(() => {
              wx.navigateBack()
            }, 1500)
          }, 1000)
        }
      }
    })
  }
})
