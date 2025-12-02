export interface HymnData {
    id: number;
    num: string;
    oldnum: string;
    title: string;
    content: string;
    image: string;
    musicUrl?: string;
    accompanyUrl?: string;
}

export type HymnCategory = '100' | '200' | '300' | '400' | '500' | '600' | '700' | '교독문' | '001';