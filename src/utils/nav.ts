import { SvgProps } from 'react-native-svg';
import m_01 from '../assets/svg/m_01.svg';
import m_01_01 from '../assets/svg/m_01_01.svg';
import m_01_02 from '../assets/svg/m_01_02.svg';
import m_01_03 from '../assets/svg/m_01_03.svg';
import m_01_04 from '../assets/svg/m_01_04.svg';
import m_01_06 from '../assets/svg/m_01_06.svg';
import m_01_07 from '../assets/svg/m_01_07.svg';
import m_01_08 from '../assets/svg/m_01_08.svg';
import m_01_09 from '../assets/svg/m_01_09.svg';
import m_03 from '../assets/svg/m_03.svg';
import m_04 from '../assets/svg/m_04.svg';
import m_06 from '../assets/svg/m_06.svg';
import m_07 from '../assets/svg/m_07.svg';
import m_08 from '../assets/svg/m_08.svg';
import m_10 from '../assets/svg/m_10.svg';
import m_11 from '../assets/svg/m_11.svg';
import m_12 from '../assets/svg/m_12.svg';
import m_14 from '../assets/svg/m_14.svg';
import user from '../assets/svg/user.svg';
import note_off from '../assets/svg/note_off.svg';
import up_down from '../assets/svg/up_down.svg';

export type navigationDataType = {
  name: string;
  svg: React.FC<SvgProps>;
  route: string;
  type?: string;
  menu?: '말씀노트' | '북마크' | '형광펜' | '즐겨찾기';
  sub?: {
    name: string;
    svg: React.FC<SvgProps>;
    route: string;
    sub?: string;
  }[];
}[];
export const upDownIcon = up_down;
export const navigationData: navigationDataType = [
  // {
  //   name: '마이페이지',
  //   svg: user,
  //   route: 'MyPageScreen'
  // },
  {
    name: '오늘',
    svg: m_01,
    route: 'Drow',
    sub: [
      {
        name: '말씀따라',
        svg: m_01_01,
        route: 'WordScreen'
      },
      {
        name: '칼럼',
        svg: m_01_02,
        route: 'CommonScreen',
        sub: 'calumlist'
      },
      {
        name: '십자가',
        svg: m_01_03,
        route: 'CommonScreen',
        sub: 'crosslist'
      },
      {
        name: '이야기메시지',
        svg: m_01_07,
        route: 'CommonScreen',
        sub: 'iyagilist'
      },
      // {
      //   name: '축복기도',
      //   svg: m_01_07,
      //   route: 'CommonScreen',
      //   sub: 'kidolist'
      // },
      {
        name: '오늘의책',
        svg: m_01_04,
        route: 'CommonScreen',
        sub: 'booklist'
      },
      {
        name: '이하루 손편지',
        svg: m_01_08,
        route: 'CommonScreen',
        sub: 'letterlist'
      },
      {
        name: '굿모닝 하나님',
        svg: m_01_09,
        route: 'CommonScreen',
        sub: 'goodlist'
      },
      // NOTE:: 통톡
      {
        name: '톨레레게',
        svg: m_01_06,
        route: 'CommonScreen',
        sub: 'todaylist'
      }
    ]
  },
  {
    name: '성경사전',
    svg: m_03,
    route: 'BibleStudyScreen'
  },
  {
    name: '성경',
    svg: m_06,
    route: 'BibleScreen'
  },
  {
    name: '찬송',
    svg: m_07,
    route: 'HymnScreen'
  },
  {
    name: '성경일독',
    svg: m_08,
    route: 'ReadingBibleScreen'
  },
  {
    name: '말씀노트',
    svg: note_off,
    route: 'MalSumNoteScreen'
  },
  {
    name: '북마크',
    svg: m_10,
    route: 'BookMarkScreen'
  },
  {
    name: '형광펜',
    svg: m_11,
    route: 'LightPenScreen'
  },
  // {
  //   name: '즐겨찾기',
  //   svg: m_12,
  //   route: 'MenuListScreen'
  // },
  // {
  //   name: '환경설정',
  //   svg: m_13,
  //   route: 'PreferencesScreen'
  // },
  // {
  //   name: '사용설명서',
  //   svg: m_14,
  //   route: 'ManualScreen'
  // },
  // {
  //   name: '개선사항',
  //   svg: m_14,
  //   route: 'https://givemeprice.notion.site/25-0fcac5bd872048818deaed5db6994f78'
  // },
  // {
  //   name: '문의요청',
  //   svg: m_04,
  //   route: 'InquiryScreen'
  //   // route: 'CommonScreen',
  //   // type: 'board?type=3'
  // },
  // {
  //   name: '저작권',
  //   svg: m_12,
  //   route: 'CopyRightScreen'
  // },
  // {
  //   name: '개인정보처리방침',
  //   svg: m_14,
  //   route: 'https://bible25frontend.givemeprice.co.kr/terms'
  // },
  // {
  //   name: '이용약관',
  //   svg: m_14,
  //   route: 'https://bible25frontend.givemeprice.co.kr/terms'
  // },
  // {
  //   name: '로그아웃',
  //   svg: m_14,
  //   route: 'KakaoScreen'
  // }
];

export const sectionNavigationData = [
  [
    {
      name: '성경',
      img: require('../assets/img/main_m_01.png'),
      route: 'BibleScreen'
    },
    {
      name: '찬송',
      img: require('../assets/img/main_m_02.png'),
      route: 'HymnScreen'
    },
    {
      name: '성경일독',
      img: require('../assets/img/main_m_03.png'),
      route: 'ReadingBibleScreen'
    },
    {
      name: '성경사전',
      img: require('../assets/img/main_m_04.png'),
      route: 'BibleStudyScreen'
    }
  ],
  [
    {
      name: '말씀따라',
      img: require('../assets/img/main_m_05.png'),
      route: 'WordScreen'
    },
    {
      name: '칼럼',
      img: require('../assets/img/main_m_06.png'),
      route: 'CommonScreen',
      sub: 'calumlist'
    },
    {
      name: '십자가',
      img: require('../assets/img/main_m_07.png'),
      route: 'CommonScreen',
      sub: 'crosslist'
    },
    {
      name: '축복기도',
      img: require('../assets/img/main_m_08.png'),
      route: 'CommonScreen',
      sub: 'kidolist'
    }
  ],
  [
    {
      name: '오늘의책',
      img: require('../assets/img/main_m_09.png'),
      route: 'CommonScreen',
      sub: 'booklist'
    },
    {
      name: '이하루손편지',
      img: require('../assets/img/main_m_10.png'),
      route: 'CommonScreen',
      sub: 'letterlist'
    },
    {
      name: '굿모닝하나님',
      img: require('../assets/img/main_m_11.png'),
      route: 'CommonScreen',
      sub: 'goodlist'
    },
    {
      name: '성경통독',
      img: require('../assets/img/main_m_12.png'),
      route: 'CommonScreen',
      sub: 'todaylist'
    }
  ]
];
