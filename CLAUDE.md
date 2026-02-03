# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

미니멀 감성 블로그 (Visual Diary). PostgreSQL(Supabase)에 게시글을 저장하고, 다크모드를 지원하는 SPA 블로그입니다.

## 개발 명령어

```bash
# 로컬 개발 서버 실행 (http://localhost:3000)
npm run dev

# API 테스트
curl http://localhost:3000/api/posts
curl http://localhost:3000/api/posts/1
```

## 아키텍처

```
브라우저 ──→ public/index.html (HTML + Tailwind CSS + 인라인 JS)
    │
    └──→ /api/* ──→ api/index.js (Express) ──→ PostgreSQL (pg Pool)
```

### 핵심 파일

| 파일 | 역할 |
|------|------|
| `api/index.js` | Express API 서버 (Vercel 서버리스 함수) |
| `public/index.html` | 프론트엔드 전체 (HTML + Tailwind CSS + JS 인라인) |
| `server.js` | 로컬 개발용 서버 래퍼 |

### 프론트엔드 구조 (public/index.html 내 인라인 JS)

SPA 방식으로 DOM을 show/hide하여 뷰를 전환합니다.

| 뷰 ID | 설명 |
|-------|------|
| `home-view` | 메인 페이지 (게시글 목록) |
| `post-view` | 게시글 상세 페이지 |
| `write-view` | 글쓰기 폼 |

주요 함수:
- `showHome()`, `showPost(id)`, `showWrite()`: 뷰 전환
- `fetchPosts()`, `fetchPost(id)`, `createPost(data)`: API 호출
- `renderPostList(posts)`, `renderPostDetail(post)`: DOM 렌더링
- `updateTheme(isDark)`: 다크/라이트 모드 토글

### API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/posts` | 게시글 목록 (`?page=1&limit=10`) |
| GET | `/api/posts/:id` | 게시글 상세 + 조회수 증가 |
| POST | `/api/posts` | 게시글 생성 |
| PUT | `/api/posts/:id` | 게시글 수정 |
| DELETE | `/api/posts/:id` | 게시글 삭제 |

### DB 스키마 (자동 생성)

```sql
posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT DEFAULT '',
  thumbnail TEXT,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

- `ensureSchema()`: 서버 시작 시 posts 테이블 자동 생성
- 파라미터 플레이스홀더 `$1, $2` 사용 (SQL 인젝션 방지)

## 환경 변수 (.env)

```env
DATABASE_URL=postgresql://...   # Supabase PostgreSQL 연결 문자열
PORT=3000                       # 로컬 개발 포트
```

## 배포

Vercel 서버리스 배포 (`vercel.json`)
- `/api/*` → `api/index.js`
- 그 외 → `public/index.html`
