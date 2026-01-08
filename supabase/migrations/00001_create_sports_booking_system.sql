/*
# 创建体育课预约系统数据库

## 1. 新建表

### profiles 表
- `id` (uuid, 主键, 引用 auth.users)
- `username` (text, 唯一)
- `email` (text)
- `phone` (text)
- `openid` (text) - 微信openid，不设置唯一约束以支持同一微信用户多账号
- `nickname` (text)
- `avatar_url` (text)
- `role` (user_role, 默认: 'user')
- `created_at` (timestamptz, 默认: now())

### courses 表
- `id` (uuid, 主键)
- `name` (text, 课程名称)
- `sport_type` (text, 运动类型：篮球、羽毛球、瑜伽、游泳、网球、健身)
- `teacher` (text, 授课老师)
- `location` (text, 上课地点)
- `start_time` (timestamptz, 开始时间)
- `end_time` (timestamptz, 结束时间)
- `total_slots` (integer, 总名额)
- `booked_slots` (integer, 已预约名额, 默认: 0)
- `image_url` (text, 课程图片)
- `description` (text, 课程描述)
- `booking_deadline` (timestamptz, 预约截止时间)
- `created_at` (timestamptz, 默认: now())

### bookings 表
- `id` (uuid, 主键)
- `user_id` (uuid, 引用 profiles.id)
- `course_id` (uuid, 引用 courses.id)
- `status` (text, 状态：pending/confirmed/cancelled/completed)
- `created_at` (timestamptz, 默认: now())
- `cancelled_at` (timestamptz, 取消时间)

## 2. 安全策略
- profiles表：公开数据，不启用RLS，管理员可修改用户角色
- courses表：公开数据，所有人可查看，不启用RLS
- bookings表：公开数据，所有人可查看所有预约记录，不启用RLS

## 3. RPC函数
- `is_admin`: 检查用户是否为管理员
- `book_course`: 预约课程（原子操作，检查名额并创建预约）
- `cancel_booking`: 取消预约（原子操作，释放名额）

## 4. 触发器
- `handle_new_user`: 用户确认后自动同步到profiles表，第一个用户为管理员
*/

-- 创建用户角色枚举
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- 创建profiles表
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  email text,
  phone text,
  openid text,
  nickname text,
  avatar_url text,
  role user_role DEFAULT 'user'::user_role NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 创建courses表
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sport_type text NOT NULL,
  teacher text NOT NULL,
  location text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  total_slots integer NOT NULL CHECK (total_slots > 0),
  booked_slots integer DEFAULT 0 CHECK (booked_slots >= 0),
  image_url text,
  description text,
  booking_deadline timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 创建bookings表
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at timestamptz DEFAULT now(),
  cancelled_at timestamptz,
  UNIQUE(user_id, course_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_courses_sport_type ON courses(sport_type);
CREATE INDEX IF NOT EXISTS idx_courses_start_time ON courses(start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_course_id ON bookings(course_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- 创建管理员检查函数
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = uid AND p.role = 'admin'::user_role
  );
$$;

-- 创建用户同步触发器函数
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count int;
BEGIN
  SELECT COUNT(*) INTO user_count FROM profiles;
  
  INSERT INTO public.profiles (id, username, email, phone, openid, nickname, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'username')::text, NULL),
    NEW.email,
    NEW.phone,
    COALESCE((NEW.raw_user_meta_data->>'openid')::text, NULL),
    COALESCE((NEW.raw_user_meta_data->>'nickname')::text, NULL),
    COALESCE((NEW.raw_user_meta_data->>'avatar_url')::text, NULL),
    CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'user'::public.user_role END
  );
  
  RETURN NEW;
END;
$$;

-- 创建触发器
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL)
  EXECUTE FUNCTION handle_new_user();

