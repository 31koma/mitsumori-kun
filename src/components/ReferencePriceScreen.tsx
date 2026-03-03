import { useState } from 'react';
import type { EstimateItem, Category } from '../types';
import { ArrowLeft, Save } from 'lucide-react';

interface ReferencePriceScreenProps {
    items: EstimateItem[];
    copperRate: string;
    copperRateDate: string;
    updateRefPrices: (newRefs: Record<string, string>) => void;
    onUpdateCopperRate: (rate: string) => void;
    onBack: () => void;
}

const CATEGORIES: Category[] = ['電線', '配管', '配線器具', '機器', '人工', '経費'];

export default function ReferencePriceScreen({ items, copperRate, copperRateDate, updateRefPrices, onUpdateCopperRate, onBack }: ReferencePriceScreenProps) {
    const [localCopperRate, setLocalCopperRate] = useState(copperRate);
    const [refs, setRefs] = useState<Record<string, string>>(() => {
        const initialMap: Record<string, string> = {};
        items.forEach(item => {
            if (!item.itemType) { // only standard items
                initialMap[item.id] = item.referencePrice || '';
            }
        });
        return initialMap;
    });

    const handleSave = () => {
        updateRefPrices(refs);
        if (localCopperRate !== copperRate) {
            onUpdateCopperRate(localCopperRate);
        }
        alert('参考価格と銅建値を更新し、保存しました！');
        onBack();
    };

    const getItemsByCategory = (cat: Category) => items.filter(item => item.category === cat && !item.itemType);

    return (
        <div className="container" style={{ paddingBottom: '80px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <h1 style={{ margin: 0 }}>参考価格の編集</h1>
            </div>

            <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.875rem', lineHeight: '1.5' }}>
                各項目の参考価格（相場）および銅建値を編集できます。変更した内容はブラウザに保存され、次回の見積もり作成時にも引き継がれます。
            </p>

            <section className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>銅建値の設定</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                        <div>
                            <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>現在の銅建値</label>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>更新日：{copperRateDate}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={localCopperRate}
                                onChange={e => setLocalCopperRate(e.target.value)}
                                style={{ width: '80px', textAlign: 'right', padding: '0.4rem' }}
                            />
                            <span style={{ fontSize: '0.875rem' }}>万円／t</span>
                        </div>
                    </div>
                </div>
            </section>

            <details style={{
                marginBottom: '1.5rem',
                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '1rem',
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                lineHeight: '1.6'
            }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: 'var(--primary)', outline: 'none' }}>材料単価について（2026年基準）</summary>
                <div style={{ marginTop: '0.75rem' }}>
                    本見積の材料単価は、2026年現在の市場相場を参考にした材料費のみの単価です。<br />
                    工賃・運搬費・施工費等は含まれていません。<br /><br />

                    <strong>1. 現在の価格感（2026年3月時点）</strong><br />
                    ・国内銅建値： 約1,650円〜1,850円 /kg<br /><br />

                    <strong>【2026年度 電気工事材料単価 判定結果】</strong><br />
                    ・ケーブル・配管：<strong>【妥当〜良心的】</strong><br />
                    銅価格・樹脂価格の高騰を適切に反映。<br />
                    1mあたりの単価設定として原価にロス分を加味した適正価格。<br /><br />

                    ・配線器具（コンセント等）：<strong>【標準的】</strong><br />
                    コスモシリーズ等の標準品（枠・ハンドル込）想定の適正価格。<br />
                    高機能品は別途加算。<br /><br />

                    ・機器類（換気扇・盤）：<strong>【妥当】</strong><br />
                    普及価格帯の本体価格として適正。<br />
                    仕様により変動あり。<br /><br />

                    ※材料単価は参考価格です。仕入価格により変動します。
                </div>
            </details>

            {CATEGORIES.map(category => {
                const categoryItems = getItemsByCategory(category);
                if (categoryItems.length === 0) return null;

                return (
                    <section key={category} className="card" style={{ marginBottom: '1rem', padding: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>{category}</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {categoryItems.map(item => (
                                <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                                    <span style={{ fontWeight: 500, flex: 1 }}>{item.name}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                                        <input
                                            type="text"
                                            value={refs[item.id] ?? ''}
                                            onChange={(e) => setRefs(prev => ({ ...prev, [item.id]: e.target.value }))}
                                            placeholder="例: 100〜150円"
                                            style={{ width: '100%', padding: '0.5rem' }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                );
            })}

            <div className="fixed-bottom-bar" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button className="btn btn-secondary" onClick={onBack}>
                    <ArrowLeft size={16} /> 戻る
                </button>
                <button className="btn btn-primary" onClick={handleSave}>
                    <Save size={16} /> 参考価格を保存して戻る
                </button>
            </div>
        </div>
    );
}
