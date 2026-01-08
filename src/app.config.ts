const pages = [
  'pages/courses/index',
  'pages/my-bookings/index',
  'pages/profile/index',
  'pages/login/index',
  'pages/course-detail/index'
]

//  To fully leverage TypeScript's type safety and ensure its correctness, always enclose the configuration object within the global defineAppConfig helper function.
export default defineAppConfig({
  pages,
  tabBar: {
    color: '#8B8B8B',
    selectedColor: '#FF6B35',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/courses/index',
        text: '课程',
        iconPath: './assets/images/unselected/courses.png',
        selectedIconPath: './assets/images/selected/courses.png'
      },
      {
        pagePath: 'pages/my-bookings/index',
        text: '我的预约',
        iconPath: './assets/images/unselected/bookings.png',
        selectedIconPath: './assets/images/selected/bookings.png'
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: './assets/images/unselected/profile.png',
        selectedIconPath: './assets/images/selected/profile.png'
      }
    ]
  },
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#FFFFFF',
    navigationBarTitleText: '体育课预约',
    navigationBarTextStyle: 'black'
  }
})
