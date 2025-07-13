import { defaultStorage } from './mmkv';

export const updateAppBadge = () => {
    const savedPlan = defaultStorage.getString('bible_reading_plan');
    if (!savedPlan) return;

    const planData = JSON.parse(savedPlan);
    const startDate = new Date(planData.startDate);
    const today = new Date();
    const currentDayNumber = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    let missedCount = 0;

    // 놓친 장 개수 계산
    for (let day = 1; day < currentDayNumber; day++) {
        const dayChapters = getDayChapters(planData, day);

        dayChapters.forEach(chapter => {
            const isRead = planData.readChapters.some((r: any) =>
                r.book === chapter.book && r.chapter === chapter.chapter && r.isRead
            );

            if (!isRead) {
                missedCount++;
            }
        });
    }

    // 네이티브 뱃지 설정 (react-native-push-notification 등 사용)
    // setBadgeCount(missedCount);

    return missedCount;
};

const getDayChapters = (planData: any, dayNumber: number) => {
    // 특정 일차의 읽을 장들을 반환하는 로직
    // 실제 구현은 planData 구조에 따라 달라집니다
    return [];
};