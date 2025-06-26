// utils/bibleStyleHelpers.ts
import { BIBLE_COLORS, CHAPTER_BASE_STYLE } from './bibleColors';

// 장 상태 타입 정의
export type ChapterStatus = 'read' | 'today' | 'yesterday' | 'missed' | 'future' | 'unread';

// 장 스타일 가져오기
export const getChapterStyleByStatus = (status: ChapterStatus, isRead: boolean) => {
    // 읽은 상태가 최우선
    if (isRead) {
        return {
            ...CHAPTER_BASE_STYLE,
            color: BIBLE_COLORS.READ,
        };
    }

    // 상태별 스타일 반환
    switch (status) {
        case 'today':
            return {
                ...CHAPTER_BASE_STYLE,
                color: BIBLE_COLORS.TODAY,
            };

        case 'yesterday':
            return {
                ...CHAPTER_BASE_STYLE,
                color: BIBLE_COLORS.YESTERDAY,
            };

        case 'missed':
            return {
                ...CHAPTER_BASE_STYLE,
                color: BIBLE_COLORS.MISSED,
            };

        case 'future':
            return {
                ...CHAPTER_BASE_STYLE,
                color: BIBLE_COLORS.FUTURE,
            };

        default:
            return {
                ...CHAPTER_BASE_STYLE,
                color: BIBLE_COLORS.UNREAD,
            };
    }
};

// 텍스트 스타일 가져오기
export const getChapterTextStyle = (status: ChapterStatus, isVisible: boolean) => {
    return {
        fontSize: 14,
        fontWeight: (status === 'today' && isVisible) ? 'bold' as const : 'normal' as const,
    };
};

// 느낌표 아이콘 표시 여부 결정
export const shouldShowExclamationIcon = (
    status: ChapterStatus,
    isRead: boolean,
    isVisible: boolean
): boolean => {
    return status === 'missed' && !isRead && isVisible;
};