export const BIBLE_COLORS = {
    // 읽기 상태 색상
    READ: '#4CAF50',         // 초록색 - 읽은 장
    UNREAD: '#000000',       // 검은색 - 안 읽은 장

    // 일독 계획 색상
    TODAY: '#F44336',        // 빨간색 - 오늘 읽을 장
    YESTERDAY: '#2196F3',    // 파란색 - 어제 읽을 장
    MISSED: '#333333',       // 진한 회색 - 놓친 장 (텍스트)
    MISSED_ICON_BG: '#F44336', // 빨간색 - 놓친 장 느낌표 아이콘 배경

    // 테두리 및 배경
    BORDER: '#E0E0E0',       // 연한 회색 - 기본 테두리
    TRANSPARENT: 'transparent', // 투명 - 기본 배경

    // 기타
    FUTURE: '#000000',       // 검은색 - 미래에 읽을 장
    WHITE: '#FFFFFF',        // 흰색 - 아이콘 색상 등
};

// 스타일 우선순위
export const STYLE_PRIORITY = {
    READ: 1,         // 최우선 - 읽은 상태
    TODAY: 2,        // 오늘 읽을 장
    YESTERDAY: 3,    // 어제 읽을 장
    MISSED: 4,       // 놓친 장
    FUTURE: 5,       // 미래 장
    UNREAD: 6,       // 일반 안 읽은 장
};

// 느낌표 아이콘 스타일
export const EXCLAMATION_ICON_STYLE = {
    position: 'absolute' as const,
    top: -3,
    right: -3,
    backgroundColor: BIBLE_COLORS.MISSED_ICON_BG,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
};

// 기본 장 버튼 스타일
export const CHAPTER_BASE_STYLE = {
    borderRadius: 17.5,
    width: 35,
    height: 35,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: BIBLE_COLORS.BORDER,
    backgroundColor: BIBLE_COLORS.TRANSPARENT,
};