import { useMemo, useState } from 'react';
import { ArrowLeft, Copy, MapPinned, Minus, Plus, RotateCcw, Trash2 } from 'lucide-react';

import { defaultItems, type PlotDrawingState, type PlotPlacement } from '../types';

const SYMBOL_COLORS = ['#2563eb', '#0f766e', '#0369a1', '#d97706', '#7c3aed', '#ea580c', '#059669', '#dc2626'];
type SymbolType = { key: string; name: string; short: string; color: string; label?: string };
type PaletteGroup = { key: string; label: string; short: string; color: string; children: SymbolType[] };
type OpenPalettePanel = { groupKey: string; top: number; left: number } | null;
type PalettePosition = { top: number; left: number };

const getSymbolShort = (name: string, index: number) => {
    if (name.includes('3P 20A')) return '3P20A';
    if (name.includes('3P 30A')) return '3P30A';
    if (name.includes('4P / 250V') && name.includes('20A')) return '4P20A';
    if (name.includes('4P / 250V') && name.includes('30A')) return '4P30A';
    if (name.includes('防水形動力')) return 'WP動力';
    const parenMatch = name.match(/[（(]([^）)]+)[）)]/);
    if (parenMatch?.[1]) return parenMatch[1].replace(/\s+/g, '').slice(0, 4);
    if (name.includes('コンセント')) return name.includes('防水') ? 'WP' : 'C';
    if (name.includes('スイッチ')) return name.includes('3路') ? '3W' : name.includes('4路') ? '4W' : 'S';
    if (name.includes('シーリング')) return 'CS';
    if (name.includes('ボックス')) return 'BOX';
    if (name.includes('プレート')) return 'PL';
    return `${index + 1}`;
};

const getSymbolColor = (name: string, index: number) => {
    if (name.includes('防水形動力')) return '#7c3aed';
    if (name.includes('3P 30A') || name.includes('4P / 250V')) return '#dc2626';
    if (name.includes('3P 20A')) return '#b45309';
    if (name.includes('250V') || name.includes('200V') || name.includes('2EET')) return '#dc2626';
    if (name.includes('1E') || name.includes('接地極付')) return '#0f766e';
    if (name.includes('DL')) return '#7c3aed';
    if (name.includes('ベースライト')) return '#0891b2';
    if (name.includes('シーリング')) return '#ea580c';
    return SYMBOL_COLORS[index % SYMBOL_COLORS.length];
};

const isSymbolType = (value: SymbolType | undefined): value is SymbolType => Boolean(value);

const DEVICE_ITEMS: SymbolType[] = defaultItems
    .filter((item) => (item.category === '配線器具' || item.category === '機器') && !item.itemType)
    .map((item, index) => ({
        key: `device_${index + 1}`,
        name: item.name,
        short: getSymbolShort(item.name, index),
        color: getSymbolColor(item.name, index),
    }));

const findSymbol = (name: string) => DEVICE_ITEMS.find((item) => item.name === name);
const withLabel = (name: string, label: string) => {
    const symbol = findSymbol(name);
    return symbol ? { ...symbol, label } : undefined;
};
const POWER_CHILDREN: SymbolType[] = [
    withLabel('3P 20A 引掛形コンセント（埋込/露出）', '動力 3P20A'),
    withLabel('3P 30A 引掛形コンセント（埋込/露出）', '動力 3P30A'),
    withLabel('接地3P 20A 引掛形コンセント（4P / 250V）', '動力 4P20A'),
    withLabel('接地3P 30A 引掛形コンセント（4P / 250V）', '動力 4P30A'),
    withLabel('防水形動力コンセント（屋外・工場用）', '防水動力'),
].filter(isSymbolType) as SymbolType[];

