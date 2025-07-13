import { combineReducers, configureStore } from '@reduxjs/toolkit';
import {
  advertSlice,
  bibleSelectSlice,
  bibleTextSlice,
  firstPopupSlice,
  fontSlice,
  illdocSelectSlice,
  linkSlice,
  menuSlice
} from './slice';

const rootReducer = combineReducers({
  menu: menuSlice.reducer,
  bible: bibleTextSlice.reducer,
  advert: advertSlice.reducer,
  biblefont: fontSlice.reducer,
  link: linkSlice.reducer,
  bibleMenu: bibleSelectSlice.reducer,
  illDoc: illdocSelectSlice.reducer,
  firstPopup: firstPopupSlice.reducer
});

export const store = configureStore({
  reducer: rootReducer
});
