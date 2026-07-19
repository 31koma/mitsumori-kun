#!/bin/bash
cd "$HOME/Documents/見積もり作るくん" || { echo "フォルダが見つかりません"; read -p "Enterで閉じる"; exit 1; }
echo "=== 重いファイルをコミットから除外中... ==="
git rm -r --cached dist-desktop
git add .gitignore
git commit --amend --no-edit
echo ""
echo "=== GitHubへ再プッシュ中... ==="
if git push origin main; then
  echo ""
  echo "✅ プッシュ完了！このウィンドウは閉じてOKです。"
  echo "（このファイル「プッシュを修正.command」は役目を終えたので消してOK）"
else
  echo ""
  echo "❌ まだ失敗します。この画面をスクショしてClaudeに見せてください。"
fi
read -p "Enterキーで閉じる"