const PALETTE_GROUPS: PaletteGroup[] = [
    {
        key: 'outlet',
        label: 'コンセント',
        short: 'C',
        color: '#2563eb',
        children: [
            'コンセント',
            'ダブルコンセント',
            '接地極付コンセント（1E）',
            '接地極付ダブルコンセント（2E）',
            '家具コンセント',
            '防水コンセント',
            '動力コンセント',
            '20A 兼用コンセント（125V）',
            '20A 接地極付コンセント（250V / 2EET）',
            '20A 接地極付埋込コンセント (2EET/125V)',
            '20A 接地極付埋込コンセント (2EET/250V)',
            '埋込アースターミナル付接地コンセント',
            'EV充電用コンセント（WK4322等）',
        ].map((name) => findSymbol(name)).filter(isSymbolType),
    },
    {
        key: 'switch',
        label: 'スイッチ',
        short: 'S',
        color: '#d97706',
        children: [
            'スイッチ',
            '3路スイッチ',
            '4路スイッチ',
            'センサー付スイッチ（親機）',
            '調光スイッチ（LED対応）',
        ].map((name) => findSymbol(name)).filter(isSymbolType),
    },
    {
        key: 'lighting',
        label: '照明',
        short: 'L',
        color: '#ea580c',
        children: [
            (() => {
                const symbol = findSymbol('引掛シーリング');
                return symbol ? { ...symbol, label: 'シーリング' } : undefined;
            })(),
            findSymbol('DL'),
            findSymbol('ベースライト'),
        ].filter(isSymbolType),
    },
    {
        key: 'box',
        label: 'ボックス',
        short: 'BOX',
        color: '#dc2626',
        children: ['露出ボックス', '埋込ボックス', 'プルボックス（150角）'].map((name) => findSymbol(name)).filter(isSymbolType),
    },
    {
        key: 'power',
        label: '動力',
        short: 'PWR',
        color: '#b45309',
        children: POWER_CHILDREN,
    },
].filter((group) => group.children.length > 0);

interface DrawingPlotScreenProps {
    onBack: () => void;
    onApplyToEstimate: (placements: PlotPlacement[]) => void;
    drawing: PlotDrawingState;
    placements: PlotPlacement[];
    scale: number;
    onDrawingChange: (drawing: PlotDrawingState) => void;
    onPlacementsChange: (placements: PlotPlacement[]) => void;
    onScaleChange: (scale: number) => void;
}

