# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

날씨에 따라 테마 색상이 동적으로 변하는 감성 블로그 (SPA). Open-Meteo API로 날씨를 가져오고, PostgreSQL(Supabase)에 게시글을 저장합니다.

## 개발 명령어

```bash
# 로컬 개발 서버 실행
npm run dev

# API 테스트
curl http://localhost:3000/api/posts
curl http://localhost:3000/api/weather
```

## 아키텍처

```
브라우저 ──→ public/index.html + client.js (SPA)
    │
    ├──→ Open-Meteo API (클라이언트에서 직접 호출, 날씨/테마)
    │
    └──→ /api/* ──→ api/index.js (Express) ──→ PostgreSQL (pg Pool)
```

### 핵심 파일

| 파일 | 역할 |
|------|------|
| `api/index.js` | Express API 서버 (Vercel 서버리스 함수) |
| `client.js` | 프론트엔드 SPA 로직 (API, ThemeManager, UI, Router) |
| `public/index.html` | HTML + Tailwind CSS 스타일 |
| `server.js` | 로컬 개발용 서버 래퍼 |

### DB 연결 (pg Pool)

```javascript
// api/index.js - PostgreSQL 직접 연결
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
```

- `ensureSchema()`: 서버 시작 시 posts 테이블 자동 생성
- 파라미터 플레이스홀더 `$1, $2` 사용 (SQL 인젝션 방지)

### 테마 시스템

날씨 코드 → CSS 변수 (`--primary-color`) → 전체 UI 색상 변경

```javascript
// client.js - ThemeManager
ThemeManager.loadWeatherTheme()  // 클라이언트에서 Open-Meteo API 직접 호출
ThemeManager.applyTheme(theme)   // CSS 변수 업데이트
```

## 환경 변수 (.env)

```env
DATABASE_URL=postgresql://...   # Supabase PostgreSQL 연결 문자열
PORT=3000                       # 로컬 개발 포트
```

## 배포

Vercel 서버리스 배포 (`vercel.json` 설정 완료)
- `/api/*` → `api/index.js`
- 그 외 → `public/index.html`
