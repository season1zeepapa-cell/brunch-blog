/**
 * ================================================
 * 🖥️ 브런치 블로그 - 로컬 개발 서버
 * ================================================
 *
 * 이 파일은 로컬 개발 환경에서만 사용됩니다.
 * api/index.js에서 Express 앱을 가져와서 실행합니다.
 *
 * 실행 방법: npm run dev 또는 node server.js
 */

// DNS 설정: IPv4 우선 사용 (일부 네트워크에서 IPv6 연결 문제 해결)
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

// 환경 변수 로드 (.env 파일에서)
require('dotenv').config();

// api/index.js에서 Express 앱 가져오기
const app = require('./api/index');

// 포트 설정 (환경 변수 또는 기본값 3000)
const PORT = process.env.PORT || 3000;

// 서버 시작
app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║     🌤️  브런치 블로그 서버가 시작되었습니다!    ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');
  console.log(`  📍 로컬 주소: http://localhost:${PORT}`);
  console.log('');
  console.log('  📌 API 엔드포인트:');
  console.log(`     🌤️  날씨: http://localhost:${PORT}/api/weather`);
  console.log(`     📝 게시글: http://localhost:${PORT}/api/posts`);
  console.log('');
  console.log('  💡 팁: Ctrl+C를 눌러 서버를 종료할 수 있습니다.');
  console.log('');
});
