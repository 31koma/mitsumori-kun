import { useState, useRef, useEffect } from 'react';
import { FileEdit, Upload, FileSpreadsheet, Save, Trash2 } from 'lucide-react';

interface TopScreenProps {
    onStart: () => void;
    onViewSaved: () => void;
    hasSavedCount: number;
}

export default function TopScreen({ onStart, onViewSaved, hasSavedCount }: TopScreenProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const invoiceInputRef = useRef<HTMLInputElement>(null);
    const [hasTemplate, setHasTemplate] = useState(false);
    const [hasInvoiceTemplate, setHasInvoiceTemplate] = useState(false);

    useEffect(() => {
        const checkTemplate = () => {
            const saved = localStorage.getItem('mitsumori-template');
            if (saved) setHasTemplate(true);

            const savedInvoice = localStorage.getItem('mitsumori-invoice-template');
            if (savedInvoice) setHasInvoiceTemplate(true);
        };
        checkTemplate();
    }, []);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'estimate' | 'invoice') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            if (type === 'estimate') {
                localStorage.setItem('mitsumori-template', base64);
                localStorage.setItem('mitsumori-template-name', file.name);
                setHasTemplate(true);
                alert(`見積書雛形として ${file.name} を保存しました！`);
            } else {
                localStorage.setItem('mitsumori-invoice-template', base64);
                localStorage.setItem('mitsumori-invoice-template-name', file.name);
                setHasInvoiceTemplate(true);
                alert(`請求書雛形として ${file.name} を保存しました！`);
            }
        };
        reader.readAsDataURL(file);

        // 同じファイルを再度選択できるようにする
        if (type === 'estimate' && fileInputRef.current) fileInputRef.current.value = '';
        if (type === 'invoice' && invoiceInputRef.current) invoiceInputRef.current.value = '';
    };

    const handleDeleteTemplate = (type: 'estimate' | 'invoice') => {
        if (window.confirm('この雛形を削除しますか？')) {
            if (type === 'estimate') {
                localStorage.removeItem('mitsumori-template');
                localStorage.removeItem('mitsumori-template-name');
                setHasTemplate(false);
            } else {
                localStorage.removeItem('mitsumori-invoice-template');
                localStorage.removeItem('mitsumori-invoice-template-name');
                setHasInvoiceTemplate(false);
            }
        }
    };

    return (
        <div className="container top-screen">
            <div>
                <FileEdit size={64} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                <h1>電気工事見積もりくん</h1>
                <p>現場でサッと、簡単・正確な見積もりを。</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '300px' }}>
                <input
                    type="file"
                    accept=".xlsx"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileUpload(e, 'estimate')}
                />
                <input
                    type="file"
                    accept=".xlsx"
                    ref={invoiceInputRef}
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileUpload(e, 'invoice')}
                />

                <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '0' }}>
                    <h2 style={{ fontSize: '1rem', border: 'none', margin: 0, padding: 0 }}>雛形・テンプレート設定</h2>

                    {hasTemplate ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}>
                                <FileSpreadsheet size={16} />
                                <span style={{ fontWeight: 'bold' }}>見積書雛形: 保存済み</span>
                            </div>
                            <button
                                onClick={() => handleDeleteTemplate('estimate')}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}
                                title="雛形を削除"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ) : (
                        <button
                            className="btn btn-secondary"
                            onClick={() => fileInputRef.current?.click()}
                            style={{ fontSize: '0.875rem', padding: '0.5rem' }}
                        >
                            <Upload size={16} /> 見積書雛形を読み込む (Excel)
                        </button>
                    )}

                    {hasInvoiceTemplate ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}>
                                <FileSpreadsheet size={16} />
                                <span style={{ fontWeight: 'bold' }}>請求書雛形: 保存済み</span>
                            </div>
                            <button
                                onClick={() => handleDeleteTemplate('invoice')}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}
                                title="雛形を削除"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ) : (
                        <button
                            className="btn btn-secondary"
                            onClick={() => invoiceInputRef.current?.click()}
                            style={{ fontSize: '0.875rem', padding: '0.5rem' }}
                        >
                            <Upload size={16} /> 請求書雛形を読み込む (Excel)
                        </button>
                    )}
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <button className="btn btn-primary btn-large" onClick={onStart}>
                        <FileEdit size={24} />
                        見積データ入力へ進む
                    </button>

                    <button className="btn btn-secondary btn-large" onClick={onViewSaved} style={{ backgroundColor: 'var(--bg-color)', color: 'var(--primary)', borderColor: 'var(--primary)' }}>
                        <Save size={20} />
                        保存した見積を見る {hasSavedCount > 0 ? `(${hasSavedCount}件)` : ''}
                    </button>
                </div>
            </div>
        </div>
    );
}
