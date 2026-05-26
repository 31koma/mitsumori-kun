import { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
    ArrowLeft,
    Check,
    Copy,
    Download,
    Eraser,
    Eye,
    EyeOff,
    FileSpreadsheet,
    MapPinned,
    Minus,
    MousePointer2,
    PenLine,
    Plus,
    RotateCcw,
    Trash2,
} from 'lucide-react';

import {
    defaultItems,
    type ConstructionBox,
    type ConstructionPageState,
    type ConstructionDrawingState,
    type EraserShape,
    type PlotDrawingState,
    type PlotPlacement,
    type WiringLine,
    type WiringLineType,
    type WiringPoint,
} from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const SYMBOL_COLORS = ['#2563eb', '#0f766e', '#0369a1', '#d97706', '#7c3aed', '#ea580c', '#059669', '#dc2626'];
const DEFAULT_ERASER_WIDTH = 14;

type WorkspaceMode = 'quantity' | 'construction';
type ConstructionTool = 'select' | 'wire' | 'orthogonalWire' | 'eraseLine' | 'eraseRect' | 'text' | 'box';
type SymbolType = { key: string; name: string; short: string; color: string; label?: string };
type PaletteGroup = { key: string; label: string; short: string; color: string; children: SymbolType[] };
type OpenPalettePanel = { groupKey: string; top: number; left: number } | null;
type PalettePosition = { top: number; left: number };
type DragState =
    | { kind: 'none' }
    | { kind: 'eraser'; shapeKind: 'line' | 'rect'; start: WiringPoint; current: WiringPoint }
    | { kind: 'label'; wireId: string; startX: number; startY: number; originX: number; originY: number }
    | { kind: 'point'; wireId: string; pointIndex: number }
    | { kind: 'wire'; wireId: string; start: WiringPoint; originalPoints: WiringPoint[]; originalLabel: WiringPoint }
    | { kind: 'box'; boxId: string; start: WiringPoint; originalBox: ConstructionBox }
    | { kind: 'boxResize'; boxId: string; handle: 'nw' | 'ne' | 'sw' | 'se'; start: WiringPoint; originalBox: ConstructionBox; keepRatio: boolean };

const DEFAULT_LINE_TYPES: WiringLineType[] = [
    { id: 'vvf16-2c', name: 'VVF 1.6-2C', label: '1.6-2C', color: '#1d4ed8', width: 4, dash: '' },
    { id: 'vvf16-3c', name: 'VVF 1.6-3C', label: '1.6-3C', color: '#0f766e', width: 4, dash: '12 8' },
    { id: 'vvf20-2c', name: 'VVF 2.0-2C', label: '2.0-2C', color: '#b45309', width: 5, dash: '' },
    { id: 'vvf20-3c', name: 'VVF 2.0-3C', label: '2.0-3C', color: '#dc2626', width: 5, dash: '14 7' },
    { id: 'cv35-3c', name: 'CV 3.5sq-3C', label: '3.5sq-3C', color: '#7c3aed', width: 5, dash: '4 7' },
    { id: 'cv55-3c', name: 'CV 5.5sq-3C', label: '5.5sq-3C', color: '#0369a1', width: 5, dash: '18 7 4 7' },
    { id: 'cv8-3c', name: 'CV 8sq-3C', label: '8sq-3C', color: '#be123c', width: 6, dash: '' },
    { id: 'cv14-3c', name: 'CV 14sq-3C', label: '14sq-3C', color: '#111827', width: 6, dash: '20 8' },
];

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
        children: ['スイッチ', '3路スイッチ', '4路スイッチ', 'センサー付スイッチ（親機）', '調光スイッチ（LED対応）']
            .map((name) => findSymbol(name))
            .filter(isSymbolType),
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
    onApplyWiresToEstimate: (summary: Array<{ name: string; meters: number }>) => void;
    onOpenEstimateInput: () => void;
    drawing: PlotDrawingState;
    placements: PlotPlacement[];
    construction: ConstructionDrawingState;
    scale: number;
    onDrawingChange: (drawing: PlotDrawingState) => void;
    onPlacementsChange: (placements: PlotPlacement[]) => void;
    onConstructionChange: (construction: ConstructionDrawingState) => void;
    onScaleChange: (scale: number) => void;
}

const pointDistance = (a: WiringPoint, b: WiringPoint) => Math.hypot(b.x - a.x, b.y - a.y);
const lineLengthPixels = (points: WiringPoint[]) => points.slice(1).reduce((sum, point, index) => sum + pointDistance(points[index], point), 0);

const snapPoint = (previous: WiringPoint | undefined, point: WiringPoint, enabled: boolean) => {
    if (!previous || !enabled) return point;
    const dx = Math.abs(point.x - previous.x);
    const dy = Math.abs(point.y - previous.y);
    return dx >= dy ? { x: point.x, y: previous.y } : { x: previous.x, y: point.y };
};

const getBoxSummaryKey = (label: string, size?: string) => {
    if (!size) return label;
    const firstDim = size.split('×')[0].trim();
    if (/^\d+/.test(firstDim)) {
        return `${label}${firstDim}`;
    }
    return `${label} (${size})`;
};

