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

//메모리 캐시
const readingStatusCache = new Map<string, boolean>();
let cacheInitialized = false;

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

export const optimizeReadingTable = async (): Promise<boolean> => {
    try {
        console.log('Starting optimization...');
        const startTime = Date.now();

        // 1. 복합 인덱스 생성
        await fetchSql(bibleSetting, `
            CREATE INDEX IF NOT EXISTS idx_reading_book_jang
                ON reading_table(book, jang)
        `, []);
        console.log('Index: idx_reading_book_jang');

        // 2. read 인덱스 생성
        await fetchSql(bibleSetting, `
            CREATE INDEX IF NOT EXISTS idx_reading_read
                ON reading_table(read)
        `, []);
        console.log('Index: idx_reading_read');

        // 3. 테이블 통계 업데이트
        await fetchSql(bibleSetting, 'ANALYZE reading_table', []);
        console.log('Table analyzed');

        // 4. 메모리 캐시 초기화
        await initializeMemoryCache();

        const duration = Date.now() - startTime;
        console.log(`Optimization complete in ${duration}ms`);

        return true;
    } catch (error) {
        console.error('Optimization error:', error);

        try {
            await initializeMemoryCache();
            return true;
        } catch (cacheError) {
            console.error('Cache init also failed:', cacheError);
            return false;
        }
    }
};

async function initializeMemoryCache(): Promise<void> {
    try {
        console.log('💾 Loading reading_table into memory...');
        const startTime = Date.now();

        // 시 완전 초기화
        readingStatusCache.clear();
        cacheInitialized = false;

        // DB에서 데이터 로드
        const sql = 'SELECT book, jang, read FROM reading_table';
        const results = await fetchSql(bibleSetting, sql, []);

        console.log(`📊 DB returned ${Array.isArray(results) ? results.length : 0} rows`);

        if (Array.isArray(results)) {
            results.forEach((row: any) => {
                const key = `${row.book}_${row.jang}`;

                // 핵심: read 값을 정확하게 파싱
                let isRead = false;

                if (row.read === true || row.read === 'true' || row.read === 'True' || row.read === '1' || row.read === 1) {
                    isRead = true;
                } else {
                    isRead = false;
                }

                readingStatusCache.set(key, isRead);
            });
        }

        cacheInitialized = true;
        const duration = Date.now() - startTime;

        // 캐시 통계 로그
        let readCount = 0;
        readingStatusCache.forEach((isRead) => {
            if (isRead) readCount++;
        });

        console.log(`Memory cache ready: ${readingStatusCache.size} items in ${duration}ms`);
        console.log(`Read: ${readCount}, Unread: ${readingStatusCache.size - readCount}`);

    } catch (error) {
        console.error('Cache init error:', error);
        readingStatusCache.clear();
        cacheInitialized = false;
    }
}

export function getReadingStatusFromCache(book: number, chapter: number): boolean | null {
    if (!cacheInitialized) {
        console.log(`Cache not initialized for ${book}:${chapter}`);
        return null;  // 캐시 미초기화 → null 반환 (DB 조회 필요)
    }

    const key = `${book}_${chapter}`;

    // 핵심 수정: 캐시에 있으면 그 값, 없으면 false (안읽음)
    if (readingStatusCache.has(key)) {
        return readingStatusCache.get(key)!;
    }

    // 캐시에 없음 = DB에도 없음 = 한 번도 읽은 적 없음 = false
    return false;
}

export async function upsertReadingStatus(
    book: number,
    chapter: number,
    isRead: boolean
): Promise<boolean> {
    const key = `${book}_${chapter}`;

    // 메모리 캐시 즉시 업데이트
    if (cacheInitialized) {
        readingStatusCache.set(key, isRead);
        console.log(`Cache updated: ${key} = ${isRead}`);
    }

    // DB 업데이트
    try {
        const upsertSql = `
            INSERT OR REPLACE INTO reading_table (book, jang, read, time)
            VALUES (?, ?, ?, ?)
        `;

        await fetchSql(bibleSetting, upsertSql, [
            book,
            chapter,
            String(isRead),
            new Date().toISOString()
        ]);

        return true;
    } catch (error) {
        console.error('DB update failed:', error);

        // DB 실패 시 캐시 롤백
        if (cacheInitialized) {
            readingStatusCache.set(key, !isRead);
        }

        return false;
    }
}

export async function batchUpsertReadingStatus(
    updates: Array<{ book: number; chapter: number; isRead: boolean }>
): Promise<boolean> {
    if (updates.length === 0) return true;

    const startTime = Date.now();

    try {
        // 메모리 캐시 즉시 업데이트
        if (cacheInitialized) {
            updates.forEach(({ book, chapter, isRead }) => {
                const key = `${book}_${chapter}`;
                readingStatusCache.set(key, isRead);
            });
        }

        // 한 트랜잭션으로 모든 업데이트
        await new Promise<void>((resolve, reject) => {
            bibleSetting.transaction(
                (tx) => {
                    updates.forEach(({ book, chapter, isRead }) => {
                        tx.executeSql(
                            'INSERT OR REPLACE INTO reading_table (book, jang, read, time) VALUES (?, ?, ?, ?)',
                            [book, chapter, String(isRead), new Date().toISOString()]
                        );
                    });

                    tx.executeSql('SELECT 1', [], () => resolve());
                },
                (error) => reject(error)
            );
        });

        const duration = Date.now() - startTime;
        console.log(`Batch: ${updates.length} items in ${duration}ms`);

        return true;
    } catch (error) {
        console.error('Batch update error:', error);
        return false;
    }
}

