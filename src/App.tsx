import { useState, useEffect } from 'react';
import { type EstimateItem, defaultItems, type EstimateInfo, defaultInfo, type SavedEstimate } from './types';
import TopScreen from './components/TopScreen';
import InputScreen from './components/InputScreen';
import EstimateScreen from './components/EstimateScreen';
import SavedEstimatesScreen from './components/SavedEstimatesScreen';
import ReferencePriceScreen from './components/ReferencePriceScreen';

export type ScreenType = 'top' | 'input' | 'estimate' | 'saved' | 'ref_edit';

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
          onViewSaved={() => setCurrentScreen('saved')}
          hasSavedCount={savedEstimates.length}
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
