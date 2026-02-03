/**
 * ================================================
 * 🎨 브런치 블로그 - 프론트엔드 클라이언트
 * ================================================
 *
 * 이 파일은 프론트엔드의 모든 로직을 담당합니다:
 * - API 통신: 서버와 데이터를 주고받습니다
 * - ThemeManager: 날씨에 따라 테마 색상을 변경합니다
 * - UI: 게시글 목록/상세를 화면에 렌더링합니다
 * - Router: 페이지 이동을 처리합니다 (SPA 방식)
 */

// ================================================
// 📦 상태 관리 (State Management)
// ================================================
/**
 * 앱의 전역 상태를 저장하는 객체
 * - 모든 데이터를 한 곳에서 관리하여 추적이 쉬움
 */
const AppState = {
  currentTheme: null,    // 현재 적용된 테마 정보
  posts: [],             // 게시글 목록
  currentPost: null,     // 현재 보고 있는 게시글
  currentPage: 1,        // 현재 페이지 번호
  totalPages: 1,         // 전체 페이지 수
  isLoading: false       // 로딩 중 여부
};

// ================================================
// 🔌 API 클라이언트 (API Client)
// ================================================
/**
 * 서버 API와 통신하는 객체
 * - 모든 API 호출을 이 객체를 통해 수행
 * - fetch API를 사용하여 HTTP 요청
 */
