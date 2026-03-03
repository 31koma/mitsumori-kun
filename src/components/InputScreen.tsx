import { useState } from 'react';
import { type EstimateItem, type Category, type EstimateInfo } from '../types';
import { ChevronRight, ChevronDown, Trash2, Sparkles } from 'lucide-react';

interface InputScreenProps {
    items: EstimateItem[];
    info: EstimateInfo;
    customRefs: Record<string, string>;
    copperRate: string;
    copperRateDate: string;
    updateItem: (id: string, updates: Partial<EstimateItem>) => void;
    updateInfo: (updates: Partial<EstimateInfo>) => void;
    updateCustomRef: (name: string, price: string) => void;
    onUpdateCopperRate: (rate: string) => void;
    addItem: (item: EstimateItem) => void;
    removeItem: (id: string) => void;
    onNext: () => void;
    onReset: () => void;
    onEditRefPrice?: () => void;
}

const CATEGORIES: Category[] = ['電線', '配管', '配線器具', '機器', '人工', '経費'];

export default function InputScreen({ items, info, customRefs, copperRate, copperRateDate, updateItem, updateInfo, updateCustomRef, onUpdateCopperRate, addItem, removeItem, onNext, onReset, onEditRefPrice }: InputScreenProps) {
    const [openCategories, setOpenCategories] = useState<Set<Category>>(new Set());
    const [aiText, setAiText] = useState('');
    const [isAIOpen, setIsAIOpen] = useState(false);

    const toggleCategory = (category: Category) => {
        setOpenCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(category)) {
                newSet.delete(category);
            } else {
                newSet.add(category);
            }
            return newSet;
        });
    };

    const handleAddCable = (type: 'cv' | 'cvt' | 'slat') => {
        addItem({
            id: `dyn_${type}_` + Date.now() + Math.random(),
            name: '',
            category: '電線',
            quantity: '',
            unit: 'm',
            unitPrice: 0,
            selected: false,
            itemType: type,
            cvtSize: '',
            cvtCores: 3
        });
    };

    const handleAddFree = (cat: Category) => {
        const defaultUnit = cat === '人工' ? '人工' : (cat === '経費' ? '' : (cat === '電線' || cat === '配管' ? 'm' : '個'));
        addItem({
            id: 'dyn_free_' + Date.now() + Math.random(),
            name: '',
            category: cat,
            quantity: '',
            unit: defaultUnit,
            unitPrice: 0,
            selected: false,
            itemType: 'free'
        });
    };

    const handleUpdateItem = (id: string, updates: Partial<EstimateItem>) => {
        updateItem(id, updates);

        const item = items.find(i => i.id === id);
        if (!item || !item.itemType) return;

        const wasEmpty = item.itemType === 'free' ? !item.name : !item.cvtSize;
        const isNowFilled = item.itemType === 'free'
            ? !!(updates.name || (updates.name === undefined && item.name))
            : !!(updates.cvtSize || (updates.cvtSize === undefined && item.cvtSize));

        if (wasEmpty && isNowFilled) {
            const sameType = items.filter(i => i.category === item.category && i.itemType === item.itemType);
            const hasEmpty = sameType.some(i => i.id !== id && (i.itemType === 'free' ? !i.name : !i.cvtSize));
            if (!hasEmpty) {
                setTimeout(() => {
                    if (item.itemType === 'free') {
                        handleAddFree(item.category);
                    } else if (item.itemType === 'cv' || item.itemType === 'cvt' || item.itemType === 'slat') {
                        handleAddCable(item.itemType as any);
                    }
                }, 10);
            }
        }
    };

    const getItemsByCategory = (cat: Category) => items.filter(item => item.category === cat);
    const selectedCount = items.filter(i => i.selected && (i.category === '経費' ? Number(i.unitPrice) > 0 : Number(i.quantity) > 0)).length;

    const handleParseAI = () => {
        if (!aiText) return;

        const lines = aiText.split('\n');
        let addedCount = 0;

        lines.forEach(line => {
            if (!line.trim()) return;

            let name = '';
            let valStr = '';

            // Try to separate by full-width or half-width colon
            const separatorMatch = line.match(/(.*?)[:：](.*)/);
            if (separatorMatch) {
                name = separatorMatch[1].trim();
                valStr = separatorMatch[2].trim();
            } else {
                // If it doesn't have a colon, maybe it's separated by space
                const spaceMatch = line.match(/(.*?)\s+([0-9]+.*)/);
                if (spaceMatch) {
                    name = spaceMatch[1].trim();
                    valStr = spaceMatch[2].trim();
                }
            }

            if (!name || !valStr) return;

            const qtyMatch = valStr.match(/^([0-9.]+)(.*)$/);
            if (!qtyMatch) return;

            const qty = Number(qtyMatch[1]);
            const inputUnit = qtyMatch[2].trim();

            if (isNaN(qty)) return;

            // Guess category
            let cat: Category = '電線';
            if (name.includes('管') || name.includes('PF') || name.includes('VE') || name.includes('CD') || name.includes('モール')) cat = '配管';
            else if (name.includes('コンセント') || name.includes('スイッチ') || name.includes('ボックス') || name.includes('シーリング') || name.includes('プレート')) cat = '配線器具';
            else if (name.includes('盤') || name.includes('換気扇') || name.includes('エアコン') || name.includes('取付') || name.includes('回路')) cat = '機器';
            else if (name.includes('人工')) cat = '人工';
            else if (name.includes('費') || name.includes('代')) cat = '経費';

            // Check for exact match in existing non-free items first
            const existingItem = items.find(i => i.name === name && i.itemType !== 'free');

            if (existingItem) {
                updateItem(existingItem.id, { quantity: String(qty), selected: true });
                addedCount++;
            } else {
                // Add as a new free item
                addItem({
                    id: 'dyn_free_ai_' + Date.now() + Math.random(),
                    name: name,
                    category: cat,
                    quantity: String(qty),
                    unit: inputUnit || (cat === '人工' ? '人工' : (cat === '経費' ? '' : (cat === '電線' || cat === '配管' ? 'm' : '個'))),
                    unitPrice: '',
                    selected: true,
                    itemType: 'free'
                });
                addedCount++;
            }
        });

        if (addedCount > 0) {
            alert(`AI解析結果から ${addedCount} 件の項目を読み込みました！`);
            setAiText('');
            setIsAIOpen(false);
        } else {
            alert('読み込めるデータが見つかりませんでした。\n「品名：数量」の形式になっているか確認してください。');
        }
    };

    const CABLE_NAMES = { cv: 'CV', cvt: 'CVT', slat: 'ニュースラ（NS）' };

    return (
        <div className="container" style={{ paddingBottom: '80px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h1 style={{ margin: 0 }}>項目入力</h1>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {onEditRefPrice && (
                            <button
                                className="btn btn-secondary"
                                onClick={onEditRefPrice}
                                style={{ fontSize: '0.875rem', padding: '0.4rem 0.75rem', color: 'var(--primary)', borderColor: 'var(--primary)' }}
                            >
                                参考価格更新
                            </button>
                        )}
                        <button
                            className="btn btn-secondary"
                            onClick={() => {
                                const newRate = window.prompt('新しい銅建値（万円／t）を入力してください', copperRate);
                                if (newRate !== null) {
                                    onUpdateCopperRate(newRate);
                                }
                            }}
                            style={{ fontSize: '0.875rem', padding: '0.4rem 0.75rem', color: 'var(--primary)', borderColor: 'var(--primary)' }}
                        >
                            銅建値更新
                        </button>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        現在の銅建値：{copperRate}万円／t（更新日：{copperRateDate}）
                    </span>
                </div>
            </div>

            <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
                <h2>基本情報</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>顧客名</label>
                    <input
                        type="text"
                        value={info.customerName}
                        onChange={e => updateInfo({ customerName: e.target.value })}
                        style={{ width: '100%' }}
                        placeholder="例：〇〇株式会社 様"
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>工事名</label>
                    <input
                        type="text"
                        value={info.projectName}
                        onChange={e => updateInfo({ projectName: e.target.value })}
                        style={{ width: '100%' }}
                        placeholder="例：本社ビル 電気設備改修工事"
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>工事場所（住所）</label>
                    <input
                        type="text"
                        value={info.address}
                        onChange={e => updateInfo({ address: e.target.value })}
                        style={{ width: '100%' }}
                        placeholder="例：東京都..."
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>担当者</label>
                    <input
                        type="text"
                        value={info.assignee}
                        onChange={e => updateInfo({ assignee: e.target.value })}
                        style={{ width: '100%' }}
                    />
                </div>
            </section>

            <section className="card" style={{ padding: '0', overflow: 'hidden', marginBottom: '1rem', border: '1px solid var(--primary)' }}>
                <button
                    onClick={() => setIsAIOpen(!isAIOpen)}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '1.5rem',
                        background: 'rgba(59, 130, 246, 0.05)',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        color: 'var(--primary)',
                        borderBottom: isAIOpen ? '1px solid var(--border-color)' : 'none'
                    }}
                >
                    {isAIOpen ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                    <Sparkles size={20} />
                    <h2 style={{ margin: 0, padding: 0, border: 'none', fontSize: '1.2rem' }}>AI図面解析結果 読み込み</h2>
                </button>
                {isAIOpen && (
                    <div style={{ padding: '1.5rem' }}>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: '1.5' }}>
                            図面からAIが抽出したテキスト結果を貼り付けてください。<br />
                            「品名：数量」の形式から自動でカテゴリーと項目を認識してリストに追加します。（例：CVT60sq：35m）
                        </p>
                        <textarea
                            value={aiText}
                            onChange={(e) => setAiText(e.target.value)}
                            placeholder={"CVT60sq：35m\nPF22：20m\nコンセント：6個"}
                            style={{
                                width: '100%',
                                minHeight: '120px',
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-color)',
                                resize: 'vertical',
                                marginBottom: '1rem',
                                fontFamily: 'inherit'
                            }}
                        />
                        <button className="btn btn-primary" onClick={handleParseAI} style={{ width: '100%' }}>
                            <Sparkles size={16} /> 結果を反映する
                        </button>
                    </div>
                )}
            </section>

            {CATEGORIES.map(category => {
                const isOpen = openCategories.has(category);
                return (
                    <section key={category} className="category-section card" style={{ padding: '0', overflow: 'hidden' }}>
                        <button
                            onClick={() => toggleCategory(category)}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '1.5rem',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                textAlign: 'left',
                                color: 'var(--text-main)',
                                borderBottom: isOpen ? '2px solid var(--border-color)' : 'none'
                            }}
                        >
                            {isOpen ? <ChevronDown size={24} color="var(--primary)" /> : <ChevronRight size={24} color="var(--primary)" />}
                            <h2 style={{ margin: 0, padding: 0, border: 'none' }}>{category}</h2>
                        </button>

                        {isOpen && (
                            <div className="items-list" style={{ padding: '1.5rem', paddingTop: '1rem' }}>
                                {getItemsByCategory(category).map(item => {
                                    const isDynamic = !!item.itemType;
                                    const isCable = item.itemType === 'cv' || item.itemType === 'cvt' || item.itemType === 'slat';
                                    const isCvt = item.itemType === 'cvt';
                                    const cableName = isCable ? CABLE_NAMES[item.itemType as 'cv' | 'cvt' | 'slat'] : '';

                                    const getCableFullName = (size: number | string, cores: number | string) =>
                                        isCvt ? `${cableName} ${size}sq` : `${cableName} ${size}sq-${cores}C`;

                                    const displayName = item.itemType === 'free'
                                        ? (item.name || '＋ 自由入力追加')
                                        : (isCable ? (item.cvtSize ? getCableFullName(item.cvtSize, item.cvtCores || '') : `＋ ${cableName}追加`) : item.name);

                                    const isEmpty = item.itemType === 'free' ? !item.name : (isCable ? !item.cvtSize : false);

                                    let displayRefPrice = '';
                                    let isCustomRef = false;
                                    if (category !== '経費') {
                                        if (item.referencePrice) {
                                            displayRefPrice = `参考: ${item.referencePrice}`;
                                        } else if (item.name) {
                                            const found = items.find(i => i.name === item.name && i.referencePrice);
                                            if (found && found.referencePrice) {
                                                displayRefPrice = `参考: ${found.referencePrice}`;
                                            } else if (customRefs[item.name]) {
                                                displayRefPrice = `参考: ${customRefs[item.name]}`;
                                                isCustomRef = true;
                                            } else {
                                                displayRefPrice = '参考価格なし';
                                            }
                                        }
                                    }

                                    return (
                                        <div key={item.id} className={`item-row ${item.selected ? 'selected' : ''}`} style={isEmpty ? { opacity: 0.7, backgroundColor: 'transparent', borderColor: 'var(--border-color)', borderStyle: 'dashed' } : undefined}>
                                            {category !== '人工' && (
                                                <div className="item-header" style={isDynamic ? { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } : undefined}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <input
                                                            type="checkbox"
                                                            id={`check-${item.id}`}
                                                            checked={item.selected}
                                                            onChange={(e) => handleUpdateItem(item.id, { selected: e.target.checked })}
                                                        />
                                                        <label htmlFor={`check-${item.id}`} style={{ fontWeight: 600, cursor: 'pointer', color: isEmpty ? 'var(--text-muted)' : 'var(--text-main)' }}>
                                                            {displayName}
                                                        </label>
                                                    </div>
                                                    {isDynamic && !isEmpty && (
                                                        <button
                                                            onClick={() => removeItem(item.id)}
                                                            className="btn btn-secondary"
                                                            style={{ border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                                                        >
                                                            <Trash2 size={16} /> 削除
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {isCable && (
                                                <div className="item-inputs" style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px dashed var(--border-color)', width: '100%', display: 'flex' }}>
                                                    <div className="input-group">
                                                        <label>{cableName} サイズ</label>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                            <input
                                                                type="text"
                                                                inputMode="decimal"
                                                                value={item.cvtSize}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val !== '' && !/^[0-9]*\.?[0-9]*$/.test(val)) return;
                                                                    handleUpdateItem(item.id, {
                                                                        cvtSize: val,
                                                                        name: val ? getCableFullName(val, item.cvtCores || '') : '',
                                                                        selected: !!val || item.selected
                                                                    });
                                                                }}
                                                                placeholder=""
                                                                style={{ width: '60px', padding: '0.5rem', textAlign: 'right' }}
                                                            />
                                                            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>sq</span>
                                                        </div>
                                                    </div>
                                                    {!isCvt && (
                                                        <div className="input-group">
                                                            <label>芯数</label>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                                <input
                                                                    type="text"
                                                                    inputMode="numeric"
                                                                    value={item.cvtCores}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        if (val !== '' && !/^[0-9]*$/.test(val)) return;
                                                                        handleUpdateItem(item.id, {
                                                                            cvtCores: val,
                                                                            name: item.cvtSize ? getCableFullName(item.cvtSize, val) : ''
                                                                        });
                                                                    }}
                                                                    placeholder="3"
                                                                    style={{ width: '50px', padding: '0.5rem', textAlign: 'right' }}
                                                                />
                                                                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>C</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {item.itemType === 'free' && (
                                                <div className="item-inputs" style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px dashed var(--border-color)', width: '100%', display: 'block' }}>
                                                    <div className="input-group" style={{ width: '100%' }}>
                                                        <label>項目名</label>
                                                        <input
                                                            type="text"
                                                            value={item.name}
                                                            onChange={(e) => handleUpdateItem(item.id, {
                                                                name: e.target.value,
                                                                selected: !!e.target.value || item.selected
                                                            })}
                                                            placeholder="例：項目名を入力"
                                                            style={{ width: '100%', maxWidth: '300px' }}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            <div className="item-inputs">
                                                {category !== '経費' && (
                                                    <div className="input-group">
                                                        <label>{category === '人工' ? '人工数' : '数量'}</label>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                            <input
                                                                type="text"
                                                                inputMode="decimal"
                                                                value={item.quantity}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    // Allow empty string or numbers with up to one decimal point
                                                                    if (val !== '' && !/^[0-9]*\.?[0-9]*$/.test(val)) return;

                                                                    const numericVal = Number(val);
                                                                    const shouldSelect = val !== '' && numericVal > 0;
                                                                    handleUpdateItem(item.id, {
                                                                        quantity: val,
                                                                        selected: shouldSelect ? true : (numericVal === 0 || val === '' ? false : item.selected)
                                                                    });
                                                                }}
                                                                placeholder="0"
                                                                style={{ width: '80px', padding: '0.5rem', textAlign: 'right' }}
                                                            />
                                                            {category !== '人工' && (
                                                                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{item.unit}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="input-group">
                                                    <label>{category === '人工' ? '人工単価（円）' : (category === '経費' ? '金額（円）' : '単価（円）')}</label>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <input
                                                            type="text"
                                                            inputMode="decimal"
                                                            value={item.unitPrice}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                // Allow empty string or numbers with up to one decimal point
                                                                if (val !== '' && !/^[0-9]*\.?[0-9]*$/.test(val)) return;

                                                                const numericVal = Number(val);
                                                                handleUpdateItem(item.id, {
                                                                    unitPrice: val,
                                                                    ...(category === '経費' ? { selected: val !== '' && numericVal > 0 } : {})
                                                                });
                                                            }}
                                                            style={{ width: '100px', padding: '0.5rem', textAlign: 'right' }}
                                                        />
                                                        {displayRefPrice && (
                                                            displayRefPrice === '参考価格なし' ? (
                                                                <button
                                                                    onClick={() => {
                                                                        if (!item.name) {
                                                                            alert('先に項目名を入力してください');
                                                                            return;
                                                                        }
                                                                        const price = prompt(`「${item.name}」の参考価格を登録します\n（例：100〜150円）`);
                                                                        if (price) {
                                                                            updateCustomRef(item.name, price);
                                                                        }
                                                                    }}
                                                                    className="btn btn-secondary"
                                                                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                                                                >
                                                                    + 参考価格登録
                                                                </button>
                                                            ) : (
                                                                <span
                                                                    style={{
                                                                        fontSize: '0.75rem',
                                                                        color: isCustomRef ? 'var(--primary)' : 'var(--text-muted)',
                                                                        whiteSpace: 'nowrap',
                                                                        cursor: isCustomRef ? 'pointer' : 'default',
                                                                        textDecoration: isCustomRef ? 'underline' : 'none'
                                                                    }}
                                                                    onClick={() => {
                                                                        if (isCustomRef && item.name) {
                                                                            const newPrice = prompt(`「${item.name}」の参考価格を編集しますか？\n（空にすると削除されます）`, customRefs[item.name]);
                                                                            if (newPrice !== null) {
                                                                                updateCustomRef(item.name, newPrice);
                                                                            }
                                                                        }
                                                                    }}
                                                                    title={isCustomRef ? "クリックして修正・削除" : ""}
                                                                >
                                                                    {displayRefPrice}
                                                                </span>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                );
            })}

            <div className="fixed-bottom-bar">
                <button className="btn btn-secondary" onClick={onReset} title="入力をリセット">
                    <Trash2 size={20} />
                </button>
                <button
                    className="btn btn-primary floating-action"
                    onClick={onNext}
                    disabled={selectedCount === 0}
                >
                    見積作成 ({selectedCount}項目)
                    <ChevronRight size={20} />
                </button>
            </div>
        </div>
    );
}
