const PSALMS_READING_TIMES: { [chapter: number]: number } = {
    1: 1.5, 2: 2.5, 3: 2.0, 4: 2.0, 5: 2.5, 6: 2.0, 7: 3.5, 8: 2.0, 9: 4.0, 10: 3.5,
    11: 1.5, 12: 2.0, 13: 1.5, 14: 1.5, 15: 1.0, 16: 2.5, 17: 3.0, 18: 10.0, 19: 3.0, 20: 2.0,
    21: 2.5, 22: 6.0, 23: 1.5, 24: 2.0, 25: 4.5, 26: 2.5, 27: 3.0, 28: 2.0, 29: 2.5, 30: 2.5,
    31: 5.0, 32: 2.5, 33: 4.5, 34: 4.5, 35: 5.5, 36: 2.5, 37: 8.0, 38: 4.5, 39: 2.5, 40: 3.5,
    41: 2.5, 42: 2.5, 43: 1.0, 44: 5.0, 45: 3.5, 46: 2.5, 47: 2.0, 48: 3.0, 49: 4.0, 50: 4.5,
    51: 4.0, 52: 2.0, 53: 1.5, 54: 1.5, 55: 4.5, 56: 2.5, 57: 2.5, 58: 2.5, 59: 3.5, 60: 2.5,
    61: 2.0, 62: 2.5, 63: 2.5, 64: 2.0, 65: 2.5, 66: 4.0, 67: 1.5, 68: 7.0, 69: 7.0, 70: 1.0,
    71: 5.0, 72: 4.0, 73: 5.5, 74: 4.5, 75: 2.0, 76: 2.5, 77: 4.0, 78: 15.0, 79: 2.5, 80: 4.0,
    81: 3.5, 82: 2.0, 83: 3.5, 84: 2.5, 85: 2.5, 86: 3.5, 87: 1.5, 88: 3.5, 89: 10.0, 90: 3.5,
    91: 3.0, 92: 3.0, 93: 1.0, 94: 4.5, 95: 2.5, 96: 2.5, 97: 2.5, 98: 2.0, 99: 2.0, 100: 1.0,
    101: 2.0, 102: 5.5, 103: 4.5, 104: 7.0, 105: 9.0, 106: 9.5, 107: 8.5, 108: 2.5, 109: 6.0, 110: 1.5,
    111: 2.0, 112: 2.0, 113: 2.0, 114: 2.0, 115: 3.5, 116: 4.0, 117: 0.5, 118: 6.0, 119: 35.0, 120: 1.5,
    121: 2.0, 122: 2.0, 123: 1.0, 124: 2.0, 125: 1.0, 126: 1.5, 127: 1.0, 128: 1.5, 129: 2.0, 130: 2.0,
    131: 1.0, 132: 3.5, 133: 1.0, 134: 1.0, 135: 4.0, 136: 5.0, 137: 2.0, 138: 2.0, 139: 5.0, 140: 2.5,
    141: 2.0, 142: 1.5, 143: 2.5, 144: 3.0, 145: 4.0, 146: 2.0, 147: 4.0, 148: 3.0, 149: 2.0, 150: 1.5
};

export const calculateTotalPsalmsTime = (): number => {
    return Object.values(PSALMS_READING_TIMES).reduce((sum, time) => sum + time, 0);
};

export const getPsalmReadingTime = (chapter: number): number => {
    return PSALMS_READING_TIMES[chapter] || 2.5;
};

export const optimizePsalmsFor25Days = () => {
    const totalDays = 25;
    const totalTime = calculateTotalPsalmsTime(); // 약 375분
    const recommendedTimePerDay = Math.round((totalTime / totalDays) * 10) / 10; // 약 15분

    const dailySchedule = [];
    let currentChapter = 1;

    for (let day = 1; day <= totalDays; day++) {
        const chaptersForToday = [];
        let timeForToday = 0;

        // 하루에 6장씩 기본 할당 (150 ÷ 25 = 6)
        const baseChaptersPerDay = 6;

        for (let i = 0; i < baseChaptersPerDay && currentChapter <= 150; i++) {
            chaptersForToday.push(currentChapter);
            timeForToday += getPsalmReadingTime(currentChapter);
            currentChapter++;
        }

        dailySchedule.push({
            day,
            chapters: chaptersForToday,
            totalTime: Math.round(timeForToday * 10) / 10
        });
    }

    return { dailySchedule, recommendedTimePerDay };
};