export function bulkGetReadingStatusFromCache(
    chapters: Array<{ book: number; chapter: number }>
): Map<string, boolean> {
    const result = new Map<string, boolean>();

    chapters.forEach(({ book, chapter }) => {
        const key = `${book}_${chapter}`;
        // 캐시에 있으면 그 값, 없으면 false
        result.set(key, readingStatusCache.get(key) ?? false);
    });

    return result;
}

export function getReadChapterCountFromCache(): number {
    let count = 0;
    readingStatusCache.forEach((isRead) => {
        if (isRead) count++;
    });
    return count;
}

export async function refreshCache(): Promise<void> {
    await initializeMemoryCache();
}

export function invalidateCache(): void {
    readingStatusCache.clear();
    cacheInitialized = false;
    console.log('🗑️ Cache invalidated');
}

export function getCacheStatus(): {
    initialized: boolean;
    size: number;
    readCount: number;
} {
    return {
        initialized: cacheInitialized,
        size: readingStatusCache.size,
        readCount: getReadChapterCountFromCache()
    };
}

export function batchFetchSql(
    db: SQLite.SQLiteDatabase,
    queries: Array<{ sql: string; params: any[] }>
): Promise<any[]> {
    return new Promise((resolve, reject) => {
        db.transaction(
            (tx) => {
                const results: any[] = [];

                queries.forEach(({ sql, params }, index) => {
                    tx.executeSql(
                        sql,
                        params,
                        (tx, result) => {
                            results[index] = result.rows.raw();
                        },
                        (tx, error) => {
                            console.error(`Query ${index} failed:`, error);
                            results[index] = null;
                            return false;
                        }
                    );
                });

                tx.executeSql('SELECT 1', [], () => resolve(results));
            },
            (error) => reject(error)
        );
    });
}

export async function bulkGetReadingStatus(
    chapters: Array<{ book: number; chapter: number }>
): Promise<Map<string, boolean>> {
    if (cacheInitialized) {
        return bulkGetReadingStatusFromCache(chapters);
    }

    try {
        if (chapters.length === 0) return new Map();

        const conditions = chapters
            .map(ch => `(book = ${ch.book} AND jang = ${ch.chapter})`)
            .join(' OR ');

        const sql = `SELECT book, jang, read FROM reading_table WHERE ${conditions}`;
        const results = await fetchSql(bibleSetting, sql, []);

        const statusMap = new Map<string, boolean>();
        if (Array.isArray(results)) {
            results.forEach((row: any) => {
                const key = `${row.book}_${row.jang}`;
                statusMap.set(key, row.read === 'true' || row.read === true);
            });
        }

        return statusMap;
    } catch (error) {
        console.error('Bulk get error:', error);
        return new Map();
    }
}

export async function getReadChapterCount(): Promise<number> {
    if (cacheInitialized) {
        return getReadChapterCountFromCache();
    }

    try {
        const sql = 'SELECT COUNT(*) as count FROM reading_table WHERE read = "true"';
        const result = await fetchSql(bibleSetting, sql, [], 0);
        return result?.count || 0;
    } catch (error) {
        console.error('Count error:', error);
        return 0;
    }
}

export async function getReadChaptersByBook(book: number): Promise<number[]> {
    try {
        const sql = `
            SELECT jang FROM reading_table
            WHERE book = ? AND read = 'true'
            ORDER BY jang ASC
        `;
        const results = await fetchSql(bibleSetting, sql, [book]);

        if (Array.isArray(results)) {
            return results.map((row: any) => row.jang);
        }
        return [];
    } catch (error) {
        console.error('Get chapters error:', error);
        return [];
    }
}

export async function vacuumDatabase(): Promise<boolean> {
    try {
        console.log('Vacuuming database...');
        const startTime = Date.now();

        await fetchSql(bibleSetting, 'VACUUM', []);
        await fetchSql(bibleSetting, 'ANALYZE', []);

        const duration = Date.now() - startTime;
        console.log(`Vacuum completed in ${duration}ms`);

        return true;
    } catch (error) {
        console.error('Vacuum error:', error);
        return false;
    }
}

export async function getDatabaseInfo(): Promise<any> {
    try {
        const tableInfo = await fetchSql(bibleSetting,
            "SELECT name, sql FROM sqlite_master WHERE type='table' AND name='reading_table'",
            []
        );

        const indexInfo = await fetchSql(bibleSetting,
            "SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='reading_table'",
            []
        );

        const totalCount = await fetchSql(bibleSetting,
            'SELECT COUNT(*) as count FROM reading_table',
            [], 0
        );

        const readCount = await getReadChapterCount();
        const cacheStatus = getCacheStatus();

        return {
            tableInfo: tableInfo[0] || null,
            indexes: indexInfo || [],
            totalChapters: totalCount?.count || 0,
            readChapters: readCount,
            cache: cacheStatus,
            hasOptimization: indexInfo.some((idx: any) =>
                idx.name === 'idx_reading_book_jang' || idx.name === 'idx_reading_read'
            )
        };
    } catch (error) {
        console.error('Get DB info error:', error);
        return null;
    }
}