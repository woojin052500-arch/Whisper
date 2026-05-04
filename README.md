# 귓속말 (Whisper) - WJedulab

"가장 조용한 목소리가 만드는 가장 뜨거운 수업"

익명 질문에서 실시간 답변 확인까지, 완벽한 세션 보존 시스템을 갖춘 통합 웹 서비스입니다.

## 🎯 프로젝트 개요

학생들이 수업 중 부담 없이 질문할 수 있는 익명 Q&A 플랫폼입니다. 선생님은 실시간으로 질문을 모니터링하고 답변할 수 있으며, 학생들은 나중에 다시 접속하여 답변을 확인할 수 있습니다.

### 주요 기능

- 🎓 **선생님 대시보드**: 수업방 생성, QR 코드 생성, 실시간 질문 관리
- 👨‍🎓 **학생 질문함**: 익명 질문 제출, 좋아요 기능, 세션 보존
- ⚡ **실시간 업데이트**: Supabase Realtime으로 새로고침 없는 실시간 통신
- 🔒 **세션 보존**: 비밀번호 기반 인증으로 언제든지 다시 접속 가능
- 🚫 **욕설 필터링**: 부적절한 언어 자동 차단
- 📱 **반응형 디자인**: PC와 모바일에 최적화된 UI

## 🛠️ 기술 스택

- **Frontend**: Next.js 14 (App Router), TypeScript, TailwindCSS
- **Backend**: Supabase (PostgreSQL + Realtime)
- **Authentication**: Custom password-based system
- **Real-time**: Supabase Realtime subscriptions
- **UI**: Modern dark theme with WJedulab branding

## 🚀 시작하기

### 1. 환경 설정

```bash
# 프로젝트 클론
git clone <repository-url>
cd 귓속말

# 의존성 설치
npm install
```

### 2. Supabase 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. 프로젝트 설정에서 API URL과 Anon Key 복사
3. `src/lib/supabase.ts` 파일에 credentials 업데이트:

```typescript
const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'
```

### 3. 데이터베이스 스키마 설정

Supabase SQL Editor에서 `supabase-schema.sql` 파일의 내용을 실행하여 테이블 생성:

```bash
# SQL 파일 내용 복사하여 Supabase SQL Editor에 붙여넣기
cat supabase-schema.sql
```

### 4. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 애플리케이션 접속

## 📁 프로젝트 구조

```
src/
├── app/
│   ├── page.tsx                 # 메인 랜딩 페이지
│   ├── teacher/
│   │   └── page.tsx            # 선생님 대시보드
│   └── student/
│       └── [roomId]/
│           └── page.tsx        # 학생 질문 인터페이스
├── lib/
│   ├── supabase.ts             # Supabase 클라이언트 설정
│   └── auth.ts                 # 인증 및 데이터베이스 함수
├── hooks/
│   └── useRealtimeQuestions.ts # 실시간 훅
└── app/
    ├── globals.css             # 전역 스타일
    └── layout.tsx              # 루트 레이아웃
```

## 🎨 디자인 시스템

- **테마**: 다크 모드 기반의 현대적 디자인
- **색상**: WJedulab 브랜드 컬러 (Primary: Sky Blue)
- **폰트**: Inter (본문), JetBrains Mono (코드)
- **반응형**: 모바일 터치에 최적화된 버튼과 레이아웃

## 🔄 사용자 워크플로우

### 선생님
1. `/teacher` 접속하여 수업방 생성
2. QR 코드 스캔으로 학생들 초대
3. 실시간 질문 모니터링 및 답변
4. 질문 상태 관리 (대기/답변완료)

### 학생
1. QR 코드 또는 수업 코드로 접속
2. 닉네임과 비밀번호로 세션 생성
3. 익명으로 질문 제출
4. 다른 질문에 좋아요 클릭
5. 나중에 다시 접속하여 답변 확인

## 🗄️ 데이터베이스 스키마

### 테이블 구조

- **rooms**: 수업방 정보 (ID, 이름, 선생님 ID)
- **students**: 학생 세션 정보 (ID, 방 ID, 닉네임, 비밀번호 해시)
- **questions**: 질문 정보 (ID, 방 ID, 학생 ID, 내용, 좋아요 수, 답변, 상태)

### 주요 기능

- 실시간 구독 (Supabase Realtime)
- 익명성 보장 (학생 ID만으로 연결)
- 욕설 필터링 (PostgreSQL 함수)
- 좋아요 기능 (RPC 함수)

## 🚀 배포

### Vercel 배포

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel --prod
```

### 환경 변수 설정

```bash
# Vercel에서 환경 변수 설정
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🔧 개발 참고사항

- **실시성**: 3초마다 자동 리프레시 + Supabase Realtime 구독
- **보안**: bcryptjs를 통한 비밀번호 해싱
- **성능**: Next.js 14 App Router와 Turbopack
- **타입 안정성**: 전체 TypeScript 적용

## 📝 라이선스

WJedulab 내부 프로젝트
