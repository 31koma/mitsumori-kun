const fs = require('fs');
const file = fs.readFileSync('src/types.ts', 'utf8');

const updated = file.replace(/export interface EstimateItem \{[\s\S]*?selected: boolean;/g, 
`export interface EstimateItem {
    id: string;
    name: string;
    category: Category;
    quantity: number | string;
    unit: string;
    unitPrice: number | string;
    selected: boolean;
    referencePrice?: string;`);

const updatedItems = updated.replace(/\{ id: '([^']+)', name: '([^']+)', category: '([^']+)', quantity: '', unit: '([^']*)', unitPrice: (\d+), selected: false \}/g, (match, id, name, category, unit, unitPriceStr) => {
    const unitPrice = parseInt(unitPriceStr, 10);
    const min = Math.max(10, Math.floor(unitPrice * 0.8 / 10) * 10);
    const max = Math.ceil(unitPrice * 1.2 / 10) * 10;
    
    // For "VVF2.0-3C", exact user request is 180〜230円 (though unitPrice differs, let's keep it close).
    // Actually the user said "例：VVF2.0-3C 単価入力：200円 参考価格：180〜230円". It's just an example.
    let refStr = `${min}〜${max}円`;
    
    // If it's AI or expense, maybe skip or adjust
    if (category === '経費') refStr = ''; // no ref for expense 
    
    if (refStr) {
        return `{ id: '${id}', name: '${name}', category: '${category}', quantity: '', unit: '${unit}', unitPrice: ${unitPriceStr}, referencePrice: '${refStr}', selected: false }`;
    }
    return match;
});

fs.writeFileSync('src/types.ts', updatedItems);
