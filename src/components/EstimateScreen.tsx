import { useRef, useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import ExcelJS from 'exceljs';
import type { EstimateItem, EstimateInfo } from '../types';
import { ArrowLeft, Download, FileText, FileSpreadsheet, Save } from 'lucide-react';

// ===== Excel出力設定（ここで出力先のセルや列を一括設定できます） =====
const EXCEL_CONFIG = {
    header: {
        customerName: 'B2',
        projectName: 'B3',
        address: 'B4',
        date: 'B5',
    },
    details: {
        startRow: 10,       // 明細の開始行
        colName: 'A',       // 品名が出力される列
        colQty: 'B',        // 数量が出力される列
        colUnit: 'C',       // 単位が出力される列
        colPrice: 'D',      // 単価が出力される列
        colAmount: 'E',     // 金額が出力される列
    },
    totals: {
        colAmount: 'E',          // 自動検索した合計行の金額を書き込む列
        fallbackLabelCol: 'D',   // 合計行が見つからなかった場合にラベルを書く列
        fallbackValueCol: 'E',   // 合計行が見つからなかった場合に金額を書く列
    }
};
// ======================================================================

interface EstimateScreenProps {
    items: EstimateItem[];
    info: EstimateInfo;
    onBack: () => void;
    onSave: () => void;
}

export default function EstimateScreen({ items, info, onBack, onSave }: EstimateScreenProps) {
    const estimateRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [hasTemplate, setHasTemplate] = useState(false);
    const [hasInvoiceTemplate, setHasInvoiceTemplate] = useState(false);

    useEffect(() => {
        if (localStorage.getItem('mitsumori-template')) {
            setHasTemplate(true);
        }
        if (localStorage.getItem('mitsumori-invoice-template')) {
            setHasInvoiceTemplate(true);
        }
    }, []);

    // Filter only selected items
    // AI解析で追加された部材も出力するため、selectedであればすべてを含める
    const selectedItems = items.filter(i => i.selected);

    // Calculate totals
    const subtotal = selectedItems.reduce((acc, item) => {
        const price = Number(item.unitPrice) || 0;
        if (item.category === '経費') {
            return acc + price;
        }
        const qty = Number(item.quantity) || 0;
        return acc + (qty * price);
    }, 0);

    const tax = Math.floor(subtotal * 0.1);
    const total = subtotal + tax;

    const handleExcelSave = async (type: 'estimate' | 'invoice') => {
        setIsGenerating(true);
        try {
            const templateKey = type === 'estimate' ? 'mitsumori-template' : 'mitsumori-invoice-template';
            const fileNameDefault = type === 'estimate' ? 'estimate.xlsx' : 'invoice.xlsx';

            const templateBase64 = localStorage.getItem(templateKey);
            if (!templateBase64) {
                alert('雛形データが見つかりません。');
                return;
            }

            // Remove data URL prefix
            const base64Data = templateBase64.split(',')[1] || templateBase64;

            // Convert base64 to binary string then to ArrayBuffer
            const binaryString = window.atob(base64Data);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const buffer = bytes.buffer;

            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer);

            const worksheet = workbook.worksheets[0]; // Assuming first sheet
            if (!worksheet) {
                throw new Error("Excel内にシートが見つかりません");
            }

            // ExcelJSのバグ（Shared Formulaが壊れる問題）を回避するため、
            // 読み込んだ直後にシート内の全数式セルを個別の数式に変換してリンクを解除する
            worksheet.eachRow((row) => {
                if (row) {
                    row.eachCell({ includeEmpty: true }, (cell: any) => {
                        if (cell && cell.formula) {
                            try {
                                const f = cell.formula;
                                const r = cell.result;
                                cell.value = { formula: f, result: r };
                            } catch (e) {
                                console.warn('Formula conversion error', e);
                            }
                        }
                    });
                }
            });

            // Write Header Info
            worksheet.getCell(EXCEL_CONFIG.header.customerName).value = info.customerName;
            worksheet.getCell(EXCEL_CONFIG.header.projectName).value = info.projectName;
            worksheet.getCell(EXCEL_CONFIG.header.address).value = info.address;
            const dateStr = new Date().toLocaleDateString('ja-JP');
            worksheet.getCell(EXCEL_CONFIG.header.date).value = dateStr;

            // セルから文字列を安全に取り出すヘルパー関数（リッチテキストや計算式などに対応）
            const getCellValueStr = (val: any): string => {
                if (val === null || val === undefined) return '';
                if (typeof val === 'object') {
                    if (val.richText) return val.richText.map((rt: any) => rt.text).join('').replace(/\s+/g, '');
                    if (val.result !== undefined) return String(val.result).replace(/\s+/g, '');
                    return '';
                }
                return String(val).replace(/\s+/g, '');
            };

            // Write Items starting from configured row
            let currentRow = EXCEL_CONFIG.details.startRow;

            // 雛形の最初の明細行のスタイルと高さをバックアップ（挿入する行に適用するため）
            const templateRowStyles: any[] = [];
            const templateRow = worksheet.getRow(currentRow);
            const templateHeight = templateRow.height;
            if (templateRow) {
                templateRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    templateRowStyles[colNumber] = cell.style; // 参照渡しで安全にコピー
                });
            }

            selectedItems.forEach((item) => {
                const targetRow = worksheet.getRow(currentRow);

                // 現在の行が「小計」などの予約行かどうか判定
                let isReservedRow = false;
                if (targetRow) {
                    targetRow.eachCell((cell) => {
                        const val = getCellValueStr(cell.value);
                        if (val.includes('小計') || val.includes('消費税') || val.includes('合計') || val.includes('備考')) {
                            isReservedRow = true;
                        }
                    });
                }

                if (isReservedRow) {
                    // 雛形の明細行が不足しているため、行を自動で追加する（押し下げる）
                    worksheet.spliceRows(currentRow, 0, []);
                    const insertedRow = worksheet.getRow(currentRow);
                    insertedRow.height = templateHeight;
                    templateRowStyles.forEach((style, colNumber) => {
                        if (style) {
                            insertedRow.getCell(colNumber).style = style; // 単一値として設定
                        }
                    });
                }

                const isKeihi = item.category === '経費';
                const qty = Number(item.quantity) || 0;
                const price = Number(item.unitPrice) || 0;
                const amount = isKeihi ? price : qty * price;

                // 品名・数量・単位・単価・金額 を 設定された列 に正しく反映
                worksheet.getCell(`${EXCEL_CONFIG.details.colName}${currentRow}`).value = item.name;
                worksheet.getCell(`${EXCEL_CONFIG.details.colQty}${currentRow}`).value = isKeihi ? '' : qty;
                worksheet.getCell(`${EXCEL_CONFIG.details.colUnit}${currentRow}`).value = isKeihi ? '' : (item.unit || '');
                worksheet.getCell(`${EXCEL_CONFIG.details.colPrice}${currentRow}`).value = isKeihi ? '' : price;
                worksheet.getCell(`${EXCEL_CONFIG.details.colAmount}${currentRow}`).value = amount;

                currentRow++;
            });

            // 雛形にもともと用意されている余分な明細枠があればクリアする
            while (true) {
                const checkRow = worksheet.getRow(currentRow);
                let isReservedRow = false;
                if (checkRow) {
                    checkRow.eachCell((cell) => {
                        const val = getCellValueStr(cell.value);
                        if (val.includes('小計') || val.includes('消費税') || val.includes('合計') || val.includes('備考')) {
                            isReservedRow = true;
                        }
                    });
                }

                if (isReservedRow || currentRow > 200) {
                    break;
                }

                checkRow.getCell(EXCEL_CONFIG.details.colName).value = '';
                checkRow.getCell(EXCEL_CONFIG.details.colQty).value = '';
                checkRow.getCell(EXCEL_CONFIG.details.colUnit).value = '';
                checkRow.getCell(EXCEL_CONFIG.details.colPrice).value = '';
                checkRow.getCell(EXCEL_CONFIG.details.colAmount).value = '';

                currentRow++;
            }

            // 合計金額、小計、消費税、総合計を雛形の中から検索して正しく反映
            let foundSubtotal = false;
            let foundTax = false;
            let foundTotal = false;

            worksheet.eachRow((row, rowNumber) => {
                let hasSubtotal = false;
                let hasTax = false;
                let hasTotal = false;

                if (row) {
                    row.eachCell((cell) => {
                        const val = getCellValueStr(cell.value);
                        if (val.includes('小計')) hasSubtotal = true;
                        if (val.includes('消費税')) hasTax = true;
                        if (val === '総合計' || val === '合計' || val.includes('御見積金額') || (val.includes('合計') && !val.includes('小'))) {
                            hasTotal = true;
                        }
                    });
                }

                if (hasSubtotal) {
                    worksheet.getCell(`${EXCEL_CONFIG.totals.colAmount}${rowNumber}`).value = subtotal;
                    foundSubtotal = true;
                }
                if (hasTax) {
                    worksheet.getCell(`${EXCEL_CONFIG.totals.colAmount}${rowNumber}`).value = tax;
                    foundTax = true;
                }
                // 明細以降の合計欄に出力するためのガード
                if (hasTotal && rowNumber >= EXCEL_CONFIG.details.startRow) {
                    worksheet.getCell(`${EXCEL_CONFIG.totals.colAmount}${rowNumber}`).value = total;
                    foundTotal = true;
                }
            });

            // 見つからなかった場合のフォールバック
            if (!foundSubtotal || !foundTax || !foundTotal) {
                let appendRow = currentRow + 1;
                if (!foundSubtotal) {
                    worksheet.getCell(`${EXCEL_CONFIG.totals.fallbackLabelCol}${appendRow}`).value = '小計';
                    worksheet.getCell(`${EXCEL_CONFIG.totals.fallbackValueCol}${appendRow}`).value = subtotal;
                    appendRow++;
                }
                if (!foundTax) {
                    worksheet.getCell(`${EXCEL_CONFIG.totals.fallbackLabelCol}${appendRow}`).value = '消費税';
                    worksheet.getCell(`${EXCEL_CONFIG.totals.fallbackValueCol}${appendRow}`).value = tax;
                    appendRow++;
                }
                if (!foundTotal) {
                    worksheet.getCell(`${EXCEL_CONFIG.totals.fallbackLabelCol}${appendRow}`).value = '総合計';
                    worksheet.getCell(`${EXCEL_CONFIG.totals.fallbackValueCol}${appendRow}`).value = total;
                }
            }

            const outBuffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([outBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            // Create download link manually
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileNameDefault;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            // 処理が成功したか確認できるようにアラートを表示
            alert('Excelファイルの出力が成功しました。');

        } catch (error: any) {
            console.error('Excel generation failed:', error);
            alert('Excelの作成に失敗しました。\n詳細: ' + (error.message || String(error)));
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePdfSave = async () => {
        if (!estimateRef.current) return;
        setIsGenerating(true);

        try {
            const element = estimateRef.current;
            // To improve pdf quality, temporarily force white background if needed.
            const canvas = await html2canvas(element, {
                scale: 2, // 2x resolution
                backgroundColor: '#ffffff',
                useCORS: true,
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`見積書_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.pdf`);
        } catch (error) {
            console.error('PDF generation failed:', error);
            alert('PDFの作成に失敗しました。');
        } finally {
            setIsGenerating(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount);
    };

    return (
        <div className="container" style={{ paddingBottom: '80px' }}>
            <h1>見積書</h1>

            {selectedItems.length === 0 ? (
                <div className="empty-state card">
                    <p>項目が選択されていません。</p>
                    <button className="btn btn-primary" onClick={onBack} style={{ marginTop: '1rem' }}>
                        <ArrowLeft size={16} /> 戻る
                    </button>
                </div>
            ) : (
                <>
                    <div className="card" ref={estimateRef} style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>
                            <FileText size={28} />
                            <h2 style={{ fontSize: '1.5rem', border: 'none', margin: 0, padding: 0 }}>御 見 積 書</h2>
                        </div>

                        <p style={{ textAlign: 'right', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: '1.5' }}>
                            {info.estimateNumber && (
                                <>見積番号: {info.estimateNumber}<br /></>
                            )}
                            発行日: {new Date().toLocaleDateString('ja-JP')}
                        </p>

                        <div style={{ padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius-md)', marginBottom: '2rem', textAlign: 'center' }}>
                            <p style={{ fontSize: '1.125rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>御見積金額（税込）</p>
                            <h3 style={{ fontSize: '2rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                                {formatCurrency(total)}
                            </h3>
                        </div>

                        <div className="estimate-table-wrapper">
                            <table className="estimate-table">
                                <thead>
                                    <tr>
                                        <th>項目</th>
                                        <th>数量</th>
                                        <th>単価</th>
                                        <th>金額</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedItems.map((item, index) => {
                                        const isKeihi = item.category === '経費';
                                        const qty = Number(item.quantity) || 0;
                                        const price = Number(item.unitPrice) || 0;
                                        const amount = isKeihi ? price : qty * price;
                                        return (
                                            <tr key={index}>
                                                <td>{item.name}</td>
                                                <td style={{ textAlign: 'right' }}>
                                                    {isKeihi ? '-' : `${qty} ${item.unit}`}
                                                </td>
                                                <td>{isKeihi ? '-' : formatCurrency(price)}</td>
                                                <td>{formatCurrency(amount)}</td>
                                            </tr>
                                        );
                                    })}

                                    <tr><td colSpan={4} style={{ padding: '0.5rem' }}></td></tr>

                                    <tr className="subtotal-row">
                                        <td colSpan={3} style={{ textAlign: 'right' }}>小計</td>
                                        <td>{formatCurrency(subtotal)}</td>
                                    </tr>
                                    <tr>
                                        <td colSpan={3} style={{ textAlign: 'right' }}>消費税 (10%)</td>
                                        <td>{formatCurrency(tax)}</td>
                                    </tr>
                                    <tr className="total-row">
                                        <td colSpan={3} style={{ textAlign: 'right' }}>総合計</td>
                                        <td>{formatCurrency(total)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p style={{ marginTop: '2rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                            備考：本見積りの有効期限は発行日より30日間とします。
                        </p>
                    </div>

                    <div className="fixed-bottom-bar" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button className="btn btn-secondary" onClick={onBack}>
                            <ArrowLeft size={16} />
                            戻る
                        </button>

                        <button className="btn btn-secondary" onClick={onSave} style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }}>
                            <Save size={16} />
                            この見積を保存
                        </button>

                        {hasTemplate && (
                            <button
                                className="btn btn-primary"
                                onClick={() => handleExcelSave('estimate')}
                                disabled={isGenerating}
                                style={{ flex: 1, minWidth: 'fit-content' }}
                            >
                                <FileSpreadsheet size={16} />
                                {isGenerating ? '作成中...' : '見積雛形(Excel)へ出力'}
                            </button>
                        )}

                        {hasInvoiceTemplate && (
                            <button
                                className="btn btn-primary"
                                onClick={() => handleExcelSave('invoice')}
                                disabled={isGenerating}
                                style={{ flex: 1, minWidth: 'fit-content', backgroundColor: '#10b981' }}
                            >
                                <FileSpreadsheet size={16} />
                                {isGenerating ? '作成中...' : '請求雛形(Excel)へ出力'}
                            </button>
                        )}

                        <button
                            className="btn btn-primary"
                            onClick={handlePdfSave}
                            disabled={isGenerating}
                            style={{ flex: 1, backgroundColor: '#4f46e5' }}
                        >
                            <Download size={16} />
                            {isGenerating ? '作成中...' : 'PDF見積書を出力'}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
