import { ArrowLeft, FileText, Trash2, Edit2 } from 'lucide-react';
import type { SavedEstimate } from '../types';

interface SavedEstimatesScreenProps {
    savedEstimates: SavedEstimate[];
    onBack: () => void;
    onLoad: (estimate: SavedEstimate) => void;
    onDelete: (id: string) => void;
}

export default function SavedEstimatesScreen({ savedEstimates, onBack, onLoad, onDelete }: SavedEstimatesScreenProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount);
    };

    const getEstimateTotal = (estimate: SavedEstimate) => {
        const selectedItems = estimate.items.filter(i => i.selected && (i.category === '経費' ? Number(i.unitPrice) > 0 : Number(i.quantity) > 0));
        const subtotal = selectedItems.reduce((acc, item) => {
            const price = Number(item.unitPrice) || 0;
            if (item.category === '経費') {
                return acc + price;
            }
            const qty = Number(item.quantity) || 0;
            return acc + (qty * price);
        }, 0);
        return subtotal + Math.floor(subtotal * 0.1);
    };

    return (
        <div className="container" style={{ paddingBottom: '80px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <FileText size={28} color="var(--primary)" />
                <h1 style={{ margin: 0 }}>保存した見積データ</h1>
            </div>

            {savedEstimates.length === 0 ? (
                <div className="empty-state card">
                    <p>保存された見積データはありません。</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>見積画面から「この見積を保存」を押すとここにリストされます。</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {savedEstimates.map((estimate) => (
                        <div key={estimate.id} className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.125rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {estimate.info.projectName || '（工事名未設定）'}
                                    </h3>
                                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                        見積番号: {estimate.estimateNumber || 'なし'}
                                    </p>
                                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                        顧客名: {estimate.info.customerName || '未設定'}
                                    </p>
                                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                        保存日時: {estimate.date}
                                    </p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                                        {formatCurrency(getEstimateTotal(estimate))}
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px dashed var(--border-color)', paddingTop: '1rem' }}>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        if (confirm('この見積データを削除しますか？\n（この操作は元に戻せません）')) {
                                            onDelete(estimate.id);
                                        }
                                    }}
                                    style={{ color: 'var(--danger)', borderColor: 'var(--danger)', padding: '0.5rem' }}
                                    title="削除"
                                >
                                    <Trash2 size={16} />
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => onLoad(estimate)}
                                    style={{ padding: '0.5rem 1rem' }}
                                >
                                    <Edit2 size={16} /> このデータを編集する
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="fixed-bottom-bar">
                <button className="btn btn-secondary" onClick={onBack}>
                    <ArrowLeft size={20} />
                    トップへ戻る
                </button>
            </div>
        </div>
    );
}
