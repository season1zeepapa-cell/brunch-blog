/**
 * ================================================
 * 🌤️ 브런치 블로그 - 백엔드 API (Vercel 서버리스 함수)
 * ================================================
 *
 * 이 파일은 모든 백엔드 엔드포인트를 정의합니다.
 * - /api/weather: 날씨 정보 및 테마 색상 반환
 * - /api/posts: 게시글 CRUD 작업
 *
 * Vercel 서버리스 규격: module.exports = app
 */

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

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
app.use(express.json());  // JSON 요청 본문 파싱
app.use(express.static('public'));  // public 폴더의 정적 파일 제공

// ================================================
// Supabase 클라이언트 초기화
// ================================================
// Supabase는 PostgreSQL 기반의 서버리스 데이터베이스입니다
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ================================================
// 날씨 테마 매핑 설정
// ================================================
// Open-Meteo API의 weathercode를 테마 색상으로 변환합니다
// weathercode 참고: https://open-meteo.com/en/docs
const getThemeFromWeatherCode = (code) => {
  // 맑음 (코드 0)
  if (code === 0) {
    return { color: '#00C6BD', name: 'clear', label: '맑음' };
  }
  // 구름/흐림 (코드 1-3, 45, 48)
  if ([1, 2, 3, 45, 48].includes(code)) {
    return { color: '#8E8E93', name: 'clouds', label: '흐림' };
  }
  // 비/이슬비/소나기 (코드 51-67, 80-82)
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return { color: '#4A90E2', name: 'rain', label: '비' };
  }
  // 눈 (코드 71-77, 85, 86)
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return { color: '#B8C5D6', name: 'snow', label: '눈' };
  }
  // 천둥번개 (코드 95-99)
  if (code >= 95 && code <= 99) {
    return { color: '#4A90E2', name: 'thunderstorm', label: '천둥번개' };
  }
  // 기본값 (민트)
  return { color: '#00C6BD', name: 'default', label: '기본' };
};

// ================================================
// 🌤️ 날씨 API 엔드포인트
// ================================================
/**
 * GET /api/weather
 *
 * 현재 위치의 날씨 정보와 해당하는 테마 색상을 반환합니다.
 * Open-Meteo API를 사용하여 날씨 정보를 가져옵니다 (API 키 불필요!)
 *
 * Query Parameters:
 * - lat: 위도 (기본값: 37.5665 - 서울)
 * - lon: 경도 (기본값: 126.9780 - 서울)
 *
 * Response:
 * {
 *   success: true,
 *   weather: { code, temp, description },
 *   theme: { color, name, label }
 * }
 */
app.get('/api/weather', async (req, res) => {
  try {
    // 쿼리 파라미터에서 위도/경도 추출 (기본값: 서울)
    const { lat = 37.5665, lon = 126.9780 } = req.query;

    // Open-Meteo API 호출 (무료, API 키 불필요!)
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=Asia/Seoul`
    );

    if (!response.ok) {
      throw new Error('날씨 API 호출 실패');
    }

    const data = await response.json();
    const currentWeather = data.current_weather;

    // 날씨 코드에 따른 테마 결정
    const theme = getThemeFromWeatherCode(currentWeather.weathercode);

    res.json({
      success: true,
      weather: {
        code: currentWeather.weathercode,
        temp: Math.round(currentWeather.temperature),
        description: theme.label
      },
      theme
    });
  } catch (error) {
    console.error('날씨 API 에러:', error);

    // 에러 발생 시 기본 테마(민트) 반환 - 폴백 처리
    res.json({
      success: false,
      theme: { color: '#00C6BD', name: 'default', label: '기본' },
      error: error.message
    });
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
 */
app.get('/api/posts', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Supabase에서 게시글 조회
    // select: 가져올 컬럼 지정, count: 전체 개수도 함께 조회
    const { data, error, count } = await supabase
      .from('posts')
      .select('id, title, excerpt, thumbnail, created_at, view_count', { count: 'exact' })
      .order('created_at', { ascending: false })  // 최신순 정렬
      .range(offset, offset + Number(limit) - 1);  // 페이지네이션

    if (error) throw error;

    res.json({
      success: true,
      posts: data || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
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
 */
app.get('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 게시글 조회
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single();  // 단일 결과만 반환

    if (error) throw error;
    if (!data) {
      return res.status(404).json({
        success: false,
        error: '게시글을 찾을 수 없습니다.'
      });
    }

    // 조회수 증가 (비동기로 처리, 응답 지연 방지)
    supabase
      .from('posts')
      .update({ view_count: (data.view_count || 0) + 1 })
      .eq('id', id)
      .then();

    res.json({ success: true, post: data });
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

    // 게시글 생성
    const { data, error } = await supabase
      .from('posts')
      .insert([{
        title,
        content,
        excerpt: excerpt || '',  // 요약이 없으면 빈 문자열
        thumbnail: thumbnail || null
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, post: data });
  } catch (error) {
    console.error('게시글 생성 에러:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/posts/:id
 *
 * 기존 게시글을 수정합니다.
 */
app.put('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, excerpt, thumbnail } = req.body;

    // 게시글 수정 (updated_at 자동 갱신)
    const { data, error } = await supabase
      .from('posts')
      .update({
        title,
        content,
        excerpt,
        thumbnail,
        updated_at: new Date().toISOString()  // 수정 시간 갱신
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, post: data });
  } catch (error) {
    console.error('게시글 수정 에러:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/posts/:id
 *
 * 게시글을 삭제합니다.
 */
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 게시글 삭제
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id);

    if (error) throw error;

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
