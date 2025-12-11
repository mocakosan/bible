// Auto-generated from SQLite DB: settingDB.db
// Do not edit by hand.

export namespace SettingDB {

  export interface BibleSettingRow {
    book: number | null; // column: book, sqlite type: INTEGER
    jang: number | null; // column: jang, sqlite type: INTEGER
    jul: number | null; // column: jul, sqlite type: INTEGER
    title: string | null; // column: title, sqlite type: TEXT
    content: string | null; // column: content, sqlite type: TEXT
    bible: string | null; // column: bible, sqlite type: TEXT
    datetime: string | null; // column: datetime, sqlite type: TEXT
    color: string | null; // column: color, sqlite type: TEXT
    type: number | null; // column: type, sqlite type: INTEGER
  }

  export interface ReadingTableRow {
    book: number | null; // column: book, sqlite type: INTEGER
    jang: number | null; // column: jang, sqlite type: INTEGER
    read: string | null; // column: read, sqlite type: TEXT
    time: string | null; // column: time, sqlite type: TEXT
  }

  export const bible_settingData: BibleSettingRow[] = [
  ];

  export const reading_tableData: ReadingTableRow[] = [
  ];

}
