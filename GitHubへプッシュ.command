#!/bin/bash
cd "$HOME/Documents/見積もり作るくん" || { echo "フォルダが見つかりません"; read -p "Enterで閉じる"; exit 1; }
echo "=== 変更内容 ==="
git status --short
echo ""
git add -A
git commit -m "電工見積もりくんへ改名・原価管理/人工自動計算/請求書/材料表PDF/顧客管理を実装 ($(date '+%Y-%m-%d'))"
echo ""
echo "=== GitHubへプッシュ中... ==="
if git push origin main; then
  echo ""
  echo "✅ プッシュ完了！このウィンドウは閉じてOKです。"
else
  echo ""
  echo "❌ プッシュに失敗しました。この画面をスクショしてClaudeに見せてください。"
fi
read -p "Enterキーで閉じる"