const API = {
  baseUrl: '/api',  // API 기본 경로

  /**
   * API 요청을 보내는 공통 함수
   * @param {string} endpoint - API 엔드포인트 (예: '/posts')
   * @param {object} options - fetch 옵션 (method, body 등)
   * @returns {Promise} - API 응답 데이터
   */
  async fetch(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options
      });
      return await response.json();
    } catch (error) {
      console.error('API 에러:', error);
      throw error;
    }
  },

  /**
   * 날씨 정보 조회
   * @param {number} lat - 위도
   * @param {number} lon - 경도
   */
  async getWeather(lat, lon) {
    const query = lat && lon ? `?lat=${lat}&lon=${lon}` : '';
    return this.fetch(`/weather${query}`);
  },

  /**
   * 게시글 목록 조회
   * @param {number} page - 페이지 번호
   * @param {number} limit - 페이지당 게시글 수
   */
  async getPosts(page = 1, limit = 10) {
    return this.fetch(`/posts?page=${page}&limit=${limit}`);
  },

  /**
   * 게시글 상세 조회
   * @param {string} id - 게시글 ID
   */
  async getPost(id) {
    return this.fetch(`/posts/${id}`);
  },

  /**
   * 게시글 생성
   * @param {object} postData - 게시글 데이터 { title, content, excerpt, thumbnail }
   */
  async createPost(postData) {
    return this.fetch('/posts', {
      method: 'POST',
      body: JSON.stringify(postData)
    });
  },

  /**
   * 게시글 수정
   * @param {string} id - 게시글 ID
   * @param {object} postData - 수정할 데이터
   */
  async updatePost(id, postData) {
    return this.fetch(`/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(postData)
    });
  },

  /**
   * 게시글 삭제
   * @param {string} id - 게시글 ID
   */
  async deletePost(id) {
    return this.fetch(`/posts/${id}`, { method: 'DELETE' });
  }
};

// ================================================
// 🎨 테마 매니저 (Theme Manager)
// ================================================
/**
 * 날씨에 따른 테마 색상을 관리하는 객체
 * - CSS 변수를 동적으로 변경하여 테마 적용
 */
const ThemeManager = {
  /**
   * 테마를 화면에 적용
   * @param {object} theme - 테마 정보 { color, name, label }
   *
   * 작동 방식:
   * 1. CSS 변수 값을 변경 (--primary-color 등)
   * 2. 브라우저가 자동으로 해당 변수를 사용하는 모든 요소 업데이트
   */
  applyTheme(theme) {
    // document.documentElement는 <html> 요소를 가리킴
    const root = document.documentElement;

    // CSS 변수 업데이트
    root.style.setProperty('--primary-color', theme.color);
    root.style.setProperty('--primary-color-light', `${theme.color}20`);  // 20 = 투명도
    root.style.setProperty('--primary-color-hover', this.darken(theme.color, 10));

    // 상태 저장
    AppState.currentTheme = theme;

    // 날씨 인디케이터 UI 업데이트
    this.updateWeatherIndicator(theme);
  },

  /**
   * 색상을 어둡게 만드는 함수
   * @param {string} hex - HEX 색상 코드 (예: '#00C6BD')
   * @param {number} percent - 어둡게 할 정도 (0-100)
   * @returns {string} - 어두워진 HEX 색상
   *
   * 작동 방식:
   * 1. HEX를 RGB로 변환
   * 2. 각 RGB 값을 감소
   * 3. 다시 HEX로 변환
   */
  darken(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);           // Red 값 추출 및 감소
    const G = Math.max(0, ((num >> 8) & 0x00FF) - amt); // Green 값 추출 및 감소
    const B = Math.max(0, (num & 0x0000FF) - amt);      // Blue 값 추출 및 감소
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  },

  /**
   * 날씨 인디케이터 UI 업데이트
   * @param {object} theme - 테마 정보
   * @param {number} temp - 현재 온도 (선택사항)
   */
  updateWeatherIndicator(theme, temp) {
    const labelEl = document.getElementById('weather-label');
    const tempEl = document.getElementById('weather-temp');

    if (labelEl) {
      labelEl.textContent = theme.label;
    }
    if (tempEl && temp !== undefined) {
      tempEl.textContent = `${temp}°C`;
    }
  },

  /**
   * 사용자 위치 기반으로 날씨를 로드하고 테마 적용
   *
   * 흐름:
   * 1. 브라우저에서 위치 정보 요청
   * 2. 허용되면 실제 위치로 API 호출
   * 3. 거부되면 기본 위치(서울)로 API 호출
   * 4. 테마 적용
   */
  async loadWeatherTheme() {
    try {
      // 브라우저가 위치 정보를 지원하는지 확인
      if (navigator.geolocation) {
        // 위치 정보 요청 (비동기)
        navigator.geolocation.getCurrentPosition(
          // 성공 콜백: 위치 정보 획득 성공
          async (position) => {
            const { latitude, longitude } = position.coords;
            const result = await API.getWeather(latitude, longitude);
            this.applyTheme(result.theme);
            if (result.weather) {
              this.updateWeatherIndicator(result.theme, result.weather.temp);
            }
          },
          // 실패 콜백: 위치 정보 거부됨
          async () => {
            console.log('위치 권한 거부됨, 기본 위치(서울) 사용');
            const result = await API.getWeather();  // 기본값 사용
            this.applyTheme(result.theme);
            if (result.weather) {
              this.updateWeatherIndicator(result.theme, result.weather.temp);
            }
          },
          // 옵션
          { timeout: 5000 }  // 5초 타임아웃
        );
      } else {
        // 위치 정보 미지원 브라우저
        const result = await API.getWeather();
        this.applyTheme(result.theme);
      }
    } catch (error) {
      console.error('테마 로드 실패:', error);
      // 폴백: 기본 민트 테마
      this.applyTheme({ color: '#00C6BD', name: 'default', label: '기본' });
    }
  }
};

// ================================================
// 🖼️ UI 렌더링 (UI Rendering)
// ================================================
/**
 * 화면에 요소를 그리는 함수들을 모아놓은 객체
 */
const UI = {
  /**
   * 게시글 목록을 화면에 렌더링
   * @param {Array} posts - 게시글 배열
   */
  renderPostList(posts) {
    const container = document.getElementById('post-list');
    if (!container) return;

    // 게시글이 없는 경우
    if (!posts || posts.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p class="text-lg font-medium mb-2">아직 게시글이 없습니다</p>
          <p class="text-sm">첫 번째 이야기를 작성해보세요!</p>
        </div>
      `;
      return;
    }

    // 게시글 카드 생성
    container.innerHTML = posts.map((post, index) => `
      <article class="post-card fade-in" style="animation-delay: ${index * 0.1}s; opacity: 0;"
               onclick="Router.navigate('/post/${post.id}')" role="button" tabindex="0">
        ${post.thumbnail ? `
          <div class="post-thumbnail overflow-hidden">
            <img src="${post.thumbnail}" alt="${this.escapeHtml(post.title)}" loading="lazy">
          </div>
        ` : ''}
        <div class="p-6">
          <h2 class="text-xl font-serif font-medium text-gray-800 mb-3 leading-tight">
            ${this.escapeHtml(post.title)}
          </h2>
          ${post.excerpt ? `
            <p class="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-2">
              ${this.escapeHtml(post.excerpt)}
            </p>
          ` : ''}
          <div class="flex items-center justify-between text-xs text-gray-400">
            <span>${this.formatDate(post.created_at)}</span>
            <span class="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              ${post.view_count || 0}
            </span>
          </div>
        </div>
      </article>
    `).join('');
  },

  /**
   * 게시글 상세를 화면에 렌더링
   * @param {object} post - 게시글 객체
   */
  renderPost(post) {
    const listContainer = document.getElementById('post-list-container');
    const detailContainer = document.getElementById('post-detail-container');

    if (!detailContainer) return;

    // 목록 숨기고 상세 표시
    if (listContainer) listContainer.classList.add('hidden');
    detailContainer.classList.remove('hidden');

    // marked.js로 마크다운을 HTML로 변환
    const htmlContent = marked.parse(post.content || '');

    // 상세 페이지 HTML 생성
    detailContainer.innerHTML = `
      <article class="fade-in">
        <!-- 뒤로가기 버튼 -->
        <div class="mb-8">
          <button class="back-button" onclick="Router.navigate('/')">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            목록으로
          </button>
        </div>

        <!-- 커버 이미지 -->
        ${post.thumbnail ? `
          <div class="mb-8 -mx-6 md:mx-0">
            <img src="${post.thumbnail}" alt="${this.escapeHtml(post.title)}"
                 class="w-full h-64 md:h-96 object-cover md:rounded-xl">
          </div>
        ` : ''}

        <!-- 게시글 헤더 -->
        <header class="mb-12">
          <h1 class="text-3xl md:text-4xl font-serif font-medium text-gray-800 leading-tight mb-6">
            ${this.escapeHtml(post.title)}
          </h1>
          <div class="flex items-center gap-4 text-sm text-gray-400">
            <span>${this.formatDate(post.created_at)}</span>
            <span class="w-1 h-1 bg-gray-300 rounded-full"></span>
            <span class="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              조회 ${post.view_count || 0}
            </span>
          </div>
        </header>

        <!-- 게시글 본문 (마크다운 렌더링) -->
        <div class="markdown-body font-serif">
          ${htmlContent}
        </div>

        <!-- 하단 구분선 및 뒤로가기 -->
        <div class="mt-16 pt-8 border-t border-gray-100">
          <button class="back-button" onclick="Router.navigate('/')">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            다른 이야기 보기
          </button>
        </div>
      </article>
    `;

    // 페이지 상단으로 스크롤
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  /**
   * 페이지네이션 UI 렌더링
   * @param {object} pagination - 페이지네이션 정보
   */
  renderPagination(pagination) {
    const container = document.getElementById('pagination');
    if (!container || pagination.totalPages <= 1) {
      if (container) container.innerHTML = '';
      return;
    }

    let html = '';

    // 이전 페이지 버튼
    if (pagination.page > 1) {
      html += `
        <button onclick="Router.loadPage(${pagination.page - 1})"
                class="px-4 py-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          이전
        </button>
      `;
    }

    // 페이지 번호들
    for (let i = 1; i <= pagination.totalPages; i++) {
      const isActive = i === pagination.page;
      html += `
        <button onclick="Router.loadPage(${i})"
                class="w-10 h-10 rounded-full text-sm transition-all
                       ${isActive
                         ? 'theme-bg text-white'
                         : 'text-gray-500 hover:bg-gray-100'}">
          ${i}
        </button>
      `;
    }

    // 다음 페이지 버튼
    if (pagination.page < pagination.totalPages) {
      html += `
        <button onclick="Router.loadPage(${pagination.page + 1})"
                class="px-4 py-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          다음
        </button>
      `;
    }

    container.innerHTML = html;
  },

  /**
   * 날짜를 한국어 형식으로 변환
   * @param {string} dateString - ISO 날짜 문자열
   * @returns {string} - 포맷된 날짜 (예: 2026년 2월 3일)
   */
  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },

  /**
   * HTML 특수문자 이스케이프 (XSS 방지)
   * @param {string} text - 원본 텍스트
   * @returns {string} - 이스케이프된 텍스트
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * 로딩 오버레이 표시
   */
  showLoading() {
    AppState.isLoading = true;
    const loader = document.getElementById('loader-overlay');
    if (loader) loader.classList.add('active');
  },

  /**
   * 로딩 오버레이 숨김
   */
  hideLoading() {
    AppState.isLoading = false;
    const loader = document.getElementById('loader-overlay');
    if (loader) loader.classList.remove('active');
  },

  /**
   * 에러 토스트 메시지 표시
   * @param {string} message - 에러 메시지
   */
  showError(message) {
    const toast = document.getElementById('error-toast');
    if (toast) {
      toast.textContent = message;
      toast.classList.add('show');
      // 3초 후 자동으로 숨김
      setTimeout(() => toast.classList.remove('show'), 3000);
    }
  }
};

