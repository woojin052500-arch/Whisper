# Google OAuth 환경 변수 설정 가이드

## 1. .env.local 파일 생성

프로젝트 루트 디렉토리에 `.env.local` 파일을 수동으로 생성하세요.

## 2. 환경 변수 추가

`.env.local` 파일에 다음 내용을 추가하세요:

```env
# Google OAuth 설정
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# NextAuth 설정
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here
```

## 3. Google OAuth 클라이언트 설정

### Google Cloud Console에서 설정:
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. "API 및 서비스" > "사용자 인증 정보" 이동
4. "사용자 인증 정보 만들기" > "OAuth 2.0 클라이언트 ID" 선택
5. 애플리케이션 유형: "웹 애플리케이션"
6. 승인된 리디렉션 URI 추가:
   - `http://localhost:3000/api/auth/callback/google`

### 필요한 값:
- **클라이언트 ID**: `GOOGLE_CLIENT_ID`에 사용
- **클라이언트 보안 비밀**: `GOOGLE_CLIENT_SECRET`에 사용

## 4. NextAuth Secret 생성

터미널에서 다음 명령어로 시크릿 키 생성:

```bash
openssl rand -base64 32
```

생성된 값을 `NEXTAUTH_SECRET`에 사용하세요.

## 5. 이미 등록된 경우

이미 Google OAuth 클라이언트를 등록하셨다면:

1. Google Cloud Console에서 기존 클라이언트 ID 확인
2. 리디렉션 URI에 `http://localhost:3000/api/auth/callback/google` 추가
3. 클라이언트 ID와 시크릿을 `.env.local`에 복사

## 6. 애플리케이션 재시작

환경 변수 설정 후 개발 서버를 재시작하세요:

```bash
npm run dev
```

## 7. 테스트

선생님 대시보드(`/teacher`)에서 Google 로그인 버튼이 나타나는지 확인하세요.

## 주의사항

- `.env.local` 파일은 git에 올라가지 않도록 .gitignore에 포함되어 있습니다
- 프로덕션 배포 시에는 실제 도메인으로 NEXTAUTH_URL을 변경하세요
- Google OAuth 설정은 보안에 중요하니 키를 안전하게 관리하세요
