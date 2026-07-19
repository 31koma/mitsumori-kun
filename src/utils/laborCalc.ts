import type { EstimateItem } from '../types';

// 歩掛（1単位あたりの必要人工数）の簡易テーブル
// 品名キーワードで判定し、該当がなければカテゴリ別デフォルトを使用する
const NAME_RULES: Array<{ keywords: string[]; laborPerUnit: number }> = [
    { keywords: ['分電盤'], laborPerUnit: 1.0 },
    { keywords: ['エアコン'], laborPerUnit: 1.0 },
    { keywords: ['動力回路', '専用回路'], laborPerUnit: 0.5 },
    { keywords: ['換気扇'], laborPerUnit: 0.5 },
    { keywords: ['ベースライト'], laborPerUnit: 0.25 },
    { keywords: ['漏電遮断器', 'ブレーカー'], laborPerUnit: 0.2 },
    { keywords: ['ダウンライト', 'DL', '照明'], laborPerUnit: 0.15 },
    { keywords: ['3路スイッチ', '4路スイッチ', 'センサー付スイッチ', '調光スイッチ'], laborPerUnit: 0.15 },
    { keywords: ['プルボックス'], laborPerUnit: 0.15 },
    { keywords: ['引掛形コンセント', 'EV充電'], laborPerUnit: 0.2 },
    { keywords: ['コンセント', 'スイッチ', 'シーリング'], laborPerUnit: 0.1 },
    { keywords: ['ボックス'], laborPerUnit: 0.1 },
    { keywords: ['レースウェイ'], laborPerUnit: 0.1 },
    { keywords: ['プレート', 'ステップル', 'サドル', 'インサート', '吊りボルト'], laborPerUnit: 0.01 },
];

// カテゴリ別デフォルト歩掛（数量1あたり）
const CATEGORY_DEFAULTS: Record<string, number> = {
    '電線': 0.02,    // 1mあたり
    '配管': 0.03,    // 1mあたり
    '配線器具': 0.1, // 1個あたり
    '機器': 0.5,     // 1台あたり
};

export interface LaborBreakdownEntry {
    name: string;
    quantity: number;
    laborPerUnit: number;
    labor: number;
}

export interface LaborCalcResult {
    total: number;          // 0.5人工単位で切り上げた合計
    rawTotal: number;       // 端数処理前の合計
    breakdown: LaborBreakdownEntry[];
}

const getLaborPerUnit = (item: EstimateItem): number => {
    const name = item.name || '';
    for (const rule of NAME_RULES) {
        if (rule.keywords.some(k => name.includes(k))) return rule.laborPerUnit;
    }
    return CATEGORY_DEFAULTS[item.category] ?? 0;
};

export const calcLabor = (items: EstimateItem[]): LaborCalcResult => {
    const breakdown: LaborBreakdownEntry[] = [];

    items.forEach(item => {
        if (!item.selected) return;
        if (item.category === '人工' || item.category === '経費') return;
        const qty = Number(item.quantity) || 0;
        if (qty <= 0) return;
        const laborPerUnit = getLaborPerUnit(item);
        if (laborPerUnit <= 0) return;
        breakdown.push({
            name: item.name,
            quantity: qty,
            laborPerUnit,
            labor: qty * laborPerUnit,
        });
    });

    const rawTotal = breakdown.reduce((acc, e) => acc + e.labor, 0);
    // 0.5人工単位で切り上げ（最低0.5人工）
    const total = rawTotal > 0 ? Math.max(0.5, Math.ceil(rawTotal * 2) / 2) : 0;

    return { total, rawTotal, breakdown };
};
