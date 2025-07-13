import { useEffect, useState, memo, useMemo } from 'react';
import { SQLiteDatabase, Transaction } from 'react-native-sqlite-storage';
type columnType =
  | '*'
  | '_id'
  | 'book'
  | 'jang'
  | 'jul'
  | 'bibletype'
  | 'content'
  | 'bname'
  | 'is_time'
  | 'color'
  | 'language'
  | 'title'
  | 'bible'
  | 'type';
interface Props {
  db: SQLiteDatabase;
  sqlName: Array<string> | string;
  columns: Array<columnType>;
  dmlType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  conditionType: { WHERE?: { [key: string]: string | number } };
}
/**
 * @cpt4567 호출 상의 문제로 해당 훅은 사용 x
 */
export const useSqlite = ({ db, sqlName, columns, dmlType, conditionType }: Props) => {
  const [data, setData] = useState<any | any[]>(typeof sqlName === 'string' ? [] : null);
  const [trigger, setTrigger] = useState<number>(1);
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

  const defineSQL = (name: string) => {
    return {
      ['SELECT']: `SELECT ${String(columns)} FROM ${name} `,
      ['INSERT']: `INSERT INTO ${sqlName} (${String(columns)}) VALUES (${columns.map((_) => '?')})`,
      ['UPDATE']: `UPDATE ${sqlName} SET  ${String(columns)} = ? `.replaceAll(',', ' = ? ,'),
      ['DELETE']: `DELETE FROM ${name}`,
    }[dmlType];
  };

  const successQuery = (name: string, tx: Transaction) => {
    ({
      ['SELECT']: () => {
        const selectSql = `${defineSQL(name)} ${defineCondition()}`;
        tx.executeSql(selectSql, [], (tx, results) => {
          typeof sqlName === 'string'
            ? setData(results.rows.raw())
            : setData((pre: any) => ({ ...pre, [name]: results.rows.raw() }));
        });
      },
      ['INSERT']: () => {
        const insertSql = `${defineSQL(name)}`;
        setData({ sql: insertSql, objcet: { ...tx, successLog, errorLog } });
      },
      ['UPDATE']: () => {
        const updateSql = `${defineSQL(name)} ${defineCondition()}`;
        setData({ sql: updateSql, objcet: { ...tx, successLog, errorLog } });
      },
      ['DELETE']: () => {
        const deleteSql = `${defineSQL(name)} ${defineCondition()}`;
        setData({ sql: deleteSql, objcet: { ...tx, successLog, errorLog } });
      },
    })[dmlType]();
  };

  function successLog() {
    console.log('Data successfully with the current date.');
  }
  function errorLog(error: Transaction) {
    console.log('Error occurred while inserting data:', error);
  }

  useMemo(() => {
    const checked = typeof sqlName === 'string';
    if (trigger)
      if (checked) {
        try {
          db.transaction((tx) => {
            successQuery(sqlName as string, tx);
          });
        } catch (e) {
          console.log(e);
        }
      } else {
        sqlName.map((name) => {
          try {
            db.transaction((tx) => {
              successQuery(name, tx);
            });
          } catch (e) {
            console.log(e);
          }
        });
      }
  }, [/*sqlName,  conditionType.WHERE, */ trigger]);

  return { data, trigger, onTrigger: () => setTrigger((pre) => pre + 1) };
};

export default useSqlite;
