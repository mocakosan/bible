export const typography = {
  letterSpacings: {
    xs: '-0.05em',
    sm: '-0.025em',
    md: 0,
    lg: '0.025em',
    xl: '0.05em',
    '2xl': '0.1em'
  },
  lineHeights: {
    '2xs': '1em',
    xs: '1.125em',
    sm: '1.25em',
    md: '1.375em',
    lg: '1.5em',
    xl: '1.75em',
    '2xl': '2em',
    '3xl': '2.5em',
    '4xl': '3em',
    '5xl': '4em'
  },
  fontWeights: {
    hairline: 100,
    thin: 200,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
    extraBlack: 950
  },
  fonts: {
    heading: undefined,
    body: undefined,
    mono: undefined
  },
  fontSizes: {
    '2xs': 10,
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 60,
    '7xl': 72,
    '8xl': 96,
    '9xl': 128
  }
};

export const shadow = {
  0: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1
    },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1
  },
  1: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2
  },
  2: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3
  },
  3: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4
  },
  4: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  5: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6
  },
  6: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3
    },
    shadowOpacity: 0.29,
    shadowRadius: 4.65,
    elevation: 7
  },
  7: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8
  },
  8: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4
    },
    shadowOpacity: 0.32,
    shadowRadius: 5.46,
    elevation: 9
  },
  9: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5
    },
    shadowOpacity: 0.34,
    shadowRadius: 6.27,
    elevation: 10
  }
};

export const opacity = {
  0: 0,
  5: 0.05,
  10: 0.1,
  20: 0.2,
  25: 0.25,
  30: 0.3,
  40: 0.4,
  50: 0.5,
  60: 0.6,
  70: 0.7,
  75: 0.75,
  80: 0.8,
  90: 0.9,
  95: 0.95,
  100: 1
};

export const color: { [key: string]: string } = {
  bible: '#2AC1BC',
  status: '#ECECEC',
  white: '#ffffff',
  black: '#000000',
  gray1: '#6F6F6F',
  gray2: '#9C9C9C',
  gray3: '#929191',
  gray4: '#E1E1E1',
  gray5: '#CCCCCC',
  gray6: '#E7E7E7',
  gray7: '#878787',
  gray8: '#7E7E7E',
  gray9: '#868686',
  orange: '#F68B87',
  lightOrange: '#FF7575',
  lightYellow: '#DEE21C',
  lightGreen: '#76F161',
  lightSkyBlue: '#75DEFF',
  lightBlue: '#75A4FF',
  lightPurple: '#896BF3',
  lightPink: '#F98AFC'
};

export const FONT_LIST = [
  { name: 'NotoSansCJKkr-Bold', origin: 'NotoSansCJKkr-Bold' },
  { name: '에스코어드림(SCoreDream600)', origin: 'S-CoreDream-6Bold' }, // OK
  { name: '부크크명조체(Bold)', origin: 'bookk_mung_bold' }, // OK
  { name: '부크크고딕체(Bold)', origin: 'bookk_godic_bold' }, // OK
  // { name: '나눔명조체', origin: 'NanumMyeongjo' }, // OK
  { name: '나눔고딕체', origin: 'NanumGothic' }, // OK
  { name: 'KCC차쎔체', origin: 'KCC-Chassam' }, // OK
  { name: '나눔펜체', origin: 'NanumPen' }, // OK
  { name: '나눔바른고딕체', origin: 'NanumBarunGothicBold' }, // OK
  { name: '조선100년체', origin: 'ChosunCentennial_otf' }, // OK
  { name: '코트라희망체', origin: 'KOTRA HOPE' } // OK
  // { name: '부크크명조체', origin: 'bookk_mung' },
  // { name: '부크크고딕체', origin: 'bookk_godic' },
  // { name: 'NanumBarunGothic', origin: 'NanumBarunGothic' },
  // { name: 'NanumBarunpenR', origin: 'NanumBarunpenR' },
  // { name: 'IM_Hyemin-Regular', origin: 'IM_Hyemin-Regular' },
  // { name: 'KCCDodamdodam_OTF(MAC용)', origin: 'KCCDodamdodam_OTF(MAC용)' },
  // { name: 'KyoboHandwriting2020pdy', origin: 'KyoboHandwriting2020pdy' },
  // { name: 'KyoboHandwriting2021sjy', origin: 'KyoboHandwriting2021sjy' },
  // { name: 'KyoboHandwriting2022khn', origin: 'KyoboHandwriting2022khn' },
  // { name: 'LINESeedKR-Rg', origin: 'LINESeedKR-Rg' },
  // { name: 'NanumSquareNeoOTF-Rg', origin: 'NanumSquareNeoOTF-Rg' },
  // { name: 'PyeongChang-Regular', origin: 'PyeongChang-Regular' },
  // { name: 'TAEBAEK milkyway', origin: 'TAEBAEK milkyway' },
  // { name: 'The Jamsil OTF 3 Regular', origin: 'The Jamsil OTF 3 Regular' },
  // { name: '휴먼범석체', origin: '휴먼범석체' }
];

export const BIBLE_MESSAGE = [
  { kor: '성경 말씀을 선택해 주세요.', eng: 'Choice Bible' }
];

export const APP_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.clsk.media&hl=ko-KR';

export const FIREBASE_SEND_IMG =
  'https://bible25-data.s3.ap-northeast-2.amazonaws.com/bible25_icon.png';
