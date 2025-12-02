import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { gFontFamily, gFontTitle } from '../../constant/global';
import { bibleSetting, fetchSql, formatDate } from '../../utils';
import { BibleStep } from '../../utils/define';

type StateType = {
  jul: Array<number>;
  book: number;
  jang: number;
  firstRead: boolean;
  reset: boolean;
};

const initialState: StateType = {
  jul: [],
  book: 1,
  jang: 1,
  firstRead: false,
  reset: false
};

const illDocState: { book: number; jang: number } = {
  book: 1,
  jang: 1
};

export const menuSlice = createSlice({
  name: 'menu',
  initialState: {
    option: { sound: false, vector: false, note: false, search: false }
  },
  reducers: {
    change: (state, action) => {
      return { ...state, ...action.payload };
    },
    reset: () => {
      return {
        option: { sound: false, vector: false, note: false, search: false }
      };
    }
  }
});

// ! 일독 전용 슬라이스
export const illdocSelectSlice = createSlice({
  name: 'illDocSelectSlice',
  initialState: illDocState,
  reducers: {
    changePage(state, action) {
      state.book = action.payload.book;
      state.jang = action.payload.jang;
    }
  }
});

//! 기본 성경 전용 슬라이스
export const bibleSelectSlice = createSlice({
  name: 'bibleSelectSlice',
  initialState,
  reducers: {
    activeBookJang: (state: StateType, action: PayloadAction<number | any>) => {
      state.book = action.payload.book;
      state.jang = action.payload.jang;
    },
    addJul(state: StateType, action: PayloadAction<number | any>) {
      state.jul = Array.from(new Set([...state.jul, ...action.payload]));
      state.firstRead = true;
    },
    deleteJul(state: StateType, action: PayloadAction<number>) {
      state.jul = state.jul.filter((item) => item !== action.payload);
      state.jul.length === 0 && (state.firstRead = false);
    },
    changePage(state: StateType, action) {
      state.book = action.payload.book;
      state.jang = action.payload.jang;
    },
    reset: (state: StateType) => {
      state.book = 1;
      state.jang = 1;
      state.jul = [];
      state.reset = !state.reset;
    },
    resetAction: (state: StateType) => {
      state.jul = [];
    },
    deleteQuery(state: StateType, action: PayloadAction<any>) {
      const { book, jang, jul, type } = action.payload;
      bibleSetting.transaction((tx) => {
        const delSql = `DELETE FROM bible_setting WHERE book = ${book} and jang = ${jang} and jul in(${jul}) and type = ${type};`;
        tx.executeSql(delSql, []);
      });
    },
    mMalSumQuery(state: StateType, action: PayloadAction<any>) {
      const { title, content, type, book, jang } = action.payload;
      const today = formatDate(new Date());
      bibleSetting.transaction(async (tx) => {
        const sqlQuery = `INSERT INTO bible_setting ('book', 'jang', 'bible', 'title', 'content', 'datetime',  'type') VALUES (${book}, ${jang},
        '${BibleStep[book - 1].name} ${jang}장',
          '${title}',
          '${content}',
          '${today}',
          ${type});`;

        await tx.executeSql(sqlQuery, []);
      });
      state.reset = !state.reset;
    },
    mQuery(state: StateType, action: PayloadAction<any>) {
      const { title, content, color, type, book, jang } = action.payload;
      const today = formatDate(new Date());
      const selectBibleSetting = async ({
        book,
        jang,
        jul,
        type
      }: {
        book: number;
        jang: number;
        jul: number;
        type: number;
      }) => {
        const sqlQuery = `SELECT jul FROM bible_setting WHERE book = ${book} and jang =  ${jang} and jul = ${jul} and type = ${type} ; `;
        const data = await fetchSql(bibleSetting, sqlQuery, []);
        return data;
      };
      state.jul.forEach(async (i) => {
        const result = await selectBibleSetting({
          book: book,
          jang: jang,
          jul: i,
          type
        });
        if (result.length === 0) {
          bibleSetting.transaction((tx) => {
            console.log('진입 :::');
            const sqlQuery = `INSERT INTO bible_setting ('book', 'jang', 'jul', 'bible', 'title', 'content', 'datetime', 'color', 'type') VALUES (${book}, ${jang},
            ${i},
            '${BibleStep[book - 1].name} ${jang}장',
              '${title}',
              '${content}',
              '${today}',
              '${color}',
              ${type});`;

            console.log(sqlQuery, 'query1111 :::');
            tx.executeSql(sqlQuery, []);
          });
        } else {
          bibleSetting.transaction((tx) => {
            const sqlQuery = `UPDATE bible_setting SET color = '${color}' , datetime = '${today}' , title = '${title}', content = '${content}' WHERE book = ${book} and jang = ${jang} and jul=${i} and type = ${type};`;
            console.log('후퇴 :::');
            tx.executeSql(sqlQuery, []);
          });
        }
      });
      state.reset = !state.reset;
    }
  }
});

