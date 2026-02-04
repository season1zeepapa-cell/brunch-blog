# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

**Brunch Blog** - 미니멀 감성 블로그. PostgreSQL(Supabase)에 게시글을 저장하고, 다크모드를 지원하는 SPA 블로그입니다. 게시글 CRUD(생성/조회/수정/삭제) 기능을 제공합니다.

## 기술 스택

- **프론트엔드:** HTML5, Tailwind CSS (CDN), Vanilla JS (ES6+), Pretendard 폰트
- **백엔드:** Node.js (>=18), Express.js 4.18
- **데이터베이스:** PostgreSQL (Supabase, pg 드라이버)
- **배포:** Vercel 서버리스

## 개발 명령어

```bash
# 로컬 개발 서버 실행 (http://localhost:3000)
npm run dev

# API 테스트 - 목록 조회
curl http://localhost:3000/api/posts

# API 테스트 - 상세 조회
curl http://localhost:3000/api/posts/1

# API 테스트 - 게시글 생성
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"제목","content":"내용","excerpt":"요약"}'

# API 테스트 - 게시글 수정
curl -X PUT http://localhost:3000/api/posts/1 \
  -H "Content-Type: application/json" \
  -d '{"title":"수정된 제목","content":"수정된 내용"}'

# API 테스트 - 게시글 삭제
curl -X DELETE http://localhost:3000/api/posts/1
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
- `showHome()`, `showPost(id)`, `showWrite()`, `showEdit()`: 뷰 전환
- `fetchPosts()`, `fetchPost(id)`, `createPost(data)`, `updatePost(id, data)`, `deletePost(id)`: API 호출
- `renderPostList()`, `renderPostDetail(post)`: DOM 렌더링
- `loadMorePosts()`: 게시글 더보기 (초기 3개, 클릭 시 2개씩 추가)
- `setUploadTab()`, `initDropZone()`, `handleFileSelect()`: 이미지 업로드 처리
- `confirmDelete(id)`: 삭제 확인 다이얼로그
- `updateTheme(isDark)`: 다크/라이트 모드 토글
- `escapeHtml(text)`: XSS 방지용 HTML 이스케이프

### 이미지 업로드 (Base64 방식)

썸네일 이미지는 Base64로 인코딩하여 DB의 `thumbnail` 컬럼에 직접 저장합니다.

- **업로드 방식:** 드래그 앤 드롭 또는 클릭으로 파일 선택
- **탭 UI:** 파일 업로드 / URL 입력 중 선택 가능
- **용량 제한:** JSON 본문 5MB 제한 (`express.json({ limit: '5mb' })`)
- **저장 형태:** `data:image/...;base64,...` 형식으로 저장

### 게시글 더보기

메인 페이지에서 게시글을 점진적으로 로드합니다.

- 초기 표시: 3개 (`INITIAL_COUNT`)
- 더보기 클릭: 2개씩 추가 (`LOAD_MORE_COUNT`)
- 상태 변수: `allPosts`, `displayedCount`

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
- 정적 파일 (js, css, 이미지) → `public/` 폴더
- 그 외 → `public/index.html` (SPA 라우팅)

```bash
# Vercel CLI로 배포
vercel

# 프로덕션 배포
vercel --prod
```