// ================================================
// 🧭 라우터 (Router)
// ================================================
/**
 * SPA(Single Page Application) 방식의 페이지 이동을 처리
 * - 페이지 새로고침 없이 URL을 변경하고 콘텐츠를 업데이트
 */
const Router = {
  /**
   * 특정 경로로 이동
   * @param {string} path - 이동할 경로 (예: '/', '/post/123')
   */
  navigate(path) {
    // 브라우저 히스토리에 새 항목 추가 (뒤로가기 지원)
    history.pushState(null, '', path);
    // 해당 경로에 맞는 페이지 렌더링
    this.handleRoute();
  },

  /**
   * 특정 페이지 번호의 게시글 목록 로드
   * @param {number} page - 페이지 번호
   */
  async loadPage(page) {
    AppState.currentPage = page;
    await this.showPostList();
  },

  /**
   * 현재 URL 경로에 따라 적절한 페이지 렌더링
   */
  async handleRoute() {
    const path = window.location.pathname;

    // 게시글 상세 페이지인 경우 (/post/게시글ID)
    if (path.startsWith('/post/')) {
      const id = path.split('/post/')[1];
      await this.showPostDetail(id);
      return;
    }

    // 그 외의 경우 목록 페이지
    await this.showPostList();
  },

  /**
   * 게시글 목록 페이지 표시
   */
  async showPostList() {
    const listContainer = document.getElementById('post-list-container');
    const detailContainer = document.getElementById('post-detail-container');

    // 컨테이너 표시/숨김 전환
    if (listContainer) listContainer.classList.remove('hidden');
    if (detailContainer) detailContainer.classList.add('hidden');

    UI.showLoading();

    try {
      // API에서 게시글 목록 조회
      const result = await API.getPosts(AppState.currentPage);

      if (result.success) {
        AppState.posts = result.posts;
        AppState.totalPages = result.pagination.totalPages;

        // UI 렌더링
        UI.renderPostList(result.posts);
        UI.renderPagination(result.pagination);
      } else {
        throw new Error(result.error || '게시글 로드 실패');
      }
    } catch (error) {
      console.error('게시글 목록 로드 에러:', error);
      UI.showError('게시글을 불러오는데 실패했습니다.');
    } finally {
      UI.hideLoading();
    }
  },

  /**
   * 게시글 상세 페이지 표시
   * @param {string} id - 게시글 ID
   */
  async showPostDetail(id) {
    UI.showLoading();

    try {
      // API에서 게시글 상세 조회
      const result = await API.getPost(id);

      if (result.success) {
        AppState.currentPost = result.post;
        UI.renderPost(result.post);
      } else {
        throw new Error(result.error || '게시글을 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('게시글 상세 로드 에러:', error);
      UI.showError('게시글을 불러오는데 실패했습니다.');
      // 에러 시 목록으로 리다이렉트
      setTimeout(() => this.navigate('/'), 2000);
    } finally {
      UI.hideLoading();
    }
  }
};

// ================================================
// 📜 스크롤 진행률 바 (Progress Bar)
// ================================================
/**
 * 페이지 스크롤에 따라 진행률 바의 너비를 업데이트
 */
function updateProgressBar() {
  const progressBar = document.getElementById('progress-bar');
  if (!progressBar) return;

  // 스크롤 가능한 총 높이
  const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
  // 현재 스크롤 위치
  const scrollTop = window.scrollY;
  // 진행률 계산 (0-100%)
  const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;

  progressBar.style.width = `${progress}%`;
}

// ================================================
// 🚀 앱 초기화 (App Initialization)
// ================================================
/**
 * 페이지 로드 시 실행되는 초기화 함수
 */
document.addEventListener('DOMContentLoaded', async () => {
  // 1. 날씨 테마 로드
  await ThemeManager.loadWeatherTheme();

  // 2. 현재 URL에 맞는 페이지 렌더링
  Router.handleRoute();

  // 3. 브라우저 뒤로가기/앞으로가기 처리
  window.addEventListener('popstate', () => Router.handleRoute());

  // 4. 스크롤 이벤트 - 진행률 바 업데이트
  window.addEventListener('scroll', updateProgressBar);

  // 5. Lucide 아이콘 초기화 (아이콘 라이브러리)
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
});

// ================================================
// 🔧 전역 함수 노출 (HTML onclick에서 사용)
// ================================================
// HTML의 onclick 속성에서 접근할 수 있도록 전역 객체로 노출
window.Router = Router;
window.UI = UI;
window.API = API;
