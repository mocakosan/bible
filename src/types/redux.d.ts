type combineType = {
  menu: menuStateType;
  index: indexStateType;
  bible: bibleTextType;
  advert: advertType;
  biblefont: fontStateType;
  translate: stirng[];
  link: linkStateType[];
  bibleMenu: bibleMenuType;
  firstPopup: firstPopupType;
};

type bibleMenuType = {
  jul: Array<number>;
  book: number;
  jang: number;
};

type menuStateType = {
  option: { sound: boolean; vector: boolean; note: boolean; search: boolean };
};

type indexStateType = {
  BOOK: string;
  JANG: string;
};

type bibleTextType = { value: { jul: number; content: string }[] };

type advertType = {
  id: number;
  title: string;
  image: string;
  link: string;
}[];

type fontStateType = {
  name: string;
  fontName: string;
  size: number;
  backgroundColor: string;
  fontColor: string;
  julColor: string;
};

type linkStateType = { id: number; link: string };
type firstPopupType = { isFirst: boolean };