export default function DrawingPlotScreen({
    onBack,
    onApplyToEstimate,
    drawing,
    placements,
    scale,
    onDrawingChange,
    onPlacementsChange,
    onScaleChange,
}: DrawingPlotScreenProps) {
    const [selectedSymbolKey, setSelectedSymbolKey] = useState<string>(DEVICE_ITEMS[0].key);
    const [status, setStatus] = useState('図面画像を読み込んでください。');
    const [openPalettePanel, setOpenPalettePanel] = useState<OpenPalettePanel>(null);
    const [palettePosition, setPalettePosition] = useState<PalettePosition>({ top: 12, left: 12 });

    const counters = useMemo(
        () =>
            DEVICE_ITEMS.map((symbol) => ({
                ...symbol,
                count: placements.filter((placement) => placement.type === symbol.key).length,
            })),
        [placements],
    );

    const selectedSymbol = DEVICE_ITEMS.find((symbol) => symbol.key === selectedSymbolKey) ?? DEVICE_ITEMS[0];

    const updateStatus = (message: string) => setStatus(message);

    const getPositionLabel = (xRatio: number, yRatio: number) => {
        const horizontal = xRatio < 0.33 ? '左' : xRatio < 0.66 ? '中央' : '右';
        const vertical = yRatio < 0.33 ? '上' : yRatio < 0.66 ? '中央' : '下';
        return `${vertical}${horizontal}`;
    };

    const redrawOrders = (items: PlotPlacement[]) => items.map((item, index) => ({ ...item, order: index + 1 }));

    const fitScaleToViewport = (width: number, height: number) => {
        const availableWidth = Math.max(window.innerWidth - 460, 720);
        const availableHeight = Math.max(window.innerHeight - 260, 520);
        const widthScale = availableWidth / width;
        const heightScale = availableHeight / height;
        return Math.max(0.4, Math.min(1.6, Number(Math.min(widthScale, heightScale, 1).toFixed(2))));
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const lowerName = file.name.toLowerCase();
        const isImage = lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg');
        if (!isImage) {
            updateStatus('PNG / JPG / JPEG の図面画像を選んでください。');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                onDrawingChange({
                    name: file.name,
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    src: String(reader.result),
                });
                onPlacementsChange([]);
                onScaleChange(fitScaleToViewport(img.naturalWidth, img.naturalHeight));
                updateStatus('図面を読み込みました。全体が見やすい倍率に合わせています。');
            };
            img.src = String(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!drawing.width || !drawing.height) {
            updateStatus('先に図面画像を読み込んでください。');
            return;
        }

        const rect = event.currentTarget.getBoundingClientRect();
        const x = Math.round((event.clientX - rect.left) / scale);
        const y = Math.round((event.clientY - rect.top) / scale);

        if (x < 0 || y < 0 || x > drawing.width || y > drawing.height) return;

        const xRatio = Number((x / drawing.width).toFixed(4));
        const yRatio = Number((y / drawing.height).toFixed(4));

        const nextPlacement: PlotPlacement = {
            id: crypto.randomUUID(),
            order: placements.length + 1,
            type: selectedSymbol.key,
            name: selectedSymbol.name,
            symbol: selectedSymbol.short,
            x,
            y,
            xRatio,
            yRatio,
            positionLabel: getPositionLabel(xRatio, yRatio),
        };

        onPlacementsChange([...placements, nextPlacement]);
        updateStatus(`${selectedSymbol.name} を No.${placements.length + 1} として配置しました。`);
    };

    const removePlacement = (id: string) => {
        onPlacementsChange(redrawOrders(placements.filter((item) => item.id !== id)));
        updateStatus('ピンを削除しました。');
    };

    const handleUndo = () => {
        if (!placements.length) {
            updateStatus('削除できるピンがありません。');
            return;
        }
        onPlacementsChange(redrawOrders(placements.slice(0, -1)));
        updateStatus('最後のピンを削除しました。');
    };

    const handleClear = () => {
        onPlacementsChange([]);
        updateStatus('配置済みピンをすべて消去しました。');
    };

    const handleCopyJson = async () => {
        const payload = {
            drawing: {
                name: drawing.name,
                width: drawing.width,
                height: drawing.height,
                scale,
            },
            placements,
        };

        try {
            await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
            updateStatus('図面プロットJSONをコピーしました。');
        } catch {
            updateStatus('JSON のコピーに失敗しました。');
        }
    };

    const handleApply = () => {
        if (!placements.length) {
            updateStatus('見積へ反映するピンがありません。');
            return;
        }
        onApplyToEstimate(placements);
    };

    const handleFitToScreen = () => {
        if (!drawing.width || !drawing.height) {
            updateStatus('先に図面画像を読み込んでください。');
            return;
        }
        onScaleChange(fitScaleToViewport(drawing.width, drawing.height));
        updateStatus('図面全体が見やすい倍率に合わせました。');
    };

    const handlePaletteDragStart = (event: React.MouseEvent<HTMLDivElement>) => {
        event.preventDefault();
        const startX = event.clientX;
        const startY = event.clientY;
        const startLeft = palettePosition.left;
        const startTop = palettePosition.top;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const nextLeft = Math.max(8, startLeft + (moveEvent.clientX - startX));
            const nextTop = Math.max(8, startTop + (moveEvent.clientY - startY));
            setPalettePosition({ left: nextLeft, top: nextTop });
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const openPaletteSelector = (groupKey: string, element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        const group = PALETTE_GROUPS.find((item) => item.key === groupKey);
        const useTwoColumns = (group?.children.length ?? 0) > 6;
        const panelWidth = useTwoColumns ? 440 : 320;
        const panelHeight = Math.min(useTwoColumns ? 360 : 420, window.innerHeight - 24);
        const preferredLeft = rect.right + 8;
        const fallbackLeft = rect.left - panelWidth - 8;
        const left = preferredLeft + panelWidth <= window.innerWidth - 12
            ? preferredLeft
            : Math.max(12, fallbackLeft);
        const top = Math.min(Math.max(12, rect.top), window.innerHeight - panelHeight - 12);
        setOpenPalettePanel({
            groupKey,
            top: Math.max(12, top),
            left: Math.max(12, left),
        });
    };

    return (
        <div
            className="container"
            style={{
                width: 'calc(100vw - 2rem)',
                maxWidth: '1800px',
                marginLeft: 'calc(50% - 50vw + 1rem)',
                height: 'calc(100vh - 2rem)',
                paddingBottom: '0.5rem',
                gap: '0.75rem',
            }}
        >
            <section className="card" style={{ marginBottom: 0, padding: '0.9rem 1.1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '240px minmax(0, 1fr)', gap: '0.75rem', alignItems: 'center' }}>
                    <label
                        htmlFor="drawing-upload-input"
                        className="btn btn-secondary"
                        style={{ width: '100%', color: 'var(--primary)', borderColor: 'var(--primary)' }}
                    >
                        画像を取り込む
                    </label>
                    <input id="drawing-upload-input" type="file" accept=".png,.jpg,.jpeg" onChange={handleFileChange} style={{ display: 'none' }} />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '0.5rem' }}>
                        <button className="btn btn-secondary" onClick={() => onScaleChange(Math.max(0.4, Number((scale - 0.1).toFixed(2))))}><Minus size={16} /> 縮小</button>
                        <button className="btn btn-secondary" onClick={() => onScaleChange(1)}><RotateCcw size={16} /> 100%</button>
                        <button className="btn btn-secondary" onClick={handleFitToScreen}>全体表示</button>
                        <button className="btn btn-secondary" onClick={() => onScaleChange(Math.min(3, Number((scale + 0.1).toFixed(2))))}><Plus size={16} /> 拡大</button>
                        <button className="btn btn-secondary" onClick={handleUndo}><Trash2 size={16} /> 直前削除</button>
                        <button className="btn btn-secondary" onClick={handleClear}>全消去</button>
                        <button className="btn btn-secondary" onClick={handleCopyJson}><Copy size={16} /> JSON</button>
                    </div>
                </div>
                <p style={{ marginTop: '0.75rem', marginBottom: 0, color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'left' }}>{status}</p>
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '0.75rem', alignItems: 'start', minHeight: 0, flex: 1 }}>
                <section className="card" style={{ padding: '1rem', marginBottom: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '1rem', flexWrap: 'wrap' }}>
                        <strong>{drawing.name || '図面未読込'}</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>選択中: {selectedSymbol.name} / ズーム {Math.round(scale * 100)}%</span>
                    </div>
                    <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
                        <div
                            style={{
                                position: 'absolute',
                                top: `${palettePosition.top}px`,
                                left: `${palettePosition.left}px`,
                                zIndex: 15,
                                width: '240px',
                                maxHeight: `calc(100% - ${palettePosition.top + 8}px)`,
                                overflow: 'auto',
                                background: 'rgba(255, 255, 255, 0.96)',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-lg)',
                                boxShadow: 'var(--shadow-lg)',
                                padding: '0.75rem',
                            }}
                        >
                            <div
                                onMouseDown={handlePaletteDragStart}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '0.5rem',
                                    marginBottom: '0.6rem',
                                    paddingBottom: '0.45rem',
                                    borderBottom: '1px solid var(--border-color)',
                                    cursor: 'grab',
                                    userSelect: 'none',
                                }}
                            >
                                <strong style={{ fontSize: '0.9rem' }}>記号パレット</strong>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>掴んで移動</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                                {PALETTE_GROUPS.map((group) => {
                                    const selectedInGroup = group.children.find((child) => child.key === selectedSymbolKey) ?? group.children[0];
                                    const groupCount = group.children.reduce((sum, child) => sum + placements.filter((item) => item.type === child.key).length, 0);
                                    const panelOpen = openPalettePanel?.groupKey === group.key;

                                    return (
                                        <div
                                            key={group.key}
                                            style={{ position: 'relative' }}
                                        >
                                            <button
                                                type="button"
                                                onClick={(event) => openPaletteSelector(group.key, event.currentTarget)}
                                                onContextMenu={(event) => {
                                                    event.preventDefault();
                                                    openPaletteSelector(group.key, event.currentTarget);
                                                }}
                                                style={{
                                                    width: '100%',
                                                    borderRadius: 'var(--radius-md)',
                                                    border: group.children.some((child) => child.key === selectedSymbolKey) || panelOpen ? `2px solid ${group.color}` : '1px solid var(--border-color)',
                                                    background: group.children.some((child) => child.key === selectedSymbolKey) || panelOpen ? `${group.color}20` : 'white',
                                                    padding: '0.75rem 0.7rem',
                                                    cursor: 'pointer',
                                                    font: 'inherit',
                                                    textAlign: 'left',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                }}
                                            >
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontWeight: 700, marginBottom: '0.15rem' }}>{group.label}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {selectedInGroup.short} {selectedInGroup.label ?? selectedInGroup.name}
                                                    </div>
                                                </div>
                                                <strong style={{ color: group.color, fontSize: '0.95rem', flexShrink: 0 }}>{groupCount}</strong>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div style={{ flex: 1, minHeight: 0, height: '100%', overflow: 'auto', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', background: '#fff' }}>
                        {!drawing.src ? (
                            <div style={{ height: '100%', minHeight: '520px', display: 'grid', placeItems: 'center', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                                図面画像を読み込むと、ここに表示されます。<br />
                                記号を選んでクリックすると配置できます。
                            </div>
                        ) : (
                            <div
                                onClick={handleCanvasClick}
                                onContextMenu={(event) => {
                                    const target = (event.target as HTMLElement).closest('[data-placement-id]');
                                    if (!target) return;
                                    event.preventDefault();
                                    removePlacement(target.getAttribute('data-placement-id') || '');
                                }}
                                style={{
                                    position: 'relative',
                                    width: drawing.width,
                                    height: drawing.height,
                                    transform: `scale(${scale})`,
                                    transformOrigin: 'top left',
                                    cursor: 'crosshair',
                                }}
                            >
                                <img src={drawing.src} alt="図面" style={{ width: drawing.width, height: drawing.height, display: 'block', userSelect: 'none' }} />
                                {placements.map((item) => {
                                    const symbol = DEVICE_ITEMS.find((entry) => entry.key === item.type) ?? DEVICE_ITEMS[0];
                                    return (
                                        <div
                                            key={item.id}
                                            data-placement-id={item.id}
                                            title={`No.${item.order} ${item.name} (${item.x}, ${item.y})`}
                                            style={{
                                                position: 'absolute',
                                                left: item.x,
                                                top: item.y,
                                                transform: 'translate(-50%, -100%)',
                                                minWidth: '38px',
                                                padding: '6px 8px',
                                                borderRadius: '14px 14px 14px 4px',
                                                background: symbol.color,
                                                color: 'white',
                                                fontSize: '11px',
                                                lineHeight: 1.25,
                                                border: '2px solid rgba(255,255,255,0.84)',
                                                boxShadow: '0 10px 18px rgba(15, 23, 42, 0.16)',
                                            }}
                                        >
                                            <strong style={{ display: 'block', fontSize: '13px' }}>{symbol.short}</strong>
                                            <span style={{ display: 'block' }}>No.{item.order}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        </div>
                    </div>
                </section>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', alignItems: 'center', gap: '0.75rem', paddingTop: '0.25rem' }}>
                <button className="btn btn-secondary" onClick={onBack}>
                    <ArrowLeft size={18} /> 戻る
                </button>
                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', padding: '0.1rem 0' }}>
                    {counters.filter((counter) => counter.count > 0).map((counter) => (
                        <div
                            key={counter.key}
                            style={{
                                flex: '0 0 auto',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.45rem',
                                padding: '0.55rem 0.75rem',
                                borderRadius: '999px',
                                border: `1px solid ${counter.color}55`,
                                background: `${counter.color}14`,
                                color: 'var(--text-main)',
                                fontSize: '0.85rem',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <strong style={{ color: counter.color }}>{counter.short}</strong>
                            <span>{counter.label ?? counter.name}</span>
                            <strong>{counter.count}</strong>
                        </div>
                    ))}
                    {!counters.some((counter) => counter.count > 0) && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>まだ配置はありません</span>
                    )}
                </div>
                <button className="btn btn-primary" onClick={handleApply}>
                    <MapPinned size={18} /> 見積項目へ反映
                </button>
            </div>
            {openPalettePanel && (
                <>
                    <div
                        onClick={() => setOpenPalettePanel(null)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 40,
                            background: 'transparent',
                        }}
                    />
                    <div
                        onClick={(event) => event.stopPropagation()}
                        style={{
                            position: 'fixed',
                            top: openPalettePanel.top,
                            left: openPalettePanel.left,
                            width: `${(PALETTE_GROUPS.find((group) => group.key === openPalettePanel.groupKey)?.children.length ?? 0) > 6 ? 440 : 320}px`,
                            zIndex: 41,
                            background: 'white',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-md)',
                            boxShadow: 'var(--shadow-lg)',
                            padding: '0.5rem',
                            display: 'grid',
                            gap: '0.5rem',
                            gridTemplateColumns: (PALETTE_GROUPS.find((group) => group.key === openPalettePanel.groupKey)?.children.length ?? 0) > 6 ? 'repeat(2, minmax(0, 1fr))' : '1fr',
                        }}
                    >
                        {PALETTE_GROUPS.find((group) => group.key === openPalettePanel.groupKey)?.children.map((symbol) => (
                            <button
                                key={symbol.key}
                                type="button"
                                onClick={() => {
                                    setSelectedSymbolKey(symbol.key);
                                    setOpenPalettePanel(null);
                                }}
                                style={{
                                    borderRadius: 'var(--radius-md)',
                                    border: selectedSymbolKey === symbol.key ? `2px solid ${symbol.color}` : '1px solid var(--border-color)',
                                    background: selectedSymbolKey === symbol.key ? `${symbol.color}20` : 'white',
                                    padding: '0.75rem',
                                    cursor: 'pointer',
                                    font: 'inherit',
                                    textAlign: 'left',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 700, marginBottom: '0.15rem' }}>{symbol.label ?? symbol.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{symbol.short}</div>
                                </div>
                                <strong style={{ color: symbol.color, fontSize: '0.95rem' }}>
                                    {placements.filter((item) => item.type === symbol.key).length}
                                </strong>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
