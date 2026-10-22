# H-solutions

## Xác thực người dùng

Dự án dùng Auth.js cho tài khoản email/mật khẩu và OAuth/OIDC trực tiếp với
Google, Apple; không dùng Clerk. Mật khẩu được băm bằng `scrypt` với salt riêng
trước khi lưu.

1. Sao chép `.env.example` thành `.env.local`.
2. Chạy `npx auth secret` để tạo `AUTH_SECRET`.
3. Điền Google OAuth Client ID/Secret và thông tin Apple Developer.
4. Cấu hình redirect URI:

```text
Google: http://localhost:3000/api/auth/callback/google
Apple:  https://your-domain.com/api/auth/callback/apple
```

Apple không chấp nhận callback HTTP localhost cho web. Khi phát triển, dùng một
HTTPS tunnel hoặc domain staging.

Các endpoint Auth.js:

- `POST /api/auth/register` — đăng ký email/mật khẩu.
- `GET|POST /api/auth/signin`
- `GET|POST /api/auth/callback/google`
- `GET|POST /api/auth/callback/apple`
- `GET /api/auth/session`
- `POST /api/auth/signout`

Trong môi trường phát triển, tài khoản mật khẩu được lưu tại `data/users.json`
(file này bị Git bỏ qua). Khi triển khai nhiều instance/serverless, hãy thay
storage JSON bằng PostgreSQL, MySQL hoặc một database dùng chung.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Document

Tài liệu dự án [document] : https://drive.google.com/drive/folders/1rvveF241bVLx3-D2MhQdyXQZpDHB-w_s?usp=sharing
