import SQLite, { SQLiteDatabase } from 'react-native-sqlite-storage';

const successLog = () => {
  console.log('db connect success');
};

const errorLog = (error: SQLite.SQLError) => {
  console.log('db connect error', error);
};

export const BibleNewDB = SQLite.openDatabase(
  {
    name: 'bible_db',
    location: 'default',
    createFromLocation: '~www/bible_db.db'
  },
  successLog,
  errorLog
);

export const bibleSetting = SQLite.openDatabase(
  {
    name: 'settingDB',
    location: 'default',
    createFromLocation: '~www/settingDB.db'
  },
  successLog,
  errorLog
);

/* export const createSqls = [
  fetchSql(
    bibleSetting,
    'CREATE TABLE reading_table ( book INTEGER, jang INTEGER, read TEXT ,time TEXT)',
    []
  ),
  fetchSql(
    bibleSetting,
    'CREATE TABLE "bible_setting" ( "id" integer PRIMARY KEY AUTOINCREMENT, "book" integer, "jang" integer, "jul" INTEGER , bible varchar(256) , title varchar(150), content varchar(150), "datetime" varchar(30), "color" varchar(6) ,"type" INTEGER)',
    []
  )
]; */

export const defineSQL = (
  columns: string | string[],
  dmlType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
  name: string,
  conditionType: { WHERE?: { [key: string]: string | number } }
) => {
  const defineCondition = () => {
    if (conditionType.hasOwnProperty('WHERE')) {
      const result = JSON.stringify(conditionType.WHERE)
        .replaceAll('{', '')
        .replaceAll('}', '')
        .replaceAll('"', '')
        .replaceAll(':', '=')
        .replaceAll(/,/g, ' and ');

      return `WHERE ${result}`;
    } else {
      return '';
    }
  };

  return {
    ['SELECT']: `SELECT ${String(columns)} FROM ${name} ${defineCondition()}`,
    ['INSERT']: `INSERT INTO ${name} (${String(columns)}) VALUES (${typeof columns === 'object' ? columns.map((_) => '?') : ''
      }) ${defineCondition()}`,
    ['UPDATE']:
      `UPDATE ${name} SET  ${String(columns)} = ? `.replaceAll(',', ' = ? ,') +
      defineCondition(),
    ['DELETE']: `DELETE FROM ${name}`
  }[dmlType];
};

export function fetchSql(
  db: SQLite.SQLiteDatabase,
  sql: string,
  machingData: any[],
  item?: number
): Promise<any> {
  return new Promise((resolve: any, reject) => {
    db.transaction(
      (tx) => {
        // Apply query optimization techniques
        tx.executeSql(sql, machingData, (tx, results) => {
          const { rows } = results;

          if (item !== undefined) {
            resolve(rows.item(item));
          } else {
            resolve(rows.raw());
          }
        });
      },
      (error) => {
        reject(error);
      }
    );
  });
}
