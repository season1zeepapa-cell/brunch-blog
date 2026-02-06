/**
 * ================================================
 * 📝 브런치 블로그 - 백엔드 API (Vercel 서버리스 함수)
 * ================================================
 *
 * 이 파일은 모든 백엔드 엔드포인트를 정의합니다.
 * - /api/posts: 게시글 CRUD 작업
 *
 * DB 연결 방식: pg Pool (PostgreSQL 직접 연결)
 * Vercel 서버리스 규격: module.exports = app
 */

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');  // pg 라이브러리에서 Pool 가져오기

// ================================================
// 환경 설정
// ================================================
// dotenv는 로컬 환경에서만 사용 (Vercel은 환경변수 자동 주입)
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// Express 앱 생성
const app = express();

// ================================================
// 미들웨어 설정
// ================================================
app.use(cors());  // CORS 허용 - 다른 도메인에서의 요청 허용
// JSON 요청 본문 파싱 (Base64 이미지 데이터를 위해 5MB까지 허용)
app.use(express.json({ limit: '5mb' }));
app.use(express.static('public'));  // public 폴더의 정적 파일 제공

// ================================================
// PostgreSQL Pool 설정
// ================================================
// Pool은 여러 연결을 관리하는 연결 풀(Connection Pool)입니다
// 매번 새 연결을 만들지 않고, 미리 만들어둔 연결을 재사용하여 성능을 높입니다
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,  // 환경변수에서 연결 문자열 가져오기
  ssl: {
    rejectUnauthorized: false  // Supabase는 SSL 연결이 필요하지만, 인증서 검증은 비활성화
  }
});

// ================================================
// 스키마 자동 생성 함수
// ================================================
/**
 * ensureSchema()
 *
 * 서버 시작 시 posts 테이블이 없으면 자동으로 생성합니다.
 * 이렇게 하면 수동으로 마이그레이션을 실행하지 않아도 됩니다!
 */
async function ensureSchema() {
  const client = await pool.connect();  // 연결 풀에서 연결 하나 가져오기

  try {
    // posts 테이블 생성 (이미 존재하면 무시)
    await client.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        excerpt TEXT DEFAULT '',
        thumbnail TEXT,
        view_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ posts 테이블 스키마 확인 완료');
  } catch (error) {
    console.error('❌ 스키마 생성 에러:', error);
    throw error;
  } finally {
    client.release();  // 연결을 풀에 반납 (중요!)
  }
}

// 서버 시작 시 스키마 확인 (비동기 즉시 실행)
ensureSchema().catch(console.error);

// ================================================
// 🏥 헬스체크 엔드포인트 (Lightsail 배포용)
// ================================================
/**
 * GET /health
 *
 * 서버와 데이터베이스 연결 상태를 확인합니다.
 * - 로드 밸런서나 모니터링 도구가 이 엔드포인트를 호출하여 서버 상태를 확인합니다.
 * - DB 연결이 정상이면 'healthy', 문제가 있으면 'unhealthy'를 반환합니다.
 */