// if (result.length !== 0) {
//   console.log('test', result);
//   bibleSetting.transaction((tx) => {
//     const sqlQuery = `UPDATE bible_setting SET color = ${color} , datetime = '${today}' , title = '${title}', content = '${content}' WHERE book = ${state.book} and jang ${state.jang} and jul=${i} and type = ${type};`;

//     tx.executeSql(sqlQuery, []);
//   });
// } else {
//   console.log('end test');
//   console.log('end test', result);
// bibleSetting.transaction((tx) => {
//   console.log('::test test', state.book, state.jang, i);
//   const sqlQuery = `INSERT INTO bible_setting ('book', 'jang', 'jul', 'bible', 'title', 'content', 'datetime', 'color', 'type') VALUES (${
//     state.book
//   }, ${state.jang},
//   ${i},
//   '${BibleStep[state.book - 1].name} ${state.jang}장',
//     '${title}',
//     '${content}',
//     '${today}',
//     '${color}',
//     ${type});`;

//     console.log(sqlQuery);
//     tx.executeSql(sqlQuery, []);
//   });
// }
// }
// );

// TODO : 성경 위치 정보 값 저장 후 sql 저장 용
export const bibleTextSlice = createSlice({
  name: 'bible',
  initialState: { value: [] } as bibleTextType,
  reducers: {
    innerData: (state, action: PayloadAction<any>) => {
      const { jul, content } = action.payload;
      const checked = state.value.find((data) => data.jul === jul);
      const result = checked
        ? state.value.filter((data) => data.jul !== jul)
        : state.value.concat({ jul, content });
      return { ...{ value: result } };
    },
    reset: () => ({ value: [] })
  }
});
export const advertSlice = createSlice({
  name: 'bible',
  initialState: [] as advertType,
  reducers: {
    in: (_, action) => {
      return action.payload;
    }
  }
});

export const fontSlice = createSlice({
  name: 'biblefont',
  initialState: {
    name: gFontFamily,
    fontName: gFontTitle,
    size: 16,
    backgroundColor: 'white',
    fontColor: 'black'
  },
  reducers: {
    changeFont: (state, action) => {
      const { name, fontName } = action.payload;
      state.name = name;
      state.fontName = fontName;
    },
    changeSize: (state, action) => {
      state.size = action.payload;
    },
    changeColor: (state, action) => {
      const { backgroundColor, fontColor } = action.payload;
      state.backgroundColor = backgroundColor;
      state.fontColor = fontColor;
    }
  }
});

export const linkSlice = createSlice({
  name: 'link',
  initialState: [
    { id: 4, link: '' },
    { id: 5, link: '' }
  ],
  reducers: {
    in: (_, action) => {
      return action.payload;
    }
  }
});
// first popup slice type
const firstPopupState: { isFirst: boolean } = {
  isFirst: false
};
// first popup slice
export const firstPopupSlice = createSlice({
  name: 'firstPopupSlice',
  initialState: firstPopupState,
  reducers: {
    changeState(state, action) {
      state.isFirst = action.payload.isFirst;
    }
  }
});
