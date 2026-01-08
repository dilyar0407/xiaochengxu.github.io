Page({
  data: {
    allCourses: [
      {
        id: '1',
        name: '瑜伽基础课程',
        sport_type: '瑜伽',
        start_time: '2026-01-06T09:00:00',
        end_time: '2026-01-06T10:00:00',
        location: '健身房A区',
        teacher: '张老师',
        image_url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
        total_slots: 20,
        booked_slots: 12
      },
      {
        id: '2',
        name: '有氧健身操',
        sport_type: '健身操',
        start_time: '2026-01-06T10:30:00',
        end_time: '2026-01-06T11:30:00',
        location: '健身房B区',
        teacher: '李老师',
        image_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
        total_slots: 15,
        booked_slots: 15
      },
      {
        id: '3',
        name: '游泳初级班',
        sport_type: '游泳',
        start_time: '2026-01-06T14:00:00',
        end_time: '2026-01-06T15:00:00',
        location: '游泳馆',
        teacher: '王老师',
        image_url: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&q=80',
        total_slots: 10,
        booked_slots: 2
      },
      {
        id: '4',
        name: '羽毛球入门',
        sport_type: '羽毛球',
        start_time: '2026-01-06T16:00:00',
        end_time: '2026-01-06T17:00:00',
        location: '体育馆二楼',
        teacher: '陈教练',
        image_url: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800&q=80',
        total_slots: 18,
        booked_slots: 5
      },
      {
        id: '5',
        name: '篮球训练课',
        sport_type: '篮球',
        start_time: '2026-01-07T09:00:00',
        end_time: '2026-01-07T10:30:00',
        location: '篮球场1号',
        teacher: '刘教练',
        image_url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80',
        total_slots: 25,
        booked_slots: 20
      },
      {
        id: '6',
        name: '动感单车',
        sport_type: '有氧运动',
        start_time: '2026-01-07T11:00:00',
        end_time: '2026-01-07T12:00:00',
        location: '有氧教室',
        teacher: '周教练',
        image_url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
        total_slots: 12,
        booked_slots: 10
      },
      {
        id: '7',
        name: '普拉提',
        sport_type: '普拉提',
        start_time: '2026-01-07T14:30:00',
        end_time: '2026-01-07T15:30:00',
        location: '瑜伽室',
        teacher: '赵老师',
        image_url: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80',
        total_slots: 15,
        booked_slots: 8
      },
      {
        id: '8',
        name: '网球基础',
        sport_type: '网球',
        start_time: '2026-01-08T10:00:00',
        end_time: '2026-01-08T11:30:00',
        location: '网球场A区',
        teacher: '孙教练',
        image_url: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80',
        total_slots: 10,
        booked_slots: 7
      },
      {
        id: '9',
        name: '拳击体验课',
        sport_type: '拳击',
        start_time: '2026-01-08T15:00:00',
        end_time: '2026-01-08T16:00:00',
        location: '搏击馆',
        teacher: '钱教练',
        image_url: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&q=80',
        total_slots: 12,
        booked_slots: 11
      }
    ],
    courses: [],
    sportTypes: ['全部', '瑜伽', '健身操', '游泳', '羽毛球', '篮球', '有氧运动', '普拉提', '网球', '拳击'],
    selectedType: '全部'
  },
  onLoad() {
    console.log('课程页面加载')
    this.filterCourses('全部')
  },

  filterCourses(type) {
    let filteredCourses = this.data.allCourses

    if (type !== '全部') {
      filteredCourses = this.data.allCourses.filter(course => course.sport_type === type)
    }

    const processedCourses = filteredCourses.map(course => {
      const startTime = this.formatTime(course.start_time)
      const endTime = this.formatTime(course.end_time)
      const slotStatus = this.getSlotStatus(course)
      return {
        ...course,
        startTimeFormatted: startTime,
        endTimeFormatted: endTime,
        slotStatusText: slotStatus.text,
        slotStatusColor: slotStatus.color,
        slotStatusBgColor: slotStatus.bgColor
      }
    })

    this.setData({
      selectedType: type,
      courses: processedCourses
    })
  },

  handleFilterChange(e) {
    const type = e.currentTarget.dataset.type
    this.filterCourses(type)
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

  goToDetail(e) {
    const courseId = e.currentTarget.dataset.id
    wx.navigateTo({url: `/pages/course-detail/index?id=${courseId}`})
  },

  handleDetailClick(e) {
    const courseId = e.currentTarget.dataset.id
    wx.navigateTo({url: `/pages/course-detail/index?id=${courseId}`})
  }
})