app.get('/health', async (req, res) => {
  try {
    // 간단한 쿼리로 DB 연결 확인 (SELECT 1은 가장 가벼운 쿼리)
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('헬스체크 실패:', error.message);
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

// ================================================
// 📝 게시글 CRUD API 엔드포인트
// ================================================

/**
 * GET /api/posts
 *
 * 게시글 목록을 페이지네이션하여 반환합니다.
 *
 * Query Parameters:
 * - page: 페이지 번호 (기본값: 1)
 * - limit: 페이지당 게시글 수 (기본값: 10)
 *
 * PostgreSQL 쿼리 설명:
 * - SELECT: 가져올 컬럼들 지정
 * - ORDER BY: 정렬 기준 (created_at DESC = 최신순)
 * - LIMIT: 가져올 행 수
 * - OFFSET: 건너뛸 행 수 (페이지네이션용)
 */
app.get('/api/posts', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // 게시글 목록 조회
    // $1, $2 등은 파라미터 플레이스홀더입니다 (SQL 인젝션 방지)
    const postsResult = await pool.query(
      `SELECT id, title, excerpt, thumbnail, created_at, view_count
       FROM posts
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    // 전체 게시글 수 조회 (페이지네이션 정보용)
    const countResult = await pool.query('SELECT COUNT(*) FROM posts');
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      posts: postsResult.rows,  // .rows에 실제 데이터가 들어있습니다
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('게시글 목록 조회 에러:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/posts/:id
 *
 * 특정 게시글의 상세 정보를 반환합니다.
 * 조회할 때마다 조회수가 1 증가합니다.
 *
 * PostgreSQL 쿼리 설명:
 * - WHERE id = $1: id가 파라미터와 일치하는 행 찾기
 */
app.get('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 게시글 조회
    const result = await pool.query(
      'SELECT * FROM posts WHERE id = $1',
      [id]
    );

    // 결과가 없으면 404 에러
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '게시글을 찾을 수 없습니다.'
      });
    }

    const post = result.rows[0];

    // 조회수 증가 (비동기로 처리, 응답 지연 방지)
    // RETURNING 없이 실행하여 응답을 기다리지 않음
    pool.query(
      'UPDATE posts SET view_count = view_count + 1 WHERE id = $1',
      [id]
    ).catch(err => console.error('조회수 증가 에러:', err));

    res.json({ success: true, post });
  } catch (error) {
    console.error('게시글 상세 조회 에러:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/posts
 *
 * 새 게시글을 생성합니다.
 *
 * Request Body:
 * {
 *   title: "제목" (필수),
 *   content: "마크다운 내용" (필수),
 *   excerpt: "요약" (선택),
 *   thumbnail: "썸네일 URL" (선택)
 * }
 *
 * PostgreSQL 쿼리 설명:
 * - INSERT INTO: 새 행 삽입
 * - RETURNING *: 삽입된 행을 바로 반환 (다시 SELECT 안 해도 됨)
 */
app.post('/api/posts', async (req, res) => {
  try {
    const { title, content, excerpt, thumbnail } = req.body;

    // 필수 필드 검증
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: '제목과 내용은 필수입니다.'
      });
    }

    // 게시글 생성 후 생성된 행 반환
    const result = await pool.query(
      `INSERT INTO posts (title, content, excerpt, thumbnail)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title, content, excerpt || '', thumbnail || null]
    );

    res.status(201).json({ success: true, post: result.rows[0] });
  } catch (error) {
    console.error('게시글 생성 에러:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/posts/:id
 *
 * 기존 게시글을 수정합니다.
 *
 * PostgreSQL 쿼리 설명:
 * - UPDATE ... SET: 기존 행의 값 변경
 * - NOW(): 현재 시각을 updated_at에 저장
 * - RETURNING *: 수정된 행 반환
 */
app.put('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, excerpt, thumbnail } = req.body;

    // 게시글 수정 후 수정된 행 반환
    const result = await pool.query(
      `UPDATE posts
       SET title = $1, content = $2, excerpt = $3, thumbnail = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [title, content, excerpt, thumbnail, id]
    );

    // 수정할 게시글이 없으면 404
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '게시글을 찾을 수 없습니다.'
      });
    }

    res.json({ success: true, post: result.rows[0] });
  } catch (error) {
    console.error('게시글 수정 에러:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/posts/:id
 *
 * 게시글을 삭제합니다.
 *
 * PostgreSQL 쿼리 설명:
 * - DELETE FROM: 행 삭제
 * - RETURNING id: 삭제된 행의 id 반환 (삭제 확인용)
 */
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 게시글 삭제 (삭제된 id 반환)
    const result = await pool.query(
      'DELETE FROM posts WHERE id = $1 RETURNING id',
      [id]
    );

    // 삭제할 게시글이 없으면 404
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '게시글을 찾을 수 없습니다.'
      });
    }

    res.json({ success: true, message: '게시글이 삭제되었습니다.' });
  } catch (error) {
    console.error('게시글 삭제 에러:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================================================
// 루트 경로 처리
// ================================================
// SPA를 위해 모든 비-API 경로를 index.html로 리다이렉트
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

// ================================================
// Vercel 서버리스 함수로 내보내기
// ================================================
// 이 형태가 Vercel 서버리스 함수의 필수 규격입니다
module.exports = app;
