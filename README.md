# 長天科技官網建置筆記

## 最新消息內容維護流程
- 新文章請放在 `news/` 目錄，檔名格式：`YYYY-MM-DD標題.md`（例：`2025-10-13AI 新創融資.md`）。
- 發佈日期會由檔名前 10 個字推導，標題為去掉日期與副檔名後的全文字。
- Frontmatter（可選）使用 YAML/JSON 格式，支援欄位：
  - `tags`: 字串陣列，預設值 `["行業新聞"]`。
  - `image`: 縮圖相對路徑（例：`dist/news/covers/ai-news.jpg`）。

```markdown
---
tags: ["行業新聞"]
image: "dist/news/covers/ai-news.jpg"
---
Markdown 內文開頭請留一行空白，方便摘要正確產生。
```

## 建置腳本
- 指令：`npm run build:news`（執行 `scripts/build-news-index.js`）。
- 功能：
  - 以 `fast-glob` 掃描 `news/**/*.md`。
  - 使用 `gray-matter` 解析 Frontmatter 與 Markdown 內文。
  - 依日期（新→舊）及 slug 倒序排序，產出 `dist/news-index.json`。
  - 自動建立 `dist/` 目錄並覆寫舊索引。
  - 遇到無法解析的檔案會跳過並於終端機警示。
- 先執行 `npm install` 確保依賴（`fast-glob`, `gray-matter`）存在。

## CI / Deploy 整合
- 在正式建置或部署之前插入 `npm run build:news`，確保最新索引寫入 `dist/news-index.json`。
- GitHub Actions 範例：

```yaml
- name: Install dependencies
  run: npm install

- name: Generate news index
  run: npm run build:news

- name: Build / Deploy
  run: npm run build
```

## 本機驗證步驟
- 於 `news/` 建立三篇測試 Markdown（包含中文、空白、符號），至少兩個日期需相同，用以確認排序規則。
- 執行 `npm run build:news`，檢查 `dist/news-index.json`：
  - 陣列排序是否符合日期新→舊、同日 slug 反向排序。
  - `slug`, `permalink`, `url` 是否正確帶入。
  - `excerpt` 應為單行純文字（約 120–160 字，結尾 `…`）。
- 啟動靜態伺服器（如 `npx serve .`）瀏覽：
  - `news.html` 會自動載入索引並顯示標題、日期、標籤、摘要與（可選）縮圖。
  - 點擊任一項目可跳轉 `news-detail.html?slug=...`，畫面應正確呈現內容與 meta。
- 新增或刪除 Markdown 後重新執行 `npm run build:news`，確認清單與詳情頁同步更新。

## 常見問題排除
- **Module not found**：未執行 `npm install` 或 `node_modules` 缺少套件。請重新安裝依賴後再跑腳本。
- **檔名格式錯誤**：未遵守 `YYYY-MM-DD` 前綴會被跳過，終端機可見警示。
- **摘要異常**：Markdown 開頭未留空行、充斥 HTML 或只有短字句，可能導致摘要不足 120 字；可手動補充段落內容。
- **詳情頁顯示失敗**：檢查網址中的 `slug` 是否正確、檔案是否存在，以及靜態伺服器是否允許讀取 `news/*.md` 檔案。