export default function DrawingPlotScreen({
    onBack,
    onApplyToEstimate,
    onApplyWiresToEstimate,
    onOpenEstimateInput,
    drawing,
    placements,
    construction,
    scale,
    onDrawingChange,
    onPlacementsChange,
    onConstructionChange,
    onScaleChange,
}: DrawingPlotScreenProps) {
    const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('quantity');
    const [constructionTool, setConstructionTool] = useState<ConstructionTool>('wire');
    const [selectedSymbolKey, setSelectedSymbolKey] = useState<string>(DEVICE_ITEMS[0].key);
    const [selectedLineTypeId, setSelectedLineTypeId] = useState(construction.lineTypes[0]?.id ?? DEFAULT_LINE_TYPES[0].id);
    const [selectedWireId, setSelectedWireId] = useState<string>('');
    const [selectedEraserId, setSelectedEraserId] = useState<string>('');
    const [selectedBoxId, setSelectedBoxId] = useState<string>('');
    const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
    const [draftWirePoints, setDraftWirePoints] = useState<WiringPoint[]>([]);
    const [previewPoint, setPreviewPoint] = useState<WiringPoint | null>(null);
    const snapOrthogonal = true;
    const [showLabels, setShowLabels] = useState(true);
    const [status, setStatus] = useState('図面画像またはPDFを読み込んでください。');
    const [openPalettePanel, setOpenPalettePanel] = useState<OpenPalettePanel>(null);
    const [palettePosition, setPalettePosition] = useState<PalettePosition>({ top: 12, left: 12 });
    const [dragState, setDragState] = useState<DragState>({ kind: 'none' });
    const [redoStack, setRedoStack] = useState<ConstructionDrawingState[]>([]);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [panDrag, setPanDrag] = useState<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

    const normalizedConstruction = useMemo(
        () => ({
            ...construction,
            lineTypes: construction.lineTypes.length ? construction.lineTypes : DEFAULT_LINE_TYPES,
            pages: construction.pages ?? {},
        }),
        [construction],
    );
    const drawingPages = useMemo(
        () =>
            drawing.pages?.length
                ? drawing.pages
                : drawing.src
                  ? [{ pageNumber: 1, name: drawing.name || '1ページ目', width: drawing.width, height: drawing.height, src: drawing.src, thumbnailSrc: drawing.src }]
                  : [],
        [drawing],
    );
    const currentPageNumber = drawing.currentPageNumber ?? drawingPages[0]?.pageNumber ?? 1;
    const currentPage = drawingPages.find((page) => page.pageNumber === currentPageNumber) ?? drawingPages[0];
    const activeDrawing = currentPage
        ? {
              name: currentPage.name,
              width: currentPage.width,
              height: currentPage.height,
              src: currentPage.src,
              fileType: drawing.fileType,
          }
        : drawing;
    const getPageConstruction = (pageNumber: number): ConstructionPageState => {
        const existing = normalizedConstruction.pages?.[String(pageNumber)];
        if (existing) return existing;
        if (pageNumber === 1) {
            return {
                wires: normalizedConstruction.wires,
                erasers: normalizedConstruction.erasers,
                boxes: [],
                scaleMetersPerPixel: normalizedConstruction.scaleMetersPerPixel,
            };
        }
        return { wires: [], erasers: [], boxes: [], scaleMetersPerPixel: normalizedConstruction.scaleMetersPerPixel || 0.01 };
    };
    const currentPageConstruction = getPageConstruction(currentPageNumber);
    const selectedLineType = normalizedConstruction.lineTypes.find((type) => type.id === selectedLineTypeId) ?? normalizedConstruction.lineTypes[0];
    const selectedWire = currentPageConstruction.wires.find((wire) => wire.id === selectedWireId);
    const selectedBox = currentPageConstruction.boxes?.find((box) => box.id === selectedBoxId);
    const currentPlacements = useMemo(
        () => placements.filter((placement) => (placement.pageNumber ?? 1) === currentPageNumber),
        [placements, currentPageNumber],
    );

    const counters = useMemo(
        () =>
            DEVICE_ITEMS.map((symbol) => ({
                ...symbol,
                count: currentPlacements.filter((placement) => placement.type === symbol.key).length,
            })),
        [currentPlacements],
    );

    const lengthSummary = (() => {
        const summary = new Map<string, { name: string; meters: number; color: string; dash: string; width: number }>();
        drawingPages.forEach((page) => {
            const pageState = getPageConstruction(page.pageNumber);
            pageState.wires.forEach((wire) => {
                const lineType = normalizedConstruction.lineTypes.find((type) => type.id === wire.lineTypeId) ?? normalizedConstruction.lineTypes[0];
                const meters = lineLengthPixels(wire.points) * pageState.scaleMetersPerPixel;
                const current = summary.get(lineType.id);
                if (current) {
                    current.meters += meters;
                } else {
                    summary.set(lineType.id, {
                        name: lineType.name,
                        meters,
                        color: wire.color ?? lineType.color,
                        dash: wire.dash ?? lineType.dash,
                        width: wire.width ?? lineType.width,
                    });
                }
            });
        });
        return Array.from(summary.values()).sort((a, b) => a.name.localeCompare(b.name));
    })();

    const pageSummaries = drawingPages.map((page) => {
        const pageState = getPageConstruction(page.pageNumber);
        const wires = new Map<string, number>();
        pageState.wires.forEach((wire) => {
            const lineType = normalizedConstruction.lineTypes.find((type) => type.id === wire.lineTypeId) ?? normalizedConstruction.lineTypes[0];
            wires.set(lineType.name, (wires.get(lineType.name) ?? 0) + lineLengthPixels(wire.points) * pageState.scaleMetersPerPixel);
        });
        const devices = DEVICE_ITEMS.map((symbol) => ({
            name: symbol.label ?? symbol.name,
            count: placements.filter((placement) => (placement.pageNumber ?? 1) === page.pageNumber && placement.type === symbol.key).length,
        })).filter((item) => item.count > 0);
        const boxes = new Map<string, number>();
        (pageState.boxes ?? []).forEach((box) => {
            const key = getBoxSummaryKey(box.label, box.size);
            boxes.set(key, (boxes.get(key) ?? 0) + 1);
        });
        return { page, wires: Array.from(wires.entries()), devices, boxes: Array.from(boxes.entries()) };
    });

    const boxSummary = (() => {
        const summary = new Map<string, number>();
        drawingPages.forEach((page) => {
            const pageState = getPageConstruction(page.pageNumber);
            (pageState.boxes ?? []).forEach((box) => {
                const key = getBoxSummaryKey(box.label, box.size);
                summary.set(key, (summary.get(key) ?? 0) + 1);
            });
        });
        return Array.from(summary.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    })();

    const selectedSymbol = DEVICE_ITEMS.find((symbol) => symbol.key === selectedSymbolKey) ?? DEVICE_ITEMS[0];

    const updateStatus = (message: string) => setStatus(message);
    const updateConstruction = (updates: Partial<ConstructionDrawingState & ConstructionPageState>, options: { keepRedo?: boolean } = {}) => {
        const currentPageUpdates =
            updates.wires || updates.erasers || updates.boxes || updates.scaleMetersPerPixel !== undefined
                ? {
                      ...currentPageConstruction,
                      wires: updates.wires ?? currentPageConstruction.wires,
                      erasers: updates.erasers ?? currentPageConstruction.erasers,
                      boxes: updates.boxes ?? currentPageConstruction.boxes ?? [],
                      scaleMetersPerPixel: updates.scaleMetersPerPixel ?? currentPageConstruction.scaleMetersPerPixel,
                  }
                : currentPageConstruction;
        const pages = {
            ...(normalizedConstruction.pages ?? {}),
            [String(currentPageNumber)]: currentPageUpdates,
        };
        onConstructionChange({
            ...normalizedConstruction,
            ...updates,
            lineTypes: updates.lineTypes ?? normalizedConstruction.lineTypes,
            pages,
            wires: currentPageUpdates.wires,
            erasers: currentPageUpdates.erasers,
            scaleMetersPerPixel: currentPageUpdates.scaleMetersPerPixel,
        });
        if (!options.keepRedo) setRedoStack([]);
    };

    const getPositionLabel = (xRatio: number, yRatio: number) => {
        const horizontal = xRatio < 0.33 ? '左' : xRatio < 0.66 ? '中央' : '右';
        const vertical = yRatio < 0.33 ? '上' : yRatio < 0.66 ? '中央' : '下';
        return `${vertical}${horizontal}`;
    };

    const redrawOrders = (items: PlotPlacement[]) => items.map((item, index) => ({ ...item, order: index + 1 }));

    const fitScaleToViewport = (width: number, height: number) => {
        const availableWidth = Math.max(window.innerWidth - 500, 720);
        const availableHeight = Math.max(window.innerHeight - 280, 520);
        const widthScale = availableWidth / width;
        const heightScale = availableHeight / height;
        return Math.max(0.35, Math.min(1.6, Number(Math.min(widthScale, heightScale, 1).toFixed(2))));
    };

    const getCanvasPoint = (event: React.MouseEvent<HTMLElement> | MouseEvent): WiringPoint | null => {
        const canvas = document.querySelector('[data-drawing-canvas="true"]') as HTMLElement | null;
        if (!canvas || !activeDrawing.width || !activeDrawing.height) return null;
        const rect = canvas.getBoundingClientRect();
        const x = Math.round((event.clientX - rect.left) / scale);
        const y = Math.round((event.clientY - rect.top) / scale);
        if (x < 0 || y < 0 || x > activeDrawing.width || y > activeDrawing.height) return null;
        return { x, y };
    };

    const renderPdfPage = async (page: pdfjsLib.PDFPageProxy, scaleValue: number) => {
        const viewport = page.getViewport({ scale: scaleValue });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas context is unavailable.');
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        return {
            src: canvas.toDataURL('image/png'),
            width: canvas.width,
            height: canvas.height,
        };
    };

    const renderPdfAsPages = async (file: File) => {
        const data = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        const pages = [];
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
            const page = await pdf.getPage(pageNumber);
            const full = await renderPdfPage(page, 1.6);
            const thumbnail = await renderPdfPage(page, 0.22);
            pages.push({
                pageNumber,
                name: `${pageNumber}ページ目`,
                width: full.width,
                height: full.height,
                src: full.src,
                thumbnailSrc: thumbnail.src,
            });
            updateStatus(`PDFを読み込み中です。${pageNumber}/${pdf.numPages}ページ`);
        }
        return pages;
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const lowerName = file.name.toLowerCase();
        const isImage = lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg');
        const isPdf = lowerName.endsWith('.pdf');
        if (!isImage && !isPdf) {
            updateStatus('PNG / JPG / JPEG / PDF の図面を選んでください。');
            return;
        }

        if (isPdf) {
            updateStatus('PDFの全ページを図面背景として変換しています。');
            renderPdfAsPages(file)
                .then((pages) => {
                    const firstPage = pages[0];
                    onDrawingChange({
                        name: file.name,
                        width: firstPage.width,
                        height: firstPage.height,
                        src: firstPage.src,
                        fileType: 'pdf',
                        pages,
                        currentPageNumber: 1,
                    });
                    onPlacementsChange([]);
                    onConstructionChange({ ...normalizedConstruction, wires: [], erasers: [], pages: {} });
                    onScaleChange(fitScaleToViewport(firstPage.width, firstPage.height));
                    updateStatus(`PDF ${pages.length}ページを案件として読み込みました。ページごとに編集できます。`);
                })
                .catch((error) => {
                    console.error(error);
                    updateStatus('PDFの読み込みに失敗しました。画像化した図面でも取り込みできます。');
                });
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
                    fileType: 'image',
                    pages: [
                        {
                            pageNumber: 1,
                            name: file.name,
                            width: img.naturalWidth,
                            height: img.naturalHeight,
                            src: String(reader.result),
                            thumbnailSrc: String(reader.result),
                        },
                    ],
                    currentPageNumber: 1,
                });
                onPlacementsChange([]);
                onConstructionChange({ ...normalizedConstruction, wires: [], erasers: [], pages: {} });
                onScaleChange(fitScaleToViewport(img.naturalWidth, img.naturalHeight));
                updateStatus('図面を読み込みました。全体が見やすい倍率に合わせています。');
            };
            img.src = String(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleQuantityClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (workspaceMode !== 'quantity') return;
        if (!activeDrawing.width || !activeDrawing.height) {
            updateStatus('先に図面を読み込んでください。');
            return;
        }

        const point = getCanvasPoint(event);
        if (!point) return;

        const xRatio = Number((point.x / activeDrawing.width).toFixed(4));
        const yRatio = Number((point.y / activeDrawing.height).toFixed(4));

        const nextPlacement: PlotPlacement = {
            id: crypto.randomUUID(),
            order: currentPlacements.length + 1,
            type: selectedSymbol.key,
            name: selectedSymbol.name,
            symbol: selectedSymbol.short,
            x: point.x,
            y: point.y,
            xRatio,
            yRatio,
            positionLabel: getPositionLabel(xRatio, yRatio),
            pageNumber: currentPageNumber,
        };

        onPlacementsChange([...placements, nextPlacement]);
        updateStatus(`${currentPageNumber}ページ目に ${selectedSymbol.name} を No.${currentPlacements.length + 1} として配置しました。`);
    };

    const finishWire = () => {
        if (draftWirePoints.length < 2) {
            setDraftWirePoints([]);
            setPreviewPoint(null);
            return;
        }
        const first = draftWirePoints[0];
        const last = draftWirePoints[draftWirePoints.length - 1];
        const newWire: WiringLine = {
            id: crypto.randomUUID(),
            lineTypeId: selectedLineType.id,
            points: draftWirePoints,
            label: selectedLineType.label,
            labelX: Math.round((first.x + last.x) / 2),
            labelY: Math.round((first.y + last.y) / 2) - 14,
            showLabel: true,
        };
        updateConstruction({ wires: [...currentPageConstruction.wires, newWire] });
        setSelectedWireId(newWire.id);
        setSelectedEraserId('');
        setDraftWirePoints([]);
        setPreviewPoint(null);
        updateStatus(`${selectedLineType.name} を作図しました。`);
    };

    const handleConstructionClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (panDrag) return;
        if (workspaceMode === 'construction' && constructionTool === 'box') {
            const point = getCanvasPoint(event);
            if (!point) return;
            const newBox: ConstructionBox = {
                id: crypto.randomUUID(),
                type: 'JB',
                label: 'JB',
                size: '100×100×100',
                note: '',
                x: Math.round(point.x - 30),
                y: Math.round(point.y - 30),
                width: 60,
                height: 60,
                strokeColor: '#111827',
                strokeWidth: 2,
                fillColor: '#ffffff',
                fontSize: 16,
                rotation: 0,
            };
            updateConstruction({ boxes: [...(currentPageConstruction.boxes ?? []), newBox] });
            setSelectedBoxId(newBox.id);
            setSelectedWireId('');
            setSelectedEraserId('');
            updateStatus('ジョイントボックスを配置しました。右側の属性で表示名やサイズを変更できます。');
            return;
        }
        if (workspaceMode !== 'construction' || (constructionTool !== 'wire' && constructionTool !== 'orthogonalWire')) return;
        const point = getCanvasPoint(event);
        if (!point) return;
        const shouldSnap = constructionTool === 'orthogonalWire' || event.shiftKey;
        const nextPoint = snapPoint(draftWirePoints.at(-1), point, shouldSnap);
        setDraftWirePoints([...draftWirePoints, nextPoint]);
        setPreviewPoint(null);
        updateStatus(draftWirePoints.length ? '曲がり点を追加しました。ダブルクリックまたは確定で終了します。' : '始点を置きました。次の点をクリックしてください。');
    };

    const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
        if (panDrag) {
            setPanOffset({
                x: panDrag.originX + event.clientX - panDrag.startX,
                y: panDrag.originY + event.clientY - panDrag.startY,
            });
            return;
        }
        if (workspaceMode !== 'construction') return;
        const point = getCanvasPoint(event);
        if (!point) return;
        if ((constructionTool === 'wire' || constructionTool === 'orthogonalWire') && draftWirePoints.length) {
            const shouldSnap = constructionTool === 'orthogonalWire' || event.shiftKey;
            setPreviewPoint(snapPoint(draftWirePoints.at(-1), point, shouldSnap));
        }
        if (dragState.kind === 'eraser') {
            setDragState({ ...dragState, current: snapPoint(dragState.start, point, dragState.shapeKind === 'line' && (snapOrthogonal || event.shiftKey)) });
        } else if (dragState.kind === 'point') {
            updateConstruction({
                wires: currentPageConstruction.wires.map((wire) =>
                    wire.id === dragState.wireId
                        ? {
                              ...wire,
                              points: wire.points.map((wirePoint, index) => (index === dragState.pointIndex ? point : wirePoint)),
                          }
                        : wire,
                ),
            }, { keepRedo: true });
        } else if (dragState.kind === 'label') {
            const dx = (event.clientX - dragState.startX) / scale;
            const dy = (event.clientY - dragState.startY) / scale;
            updateConstruction({
                wires: currentPageConstruction.wires.map((wire) =>
                    wire.id === dragState.wireId ? { ...wire, labelX: Math.round(dragState.originX + dx), labelY: Math.round(dragState.originY + dy) } : wire,
                ),
            }, { keepRedo: true });
        } else if (dragState.kind === 'wire') {
            const dx = point.x - dragState.start.x;
            const dy = point.y - dragState.start.y;
            updateConstruction({
                wires: currentPageConstruction.wires.map((wire) =>
                    wire.id === dragState.wireId
                        ? {
                              ...wire,
                              points: dragState.originalPoints.map((wirePoint) => ({ x: wirePoint.x + dx, y: wirePoint.y + dy })),
                              labelX: dragState.originalLabel.x + dx,
                              labelY: dragState.originalLabel.y + dy,
                          }
                        : wire,
                ),
            }, { keepRedo: true });
        } else if (dragState.kind === 'box') {
            const dx = point.x - dragState.start.x;
            const dy = point.y - dragState.start.y;
            updateConstruction({
                boxes: (currentPageConstruction.boxes ?? []).map((box) =>
                    box.id === dragState.boxId
                        ? { ...box, x: Math.round(dragState.originalBox.x + dx), y: Math.round(dragState.originalBox.y + dy) }
                        : box,
                ),
            }, { keepRedo: true });
        } else if (dragState.kind === 'boxResize') {
            const dx = point.x - dragState.start.x;
            const dy = point.y - dragState.start.y;
            const original = dragState.originalBox;
            let nextX = original.x;
            let nextY = original.y;
            let nextWidth = original.width;
            let nextHeight = original.height;

            if (dragState.handle.includes('e')) nextWidth = original.width + dx;
            if (dragState.handle.includes('s')) nextHeight = original.height + dy;
            if (dragState.handle.includes('w')) {
                nextX = original.x + dx;
                nextWidth = original.width - dx;
            }
            if (dragState.handle.includes('n')) {
                nextY = original.y + dy;
                nextHeight = original.height - dy;
            }

            if (dragState.keepRatio) {
                const ratio = original.width / Math.max(original.height, 1);
                if (Math.abs(nextWidth - original.width) >= Math.abs(nextHeight - original.height)) {
                    nextHeight = nextWidth / ratio;
                } else {
                    nextWidth = nextHeight * ratio;
                }
                if (dragState.handle.includes('w')) nextX = original.x + original.width - nextWidth;
                if (dragState.handle.includes('n')) nextY = original.y + original.height - nextHeight;
            }

            nextWidth = Math.max(20, nextWidth);
            nextHeight = Math.max(20, nextHeight);
            updateConstruction({
                boxes: (currentPageConstruction.boxes ?? []).map((box) =>
                    box.id === dragState.boxId
                        ? { ...box, x: Math.round(nextX), y: Math.round(nextY), width: Math.round(nextWidth), height: Math.round(nextHeight) }
                        : box,
                ),
            }, { keepRedo: true });
        }
    };

    const handleConstructionMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.button === 1) {
            event.preventDefault();
            setPanDrag({ startX: event.clientX, startY: event.clientY, originX: panOffset.x, originY: panOffset.y });
            updateStatus('パン移動中です。中ボタンを押したまま図面を動かせます。');
            return;
        }
        if (event.button !== 0) return;
        if (workspaceMode !== 'construction' || (constructionTool !== 'eraseLine' && constructionTool !== 'eraseRect')) return;
        const point = getCanvasPoint(event);
        if (!point) return;
        event.preventDefault();
        setSelectedWireId('');
        setSelectedEraserId('');
        setSelectedBoxId('');
        setDragState({ kind: 'eraser', shapeKind: constructionTool === 'eraseLine' ? 'line' : 'rect', start: point, current: point });
    };

    const handleMouseUp = () => {
        if (panDrag) {
            setPanDrag(null);
            updateStatus('パン移動を終了しました。');
            return;
        }
        if (dragState.kind === 'eraser') {
            const nextShape: EraserShape = {
                id: crypto.randomUUID(),
                kind: dragState.shapeKind,
                x1: dragState.start.x,
                y1: dragState.start.y,
                x2: dragState.current.x,
                y2: dragState.current.y,
                width: dragState.shapeKind === 'line' ? DEFAULT_ERASER_WIDTH : 0,
            };
            updateConstruction({ erasers: [...currentPageConstruction.erasers, nextShape] });
            updateStatus(dragState.shapeKind === 'line' ? '白線で既存配線を隠しました。' : '白矩形で既存配線を隠しました。');
        }
        if (dragState.kind !== 'none') setDragState({ kind: 'none' });
    };

    const removePlacement = (id: string) => {
        const otherPages = placements.filter((item) => (item.pageNumber ?? 1) !== currentPageNumber);
        onPlacementsChange([...otherPages, ...redrawOrders(currentPlacements.filter((item) => item.id !== id))]);
        updateStatus('ピンを削除しました。');
    };

    const handleUndo = () => {
        if (workspaceMode === 'construction') {
            if (draftWirePoints.length) {
                setDraftWirePoints(draftWirePoints.slice(0, -1));
                updateStatus('作図中の直前点を削除しました。');
                return;
            }
            if (currentPageConstruction.wires.length) {
                setRedoStack([normalizedConstruction, ...redoStack]);
                updateConstruction({ wires: currentPageConstruction.wires.slice(0, -1) }, { keepRedo: true });
                updateStatus('最後の配線を削除しました。');
                return;
            }
            if (currentPageConstruction.erasers.length) {
                setRedoStack([normalizedConstruction, ...redoStack]);
                updateConstruction({ erasers: currentPageConstruction.erasers.slice(0, -1) }, { keepRedo: true });
                updateStatus('最後の消し込みを削除しました。');
                return;
            }
            if ((currentPageConstruction.boxes ?? []).length) {
                setRedoStack([normalizedConstruction, ...redoStack]);
                updateConstruction({ boxes: (currentPageConstruction.boxes ?? []).slice(0, -1) }, { keepRedo: true });
                updateStatus('最後の図形を削除しました。');
                return;
            }
        }

        if (!currentPlacements.length) {
            updateStatus('削除できるピンがありません。');
            return;
        }
        onPlacementsChange([...placements.filter((item) => (item.pageNumber ?? 1) !== currentPageNumber), ...redrawOrders(currentPlacements.slice(0, -1))]);
        updateStatus('最後のピンを削除しました。');
    };

    const handleRedo = () => {
        if (!redoStack.length) {
            updateStatus('進める操作がありません。');
            return;
        }
        const [next, ...rest] = redoStack;
        onConstructionChange(next);
        setRedoStack(rest);
        updateStatus('取り消した施工図操作を戻しました。');
    };

    const cancelDraft = () => {
        setDraftWirePoints([]);
        setPreviewPoint(null);
        setDragState({ kind: 'none' });
        updateStatus('作図をキャンセルしました。');
    };

    const handleClear = () => {
        if (workspaceMode === 'construction') {
            if (!confirm('施工図制作モードの消し込み・配線・ラベルをすべて消去しますか？')) return;
            updateConstruction({ wires: [], erasers: [], boxes: [] });
            setSelectedWireId('');
            setSelectedBoxId('');
            setDraftWirePoints([]);
            updateStatus('施工図レイヤーをすべて消去しました。');
            return;
        }
        onPlacementsChange([]);
        updateStatus('配置済みピンをすべて消去しました。');
    };

    const handleCopyJson = async () => {
        const payload = {
            drawing: {
                name: drawing.name,
                width: activeDrawing.width,
                height: activeDrawing.height,
                scale,
                fileType: drawing.fileType ?? 'image',
            },
            placements,
            construction: normalizedConstruction,
        };

        try {
            await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
            updateStatus('図面データJSONをコピーしました。');
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

    const handleApplyWires = () => {
        if (!lengthSummary.length) {
            updateStatus('見積へ反映する配線がありません。');
            return;
        }
        onApplyWiresToEstimate(lengthSummary.map((item) => ({ name: item.name.replace(/\s+/g, ''), meters: Number(item.meters.toFixed(1)) })));
    };

    const handleFitToScreen = () => {
        if (!activeDrawing.width || !activeDrawing.height) {
            updateStatus('先に図面を読み込んでください。');
            return;
        }
        onScaleChange(fitScaleToViewport(activeDrawing.width, activeDrawing.height));
        setPanOffset({ x: 0, y: 0 });
        updateStatus('図面全体が見やすい倍率に合わせました。');
    };

    const handleDrawingWheel = (event: React.WheelEvent<HTMLDivElement>) => {
        if (workspaceMode !== 'construction') return;
        event.preventDefault();
        if (!activeDrawing.width || !activeDrawing.height) return;

        const nextScale = Math.max(0.25, Math.min(4, Number((scale * (event.deltaY < 0 ? 1.1 : 0.9)).toFixed(3))));
        if (nextScale === scale) return;

        const rect = event.currentTarget.getBoundingClientRect();
        const pointerX = event.clientX - rect.left;
        const pointerY = event.clientY - rect.top;
        const drawingX = (pointerX - panOffset.x) / scale;
        const drawingY = (pointerY - panOffset.y) / scale;

        setPanOffset({
            x: pointerX - drawingX * nextScale,
            y: pointerY - drawingY * nextScale,
        });
        onScaleChange(nextScale);
    };

    const switchPage = (pageNumber: number) => {
        const nextPage = drawingPages.find((page) => page.pageNumber === pageNumber);
        if (!nextPage) return;
        setDraftWirePoints([]);
        setPreviewPoint(null);
        setSelectedWireId('');
        setSelectedEraserId('');
        setSelectedBoxId('');
        setSelectedPointIndex(null);
        setPanDrag(null);
        setPanOffset({ x: 0, y: 0 });
        onDrawingChange({
            ...drawing,
            width: nextPage.width,
            height: nextPage.height,
            src: nextPage.src,
            currentPageNumber: pageNumber,
        });
        onScaleChange(fitScaleToViewport(nextPage.width, nextPage.height));
        updateStatus(`${pageNumber}ページ目に切り替えました。編集内容はページごとに保持されます。`);
    };

    const switchPageByDelta = (delta: number) => {
        if (!drawingPages.length) return;
        const currentIndex = drawingPages.findIndex((page) => page.pageNumber === currentPageNumber);
        const nextIndex = Math.max(0, Math.min(drawingPages.length - 1, (currentIndex < 0 ? 0 : currentIndex) + delta));
        switchPage(drawingPages[nextIndex].pageNumber);
    };

    const handleSelectedWireUpdate = (updates: Partial<WiringLine>) => {
        if (!selectedWireId) return;
        updateConstruction({
            wires: currentPageConstruction.wires.map((wire) => (wire.id === selectedWireId ? { ...wire, ...updates } : wire)),
        });
    };

    const handleSelectedLineTypeChange = (lineTypeId: string) => {
        setSelectedLineTypeId(lineTypeId);
        const lineType = normalizedConstruction.lineTypes.find((type) => type.id === lineTypeId);
        if (selectedWire && lineType) {
            handleSelectedWireUpdate({
                lineTypeId,
                label: lineType.label,
                color: lineType.color,
                width: lineType.width,
                dash: lineType.dash,
            });
        }
    };

    const deleteSelectedWire = () => {
        if (selectedWireId) {
            updateConstruction({ wires: currentPageConstruction.wires.filter((wire) => wire.id !== selectedWireId) });
            setSelectedWireId('');
            setSelectedPointIndex(null);
            updateStatus('選択した配線を削除しました。');
            return;
        }
        if (selectedEraserId) {
            updateConstruction({ erasers: currentPageConstruction.erasers.filter((shape) => shape.id !== selectedEraserId) });
            setSelectedEraserId('');
            updateStatus('選択した消し込みを削除しました。');
            return;
        }
        if (selectedBoxId) {
            updateConstruction({ boxes: (currentPageConstruction.boxes ?? []).filter((box) => box.id !== selectedBoxId) });
            setSelectedBoxId('');
            updateStatus('選択した図形を削除しました。');
            return;
        }
        setSelectedPointIndex(null);
    };

    const handleSelectedBoxUpdate = (updates: Partial<ConstructionBox>) => {
        if (!selectedBoxId) return;
        updateConstruction({
            boxes: (currentPageConstruction.boxes ?? []).map((box) => (box.id === selectedBoxId ? { ...box, ...updates } : box)),
        });
    };

    const addBendPoint = () => {
        if (!selectedWire || selectedWire.points.length < 2) return;
        let targetIndex = 1;
        let longest = 0;
        for (let index = 1; index < selectedWire.points.length; index += 1) {
            const length = pointDistance(selectedWire.points[index - 1], selectedWire.points[index]);
            if (length > longest) {
                longest = length;
                targetIndex = index;
            }
        }
        const previous = selectedWire.points[targetIndex - 1];
        const next = selectedWire.points[targetIndex];
        const bendPoint = { x: Math.round((previous.x + next.x) / 2), y: Math.round((previous.y + next.y) / 2) };
        handleSelectedWireUpdate({
            points: [...selectedWire.points.slice(0, targetIndex), bendPoint, ...selectedWire.points.slice(targetIndex)],
        });
        setSelectedPointIndex(targetIndex);
        updateStatus('一番長い区間に曲がり点を追加しました。');
    };

    const deleteSelectedPoint = () => {
        if (!selectedWire || selectedPointIndex === null || selectedWire.points.length <= 2) return;
        handleSelectedWireUpdate({ points: selectedWire.points.filter((_, index) => index !== selectedPointIndex) });
        setSelectedPointIndex(null);
        updateStatus('曲がり点を削除しました。');
    };

    const addLineType = () => {
        const name = window.prompt('追加する線種名を入力してください（例：CV 22sq-3C）');
        if (!name?.trim()) return;
        const label = window.prompt('図面に表示するラベルを入力してください', name.replace(/^VVF\s*/i, '').replace(/^CV\s*/i, '')) ?? name;
        const nextType: WiringLineType = {
            id: `custom_${Date.now()}`,
            name: name.trim(),
            label: label.trim() || name.trim(),
            color: '#334155',
            width: 5,
            dash: '10 6',
        };
        updateConstruction({ lineTypes: [...normalizedConstruction.lineTypes, nextType] });
        setSelectedLineTypeId(nextType.id);
        updateStatus(`${nextType.name} を線種に追加しました。`);
    };

    const addTextLabel = () => {
        if (!selectedWire) {
            updateStatus('文字は配線を選択してからラベルとして編集できます。');
            setConstructionTool('select');
            return;
        }
        const label = window.prompt('表示する文字を入力してください', selectedWire.label);
        if (label === null) return;
        handleSelectedWireUpdate({ label, showLabel: true });
        updateStatus('配線ラベルを更新しました。');
    };

    const exportQuantityCsv = () => {
        if (!lengthSummary.length) {
            updateStatus('出力する数量表がありません。');
            return;
        }
        const rows = [
            ['全ページ集計', '長さ(m)'],
            ...lengthSummary.map((item) => [item.name, item.meters.toFixed(1)]),
            ...boxSummary.map(([name, count]) => [name, `${count}個`]),
            [],
            ['ページ別集計', '項目', '数量'],
            ...pageSummaries.flatMap(({ page, wires, devices, boxes }) => [
                ...wires.map(([name, meters]) => [`${page.pageNumber}ページ目`, name, `${meters.toFixed(1)}m`]),
                ...devices.map((device) => [`${page.pageNumber}ページ目`, device.name, `${device.count}個`]),
                ...boxes.map(([name, count]) => [`${page.pageNumber}ページ目`, name, `${count}個`]),
            ]),
        ];
        const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `施工図数量表_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
        updateStatus('線種別の数量表CSVを出力しました。');
    };

    const loadImage = (src: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = src;
        });

    const renderPageToCanvas = async (page: NonNullable<typeof currentPage>) => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas context is unavailable.');
        canvas.width = page.width;
        canvas.height = page.height;
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(await loadImage(page.src), 0, 0, page.width, page.height);
        const pageState = getPageConstruction(page.pageNumber);

        pageState.erasers.forEach((shape) => {
            context.save();
            context.strokeStyle = '#ffffff';
            context.fillStyle = '#ffffff';
            context.lineCap = 'round';
            context.lineJoin = 'round';
            if (shape.kind === 'rect') {
                context.fillRect(Math.min(shape.x1, shape.x2), Math.min(shape.y1, shape.y2), Math.abs(shape.x2 - shape.x1), Math.abs(shape.y2 - shape.y1));
            } else {
                context.lineWidth = shape.width;
                context.beginPath();
                context.moveTo(shape.x1, shape.y1);
                context.lineTo(shape.x2, shape.y2);
                context.stroke();
            }
            context.restore();
        });

        pageState.wires.forEach((wire) => {
            const lineType = normalizedConstruction.lineTypes.find((type) => type.id === wire.lineTypeId) ?? normalizedConstruction.lineTypes[0];
            context.save();
            context.strokeStyle = wire.color ?? lineType.color;
            context.lineWidth = wire.width ?? lineType.width;
            context.lineCap = 'round';
            context.lineJoin = 'round';
            context.setLineDash((wire.dash ?? lineType.dash).split(/\s+/).filter(Boolean).map(Number));
            context.beginPath();
            wire.points.forEach((point, index) => {
                if (index === 0) context.moveTo(point.x, point.y);
                else context.lineTo(point.x, point.y);
            });
            context.stroke();
            context.restore();

            if (wire.showLabel) {
                context.save();
                context.font = '700 18px sans-serif';
                const width = Math.max(72, context.measureText(wire.label).width + 14);
                context.fillStyle = '#ffffff';
                context.strokeStyle = '#111827';
                context.lineWidth = 2;
                context.fillRect(wire.labelX - 5, wire.labelY - 22, width, 26);
                context.strokeRect(wire.labelX - 5, wire.labelY - 22, width, 26);
                context.fillStyle = '#111827';
                context.fillText(wire.label, wire.labelX, wire.labelY - 3);
                context.restore();
            }
        });

        (pageState.boxes ?? []).forEach((box) => {
            const cx = box.x + box.width / 2;
            const cy = box.y + box.height / 2;
            context.save();
            context.translate(cx, cy);
            context.rotate(((box.rotation ?? 0) * Math.PI) / 180);
            context.fillStyle = box.fillColor ?? '#ffffff';
            context.strokeStyle = box.strokeColor ?? '#111827';
            context.lineWidth = box.strokeWidth ?? 2;
            context.fillRect(-box.width / 2, -box.height / 2, box.width, box.height);
            context.strokeRect(-box.width / 2, -box.height / 2, box.width, box.height);
            context.fillStyle = box.strokeColor ?? '#111827';
            context.font = `700 ${box.fontSize ?? 16}px sans-serif`;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(box.label, 0, 0);
            context.restore();
        });

        placements
            .filter((placement) => (placement.pageNumber ?? 1) === page.pageNumber)
            .forEach((placement) => {
                const symbol = DEVICE_ITEMS.find((entry) => entry.key === placement.type) ?? DEVICE_ITEMS[0];
                context.save();
                context.fillStyle = symbol.color;
                context.strokeStyle = '#ffffff';
                context.lineWidth = 3;
                context.beginPath();
                context.arc(placement.x, placement.y - 20, 17, 0, Math.PI * 2);
                context.fill();
                context.stroke();
                context.fillStyle = '#ffffff';
                context.font = '700 13px sans-serif';
                context.textAlign = 'center';
                context.fillText(symbol.short, placement.x, placement.y - 16);
                context.restore();
            });

        return canvas;
    };

    const exportConstructionPdf = async () => {
        if (!drawingPages.length) {
            updateStatus('先に図面を読み込んでください。');
            return;
        }
        try {
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            for (const [index, page] of drawingPages.entries()) {
                if (index > 0) pdf.addPage('a3', 'landscape');
                updateStatus(`施工図PDFを作成中です。${index + 1}/${drawingPages.length}ページ`);
                const canvas = await renderPageToCanvas(page);
                const imgWidth = pageWidth;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                const offsetY = Math.max(0, (pageHeight - imgHeight) / 2);
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, offsetY, imgWidth, Math.min(pageHeight, imgHeight));
            }
            pdf.save(`施工図_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.pdf`);
            updateStatus(`全${drawingPages.length}ページの施工図PDFを出力しました。`);
        } catch (error) {
            console.error(error);
            updateStatus('PDF出力に失敗しました。');
        }
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
        const left = preferredLeft + panelWidth <= window.innerWidth - 12 ? preferredLeft : Math.max(12, fallbackLeft);
        const top = Math.min(Math.max(12, rect.top), window.innerHeight - panelHeight - 12);
        setOpenPalettePanel({
            groupKey,
            top: Math.max(12, top),
            left: Math.max(12, left),
        });
    };

    const draftDisplayPoints = previewPoint ? [...draftWirePoints, previewPoint] : draftWirePoints;
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (workspaceMode !== 'construction') return;
            if (event.key === 'Enter') {
                event.preventDefault();
                finishWire();
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                cancelDraft();
            }
            if (event.key === 'Delete' || event.key === 'Backspace') {
                if (selectedWireId || selectedEraserId || selectedBoxId) {
                    event.preventDefault();
                    deleteSelectedWire();
                }
            }
            if (event.key === 'PageUp') {
                event.preventDefault();
                switchPageByDelta(-1);
            }
            if (event.key === 'PageDown') {
                event.preventDefault();
                switchPageByDelta(1);
            }
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
                event.preventDefault();
                handleUndo();
            }
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') {
                event.preventDefault();
                handleRedo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    });

    useEffect(() => {
        if (!panDrag) return;

        const handleGlobalMouseMove = (event: MouseEvent) => {
            setPanOffset({
                x: panDrag.originX + event.clientX - panDrag.startX,
                y: panDrag.originY + event.clientY - panDrag.startY,
            });
        };

        const handleGlobalMouseUp = () => {
            setPanDrag(null);
            updateStatus('パン移動を終了しました。');
        };

        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [panDrag]);

    const activeCursor = panDrag ? 'grabbing' : workspaceMode === 'construction' && constructionTool === 'select' ? 'grab' : 'crosshair';

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
            <section className="card" style={{ marginBottom: 0, padding: '0.85rem 1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '220px minmax(0, 1fr)', gap: '0.75rem', alignItems: 'center' }}>
                    <label
                        htmlFor="drawing-upload-input"
                        className="btn btn-secondary"
                        style={{ width: '100%', color: 'var(--primary)', borderColor: 'var(--primary)' }}
                    >
                        図面を取り込む
                    </label>
                    <input id="drawing-upload-input" type="file" accept=".png,.jpg,.jpeg,.pdf" onChange={handleFileChange} style={{ display: 'none' }} />
                    <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button className="btn btn-secondary" onClick={() => setWorkspaceMode('quantity')} style={{ minWidth: '96px', padding: '0.6rem 0.8rem', borderColor: workspaceMode === 'quantity' ? 'var(--primary)' : undefined, color: workspaceMode === 'quantity' ? 'var(--primary)' : undefined }}>
                            数量拾い
                        </button>
                        <button className="btn btn-secondary" onClick={() => setWorkspaceMode('construction')} style={{ minWidth: '120px', padding: '0.6rem 0.8rem', borderColor: workspaceMode === 'construction' ? 'var(--primary)' : undefined, color: workspaceMode === 'construction' ? 'var(--primary)' : undefined }}>
                            施工図制作
                        </button>
                        <button className="btn btn-secondary" onClick={onOpenEstimateInput} style={{ minWidth: '118px', padding: '0.6rem 0.8rem' }}>見積もり確認</button>
                        <button className="btn btn-secondary" onClick={() => onScaleChange(Math.max(0.35, Number((scale - 0.1).toFixed(2))))} style={{ padding: '0.6rem 0.8rem' }}>
                            <Minus size={16} /> 縮小
                        </button>
                        <button className="btn btn-secondary" onClick={() => onScaleChange(1)} style={{ padding: '0.6rem 0.8rem' }}>
                            <RotateCcw size={16} /> 100%
                        </button>
                        <button className="btn btn-secondary" onClick={handleFitToScreen} style={{ padding: '0.6rem 0.8rem' }}>全体表示</button>
                        <button className="btn btn-secondary" onClick={() => onScaleChange(Math.min(3, Number((scale + 0.1).toFixed(2))))} style={{ padding: '0.6rem 0.8rem' }}>
                            <Plus size={16} /> 拡大
                        </button>
                        <button className="btn btn-secondary" onClick={handleUndo} style={{ padding: '0.6rem 0.8rem' }}>
                            <Trash2 size={16} /> 直前削除
                        </button>
                        <button className="btn btn-secondary" onClick={handleClear} style={{ padding: '0.6rem 0.8rem' }}>全消去</button>
                        <button className="btn btn-secondary" onClick={handleCopyJson} style={{ padding: '0.6rem 0.8rem' }}>
                            <Copy size={16} /> JSON
                        </button>
                    </div>
                </div>
                <p style={{ marginTop: '0.65rem', marginBottom: 0, color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'left' }}>{status}</p>
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: '170px minmax(0, 1fr) 300px', gap: '0.75rem', alignItems: 'start', minHeight: 0, flex: 1 }}>
                <aside
                    className="card"
                    onWheel={(event) => {
                        if (Math.abs(event.deltaY) < 18) return;
                        event.preventDefault();
                        switchPageByDelta(event.deltaY > 0 ? 1 : -1);
                    }}
                    style={{ padding: '0.75rem', marginBottom: 0, height: '100%', minHeight: 0, overflow: 'auto', textAlign: 'left' }}
                >
                    <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>ページ一覧</h2>
                    <div style={{ display: 'grid', gap: '0.6rem' }}>
                        {drawingPages.map((page) => {
                            const pageState = getPageConstruction(page.pageNumber);
                            const selected = page.pageNumber === currentPageNumber;
                            return (
                                <button
                                    key={page.pageNumber}
                                    type="button"
                                    onClick={() => switchPage(page.pageNumber)}
                                    style={{
                                        border: selected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-md)',
                                        background: selected ? 'rgba(37,99,235,0.1)' : 'white',
                                        padding: '0.45rem',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        color: '#0f172a',
                                    }}
                                >
                                    <img src={page.thumbnailSrc} alt={`${page.pageNumber}ページ目`} style={{ width: '100%', aspectRatio: '1 / 1.35', objectFit: 'contain', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'block' }} />
                                    <strong style={{ display: 'block', marginTop: '0.35rem', fontSize: '0.82rem' }}>{page.pageNumber}ページ目</strong>
                                    <span style={{ display: 'block', color: '#64748b', fontSize: '0.72rem' }}>縮尺 {pageState.scaleMetersPerPixel} m/px</span>
                                </button>
                            );
                        })}
                        {!drawingPages.length && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>PDFまたは画像を読み込んでください。</p>}
                    </div>
                </aside>
                <section className="card" style={{ padding: '1rem', marginBottom: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '1rem', flexWrap: 'wrap' }}>
                        <strong>{drawing.name ? `${drawing.name} / ${currentPageNumber}ページ目` : '図面未読込'}</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                            {workspaceMode === 'quantity' ? `選択中: ${selectedSymbol.name}` : `施工図: ${selectedLineType.name}`} / ズーム {Math.round(scale * 100)}%
                        </span>
                    </div>
                    <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
                        {workspaceMode === 'quantity' && (
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
                                        const groupCount = group.children.reduce((sum, child) => sum + currentPlacements.filter((item) => item.type === child.key).length, 0);
                                        const panelOpen = openPalettePanel?.groupKey === group.key;

                                        return (
                                            <div key={group.key} style={{ position: 'relative' }}>
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
                        )}
                        {workspaceMode === 'construction' && (
                            <div
                                data-export-ignore
                                onClick={(event) => event.stopPropagation()}
                                onMouseDown={(event) => event.stopPropagation()}
                                style={{
                                    position: 'absolute',
                                    top: 12,
                                    left: 12,
                                    zIndex: 30,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    flexWrap: 'wrap',
                                    maxWidth: 'calc(100% - 24px)',
                                    padding: '0.45rem',
                                    borderRadius: 'var(--radius-md)',
                                    background: 'rgba(255,255,255,0.96)',
                                    border: '1px solid var(--border-color)',
                                    boxShadow: 'var(--shadow-lg)',
                                    textAlign: 'left',
                                }}
                            >
                                {[
                                    { key: 'select', label: '選択', icon: <MousePointer2 size={15} /> },
                                    { key: 'eraseLine', label: '消す', icon: <Eraser size={15} /> },
                                    { key: 'wire', label: '配線', icon: <PenLine size={15} /> },
                                    { key: 'orthogonalWire', label: '直角配線', icon: <PenLine size={15} /> },
                                    { key: 'box', label: 'ジョイントボックス', icon: <Check size={15} /> },
                                ].map((tool) => (
                                    <button
                                        key={tool.key}
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => {
                                            setConstructionTool(tool.key as ConstructionTool);
                                            if (tool.key === 'wire' || tool.key === 'orthogonalWire') {
                                                setSelectedWireId('');
                                                setSelectedEraserId('');
                                                updateStatus(tool.key === 'orthogonalWire' ? '直角配線を開始できます。クリックで始点を置いてください。' : '配線を開始できます。クリックで始点を置いてください。');
                                            } else if (tool.key === 'box') {
                                                setSelectedWireId('');
                                                setSelectedEraserId('');
                                                updateStatus('図面上をクリックすると100×100のジョイントボックスを配置します。');
                                            }
                                        }}
                                        style={{
                                            padding: '0.45rem 0.6rem',
                                            fontSize: '0.82rem',
                                            borderColor: constructionTool === tool.key ? 'var(--primary)' : undefined,
                                            color: constructionTool === tool.key ? 'var(--primary)' : '#0f172a',
                                            background: constructionTool === tool.key ? '#eff6ff' : 'white',
                                        }}
                                    >
                                        {tool.icon}
                                        {tool.label}
                                    </button>
                                ))}
                                <button className="btn btn-secondary" onClick={addTextLabel} style={{ padding: '0.45rem 0.6rem', fontSize: '0.82rem', color: '#0f172a', background: 'white' }}>
                                    文字
                                </button>
                                <select
                                    value={selectedLineTypeId}
                                    onChange={(event) => handleSelectedLineTypeChange(event.target.value)}
                                    style={{ width: '155px', padding: '0.45rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', font: 'inherit', fontSize: '0.82rem' }}
                                    title="線種選択"
                                >
                                    {normalizedConstruction.lineTypes.map((lineType) => (
                                        <option key={lineType.id} value={lineType.id}>
                                            {lineType.name}
                                        </option>
                                    ))}
                                </select>
                                <button className="btn btn-secondary" onClick={deleteSelectedWire} disabled={!selectedWireId && !selectedEraserId && !selectedBoxId} style={{ padding: '0.45rem 0.6rem', fontSize: '0.82rem', color: '#0f172a', background: 'white' }}>
                                    <Trash2 size={15} /> 削除
                                </button>
                                <button className="btn btn-secondary" onClick={handleUndo} style={{ padding: '0.45rem 0.6rem', fontSize: '0.82rem', color: '#0f172a', background: 'white' }}>
                                    戻る
                                </button>
                                <button className="btn btn-secondary" onClick={handleRedo} disabled={!redoStack.length} style={{ padding: '0.45rem 0.6rem', fontSize: '0.82rem', color: '#0f172a', background: 'white' }}>
                                    進む
                                </button>
                                <button className="btn btn-secondary" onClick={finishWire} disabled={draftWirePoints.length < 2} style={{ padding: '0.45rem 0.6rem', fontSize: '0.82rem', color: '#0f172a', background: 'white' }}>
                                    <Check size={15} /> 確定
                                </button>
                                <button className="btn btn-primary" onClick={exportConstructionPdf} style={{ padding: '0.45rem 0.7rem', fontSize: '0.82rem' }}>
                                    <Download size={15} /> PDF出力
                                </button>
                            </div>
                        )}
                        <div
                            onWheel={handleDrawingWheel}
                            style={{
                                flex: 1,
                                minHeight: 0,
                                height: '100%',
                                overflow: 'hidden',
                                borderRadius: 'var(--radius-lg)',
                                border: panDrag ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                                background: '#fff',
                                position: 'relative',
                                cursor: panDrag ? 'grabbing' : 'default',
                            }}
                        >
                            {!activeDrawing.src ? (
                                <div style={{ height: '100%', minHeight: '520px', display: 'grid', placeItems: 'center', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                                    図面画像またはPDFを読み込むと、ここに表示されます。
                                </div>
                            ) : (
                                <div
                                    data-drawing-canvas="true"
                                    onClick={(event) => {
                                        handleQuantityClick(event);
                                        handleConstructionClick(event);
                                    }}
                                    onDoubleClick={(event) => {
                                        if (workspaceMode === 'construction' && (constructionTool === 'wire' || constructionTool === 'orthogonalWire')) {
                                            event.preventDefault();
                                            finishWire();
                                        }
                                    }}
                                    onMouseDown={handleConstructionMouseDown}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                    onMouseLeave={() => {
                                        if (!panDrag) handleMouseUp();
                                    }}
                                    onAuxClick={(event) => {
                                        if (event.button === 1) event.preventDefault();
                                    }}
                                    onContextMenu={(event) => {
                                        const target = (event.target as HTMLElement).closest('[data-placement-id]');
                                        if (!target) return;
                                        event.preventDefault();
                                        removePlacement(target.getAttribute('data-placement-id') || '');
                                    }}
                                    style={{
                                        position: 'relative',
                                        width: activeDrawing.width,
                                        height: activeDrawing.height,
                                        transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`,
                                        transformOrigin: 'top left',
                                        cursor: activeCursor,
                                        userSelect: panDrag ? 'none' : undefined,
                                    }}
                                >
                                    {panDrag && (
                                        <div
                                            data-export-ignore
                                            style={{
                                                position: 'absolute',
                                                left: 12,
                                                top: 12,
                                                zIndex: 20,
                                                padding: '0.45rem 0.7rem',
                                                borderRadius: 'var(--radius-md)',
                                                background: 'rgba(37,99,235,0.9)',
                                                color: 'white',
                                                fontWeight: 700,
                                                fontSize: '0.85rem',
                                                pointerEvents: 'none',
                                            }}
                                        >
                                            パン移動中
                                        </div>
                                    )}
                                    <img src={activeDrawing.src} alt="図面" style={{ width: activeDrawing.width, height: activeDrawing.height, display: 'block', userSelect: 'none' }} />
                                    <svg
                                        width={activeDrawing.width}
                                        height={activeDrawing.height}
                                        data-interactive-layer="true"
                                        style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: workspaceMode === 'construction' ? 'auto' : 'none' }}
                                    >
                                        {currentPageConstruction.erasers.map((shape) => {
                                            const selected = shape.id === selectedEraserId;
                                            return shape.kind === 'rect' ? (
                                                <rect
                                                    key={shape.id}
                                                    x={Math.min(shape.x1, shape.x2)}
                                                    y={Math.min(shape.y1, shape.y2)}
                                                    width={Math.abs(shape.x2 - shape.x1)}
                                                    height={Math.abs(shape.y2 - shape.y1)}
                                                    fill="#ffffff"
                                                    stroke={selected ? '#f97316' : '#d1d5db'}
                                                    strokeWidth={selected ? 3 : 1}
                                                    onClick={(event) => {
                                                        if (constructionTool !== 'select') return;
                                                        event.stopPropagation();
                                                        setSelectedEraserId(shape.id);
                                                        setSelectedWireId('');
                                                        setSelectedBoxId('');
                                                    }}
                                                    style={{ cursor: constructionTool === 'select' ? 'pointer' : 'default' }}
                                                />
                                            ) : (
                                                <g key={shape.id}>
                                                    <line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} stroke="#ffffff" strokeWidth={shape.width} strokeLinecap="round" />
                                                    <line
                                                        x1={shape.x1}
                                                        y1={shape.y1}
                                                        x2={shape.x2}
                                                        y2={shape.y2}
                                                        stroke={selected ? '#f97316' : 'transparent'}
                                                        strokeWidth={Math.max(shape.width + 6, 18)}
                                                        strokeLinecap="round"
                                                        onClick={(event) => {
                                                            if (constructionTool !== 'select') return;
                                                            event.stopPropagation();
                                                            setSelectedEraserId(shape.id);
                                                            setSelectedWireId('');
                                                            setSelectedBoxId('');
                                                        }}
                                                        style={{ cursor: constructionTool === 'select' ? 'pointer' : 'default' }}
                                                    />
                                                </g>
                                            );
                                        })}
                                        {dragState.kind === 'eraser' && (
                                            dragState.shapeKind === 'rect' ? (
                                                <rect
                                                    x={Math.min(dragState.start.x, dragState.current.x)}
                                                    y={Math.min(dragState.start.y, dragState.current.y)}
                                                    width={Math.abs(dragState.current.x - dragState.start.x)}
                                                    height={Math.abs(dragState.current.y - dragState.start.y)}
                                                    fill="rgba(255,255,255,0.82)"
                                                    stroke="#94a3b8"
                                                    strokeWidth={1}
                                                />
                                            ) : (
                                                <line x1={dragState.start.x} y1={dragState.start.y} x2={dragState.current.x} y2={dragState.current.y} stroke="#ffffff" strokeWidth={DEFAULT_ERASER_WIDTH} strokeLinecap="round" />
                                            )
                                        )}
                                        {(currentPageConstruction.boxes ?? []).map((box) => {
                                            const selected = box.id === selectedBoxId;
                                            const cx = box.x + box.width / 2;
                                            const cy = box.y + box.height / 2;
                                            return (
                                                <g key={box.id} transform={`rotate(${box.rotation ?? 0} ${cx} ${cy})`}>
                                                    <rect
                                                        x={box.x}
                                                        y={box.y}
                                                        width={box.width}
                                                        height={box.height}
                                                        fill={box.fillColor ?? '#ffffff'}
                                                        stroke={selected ? '#f97316' : (box.strokeColor ?? '#111827')}
                                                        strokeWidth={selected ? Math.max(box.strokeWidth ?? 2, 3) : (box.strokeWidth ?? 2)}
                                                        onMouseDown={(event) => {
                                                            if (workspaceMode !== 'construction' || constructionTool !== 'select') return;
                                                            event.stopPropagation();
                                                            const start = getCanvasPoint(event.nativeEvent);
                                                            if (!start) return;
                                                            setSelectedBoxId(box.id);
                                                            setSelectedWireId('');
                                                            setSelectedEraserId('');
                                                            setDragState({ kind: 'box', boxId: box.id, start, originalBox: box });
                                                        }}
                                                        style={{ cursor: constructionTool === 'select' ? 'move' : 'default' }}
                                                    />
                                                    <text
                                                        x={cx}
                                                        y={cy}
                                                        fill={box.strokeColor ?? '#111827'}
                                                        fontSize={box.fontSize ?? 16}
                                                        fontWeight={700}
                                                        textAnchor="middle"
                                                        dominantBaseline="middle"
                                                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                                                    >
                                                        {box.label}
                                                    </text>
                                                </g>
                                            );
                                        })}
                                        {currentPageConstruction.wires.map((wire) => {
                                            const lineType = normalizedConstruction.lineTypes.find((type) => type.id === wire.lineTypeId) ?? normalizedConstruction.lineTypes[0];
                                            const selected = wire.id === selectedWireId;
                                            return (
                                                <g key={wire.id}>
                                                    <polyline
                                                        points={wire.points.map((point) => `${point.x},${point.y}`).join(' ')}
                                                        fill="none"
                                                        stroke={wire.color ?? lineType.color}
                                                        strokeWidth={(wire.width ?? lineType.width) + (selected ? 4 : 0)}
                                                        strokeDasharray={wire.dash ?? lineType.dash}
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        opacity={selected ? 0.28 : 0}
                                                        style={{ pointerEvents: 'none' }}
                                                    />
                                                    <polyline
                                                        points={wire.points.map((point) => `${point.x},${point.y}`).join(' ')}
                                                        fill="none"
                                                        stroke={wire.color ?? lineType.color}
                                                        strokeWidth={wire.width ?? lineType.width}
                                                        strokeDasharray={wire.dash ?? lineType.dash}
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        onMouseDown={(event) => {
                                                            if (workspaceMode !== 'construction' || constructionTool !== 'select') return;
                                                            event.stopPropagation();
                                                            setSelectedWireId(wire.id);
                                                            setSelectedEraserId('');
                                                            setSelectedBoxId('');
                                                            setSelectedPointIndex(null);
                                                            const start = getCanvasPoint(event.nativeEvent);
                                                            if (start) {
                                                                setDragState({ kind: 'wire', wireId: wire.id, start, originalPoints: wire.points, originalLabel: { x: wire.labelX, y: wire.labelY } });
                                                            }
                                                        }}
                                                        onClick={(event) => {
                                                            if (constructionTool !== 'select') return;
                                                            event.stopPropagation();
                                                            setSelectedWireId(wire.id);
                                                            setSelectedBoxId('');
                                                            setSelectedEraserId('');
                                                        }}
                                                        style={{ cursor: constructionTool === 'select' ? 'move' : 'default', pointerEvents: workspaceMode === 'construction' ? 'stroke' : 'none' }}
                                                    />
                                                    {selected &&
                                                        wire.points.map((point, index) => (
                                                            <circle
                                                                key={`${wire.id}_${index}`}
                                                                cx={point.x}
                                                                cy={point.y}
                                                                r={7}
                                                                fill={selectedPointIndex === index ? '#f97316' : '#ffffff'}
                                                                stroke="#0f172a"
                                                                strokeWidth={2}
                                                                onMouseDown={(event) => {
                                                                    event.stopPropagation();
                                                                    setSelectedPointIndex(index);
                                                                    setDragState({ kind: 'point', wireId: wire.id, pointIndex: index });
                                                                }}
                                                                style={{ cursor: 'grab' }}
                                                            />
                                                        ))}
                                                    {showLabels && wire.showLabel && (
                                                        <g
                                                            onMouseDown={(event) => {
                                                                if (workspaceMode !== 'construction') return;
                                                                event.stopPropagation();
                                                                setSelectedWireId(wire.id);
                                                                setDragState({
                                                                    kind: 'label',
                                                                    wireId: wire.id,
                                                                    startX: event.clientX,
                                                                    startY: event.clientY,
                                                                    originX: wire.labelX,
                                                                    originY: wire.labelY,
                                                                });
                                                            }}
                                                            style={{ cursor: 'move' }}
                                                        >
                                                            <rect x={wire.labelX - 4} y={wire.labelY - 16} width={Math.max(54, wire.label.length * 8 + 8)} height={20} rx={3} fill="white" stroke="#111827" strokeWidth={1} />
                                                            <text x={wire.labelX} y={wire.labelY - 2} fill="#111827" fontSize={13} fontWeight={700}>
                                                                {wire.label}
                                                            </text>
                                                        </g>
                                                    )}
                                                </g>
                                            );
                                        })}
                                        {draftDisplayPoints.length > 0 && (
                                            <polyline
                                                points={draftDisplayPoints.map((point) => `${point.x},${point.y}`).join(' ')}
                                                fill="none"
                                                stroke={selectedLineType.color}
                                                strokeWidth={selectedLineType.width}
                                                strokeDasharray={selectedLineType.dash}
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        )}
                                    </svg>
                                    {currentPlacements.map((item) => {
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
                                                    pointerEvents: workspaceMode === 'quantity' ? 'auto' : 'none',
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

                <aside className="card" style={{ padding: '1rem', marginBottom: 0, height: '100%', minHeight: 0, overflow: 'auto', textAlign: 'left' }}>
                    <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>レイヤー</h2>
                    {['PDF背景レイヤー', '既存配線消し込みレイヤー', '新規配線レイヤー', 'マーク／器具レイヤー', '文字ラベルレイヤー'].map((layer) => (
                        <div key={layer} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                            <span>{layer}</span>
                            <span style={{ color: 'var(--success)', fontWeight: 700 }}>ON</span>
                        </div>
                    ))}
                    <h2 style={{ fontSize: '1rem', margin: '1rem 0 0.75rem' }}>属性</h2>
                    <div style={{ display: 'grid', gap: '0.55rem' }}>
                        <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            線種
                            <select value={selectedLineTypeId} onChange={(event) => handleSelectedLineTypeChange(event.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                                {normalizedConstruction.lineTypes.map((lineType) => (
                                    <option key={lineType.id} value={lineType.id}>
                                        {lineType.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                色
                                <input type="color" value={selectedWire?.color ?? selectedLineType.color} onChange={(event) => selectedWire ? handleSelectedWireUpdate({ color: event.target.value }) : undefined} style={{ width: '100%', height: '38px' }} />
                            </label>
                            <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                太さ
                                <select value={String(selectedWire?.width ?? selectedLineType.width)} onChange={(event) => selectedWire ? handleSelectedWireUpdate({ width: Number(event.target.value) }) : undefined} style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                                    {[3, 4, 5, 6, 8, 10].map((width) => (
                                        <option key={width} value={width}>{width}px</option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            縮尺 m/px
                            <input
                                type="number"
                                min="0"
                                step="0.001"
                                value={currentPageConstruction.scaleMetersPerPixel}
                                onChange={(event) => updateConstruction({ scaleMetersPerPixel: Number(event.target.value) || 0 })}
                                style={{ width: '100%' }}
                            />
                        </label>
                        {selectedWire && (
                            <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                ラベル
                                <input value={selectedWire.label} onChange={(event) => handleSelectedWireUpdate({ label: event.target.value })} style={{ width: '100%' }} />
                            </label>
                        )}
                        {selectedBox && (
                            <>
                                <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                    名称
                                    <input value={selectedBox.label} onChange={(event) => handleSelectedBoxUpdate({ label: event.target.value })} list="construction-box-labels" style={{ width: '100%' }} />
                                </label>
                                <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                    サイズ
                                    <select
                                        value={['100×100×100', '150×150×100', '200×200×150', '300×300×200'].includes(selectedBox.size || '') ? selectedBox.size : 'その他'}
                                        onChange={(event) => {
                                            const val = event.target.value;
                                            if (val === 'その他') {
                                                handleSelectedBoxUpdate({ size: 'その他' });
                                            } else {
                                                handleSelectedBoxUpdate({ size: val });
                                            }
                                        }}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                                    >
                                        <option value="100×100×100">100×100×100</option>
                                        <option value="150×150×100">150×150×100</option>
                                        <option value="200×200×150">200×200×150</option>
                                        <option value="300×300×200">300×300×200</option>
                                        <option value="その他">その他（自由入力）</option>
                                    </select>
                                </label>
                                {(!['100×100×100', '150×150×100', '200×200×150', '300×300×200'].includes(selectedBox.size || '') || selectedBox.size === 'その他') && (
                                    <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                        サイズ自由入力
                                        <input
                                            value={selectedBox.size === 'その他' ? '' : selectedBox.size || ''}
                                            placeholder="サイズを入力してください"
                                            onChange={(event) => handleSelectedBoxUpdate({ size: event.target.value })}
                                            style={{ width: '100%' }}
                                        />
                                    </label>
                                )}
                                <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                    備考
                                    <input
                                        value={selectedBox.note || ''}
                                        placeholder="備考を入力してください"
                                        onChange={(event) => handleSelectedBoxUpdate({ note: event.target.value })}
                                        style={{ width: '100%' }}
                                    />
                                </label>
                            </>
                        )}
                        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                            <button className="btn btn-secondary" onClick={() => setShowLabels(!showLabels)} style={{ padding: '0.45rem 0.65rem', fontSize: '0.82rem' }}>
                                {showLabels ? <Eye size={15} /> : <EyeOff size={15} />} ラベル
                            </button>
                            <button className="btn btn-secondary" onClick={addLineType} style={{ padding: '0.45rem 0.65rem', fontSize: '0.82rem' }}>線種追加</button>
                            <button className="btn btn-secondary" onClick={addBendPoint} disabled={!selectedWire} style={{ padding: '0.45rem 0.65rem', fontSize: '0.82rem' }}>曲点追加</button>
                            <button className="btn btn-secondary" onClick={deleteSelectedPoint} disabled={!selectedWire || selectedPointIndex === null || (selectedWire?.points.length ?? 0) <= 2} style={{ padding: '0.45rem 0.65rem', fontSize: '0.82rem' }}>曲点削除</button>
                            <button className="btn btn-secondary" onClick={exportQuantityCsv} title="数量表CSV" style={{ padding: '0.45rem 0.65rem', fontSize: '0.82rem' }}>
                                <FileSpreadsheet size={15} /> 数量CSV
                            </button>
                        </div>
                    </div>
                    <h2 style={{ fontSize: '1rem', margin: '1rem 0 0.75rem' }}>全ページ集計</h2>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                        {lengthSummary.map((item) => (
                            <div key={item.name} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.65rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                                    <span style={{ fontWeight: 700 }}>{item.name}</span>
                                    <strong>{item.meters.toFixed(1)}m</strong>
                                </div>
                                <svg width="100%" height="14" style={{ display: 'block', marginTop: '0.35rem' }}>
                                    <line x1="0" y1="7" x2="260" y2="7" stroke={item.color} strokeWidth={item.width} strokeDasharray={item.dash} />
                                </svg>
                            </div>
                        ))}
                        {boxSummary.map(([name, count]) => (
                            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.65rem', fontSize: '0.85rem' }}>
                                <span style={{ fontWeight: 700 }}>{name}</span>
                                <strong>{count}個</strong>
                            </div>
                        ))}
                        {!lengthSummary.length && !boxSummary.length && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>まだ配線・図形はありません。</p>}
                    </div>
                    <h2 style={{ fontSize: '1rem', margin: '1rem 0 0.75rem' }}>ページ別集計</h2>
                    <div style={{ display: 'grid', gap: '0.6rem' }}>
	                        {pageSummaries.map(({ page, wires, devices, boxes }) => (
                            <div key={page.pageNumber} style={{ border: page.pageNumber === currentPageNumber ? '1px solid var(--primary)' : '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.65rem' }}>
                                <strong style={{ display: 'block', marginBottom: '0.35rem' }}>{page.pageNumber}ページ目</strong>
                                {wires.map(([name, meters]) => (
                                    <div key={name} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.82rem' }}>
                                        <span>{name}</span>
                                        <strong>{meters.toFixed(1)}m</strong>
                                    </div>
                                ))}
                                {devices.map((device) => (
                                    <div key={device.name} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.82rem' }}>
                                        <span>{device.name}</span>
                                        <strong>{device.count}個</strong>
                                    </div>
                                ))}
                                {boxes.map(([name, count]) => (
                                    <div key={name} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.82rem' }}>
                                        <span>{name}</span>
                                        <strong>{count}個</strong>
                                    </div>
                                ))}
                                {!wires.length && !devices.length && !boxes.length && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>未入力</span>}
                            </div>
                        ))}
                    </div>
                    {workspaceMode === 'quantity' && (
                        <>
                            <h2 style={{ fontSize: '1rem', margin: '1rem 0 0.75rem' }}>配置数</h2>
                            <div style={{ display: 'grid', gap: '0.45rem' }}>
                                {counters.filter((counter) => counter.count > 0).map((counter) => (
                                    <div key={counter.key} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.85rem' }}>
                                        <span>{counter.label ?? counter.name}</span>
                                        <strong style={{ color: counter.color }}>{counter.count}</strong>
                                    </div>
                                ))}
                                {!counters.some((counter) => counter.count > 0) && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>まだ配置はありません</span>}
                            </div>
                        </>
                    )}
                </aside>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', alignItems: 'center', gap: '0.75rem', paddingTop: '0.25rem' }}>
                <button className="btn btn-secondary" onClick={onBack}>
                    <ArrowLeft size={18} /> 戻る
                </button>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'left' }}>
                    {workspaceMode === 'construction'
                        ? '配線はクリックで始点、連続クリックで曲がり点、ダブルクリック・Enter・確定で終了。Escでキャンセルできます。'
                        : '記号を選んで図面上をクリックすると数量拾い用のマークを配置できます。'}
                </div>
                <button className="btn btn-primary" onClick={workspaceMode === 'construction' ? handleApplyWires : handleApply}>
                    <MapPinned size={18} /> {workspaceMode === 'construction' ? '配線を見積へ反映' : '見積項目へ反映'}
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
                                <strong style={{ color: symbol.color, fontSize: '0.95rem' }}>{currentPlacements.filter((item) => item.type === symbol.key).length}</strong>
                            </button>
                        ))}
                    </div>
                </>
            )}
            <datalist id="construction-box-labels">
                {['JB', 'PB', '端子箱', '盤', 'P-1', 'JB-1', 'JB-2'].map((label) => (
                    <option key={label} value={label} />
                ))}
            </datalist>
        </div>
    );
}
