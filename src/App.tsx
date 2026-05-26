import { useState, useEffect } from 'react';
import { type EstimateItem, defaultItems, type EstimateInfo, defaultInfo, type SavedEstimate, type PlotPlacement, type Category, type PlotDrawingState, type ConstructionDrawingState } from './types';
import TopScreen from './components/TopScreen';
import InputScreen from './components/InputScreen';
import EstimateScreen from './components/EstimateScreen';
import SavedEstimatesScreen from './components/SavedEstimatesScreen';
import ReferencePriceScreen from './components/ReferencePriceScreen';
import DrawingPlotScreen from './components/DrawingPlotScreen';

export type ScreenType = 'top' | 'plot' | 'input' | 'estimate' | 'saved' | 'ref_edit';

function App() {
  const REQUIRED_PASSWORD = import.meta.env.VITE_APP_PASSWORD;

  const [isAuthorized, setIsAuthorized] = useState(() => {
    if (!REQUIRED_PASSWORD) return true; // 設定されていない場合はパススルー
    return sessionStorage.getItem('mitsumori-auth') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === REQUIRED_PASSWORD) {
      sessionStorage.setItem('mitsumori-auth', 'true');
      setIsAuthorized(true);
      setPasswordError('');
    } else {
      setPasswordError('パスワードが間違っています。');
    }
  };

  const [currentScreen, setCurrentScreen] = useState<ScreenType>('top');

  const [items, setItems] = useState<EstimateItem[]>(() => {
    const saved = localStorage.getItem('mitsumori-kun-items');

    let initialItems = defaultItems;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Add any new defaults that might have been added in updates
          const missingDefaults = defaultItems.filter(di => !parsed.some((pi: any) => pi.id === di.id));
          initialItems = [...parsed, ...missingDefaults];
        }
      } catch (e) {
        console.error('Failed to parse saved items', e);
      }
    }

    const savedRefsStr = localStorage.getItem('mitsumori-kun-ref-prices');
    if (savedRefsStr) {
      try {
        const savedRefs = JSON.parse(savedRefsStr);
        initialItems = initialItems.map(item => ({
          ...item,
          referencePrice: savedRefs[item.id] !== undefined ? savedRefs[item.id] : item.referencePrice
        }));
      } catch (e) { }
    }

    return initialItems;
  });

  const [info, setInfo] = useState<EstimateInfo>(() => {
    const saved = localStorage.getItem('mitsumori-kun-info');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved info', e);
      }
    }
    return defaultInfo;
  });

  const [savedEstimates, setSavedEstimates] = useState<SavedEstimate[]>(() => {
    const saved = localStorage.getItem('mitsumori-kun-saved-list');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved list', e);
      }
    }
    return [];
  });

  const [customRefs, setCustomRefs] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('mitsumori-kun-custom-refs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved custom refs', e);
      }
    }
    return {};
  });

  const [copperRate, setCopperRate] = useState<string>(() => {
    return localStorage.getItem('mitsumori-kun-copper-rate') || '170';
  });

  const [copperRateDate, setCopperRateDate] = useState<string>(() => {
    return localStorage.getItem('mitsumori-kun-copper-date') || '2026/03/02';
  });
  const [plotDrawing, setPlotDrawing] = useState<PlotDrawingState>({
    name: '',
    width: 0,
    height: 0,
    src: '',
  });
  const [plotPlacements, setPlotPlacements] = useState<PlotPlacement[]>([]);
  const [constructionDrawing, setConstructionDrawing] = useState<ConstructionDrawingState>({
    lineTypes: [
      { id: 'vvf16-2c', name: 'VVF 1.6-2C', label: '1.6-2C', color: '#1d4ed8', width: 4, dash: '' },
      { id: 'vvf16-3c', name: 'VVF 1.6-3C', label: '1.6-3C', color: '#0f766e', width: 4, dash: '12 8' },
      { id: 'vvf20-2c', name: 'VVF 2.0-2C', label: '2.0-2C', color: '#b45309', width: 5, dash: '' },
      { id: 'vvf20-3c', name: 'VVF 2.0-3C', label: '2.0-3C', color: '#dc2626', width: 5, dash: '14 7' },
      { id: 'cv35-3c', name: 'CV 3.5sq-3C', label: '3.5sq-3C', color: '#7c3aed', width: 5, dash: '4 7' },
      { id: 'cv55-3c', name: 'CV 5.5sq-3C', label: '5.5sq-3C', color: '#0369a1', width: 5, dash: '18 7 4 7' },
      { id: 'cv8-3c', name: 'CV 8sq-3C', label: '8sq-3C', color: '#be123c', width: 6, dash: '' },
      { id: 'cv14-3c', name: 'CV 14sq-3C', label: '14sq-3C', color: '#111827', width: 6, dash: '20 8' },
    ],
    wires: [],
    erasers: [],
    scaleMetersPerPixel: 0.01,
    pages: {},
  });
  const [plotScale, setPlotScale] = useState(1);

  // Save to local storage whenever items or info change
  useEffect(() => {
    localStorage.setItem('mitsumori-kun-items', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('mitsumori-kun-info', JSON.stringify(info));
  }, [info]);

  useEffect(() => {
    localStorage.setItem('mitsumori-kun-saved-list', JSON.stringify(savedEstimates));
  }, [savedEstimates]);

  useEffect(() => {
    localStorage.setItem('mitsumori-kun-custom-refs', JSON.stringify(customRefs));
  }, [customRefs]);

  const handleUpdateCopperRate = (rate: string) => {
    setCopperRate(rate);
    const today = new Date();
    const d = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
    setCopperRateDate(d);
    localStorage.setItem('mitsumori-kun-copper-rate', rate);
    localStorage.setItem('mitsumori-kun-copper-date', d);
  };

  const updateItem = (id: string, updates: Partial<EstimateItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const updateInfo = (updates: Partial<EstimateInfo>) => {
    setInfo(prev => ({ ...prev, ...updates }));
  };

  const addItem = (item: EstimateItem) => {
    setItems(prev => {
      // Find the last item in the same category to insert after, or just append
      const lastIndex = prev.map(i => i.category).lastIndexOf(item.category);
      if (lastIndex === -1) return [...prev, item];
      const newItems = [...prev];
      newItems.splice(lastIndex + 1, 0, item);
      return newItems;
    });
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const detectCategoryFromPlotName = (name: string): Category => {
    if (name.includes('コンセント') || name.includes('スイッチ') || name.includes('ボックス') || name.includes('シーリング')) return '配線器具';
    if (name.includes('照明') || name.includes('換気扇') || name.includes('盤') || name.includes('ベースライト') || name === 'DL') return '機器';
    return '配線器具';
  };

  const normalizePlotItemName = (name: string): string => {
    const trimmed = name.trim();
    if (trimmed === 'switch') return 'スイッチ';
    if (trimmed === 'outlet') return 'コンセント';
    if (trimmed === 'three_way_switch') return '3路スイッチ';
    if (trimmed === 'light') return '照明';
    if (trimmed === 'junction_box') return 'ジョイントボックス';
    return trimmed;
  };

  const applyPlotPlacements = (placements: PlotPlacement[]) => {
    const aggregated = new Map<string, { count: number; category: Category }>();

    placements.forEach((placement) => {
      const itemName = normalizePlotItemName(placement.name);
      if (!itemName) return;
      const current = aggregated.get(itemName);
      if (current) {
        current.count += 1;
      } else {
        aggregated.set(itemName, { count: 1, category: detectCategoryFromPlotName(itemName) });
      }
    });

    if (!aggregated.size) {
      alert('反映できる図面プロットがありませんでした。');
      return;
    }

    aggregated.forEach((entry, itemName) => {
      const existingItem = items.find(i => i.name === itemName);
      if (existingItem) {
        const nextQuantity = Number(existingItem.quantity || 0) + entry.count;
        updateItem(existingItem.id, {
          quantity: String(nextQuantity),
          selected: true
        });
      } else {
        const defaultUnit = entry.category === '人工' ? '人工' : (entry.category === '経費' ? '' : (entry.category === '電線' || entry.category === '配管' ? 'm' : '個'));
        addItem({
          id: 'dyn_plot_' + Date.now() + Math.random(),
          name: itemName,
          category: entry.category,
          quantity: String(entry.count),
          unit: defaultUnit,
          unitPrice: '',
          selected: true,
          itemType: 'free'
        });
      }
    });

    alert(`図面プロットから ${aggregated.size} 種類の項目を反映しました。`);
    setCurrentScreen('input');
  };

  const applyConstructionWires = (summary: Array<{ name: string; meters: number }>) => {
    if (!summary.length) {
      alert('反映できる配線数量がありませんでした。');
      return;
    }

    summary.forEach((entry) => {
      const existingItem = items.find(i => i.name.replace(/\s+/g, '') === entry.name.replace(/\s+/g, ''));
      if (existingItem) {
        updateItem(existingItem.id, {
          quantity: String(entry.meters),
          selected: true
        });
      } else {
        addItem({
          id: 'dyn_wire_' + Date.now() + Math.random(),
          name: entry.name,
          category: '電線',
          quantity: String(entry.meters),
          unit: 'm',
          unitPrice: '',
          selected: true,
          itemType: 'free'
        });
      }
    });

    alert(`施工図配線から ${summary.length} 種類の線種を見積へ反映しました。`);
    setCurrentScreen('input');
  };

  const generateNextEstimateNumber = () => {
    const currentYear = new Date().getFullYear();
    const seqStr = localStorage.getItem('mitsumori-kun-sequence');
    let seq = { year: currentYear, count: 1 };

    if (seqStr) {
      try {
        const parsed = JSON.parse(seqStr);
        if (parsed.year === currentYear) {
          seq.count = parsed.count + 1;
        }
      } catch (e) {
        console.error('Failed to parse sequence', e);
      }
    }

    localStorage.setItem('mitsumori-kun-sequence', JSON.stringify(seq));
    return `${currentYear}-${String(seq.count).padStart(3, '0')}`;
  };

  const clearData = () => {
    if (confirm('【警告】すべての入力データ、変更した単価、追加した項目も完全に削除し、初期状態に戻しますか？\n（※この操作は元に戻せません）')) {
      localStorage.removeItem('mitsumori-kun-items');
      localStorage.removeItem('mitsumori-kun-info');

      const savedRefsStr = localStorage.getItem('mitsumori-kun-ref-prices');
      let newItems = defaultItems;
      if (savedRefsStr) {
        try {
          const savedRefs = JSON.parse(savedRefsStr);
          newItems = defaultItems.map(item => ({
            ...item,
            referencePrice: savedRefs[item.id] !== undefined ? savedRefs[item.id] : item.referencePrice
          }));
        } catch (e) { }
      }

      setItems(newItems);
      setInfo(defaultInfo);
    }
  };

  const handleUpdateRefPrices = (newRefs: Record<string, string>) => {
    localStorage.setItem('mitsumori-kun-ref-prices', JSON.stringify(newRefs));
    setItems(prev => prev.map(item => {
      if (newRefs[item.id] !== undefined) {
        return { ...item, referencePrice: newRefs[item.id] };
      }
      return item;
    }));
  };

  const handleUpdateCustomRef = (name: string, price: string) => {
    setCustomRefs(prev => {
      const next = { ...prev };
      if (!price) {
        delete next[name];
      } else {
        next[name] = price;
      }
      return next;
    });
  };

  const handleSaveEstimate = () => {
    const nextNumber = generateNextEstimateNumber();
    const updatedInfo = { ...info, estimateNumber: nextNumber };
    setInfo(updatedInfo); // Also update working copy

    const newSaved: SavedEstimate = {
      id: `est_${Date.now()}`,
      date: new Date().toLocaleString('ja-JP'),
      info: updatedInfo,
      items: [...items],
      estimateNumber: nextNumber
    };
    setSavedEstimates(prev => [newSaved, ...prev]);
    alert(`見積番号 ${nextNumber} でデータを保存しました！\nトップ画面の「保存した見積を見る」からいつでも再開できます。`);
  };

  const handleLoadSavedEstimate = (estimate: SavedEstimate) => {
    setItems(estimate.items);
    setInfo(estimate.info);
    setCurrentScreen('input');
  };

  const handleDeleteSavedEstimate = (id: string) => {
    setSavedEstimates(prev => prev.filter(e => e.id !== id));
  };

  if (!isAuthorized) {
    return (
      <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
        <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2rem', textAlign: 'center', margin: '0 auto' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: 'var(--primary)', border: 'none', padding: 0 }}>電気工事見積もりくん</h1>
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-main)', fontSize: '0.875rem' }}>利用するにはパスワードを入力してください</p>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="パスワード"
              style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '1rem', width: '100%', boxSizing: 'border-box' }}
              autoFocus
            />
            {passwordError && <p style={{ color: '#ef4444', fontSize: '0.875rem', margin: 0, textAlign: 'left' }}>{passwordError}</p>}
            <button type="submit" className="btn btn-primary btn-large" style={{ marginTop: '0.5rem' }}>
              ログイン
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      {currentScreen === 'top' && (
        <TopScreen
          onStart={() => setCurrentScreen('input')}
          onOpenPlot={() => setCurrentScreen('plot')}
          onViewSaved={() => setCurrentScreen('saved')}
          hasSavedCount={savedEstimates.length}
        />
      )}

      {currentScreen === 'plot' && (
        <DrawingPlotScreen
          onBack={() => setCurrentScreen('top')}
          onApplyToEstimate={applyPlotPlacements}
          onApplyWiresToEstimate={applyConstructionWires}
          onOpenEstimateInput={() => setCurrentScreen('input')}
          drawing={plotDrawing}
          placements={plotPlacements}
          construction={constructionDrawing}
          scale={plotScale}
          onDrawingChange={setPlotDrawing}
          onPlacementsChange={setPlotPlacements}
          onConstructionChange={setConstructionDrawing}
          onScaleChange={setPlotScale}
        />
      )}

      {currentScreen === 'input' && (
        <InputScreen
          items={items}
          info={info}
          customRefs={customRefs}
          copperRate={copperRate}
          copperRateDate={copperRateDate}
          updateItem={updateItem}
          updateInfo={updateInfo}
          updateCustomRef={handleUpdateCustomRef}
          onUpdateCopperRate={handleUpdateCopperRate}
          addItem={addItem}
          removeItem={removeItem}
          onNext={() => setCurrentScreen('estimate')}
          onReset={clearData}
          onEditRefPrice={() => setCurrentScreen('ref_edit')}
          onOpenPlot={() => setCurrentScreen('plot')}
        />
      )}

      {currentScreen === 'estimate' && (
        <EstimateScreen
          items={items}
          info={info}
          onBack={() => setCurrentScreen('input')}
          onSave={handleSaveEstimate}
        />
      )}

      {currentScreen === 'saved' && (
        <SavedEstimatesScreen
          savedEstimates={savedEstimates}
          onBack={() => setCurrentScreen('top')}
          onLoad={handleLoadSavedEstimate}
          onDelete={handleDeleteSavedEstimate}
        />
      )}

      {currentScreen === 'ref_edit' && (
        <ReferencePriceScreen
          items={items}
          copperRate={copperRate}
          copperRateDate={copperRateDate}
          updateRefPrices={handleUpdateRefPrices}
          onUpdateCopperRate={handleUpdateCopperRate}
          onBack={() => setCurrentScreen('input')}
        />
      )}
    </>
  );
}

export default App;
