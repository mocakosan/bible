import AssociateScreen from '../components/page/associate';
import BibleScreen from '../components/page/bible';
import BibleStudyScreen from '../components/page/biblestudy';
import BookMarkScreen from '../components/page/bookmark';
import ChapterScreen, { ChapterScreen2 } from '../components/page/chapter';
import CommonScreen from '../components/page/common';
import HomeScreen from '../components/page/home';
import HymnScreen from '../components/page/hymn';
import LightPenScreen from '../components/page/lightpen';
import MalSumNoteScreen from '../components/page/malsumnote';
import MalSumNoteDetailScreen from '../components/page/malsumnotedetail';
import ManualScreen from '../components/page/manual';
import MenuDetailScreen from '../components/page/menudetail';
import MenuListScreen from '../components/page/menulist';
import PhotoDetailScreen from '../components/page/photo';
import PreferencesScreen from '../components/page/prefer';
import ProgressScreen from '../components/page/progs';
import ReadingBibleScreen from '../components/page/reading';
import SettingSrceen from '../components/page/setting';
import SupportScreen from '../components/page/support';
import TranslateScreen from '../components/page/translate';
import VersionInfoScreen from '../components/page/version';
import WordScreen from '../components/page/words';
import BibleConectionScreen from '../components/page/bible/connection';
import BookMarkDetailScreen from '../components/page/bookmarkdetail';
import CopyRightScreen from '../components/page/copyright';
import HomeFocusScreen from '../components/page/home/focus';
import InquiryScreen from '../components/page/inquiry';
import KakaoScreen from '../components/page/kakao';
import LightPenDetailScreen from '../components/page/lightpendetail';
import NewsScreen from '../components/page/news';
import NoteScreen from '../components/page/note';
import IllDocSettingScreen from '../components/page/setting/illDoc';
import IllDocTranslateScreen from '../components/page/translate/illDoc';
import MyPageScreen from "../components/page/mypage";
import PointHistoryScreen from "../components/page/dalantdetail";
import HymnListScreen from "../components/page/hymn";
import HymnDetailScreen from "../components/section/hymn/HymnDetailScreen";
import HymnDocScreen from "../components/section/hymn/HymnDocScreen";
// 교독문 상세 화면 추가
import GyodokDetailScreen from "../components/section/hymn/GyodokDetailScreen";

export const route = [
  {
    name: 'HomeScreen',
    component: HomeScreen
  },
  {
    name: 'BibleScreen',
    component: BibleScreen
  },
  {
    name: 'BibleConectionScreen',
    component: BibleConectionScreen
  },
  {
    name: 'PhotoDetailScreen',
    component: PhotoDetailScreen
  },
  {
    name: 'ChapterScreen',
    component: ChapterScreen
  },
  {
    name: 'SettingScreen',
    component: SettingSrceen
  },
  {
    name: 'HymnScreen',
    component: HymnListScreen
  },
  {
    name: 'HymnDetailScreen',
    component: HymnDetailScreen
  },
  {
    name: 'HymnDocScreen',
    component: HymnDocScreen
  },
  {
    name: 'BibleStudyScreen',
    component: BibleStudyScreen
  },
  {
    name: 'WordScreen',
    component: WordScreen
  },
  {
    name: 'CommonScreen',
    component: CommonScreen
  },
  {
    name: 'ReadingBibleScreen',
    component: ReadingBibleScreen
  },
  {
    name: 'ProgressScreen',
    component: ProgressScreen
  },
  {
    name: 'MenuListScreen',
    component: MenuListScreen
  },
  {
    name: 'MenuDetailScreen',
    component: MenuDetailScreen
  },
  {
    name: 'PreferencesScreen',
    component: PreferencesScreen
  },
  {
    name: 'ManualScreen',
    component: ManualScreen
  },
  {
    name: 'TranslateScreen',
    component: TranslateScreen
  },
  {
    name: 'AssociateScreen',
    component: AssociateScreen
  },
  {
    name: 'SupportScreen',
    component: SupportScreen
  },
  {
    name: 'VersionInfoScreen',
    component: VersionInfoScreen
  },
  {
    name: 'BookMarkScreen',
    component: BookMarkScreen
  },
  {
    name: 'LightPenScreen',
    component: LightPenScreen
  },
  {
    name: 'MalSumNoteScreen',
    component: MalSumNoteScreen
  },
  {
    name: 'MalSumNoteDetailScreen',
    component: MalSumNoteDetailScreen
  },
  {
    name: 'BookMarkDetailScreen',
    component: BookMarkDetailScreen
  },
  {
    name: 'LightPenDetailScreen',
    component: LightPenDetailScreen
  },
  {
    name: 'NoteScreen',
    component: NoteScreen
  },
  {
    name: 'CopyRightScreen',
    component: CopyRightScreen
  },
  {
    name: 'ChapterScreen2',
    component: ChapterScreen2
  },
  {
    name: 'HomeFocusScreen',
    component: HomeFocusScreen
  },
  {
    name: 'IllDocSettingScreen',
    component: IllDocSettingScreen
  },
  {
    name: 'IllDocTranslateScreen',
    component: IllDocTranslateScreen
  },
  {
    name: 'InquiryScreen',
    component: InquiryScreen
  },
  {
    name: 'NewsScreen',
    component: NewsScreen
  },
  {
    name: 'KakaoScreen',
    component: KakaoScreen
  },
  {
    name: 'PointHistoryScreen',
    component: PointHistoryScreen
  },
  // 교독문 상세 화면 추가
  {
    name: 'GyodokDetailScreen',
    component: GyodokDetailScreen
  },
];