-- 创建预约课程RPC函数
CREATE OR REPLACE FUNCTION book_course(p_user_id uuid, p_course_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_course courses%ROWTYPE;
  v_existing_booking bookings%ROWTYPE;
  v_booking_id uuid;
BEGIN
  -- 检查课程是否存在
  SELECT * INTO v_course FROM courses WHERE id = p_course_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', '课程不存在');
  END IF;
  
  -- 检查是否已预约
  SELECT * INTO v_existing_booking FROM bookings 
  WHERE user_id = p_user_id AND course_id = p_course_id AND status IN ('confirmed', 'pending');
  IF FOUND THEN
    RETURN json_build_object('success', false, 'message', '您已预约过此课程');
  END IF;
  
  -- 检查预约截止时间
  IF now() > v_course.booking_deadline THEN
    RETURN json_build_object('success', false, 'message', '预约已截止');
  END IF;
  
  -- 检查名额
  IF v_course.booked_slots >= v_course.total_slots THEN
    RETURN json_build_object('success', false, 'message', '名额已满');
  END IF;
  
  -- 创建预约并更新名额
  INSERT INTO bookings (user_id, course_id, status)
  VALUES (p_user_id, p_course_id, 'confirmed')
  RETURNING id INTO v_booking_id;
  
  UPDATE courses SET booked_slots = booked_slots + 1 WHERE id = p_course_id;
  
  RETURN json_build_object('success', true, 'message', '预约成功', 'booking_id', v_booking_id);
END;
$$;

-- 创建取消预约RPC函数
CREATE OR REPLACE FUNCTION cancel_booking(p_booking_id uuid, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking bookings%ROWTYPE;
  v_course courses%ROWTYPE;
BEGIN
  -- 获取预约信息
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', '预约不存在');
  END IF;
  
  -- 检查预约状态
  IF v_booking.status = 'cancelled' THEN
    RETURN json_build_object('success', false, 'message', '预约已取消');
  END IF;
  
  IF v_booking.status = 'completed' THEN
    RETURN json_build_object('success', false, 'message', '课程已完成，无法取消');
  END IF;
  
  -- 获取课程信息
  SELECT * INTO v_course FROM courses WHERE id = v_booking.course_id FOR UPDATE;
  
  -- 检查是否超过预约截止时间
  IF now() > v_course.booking_deadline THEN
    RETURN json_build_object('success', false, 'message', '已超过预约截止时间，无法取消');
  END IF;
  
  -- 取消预约并释放名额
  UPDATE bookings SET status = 'cancelled', cancelled_at = now() WHERE id = p_booking_id;
  UPDATE courses SET booked_slots = GREATEST(booked_slots - 1, 0) WHERE id = v_booking.course_id;
  
  RETURN json_build_object('success', true, 'message', '取消成功');
END;
$$;

-- 插入初始课程数据
INSERT INTO courses (name, sport_type, teacher, location, start_time, end_time, total_slots, booked_slots, image_url, description, booking_deadline) VALUES
('篮球基础班', '篮球', '张教练', '体育馆A区', now() + interval '2 days', now() + interval '2 days' + interval '2 hours', 20, 5, 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_59c27497-6529-45d6-873d-7fb880bd96ce.jpg', '适合零基础学员，学习篮球基本技巧和规则', now() + interval '1 day'),
('篮球进阶班', '篮球', '张教练', '体育馆A区', now() + interval '4 days', now() + interval '4 days' + interval '2 hours', 15, 8, 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_59c27497-6529-45d6-873d-7fb880bd96ce.jpg', '提升篮球技术，学习战术配合', now() + interval '3 days'),
('羽毛球初级班', '羽毛球', '李教练', '羽毛球馆1号场', now() + interval '1 day', now() + interval '1 day' + interval '1.5 hours', 16, 10, 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_73a7e393-401a-4b05-ae2d-c218702a971b.jpg', '羽毛球入门课程，掌握基本动作要领', now() + interval '12 hours'),
('羽毛球提高班', '羽毛球', '李教练', '羽毛球馆2号场', now() + interval '5 days', now() + interval '5 days' + interval '1.5 hours', 12, 6, 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_73a7e393-401a-4b05-ae2d-c218702a971b.jpg', '提升羽毛球技术，学习高级技巧', now() + interval '4 days'),
('瑜伽舒缓课', '瑜伽', '王老师', '瑜伽室B区', now() + interval '1 day', now() + interval '1 day' + interval '1 hour', 25, 15, 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_cb123e8b-a271-460a-8cb5-9a9655290952.jpg', '放松身心，缓解压力，适合所有人群', now() + interval '18 hours'),
('瑜伽塑形课', '瑜伽', '王老师', '瑜伽室A区', now() + interval '3 days', now() + interval '3 days' + interval '1 hour', 20, 12, 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_cb123e8b-a271-460a-8cb5-9a9655290952.jpg', '塑造完美体型，提升身体柔韧性', now() + interval '2 days'),
('游泳入门课', '游泳', '赵教练', '游泳馆深水区', now() + interval '2 days', now() + interval '2 days' + interval '1 hour', 10, 7, 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_fb31db43-c776-43c9-bb57-4cc97b20ef71.jpg', '学习游泳基本技能，克服水性恐惧', now() + interval '1 day'),
('游泳提高课', '游泳', '赵教练', '游泳馆标准池', now() + interval '6 days', now() + interval '6 days' + interval '1 hour', 8, 3, 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_fb31db43-c776-43c9-bb57-4cc97b20ef71.jpg', '提升游泳技术，学习多种泳姿', now() + interval '5 days'),
('网球基础课', '网球', '刘教练', '网球场3号场地', now() + interval '3 days', now() + interval '3 days' + interval '2 hours', 12, 4, 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_fcfa8746-997b-464a-8496-c543e16400a1.jpg', '网球入门，学习正反手击球技术', now() + interval '2 days'),
('网球实战课', '网球', '刘教练', '网球场1号场地', now() + interval '7 days', now() + interval '7 days' + interval '2 hours', 10, 5, 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_fcfa8746-997b-464a-8496-c543e16400a1.jpg', '实战演练，提升比赛技巧', now() + interval '6 days'),
('健身塑形课', '健身', '陈教练', '健身房力量区', now() + interval '1 day', now() + interval '1 day' + interval '1.5 hours', 18, 9, 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_cdecd62c-ec9a-4120-887f-9c726dc0f541.jpg', '科学健身，塑造完美身材', now() + interval '12 hours'),
('健身增肌课', '健身', '陈教练', '健身房器械区', now() + interval '4 days', now() + interval '4 days' + interval '1.5 hours', 15, 7, 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_cdecd62c-ec9a-4120-887f-9c726dc0f541.jpg', '专业增肌训练，打造强健体魄', now() + interval '3 days');
