# Daily Work Log

一个基于 HTML、CSS 和原生 JavaScript 的多语言工作日志应用，使用 Supabase 提供用户认证、数据库和头像存储服务。

## 功能介绍

- 邮箱和密码注册、登录、退出及密码重置。
- 工作日志的创建、查看、编辑和删除。
- 工作日志仪表盘、状态汇总及按日期查看。
- 用户昵称和头像管理。
- 工作日志详情预览，以及完成日志后导出 PDF。
- 韩文、中文和英文混合界面。

## 目录结构

```text
.
├── index.html                    # 主应用页面：登录、仪表盘、日志列表、编辑和报告
├── app.js                        # 主应用逻辑及 Supabase 数据访问
├── style.css                     # 页面样式和响应式布局
├── reset-password.html           # 密码重置页面
├── reset-password.js             # 密码重置和 Supabase 初始化逻辑
├── login-office-illustration.png # 登录页插图
└── assets/
    └── login-illustration-hd.png # 登录页使用的高清插图
```

应用通过 CDN 加载 Supabase JS、html2canvas 和 jsPDF；当前仓库没有 npm 构建脚本，也没有 Supabase CLI 配置或数据库迁移文件。

## 本地运行

### 环境要求

- Python 3，或 VS Code 的 Live Server 扩展。
- 如需运行本地 Supabase：Docker Desktop 和 Supabase CLI。
- Supabase CLI 可通过 `npx` 运行；需要已安装 Node.js 和 npm。

### 运行前端

在项目根目录启动静态 HTTP 服务：

```powershell
py -m http.server 5501
```

然后访问：

- 主应用：<http://localhost:5501/>
- 密码重置页：<http://localhost:5501/reset-password.html>

也可以使用 VS Code Live Server；仓库的编辑器设置将其端口设为 `5501`。

### 启动本地 Supabase

1. 在项目根目录初始化 Supabase 配置并启动本地服务：

   ```powershell
   npx supabase@latest init
   npx supabase@latest start
   ```

   首次启动会下载所需容器镜像。Supabase Studio 和本地 API 地址会在命令输出中列出。

2. 创建数据库迁移：

   ```powershell
   npx supabase@latest migration new initial_schema
   ```

   将下方“数据库表和 RLS 示例”中的 SQL 放入新生成的 `supabase/migrations/<时间戳>_initial_schema.sql` 文件。

3. 应用迁移并查看本地连接信息：

   ```powershell
   npx supabase@latest db reset
   npx supabase@latest status
   ```

4. 在 `app.js` 和 `reset-password.js` 中，将 `SUPABASE_URL` 与 `SUPABASE_ANON_KEY` 分别替换为 `status` 输出的本地 API URL 和 anon/publishable key。两个文件必须指向同一个 Supabase 项目。不要将 `service_role` key 放入前端代码。

5. 在 Supabase Auth 的 URL 配置中允许本地前端地址（例如 `http://localhost:5501` 和 `http://127.0.0.1:5501`），并将密码重置地址加入允许的重定向地址。运行注册和重置密码流程时，可在本地 Supabase 输出中查看 Inbucket 邮件测试服务地址。

本仓库目前没有 `supabase/` 配置和迁移；执行 `init` 会在项目根目录创建它们。若只想使用现有云端 Supabase 项目，无需启动本地 Supabase，直接启动静态前端即可。

## 数据库表和 RLS 示例

应用会访问 `public.users`、`public.work_logs` 两张表和名为 `avatars` 的 Storage bucket。以下 SQL 是适用于个人日志的最小权限示例：用户只能读写自己的资料和日志。应用界面虽然提供“全部日志”列表，但启用此策略后，API 只会返回当前用户自己的日志。

```sql
create table public.users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  avatar_url text,
  updated_at timestamptz not null default now()
);

create table public.work_logs (
  id uuid primary key default gen_random_uuid(),
  author text not null,
  user_id uuid not null references public.users (user_id) on delete cascade,
  date date,
  status text not null default '진행 중',
  assigned_work text not null default '',
  completed_work text not null default '',
  unfinished_work text not null default '',
  learning text not null default '',
  tomorrow_plan text not null default '',
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.work_logs enable row level security;

grant select, insert, update on public.users to authenticated;
grant select, insert, update, delete on public.work_logs to authenticated;

create policy "Users can read their own profile"
  on public.users for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create their own profile"
  on public.users for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own profile"
  on public.users for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can read their own work logs"
  on public.work_logs for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create their own work logs"
  on public.work_logs for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own work logs"
  on public.work_logs for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their own work logs"
  on public.work_logs for delete to authenticated
  using (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

create policy "Anyone can view public avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload avatars to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can update avatars in their own folder"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can delete avatars in their own folder"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
```

### RLS 配置说明

- **先启用 RLS，再授权访问。** 授予 `authenticated` 的 SQL 权限并不会绕过 RLS；每个操作仍必须通过对应策略。
- `USING` 限制可读取、更新或删除的现有行；`WITH CHECK` 限制插入或更新后允许保存的行。用 `auth.uid()` 与 `user_id` 比较，可以阻止用户伪造他人的记录归属。
- 用户资料的 `user_id` 对应 Supabase Auth 用户 ID；日志的 `user_id` 也关联该资料。应用会在用户首次登录时创建资料。
- 头像 bucket 设置为公开，任何人都可以读取头像图片；上传、替换和删除仅允许操作对象路径以当前用户 ID 开头的文件。不要在公开 bucket 中放置敏感文件。
- 如果产品需要登录用户共同查看所有日志，可另行增加“所有已登录用户可 `SELECT` 日志”的策略，并为日志作者资料增加相应的只读策略。此配置会向所有登录用户公开日志正文；不要在未确认数据共享范围时直接开放。

> 不要在浏览器代码中使用 `service_role` 密钥。它可以绕过 RLS，只能保存在受信任的服务端环境中。
