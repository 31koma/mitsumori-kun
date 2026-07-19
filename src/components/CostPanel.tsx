import { useState, useEffect } from 'react';
import { TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';
import type { EstimateItem } from '../types';

interface CostPanelProps {
    items: EstimateItem[];
}

const MATERIAL_CATEGORIES = ['電線', '配管', '配線器具', '機器'];

// 原価管理パネル: 材料原価・人件費・利益率をリアルタイム表示
export default function CostPanel({ items }: CostPanelProps) {
    const [isOpen, setIsOpen] = useState(true);
    const [materialCostRate, setMaterialCostRate] = useState<string>(() => {
        return localStorage.getItem('mitsumori-kun-material-cost-rate') || '70';
    });
    const [laborCostRate, setLaborCostRate] = useState<string>(() => {
        return localStorage.getItem('mitsumori-kun-labor-cost-rate') || '85';
    });

    useEffect(() => {
        localStorage.setItem('mitsumori-kun-material-cost-rate', materialCostRate);
    }, [materialCostRate]);

    useEffect(() => {
        localStorage.setItem('mitsumori-kun-labor-cost-rate', laborCostRate);
    }, [laborCostRate]);

    const selectedItems = items.filter(i => i.selected);

    const amountOf = (item: EstimateItem) => {
        const price = Number(item.unitPrice) || 0;
        if (item.category === '経費') return price;
        return (Number(item.quantity) || 0) * price;
    };

    const materialSales = selectedItems.filter(i => MATERIAL_CATEGORIES.includes(i.category)).reduce((a, i) => a + amountOf(i), 0);
    const laborSales = selectedItems.filter(i => i.category === '人工').reduce((a, i) => a + amountOf(i), 0);
    const expenseSales = selectedItems.filter(i => i.category === '経費').reduce((a, i) => a + amountOf(i), 0);
    const subtotal = materialSales + laborSales + expenseSales;

    const mRate = Math.min(Math.max(Number(materialCostRate) || 0, 0), 200) / 100;
    const lRate = Math.min(Math.max(Number(laborCostRate) || 0, 0), 200) / 100;

    const materialCost = Math.round(materialSales * mRate);
    const laborCost = Math.round(laborSales * lRate);
    const expenseCost = expenseSales; // 経費は実費扱い
    const totalCost = materialCost + laborCost + expenseCost;
    const profit = subtotal - totalCost;
    const margin = subtotal > 0 ? (profit / subtotal) * 100 : 0;

    const fmt = (n: number) => new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(n);

    const marginColor = margin >= 30 ? 'var(--success, #10b981)' : margin >= 15 ? '#f59e0b' : '#ef4444';

    return (
        <section className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1rem', border: '1px solid #10b981' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '1.5rem',
                    background: 'rgba(16, 185, 129, 0.05)',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: '#059669',
                    borderBottom: isOpen ? '1px solid var(--border-color)' : 'none'
                }}
            >
                {isOpen ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                <TrendingUp size={20} />
                <h2 style={{ margin: 0, padding: 0, border: 'none', fontSize: '1.2rem' }}>原価管理</h2>
                <span style={{ marginLeft: 'auto', fontSize: '0.9rem', fontWeight: 'bold', color: marginColor }}>
                    利益率 {margin.toFixed(1)}%
                </span>
            </button>

            {isOpen && (
                <div style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>材料原価率（%）</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={materialCostRate}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val !== '' && !/^[0-9]*\.?[0-9]*$/.test(val)) return;
                                    setMaterialCostRate(val);
                                }}
                                style={{ width: '80px', padding: '0.5rem', textAlign: 'right' }}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>人工原価率（%）</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={laborCostRate}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val !== '' && !/^[0-9]*\.?[0-9]*$/.test(val)) return;
                                    setLaborCostRate(val);
                                }}
                                style={{ width: '80px', padding: '0.5rem', textAlign: 'right' }}
                            />
                        </div>
                    </div>

                    <table style={{ width: '100%', fontSize: '0.9rem', borderCollapse: 'collapse' }}>
                        <tbody>
                            <tr>
                                <td style={{ padding: '0.4rem 0', color: 'var(--text-muted)' }}>売上（税抜小計）</td>
                                <td style={{ padding: '0.4rem 0', textAlign: 'right', fontWeight: 600 }}>{fmt(subtotal)}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '0.4rem 0', color: 'var(--text-muted)' }}>材料原価（売価 {fmt(materialSales)} × {materialCostRate || 0}%）</td>
                                <td style={{ padding: '0.4rem 0', textAlign: 'right' }}>{fmt(materialCost)}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '0.4rem 0', color: 'var(--text-muted)' }}>人件費（人工 {fmt(laborSales)} × {laborCostRate || 0}%）</td>
                                <td style={{ padding: '0.4rem 0', textAlign: 'right' }}>{fmt(laborCost)}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '0.4rem 0', color: 'var(--text-muted)' }}>経費（実費）</td>
                                <td style={{ padding: '0.4rem 0', textAlign: 'right' }}>{fmt(expenseCost)}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '0.6rem 0', fontWeight: 700 }}>粗利</td>
                                <td style={{ padding: '0.6rem 0', textAlign: 'right', fontWeight: 700, color: marginColor }}>
                                    {fmt(profit)}（{margin.toFixed(1)}%）
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                        ※ 原価率は概算です。実際の仕入価格に合わせて調整してください（設定は自動保存されます）。
                    </p>
                </div>
            )}
        </section>
    );
}
