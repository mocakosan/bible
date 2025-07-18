export const marketUrl = {
  ['제휴']: 'https://kpuri.co.kr/',
  ['후원마트']: 'https://kpuri.co.kr/',
  ['후원상품']: 'https://www.by1004.co.kr/'
};
export function groupObjectsByTwoCriteria(
  objects: any,
  criterion1: string,
  criterion2: string,
  criterion3: string
) {
  return objects.reduce((result: any, obj: any) => {
    const value1 = obj[criterion1];
    const value2 = obj[criterion2];
    const value3 = obj[criterion3];

    // Create a unique key based on the two criteria values
    const key = value1 + '-' + value2 + '-' + value3;

    // Check if the key already exists in the result
    if (result.hasOwnProperty(key)) {
      // Add the object to the existing group
      result[key].push(obj);
    } else {
      // Create a new group with the key and the object
      result[key] = [obj];
    }

    return result;
  }, {});
}

export const BibleStep = [
  { count: 50, index: 1, name: '창세기' },
  { count: 40, index: 2, name: '출애굽기' },
  { count: 27, index: 3, name: '레위기' },
  { count: 36, index: 4, name: '민수기' },
  { count: 34, index: 5, name: '신명기' },
  { count: 24, index: 6, name: '여호수아' },
  { count: 21, index: 7, name: '사사기' },
  { count: 4, index: 8, name: '룻기' },
  { count: 31, index: 9, name: '사무엘상' },
  { count: 24, index: 10, name: '사무엘하' },
  { count: 22, index: 11, name: '열왕기상' },
  { count: 25, index: 12, name: '열왕기하' },
  { count: 29, index: 13, name: '역대기상' },
  { count: 36, index: 14, name: '역대기하' },
  { count: 10, index: 15, name: '에스라' },
  { count: 13, index: 16, name: '느헤미야' },
  { count: 10, index: 17, name: '에스더' },
  { count: 42, index: 18, name: '욥기' },
  { count: 150, index: 19, name: '시편' },
  { count: 31, index: 20, name: '잠언' },
  { count: 12, index: 21, name: '전도서' },
  { count: 8, index: 22, name: '아가' },
  { count: 66, index: 23, name: '이사야' },
  { count: 52, index: 24, name: '예레미야' },
  { count: 5, index: 25, name: '예레미야 애가' },
  { count: 48, index: 26, name: '에스겔' },
  { count: 12, index: 27, name: '다니엘' },
  { count: 14, index: 28, name: '호세아' },
  { count: 3, index: 29, name: '요엘' },
  { count: 9, index: 30, name: '아모스' },
  { count: 1, index: 31, name: '오바댜' },
  { count: 4, index: 32, name: '요나' },
  { count: 7, index: 33, name: '미가' },
  { count: 3, index: 34, name: '나훔' },
  { count: 3, index: 35, name: '하박국' },
  { count: 3, index: 36, name: '스바냐' },
  { count: 2, index: 37, name: '학개' },
  { count: 14, index: 38, name: '스가랴' },
  { count: 4, index: 39, name: '말라기' },
  { count: 28, index: 40, name: '마태복음' },
  { count: 16, index: 41, name: '마가복음' },
  { count: 24, index: 42, name: '누가복음' },
  { count: 21, index: 43, name: '요한복음' },
  { count: 28, index: 44, name: '사도행전' },
  { count: 16, index: 45, name: '로마서' },
  { count: 16, index: 46, name: '고린도전서' },
  { count: 13, index: 47, name: '고린도후서' },
  { count: 6, index: 48, name: '갈라디아서' },
  { count: 6, index: 49, name: '에베소서' },
  { count: 4, index: 50, name: '빌립보서' },
  { count: 4, index: 51, name: '골로새서' },
  { count: 5, index: 52, name: '데살로니가전서' },
  { count: 3, index: 53, name: '데살로니가후서' },
  { count: 6, index: 54, name: '디모데전서' },
  { count: 4, index: 55, name: '디모데후서' },
  { count: 3, index: 56, name: '디도서' },
  { count: 1, index: 57, name: '빌레몬서' },
  { count: 13, index: 58, name: '히브리서' },
  { count: 5, index: 59, name: '야고보서' },
  { count: 5, index: 60, name: '베드로전서' },
  { count: 3, index: 61, name: '베드로후서' },
  { count: 5, index: 62, name: '요한일서' },
  { count: 1, index: 63, name: '요한이서' },
  { count: 1, index: 64, name: '요한삼서' },
  { count: 1, index: 65, name: '유다서' },
  { count: 22, index: 66, name: '요한계시록' }
];
export const OldBibleStep = [
  { count: 50, index: 1, name: '창세기' },
  { count: 40, index: 2, name: '출애굽기' },
  { count: 27, index: 3, name: '레위기' },
  { count: 36, index: 4, name: '민수기' },
  { count: 34, index: 5, name: '신명기' },
  { count: 24, index: 6, name: '여호수아' },
  { count: 21, index: 7, name: '사사기' },
  { count: 4, index: 8, name: '룻기' },
  { count: 31, index: 9, name: '사무엘상' },
  { count: 24, index: 10, name: '사무엘하' },
  { count: 22, index: 11, name: '열왕기상' },
  { count: 25, index: 12, name: '열왕기하' },
  { count: 29, index: 13, name: '역대기상' },
  { count: 36, index: 14, name: '역대기하' },
  { count: 10, index: 15, name: '에스라' },
  { count: 13, index: 16, name: '느헤미야' },
  { count: 10, index: 17, name: '에스더' },
  { count: 42, index: 18, name: '욥기' },
  { count: 150, index: 19, name: '시편' },
  { count: 31, index: 20, name: '잠언' },
  { count: 12, index: 21, name: '전도서' },
  { count: 8, index: 22, name: '아가' },
  { count: 66, index: 23, name: '이사야' },
  { count: 52, index: 24, name: '예레미야' },
  { count: 5, index: 25, name: '예레미야 애가' },
  { count: 48, index: 26, name: '에스겔' },
  { count: 12, index: 27, name: '다니엘' },
  { count: 14, index: 28, name: '호세아' },
  { count: 3, index: 29, name: '요엘' },
  { count: 9, index: 30, name: '아모스' },
  { count: 1, index: 31, name: '오바댜' },
  { count: 4, index: 32, name: '요나' },
  { count: 7, index: 33, name: '미가' },
  { count: 3, index: 34, name: '나훔' },
  { count: 3, index: 35, name: '하박국' },
  { count: 3, index: 36, name: '스바냐' },
  { count: 2, index: 37, name: '학개' },
  { count: 14, index: 38, name: '스가랴' },
  { count: 4, index: 39, name: '말라기' }
];
export const NewBibleStep = [
  { count: 28, index: 40, name: '마태복음' },
  { count: 16, index: 41, name: '마가복음' },
  { count: 24, index: 42, name: '누가복음' },
  { count: 21, index: 43, name: '요한복음' },
  { count: 28, index: 44, name: '사도행전' },
  { count: 16, index: 45, name: '로마서' },
  { count: 16, index: 46, name: '고린도전서' },
  { count: 13, index: 47, name: '고린도후서' },
  { count: 6, index: 48, name: '갈라디아서' },
  { count: 6, index: 49, name: '에베소서' },
  { count: 4, index: 50, name: '빌립보서' },
  { count: 4, index: 51, name: '골로새서' },
  { count: 5, index: 52, name: '데살로니가전서' },
  { count: 3, index: 53, name: '데살로니가후서' },
  { count: 6, index: 54, name: '디모데전서' },
  { count: 4, index: 55, name: '디모데후서' },
  { count: 3, index: 56, name: '디도서' },
  { count: 1, index: 57, name: '빌레몬서' },
  { count: 13, index: 58, name: '히브리서' },
  { count: 5, index: 59, name: '야고보서' },
  { count: 5, index: 60, name: '베드로전서' },
  { count: 3, index: 61, name: '베드로후서' },
  { count: 5, index: 62, name: '요한일서' },
  { count: 1, index: 63, name: '요한이서' },
  { count: 1, index: 64, name: '요한삼서' },
  { count: 1, index: 65, name: '유다서' },
  { count: 22, index: 66, name: '요한계시록' }
];
[
  'Gen',
  'Exo',
  'Lev',
  'Num',
  'Deu',
  'Jos',
  'Jud',
  'Rut',
  '1Sa',
  '2Sa',
  '1Ki',
  '2Ki',
  '1Ch',
  '2Ch',
  'Ezr',
  'Neh',
  'Est',
  'Job',
  'Psa',
  'Pro',
  'Ecc',
  'Son',
  'Isa',
  'Jer',
  'Lam',
  'Eze',
  'Dan',
  'Hos',
  'Joe',
  'Amo',
  'Oba',
  'Jon',
  'Mic',
  'Nah',
  'Hab',
  'Zep',
  'Hag',
  'Zec',
  'Mal',
  'Mat',
  'Mar',
  'Luk',
  'Joh',
  'Act',
  'Rom',
  '1Co',
  '2Co',
  'Gal',
  'Eph',
  'Phi',
  'Col',
  '1Th',
  '2Th',
  '1Ti',
  '2Ti',
  'Tit',
  'Phi',
  'Heb',
  'Jam',
  '1Pe',
  '2Pe',
  '1Jo',
  '2Jo',
  '3Jo',
  'Jud',
  'Rev'
];
