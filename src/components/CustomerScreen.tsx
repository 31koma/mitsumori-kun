import { useState } from 'react';
import { ArrowLeft, Users, Plus, Trash2, Edit2, FileText, ChevronDown, ChevronRight, FileEdit } from 'lucide-react';
import type { Customer, SavedEstimate } from '../types';

interface CustomerScreenProps {
    customers: Customer[];
    savedEstimates: SavedEstimate[];
    onBack: () => void;
    onSaveCustomer: (customer: Customer) => void;
    onDeleteCustomer: (id: string) => void;
    onCreateEstimate: (customer: Customer) => void;
}

interface CustomerForm {
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
    address: string;
    note: string;
}

const emptyForm: CustomerForm = { name: '', contactPerson: '', phone: '', email: '', address: '', note: '' };

export default function CustomerScreen({ customers, savedEstimates, onBack, onSaveCustomer, onDeleteCustomer, onCreateEstimate }: CustomerScreenProps) {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<CustomerForm>(emptyForm);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount);

    const getEstimateTotal = (estimate: SavedEstimate) => {
        const selected = estimate.items.filter(i => i.selected && (i.category === '経費' ? Number(i.unitPrice) > 0 : Number(i.quantity) > 0));
        const subtotal = selected.reduce((acc, item) => {
            const price = Number(item.unitPrice) || 0;
            if (item.category === '経費') return acc + price;
            return acc + (Number(item.quantity) || 0) * price;
        }, 0);
        return subtotal + Math.floor(subtotal * 0.1);
    };

    // 顧客に紐づく見積履歴（customerId 優先、なければ顧客名一致）
    const getHistory = (customer: Customer) =>
        savedEstimates.filter(e =>
            e.info.customerId === customer.id ||
            (!!e.info.customerName && e.info.customerName === customer.name)
        );

    const openNewForm = () => {
        setEditingId(null);
        setForm(emptyForm);
        setIsFormOpen(true);
    };

    const openEditForm = (customer: Customer) => {
        setEditingId(customer.id);
        setForm({
            name: customer.name,
            contactPerson: customer.contactPerson || '',
            phone: customer.phone || '',
            email: customer.email || '',
            address: customer.address || '',
            note: customer.note || '',
        });
        setIsFormOpen(true);
    };

    const handleSubmit = () => {
        if (!form.name.trim()) {
            alert('顧客名を入力してください。');
            return;
        }
        const now = new Date().toLocaleString('ja-JP');
        const existing = editingId ? customers.find(c => c.id === editingId) : undefined;
        onSaveCustomer({
            id: editingId || `cust_${Date.now()}`,
            name: form.name.trim(),
            contactPerson: form.contactPerson.trim() || undefined,
            phone: form.phone.trim() || undefined,
            email: form.email.trim() || undefined,
            address: form.address.trim() || undefined,
            note: form.note.trim() || undefined,
            createdAt: existing?.createdAt || now,
            updatedAt: now,
        });
        setIsFormOpen(false);
        setEditingId(null);
        setForm(emptyForm);
    };

    const inputStyle: React.CSSProperties = { width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', boxSizing: 'border-box' };

    return (
        <div className="container" style={{ paddingBottom: '80px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Users size={28} color="var(--primary)" />
                    <h1 style={{ margin: 0 }}>顧客管理</h1>
                </div>
                <button className="btn btn-primary" onClick={openNewForm}>
                    <Plus size={16} /> 顧客を追加
                </button>
            </div>

            {isFormOpen && (
                <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem', border: '1px solid var(--primary)' }}>
                    <h2 style={{ fontSize: '1.1rem', marginTop: 0 }}>{editingId ? '顧客情報を編集' : '新規顧客の登録'}</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>顧客名 *</label>
                            <input style={inputStyle} type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="例：〇〇株式会社 様" />
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '160px' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>担当者</label>
                                <input style={inputStyle} type="text" value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} />
                            </div>
                            <div style={{ flex: 1, minWidth: '160px' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>電話番号</label>
                                <input style={inputStyle} type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>メールアドレス</label>
                            <input style={inputStyle} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>住所</label>
                            <input style={inputStyle} type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>備考</label>
                            <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical', fontFamily: 'inherit' }} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => { setIsFormOpen(false); setEditingId(null); }}>キャンセル</button>
                            <button className="btn btn-primary" onClick={handleSubmit}>保存</button>
                        </div>
                    </div>
                </div>
            )}

            {customers.length === 0 && !isFormOpen ? (
                <div className="empty-state card">
                    <p>登録された顧客はまだありません。</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        「顧客を追加」から登録するか、見積を保存すると顧客名から自動登録されます。
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {customers.map(customer => {
                        const history = getHistory(customer);
                        const isExpanded = expandedId === customer.id;
                        return (
                            <div key={customer.id} className="card" style={{ padding: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.125rem' }}>{customer.name}</h3>
                                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            {[customer.contactPerson && `担当: ${customer.contactPerson}`, customer.phone, customer.email].filter(Boolean).join(' ／ ') || '連絡先未登録'}
                                        </p>
                                        {customer.address && (
                                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{customer.address}</p>
                                        )}
                                        {customer.note && (
                                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>備考: {customer.note}</p>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button className="btn btn-secondary" onClick={() => openEditForm(customer)} style={{ padding: '0.5rem' }} title="編集">
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => {
                                                if (confirm(`「${customer.name}」を削除しますか？\n（見積履歴自体は削除されません）`)) {
                                                    onDeleteCustomer(customer.id);
                                                }
                                            }}
                                            style={{ padding: '0.5rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                                            title="削除"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.75rem', flexWrap: 'wrap' }}>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => setExpandedId(isExpanded ? null : customer.id)}
                                        style={{ fontSize: '0.85rem' }}
                                    >
                                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        <FileText size={16} /> 見積・工事履歴（{history.length}件）
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => onCreateEstimate(customer)}
                                        style={{ fontSize: '0.85rem', marginLeft: 'auto' }}
                                    >
                                        <FileEdit size={16} /> この顧客で見積作成
                                    </button>
                                </div>

                                {isExpanded && (
                                    <div style={{ marginTop: '0.75rem' }}>
                                        {history.length === 0 ? (
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>この顧客の見積履歴はまだありません。</p>
                                        ) : (
                                            history.map(est => (
                                                <div key={est.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.875rem', flexWrap: 'wrap' }}>
                                                    <span>
                                                        {est.estimateNumber && <strong style={{ marginRight: '0.5rem' }}>{est.estimateNumber}</strong>}
                                                        {est.info.projectName || '（工事名未設定）'}
                                                    </span>
                                                    <span style={{ color: 'var(--text-muted)' }}>
                                                        {est.date} ／ <strong style={{ color: 'var(--primary)' }}>{formatCurrency(getEstimateTotal(est))}</strong>
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
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
