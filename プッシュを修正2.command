#!/bin/bash
cd "$HOME/Documents/見積もり作るくん" || { echo "フォルダが見つかりません"; read -p "Enterで閉じる"; exit 1; }
echo "=== 履歴を整理して作り直し中... ==="
git fetch origin
git reset --soft origin/main
git rm -r --cached dist-desktop --ignore-unmatch > /dev/null 2>&1
git add -A
git commit -m "電工見積もりくんへ改名・原価管理/人工自動計算/請求書/材料表PDF/顧客管理を実装"
echo ""
echo "=== GitHubへプッシュ中（今度は軽いはず）... ==="
if git push origin main; then
  echo ""
  echo "✅ プッシュ完了！このウィンドウは閉じてOKです。"
  echo "（「プッシュを修正.command」「プッシュを修正2.command」は両方消してOK）"
else
  echo ""
  echo "❌ 失敗。この画面をスクショしてClaudeに見せてください。"
fi
read -p "Enterキーで閉じる"
