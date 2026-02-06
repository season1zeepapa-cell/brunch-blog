/**
 * ================================================
 * PM2 설정 파일 (AWS Lightsail 배포용)
 * ================================================
 *
 * PM2란?
 * - Node.js 프로세스 매니저입니다.
 * - 서버가 죽으면 자동으로 재시작해줍니다.
 * - 여러 CPU 코어를 활용할 수 있게 해줍니다.
 *
 * 사용 방법:
 * - 시작: npm run pm2:start 또는 pm2 start ecosystem.config.js
 * - 중지: npm run pm2:stop 또는 pm2 stop brunch-blog
 * - 재시작: npm run pm2:restart 또는 pm2 restart brunch-blog
 * - 로그 보기: npm run pm2:logs 또는 pm2 logs brunch-blog
 * - 상태 확인: pm2 status
 */

module.exports = {
  apps: [{
    // 앱 이름 (pm2 status에서 이 이름으로 표시됨)
    name: 'brunch-blog',

    // 실행할 스크립트 파일
    script: 'server.js',

    // 인스턴스 개수 (1 = 단일 프로세스)
    // 'max'로 설정하면 CPU 코어 수만큼 프로세스 생성 (클러스터 모드)
    instances: 1,

    // 프로세스가 죽으면 자동 재시작
    autorestart: true,

    // 파일 변경 감지하여 자동 재시작 (개발용, 프로덕션에서는 false 권장)
    watch: false,

    // 메모리 사용량이 이 값을 넘으면 자동 재시작
    // Lightsail $10 플랜 (1GB RAM) 기준으로 300MB로 설정
    max_memory_restart: '300M',

    // 환경 변수 설정
    // DATABASE_URL은 .env 파일에서 로드됨
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
