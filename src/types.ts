export type Category = '電線' | '配管' | '配線器具' | '機器' | '人工' | '経費';

export interface EstimateItem {
    id: string;
    name: string;
    category: Category;
    quantity: number | string;
    unit: string;
    unitPrice: number | string;
    selected: boolean;
    referencePrice?: string;
    itemType?: 'cv' | 'cvt' | 'slat' | 'free';
    cvtSize?: number | string;
    cvtCores?: number | string;
}

export interface EstimateInfo {
    customerName: string;
    projectName: string;
    address: string;
    assignee: string;
    estimateNumber?: string;
}

export interface SavedEstimate {
    id: string;
    date: string;
    info: EstimateInfo;
    items: EstimateItem[];
    estimateNumber: string;
}

export const defaultInfo: EstimateInfo = {
    customerName: '',
    projectName: '',
    address: '',
    assignee: ''
};

export const defaultItems: EstimateItem[] = [
    // 電線
    { id: 'c1_1', name: 'VVF1.6-2C', category: '電線', quantity: '', unit: 'm', unitPrice: 130, referencePrice: '100〜150円', selected: false },
    { id: 'c1_2', name: 'VVF1.6-3C', category: '電線', quantity: '', unit: 'm', unitPrice: 200, referencePrice: '180〜230円', selected: false },
    { id: 'c1_3', name: 'VVF2.0-2C', category: '電線', quantity: '', unit: 'm', unitPrice: 190, referencePrice: '170〜220円', selected: false },
    { id: 'c1_4', name: 'VVF2.0-3C', category: '電線', quantity: '', unit: 'm', unitPrice: 290, referencePrice: '260〜320円', selected: false },
    { id: 'c1_5', name: 'IV1.6', category: '電線', quantity: '', unit: 'm', unitPrice: 80, referencePrice: '70〜100円', selected: false },
    { id: 'c1_6', name: 'IV2.0', category: '電線', quantity: '', unit: 'm', unitPrice: 100, referencePrice: '80〜120円', selected: false },
    { id: 'c1_7', name: 'IV3.5', category: '電線', quantity: '', unit: 'm', unitPrice: 150, referencePrice: '130〜180円', selected: false },
    { id: 'c1_8', name: 'CV 5.5sq-3C', category: '電線', quantity: '', unit: 'm', unitPrice: 500, referencePrice: '450〜550円', selected: false },
    { id: 'c1_9', name: 'CV 8sq-3C', category: '電線', quantity: '', unit: 'm', unitPrice: 800, referencePrice: '750〜900円', selected: false },
    { id: 'c1_10', name: 'CV 14sq-3C', category: '電線', quantity: '', unit: 'm', unitPrice: 1400, referencePrice: '1200〜1600円', selected: false },
    { id: 'c1_11', name: 'CV 22sq-3C', category: '電線', quantity: '', unit: 'm', unitPrice: 2200, referencePrice: '1900〜2500円', selected: false },
    { id: 'c1_12', name: 'VCTF 1.25-2C', category: '電線', quantity: '', unit: 'm', unitPrice: 120, referencePrice: '100〜150円', selected: false },
    { id: 'c1_13', name: 'VCTF 2.0-2C', category: '電線', quantity: '', unit: 'm', unitPrice: 180, referencePrice: '150〜220円', selected: false },
    { id: 'c1_14', name: 'LANケーブル', category: '電線', quantity: '', unit: 'm', unitPrice: 80, referencePrice: '60〜100円', selected: false },
    { id: 'c1_15', name: '同軸ケーブル', category: '電線', quantity: '', unit: 'm', unitPrice: 100, referencePrice: '80〜120円', selected: false },
    { id: 'c1_16', name: 'CVT 8sq', category: '電線', quantity: '', unit: 'm', unitPrice: 1000, referencePrice: '900〜1,100円', selected: false },
    { id: 'c1_17', name: 'CVT 14sq', category: '電線', quantity: '', unit: 'm', unitPrice: 1600, referencePrice: '1,400〜1,800円', selected: false },
    { id: 'c1_18', name: 'CVT 22sq', category: '電線', quantity: '', unit: 'm', unitPrice: 2450, referencePrice: '2,100〜2,800円', selected: false },
    { id: 'c1_19', name: 'CVT 38sq', category: '電線', quantity: '', unit: 'm', unitPrice: 4000, referencePrice: '3,500〜4,500円', selected: false },
    { id: 'c1_20', name: 'CVT 60sq', category: '電線', quantity: '', unit: 'm', unitPrice: 6250, referencePrice: '5,500〜7,000円', selected: false },
    { id: 'c1_21', name: 'CVT 100sq', category: '電線', quantity: '', unit: 'm', unitPrice: 10250, referencePrice: '9,000〜11,500円', selected: false },
    { id: 'c1_22', name: 'CVV 2sq-2C', category: '電線', quantity: '', unit: 'm', unitPrice: 180, referencePrice: '150〜220円', selected: false },
    { id: 'c1_23', name: 'CVV 2sq-3C', category: '電線', quantity: '', unit: 'm', unitPrice: 240, referencePrice: '200〜280円', selected: false },

    { id: 'c1_30', name: 'ニュースラ（NS）8sq-3C', category: '電線', quantity: '', unit: 'm', unitPrice: 1150, referencePrice: '1000〜1300円', selected: false },
    { id: 'c1_31', name: 'ニュースラ（NS）14sq-3C', category: '電線', quantity: '', unit: 'm', unitPrice: 1800, referencePrice: '1600〜2000円', selected: false },
    { id: 'c1_32', name: 'ニュースラ（NS）22sq-3C', category: '電線', quantity: '', unit: 'm', unitPrice: 2650, referencePrice: '2300〜3000円', selected: false },
    { id: 'c1_33', name: 'ニュースラ（NS）38sq-3C', category: '電線', quantity: '', unit: 'm', unitPrice: 4300, referencePrice: '3800〜4800円', selected: false },
    { id: 'c1_34', name: 'ニュースラ（NS）60sq-3C', category: '電線', quantity: '', unit: 'm', unitPrice: 6650, referencePrice: '5800〜7500円', selected: false },
    { id: 'c1_35', name: 'ニュースラ（NS）100sq-3C', category: '電線', quantity: '', unit: 'm', unitPrice: 10750, referencePrice: '9500〜12000円', selected: false },
    { id: 'c1_36', name: 'ニュースラ（NS）150sq-3C', category: '電線', quantity: '', unit: 'm', unitPrice: 15750, referencePrice: '14000〜17500円', selected: false },

    // 配管
    { id: 'c2_1', name: 'PF管16', category: '配管', quantity: '', unit: 'm', unitPrice: 150, referencePrice: '120〜180円', selected: false },
    { id: 'c2_2', name: 'PF管22', category: '配管', quantity: '', unit: 'm', unitPrice: 200, referencePrice: '170〜230円', selected: false },
    { id: 'c2_3', name: 'CD管16', category: '配管', quantity: '', unit: 'm', unitPrice: 130, referencePrice: '110〜150円', selected: false },
    { id: 'c2_4', name: 'CD管22', category: '配管', quantity: '', unit: 'm', unitPrice: 180, referencePrice: '150〜210円', selected: false },
    { id: 'c2_5', name: 'VE管14', category: '配管', quantity: '', unit: 'm', unitPrice: 200, referencePrice: '180〜230円', selected: false },
    { id: 'c2_6', name: 'VE管16', category: '配管', quantity: '', unit: 'm', unitPrice: 250, referencePrice: '200〜280円', selected: false },
    { id: 'c2_7', name: 'VE管22', category: '配管', quantity: '', unit: 'm', unitPrice: 350, referencePrice: '300〜400円', selected: false },
    { id: 'c2_8', name: 'モール1号', category: '配管', quantity: '', unit: 'm', unitPrice: 150, referencePrice: '120〜180円', selected: false },
    { id: 'c2_9', name: 'モール2号', category: '配管', quantity: '', unit: 'm', unitPrice: 200, referencePrice: '180〜250円', selected: false },
    { id: 'c2_10', name: 'モール3号', category: '配管', quantity: '', unit: 'm', unitPrice: 300, referencePrice: '250〜350円', selected: false },
    { id: 'c2_11', name: 'レースウェイ（D1）', category: '配管', quantity: '', unit: 'm', unitPrice: 1500, referencePrice: '1,200〜1,800円', selected: false },
    { id: 'c2_12', name: 'インサート（デッキプレート用）', category: '配管', quantity: '', unit: '個', unitPrice: 115, referencePrice: '80〜150円', selected: false },
    { id: 'c2_13', name: '吊りボルト（W3/8）', category: '配管', quantity: '', unit: '本', unitPrice: 275, referencePrice: '200〜350円', selected: false },
    { id: 'c2_14', name: '万能サドル（ステンレス）', category: '配管', quantity: '', unit: '個', unitPrice: 160, referencePrice: '120〜200円', selected: false },

    // 配線器具
    { id: 'c3_1', name: 'コンセント', category: '配線器具', quantity: '', unit: '個', unitPrice: 1200, referencePrice: '1000〜1500円', selected: false },
    { id: 'c3_2', name: 'ダブルコンセント', category: '配線器具', quantity: '', unit: '個', unitPrice: 1500, referencePrice: '1200〜1800円', selected: false },
    { id: 'c3_3', name: 'スイッチ', category: '配線器具', quantity: '', unit: '個', unitPrice: 1200, referencePrice: '1000〜1500円', selected: false },
    { id: 'c3_4', name: '3路スイッチ', category: '配線器具', quantity: '', unit: '個', unitPrice: 1800, referencePrice: '1500〜2200円', selected: false },
    { id: 'c3_5', name: '4路スイッチ', category: '配線器具', quantity: '', unit: '個', unitPrice: 2500, referencePrice: '2000〜3000円', selected: false },
    { id: 'c3_6', name: '防水コンセント', category: '配線器具', quantity: '', unit: '個', unitPrice: 2500, referencePrice: '2000〜3000円', selected: false },
    { id: 'c3_7', name: '動力コンセント', category: '配線器具', quantity: '', unit: '個', unitPrice: 8000, referencePrice: '7000〜9500円', selected: false },
    { id: 'c3_8', name: '引掛シーリング', category: '配線器具', quantity: '', unit: '個', unitPrice: 1200, referencePrice: '1000〜1500円', selected: false },
    { id: 'c3_9', name: '露出ボックス', category: '配線器具', quantity: '', unit: '個', unitPrice: 600, referencePrice: '500〜800円', selected: false },
    { id: 'c3_10', name: '埋込ボックス', category: '配線器具', quantity: '', unit: '個', unitPrice: 300, referencePrice: '250〜450円', selected: false },
    { id: 'c3_11', name: 'プレート', category: '配線器具', quantity: '', unit: '個', unitPrice: 150, referencePrice: '100〜200円', selected: false },
    { id: 'c3_12', name: '接地極付コンセント（1E）', category: '配線器具', quantity: '', unit: '個', unitPrice: 1400, referencePrice: '1,200〜1,600円', selected: false },
    { id: 'c3_13', name: '接地極付ダブルコンセント（2E）', category: '配線器具', quantity: '', unit: '個', unitPrice: 1750, referencePrice: '1,500〜2,000円', selected: false },
    { id: 'c3_14', name: '20A 兼用コンセント（125V）', category: '配線器具', quantity: '', unit: '個', unitPrice: 2100, referencePrice: '1,800〜2,400円', selected: false },
    { id: 'c3_15', name: '20A 接地極付コンセント（250V / 2EET）', category: '配線器具', quantity: '', unit: '個', unitPrice: 3000, referencePrice: '2,500〜3,500円', selected: false },
    { id: 'c3_16', name: 'EV充電用コンセント（WK4322等）', category: '配線器具', quantity: '', unit: '個', unitPrice: 5000, referencePrice: '4,000〜6,000円', selected: false },
    { id: 'c3_17', name: '調光スイッチ（LED対応）', category: '配線器具', quantity: '', unit: '個', unitPrice: 7500, referencePrice: '6,000〜9,000円', selected: false },
    { id: 'c3_18', name: 'センサー付スイッチ（親機）', category: '配線器具', quantity: '', unit: '個', unitPrice: 9000, referencePrice: '7,000〜11,000円', selected: false },
    { id: 'c3_19', name: 'プルボックス（150角）', category: '配線器具', quantity: '', unit: '個', unitPrice: 3000, referencePrice: '2,500〜3,500円', selected: false },
    { id: 'c3_22', name: 'ステップル（100個入/箱）', category: '配線器具', quantity: '', unit: '箱', unitPrice: 750, referencePrice: '600〜900円', selected: false },
    { id: 'c3_23', name: '20A 接地極付埋込コンセント (2EET/125V)', category: '配線器具', quantity: '', unit: '個', unitPrice: 2700, referencePrice: '2,200〜3,200円', selected: false },
    { id: 'c3_24', name: '20A 接地極付埋込コンセント (2EET/250V)', category: '配線器具', quantity: '', unit: '個', unitPrice: 3300, referencePrice: '2,800〜3,800円', selected: false },
    { id: 'c3_25', name: '埋込アースターミナル付接地コンセント', category: '配線器具', quantity: '', unit: '個', unitPrice: 2150, referencePrice: '1,800〜2,500円', selected: false },

    // 機器
    { id: 'c4_1', name: '換気扇', category: '機器', quantity: '', unit: '台', unitPrice: 8000, referencePrice: '7000〜10000円', selected: false },
    { id: 'c4_2', name: '分電盤', category: '機器', quantity: '', unit: '面', unitPrice: 30000, referencePrice: '25000〜40000円', selected: false },
    { id: 'c4_3', name: 'エアコン取付', category: '機器', quantity: '', unit: '台', unitPrice: 20000, referencePrice: '15000〜25000円', selected: false },
    { id: 'c4_4', name: '専用回路', category: '機器', quantity: '', unit: '箇所', unitPrice: 20000, referencePrice: '18000〜25000円', selected: false },
    { id: 'c4_5', name: '電圧切替', category: '機器', quantity: '', unit: '箇所', unitPrice: 5000, referencePrice: '4000〜8000円', selected: false },
    { id: 'c4_6', name: '動力回路', category: '機器', quantity: '', unit: '回路', unitPrice: 15000, referencePrice: '12000〜20000円', selected: false },
    { id: 'c4_7', name: '安全ブレーカー（20A）', category: '機器', quantity: '', unit: '個', unitPrice: 1500, referencePrice: '1,200〜1,800円', selected: false },
    { id: 'c4_8', name: '漏電遮断器（2P1E/20A）', category: '機器', quantity: '', unit: '個', unitPrice: 5500, referencePrice: '4,500〜6,500円', selected: false },
    { id: 'c4_9', name: '漏電遮断器（3P2E/50A）', category: '機器', quantity: '', unit: '個', unitPrice: 15000, referencePrice: '12,000〜18,000円', selected: false },
    { id: 'c4_10', name: '電力量計ボックス', category: '機器', quantity: '', unit: '個', unitPrice: 4500, referencePrice: '3,500〜5,500円', selected: false },

    // 人工
    { id: 'c5_1', name: '人工費', category: '人工', quantity: '', unit: '人工', unitPrice: 20000, referencePrice: '18000〜25000円', selected: false },

    // 経費
    { id: 'c6_1', name: '諸経費', category: '経費', quantity: '', unit: '', unitPrice: 10000, selected: false },
    { id: 'c6_2', name: '交通費', category: '経費', quantity: '', unit: '', unitPrice: 3000, selected: false },
    { id: 'c6_3', name: '駐車場代', category: '経費', quantity: '', unit: '', unitPrice: 1000, selected: false },
    { id: 'c6_4', name: '高所作業費', category: '経費', quantity: '', unit: '', unitPrice: 8000, selected: false },
    { id: 'c6_5', name: '雑費', category: '経費', quantity: '', unit: '', unitPrice: 5000, selected: false },

    // 動的入力用（電線）
    { id: 'dyn_cv_default', name: '', category: '電線', quantity: '', unit: 'm', unitPrice: 0, selected: false, itemType: 'cv', cvtSize: '', cvtCores: 3 },
    { id: 'dyn_cvt_default', name: '', category: '電線', quantity: '', unit: 'm', unitPrice: 0, selected: false, itemType: 'cvt', cvtSize: '', cvtCores: 3 },
    { id: 'dyn_slat_default', name: '', category: '電線', quantity: '', unit: 'm', unitPrice: 0, selected: false, itemType: 'slat', cvtSize: '', cvtCores: 3 },

    // 自由入力欄（各カテゴリ）
    { id: 'dyn_free_cable', name: '', category: '電線', quantity: '', unit: 'm', unitPrice: 0, selected: false, itemType: 'free' },
    { id: 'dyn_free_pipe', name: '', category: '配管', quantity: '', unit: 'm', unitPrice: 0, selected: false, itemType: 'free' },
    { id: 'dyn_free_device', name: '', category: '配線器具', quantity: '', unit: '個', unitPrice: 0, selected: false, itemType: 'free' },
    { id: 'dyn_free_machine', name: '', category: '機器', quantity: '', unit: '台', unitPrice: 0, selected: false, itemType: 'free' },
    { id: 'dyn_free_labor', name: '', category: '人工', quantity: '', unit: '人工', unitPrice: 0, selected: false, itemType: 'free' },
    { id: 'dyn_free_expense', name: '', category: '経費', quantity: '', unit: '', unitPrice: 0, selected: false, itemType: 'free' },
];
