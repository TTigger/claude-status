# claude-status 設計文件

- 日期：2026-06-02
- 狀態：草案（待使用者最終審核）
- 套件：`@ttigger/claude-status`（公開 npm）
- 作者：使用者 + Claude

## 1. 目標

打造一套**跨電腦一致**的 Claude Code CLI 介面，透過公開 npm 套件、用 `npx @ttigger/claude-status install` 一行指令安裝，**無須 git clone 或逐機重設**。功能：

1. 在 Claude Code session 底部常駐顯示 **使用量 HUD（statusLine）**，含：
   - 模型（含 1M context 標示）
   - 專案資料夾名稱
   - Git 分支
   - Context 上下文用量（進度條 + % + token k）＋ auto-compact 剩餘（近似）
   - 5 小時 Session 用量（進度條 + % + reset 倒數）
   - 7 天 Weekly 用量（進度條 + % + reset 倒數）
2. 提供全域 **`cc`** 指令作為 `claude` 的捷徑，並可引導使用者自訂名稱。
3. 提供 **7 種視覺風格**（Claude／簡潔／區塊／科技感／數據控／ASCII／Emoji），可在 config 切換；**預設為 ⑦ Claude 簡潔風**（採 Claude 品牌色系）。

## 2. 非目標（明確排除）

- **顯示付費方案（Max 5x 等）**：Claude Code 不對任何腳本/檔案/官方環境變數公開訂閱方案；唯一線索 `CLAUDE_CODE_SUBSCRIPTION_TYPE` 未公開、隨時可能失效。經使用者決定**移除**。

## 3. 技術前提（已對官方文件查證）

statusLine 是 Claude Code 在 session 底部常駐、於每則訊息（及 `/compact`、權限/vim 變更）重新渲染的列，可設 `refreshInterval` 定時刷新。腳本透過 **stdin 收到一份 JSON**，stdout 印出的內容即為狀態列；**支援多行**（每個 print 一列）、**支援 ANSI 色碼**（8 色保證，256 色視終端機）、自 v2.1.153 起提供 `COLUMNS`/`LINES` 環境變數。

`rate_limits` 只在 **Claude.ai 訂閱者送出第一則訊息後**才出現；免費／API key 使用者沒有此欄位，且每個 session 第一次渲染時尚未出現。

來源：code.claude.com/docs/en/statusline、/settings、/costs、/model-config。

## 4. 資料來源對照

| HUD 元素 | 來源 | 可靠度 |
|---|---|---|
| 模型名稱 | `model.display_name` | ✅ |
| 1M context 標示 | `context_window.context_window_size === 1000000` → 附加 "1M"；`model.id` 的 `[1m]` 後綴為輔助 | ✅ |
| 專案資料夾 | `workspace.project_dir` 取最後一層（空則退回 `workspace.current_dir`） | ✅ |
| Git 分支 | 腳本內執行 `git branch --show-current`（於 cwd，含 timeout，非 git 目錄留空）；`worktree.branch` 存在時作為快路徑 | ✅（自抓） |
| Context % / 條 | `context_window.used_percentage` | ✅ |
| Context token k | `context_window.current_usage` 加總；無則用 `context_window_size × used_percentage` 估算 | ✅ |
| auto-compact 剩餘 | **近似**：`max(0, T − used_percentage)`，T 預設 `83.5`，有 `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` 則以該值為 T | ⚠️ 近似，可在 config 關閉 |
| Session（5h）% / reset | `rate_limits.five_hour.used_percentage`、`.resets_at` | ✅（訂閱者、首則訊息後） |
| Weekly（7d）% / reset | `rate_limits.seven_day.used_percentage`、`.resets_at` | ✅（同上） |
| 主題（配色用） | 讀 `~/.claude/settings.json` 的 `theme`（`light*` → light 色盤，否則 dark） | ✅ |

## 5. HUD 渲染規格

### 5.1 預設版面（單行自適應 `layout: "auto"`）

符合狀態列「一行」慣例，又保留進度條圖形；依 `COLUMNS` 自動伸縮。

```
寬 (≥110): Opus 4.8·1M | claude-status | ⎇main | Ctx ▰▰▱▱ 23% 47k | S ▰▰▱▱ 52% 3h12m | W ▰▱▱▱ 31% 4d6h
窄 (~80):  Opus 4.8·1M | claude-status | Ctx ▰▰▱▱ 23% | S 52% 3h | W 31% 4d
```

- 元素一律以 ` | ` 分隔；**標籤英文**（`Ctx`/`S`/`W`…；寬度穩定、對齊容易）。
- **自適應縮減順序**（`COLUMNS` 不足時依序拿掉，直到放得下一行）：
  1. Context 的 token k
  2. auto-compact 剩餘
  3. reset 倒數降精度（`3h12m` → `3h`）
  4. Session/Weekly 進度條 → 僅留 %
  5. Git 分支縮短/省略
  仍放不下才換行。`COLUMNS` 缺失（舊版）時以保守寬度估算。
- **其他版面（config `layout` 切換）**：`oneline`（固定單行精簡，永遠一行、省略 token k 與 auto-compact）、`two`（兩行）、`three`（三行分組，最易讀）。元素顯示/隱藏/順序皆可調。

備用版面範例：

`three`（三行分組）
```
Opus 4.8·1M | claude-status | ⎇ main
Ctx ▰▰▱▱▱▱ 23% 47k | compact in 60%
Sess ▰▰▰▰▰▱ 52% 3h12m | Wk ▰▰▱▱▱ 31% 4d6h
```
`two`（兩行）
```
Opus 4.8·1M | claude-status | ⎇main | Ctx ▰▰▱▱ 23% 47k
S ▰▰▱▱ 52% 3h12m | W ▰▱▱▱ 31% 4d6h | compact 60%
```

### 5.2 視覺風格（≥6 種，config `style` 切換）

同一組資料、同一版面，差別在字元材質與標籤風格。全部隨套件內建：

| # | 名稱 | 特徵 | 相容性需求 |
|---|---|---|---|
| ⑦ | **Claude 簡潔風** | 乾淨細條 `▰▱` + Claude 品牌色（見 §5.3）（**預設**） | 真彩/256 色 + Unicode（不足時降級） |
| ① | Minimal 簡潔 | 小寫、細點分隔、迷你條 `▪░` | Unicode 區塊 |
| ② | Classic 區塊 | `▓░` 實心條（不支援 Claude 風時的保底） | Unicode 區塊 |
| ③ | Tech 科技感 | Nerd Font 圖示 + `█▱` | Nerd Font |
| ④ | Data 數據控 | Braille `⣿⣀⠀`、小數、原始數字（47.0k/200k） | Braille 字元 |
| ⑤ | ASCII 相容 | 純 ASCII `[###---]`（最相容保底） | 無（最相容） |
| ⑥ | Emoji 活潑 | emoji 圖示 + 燈號 | Emoji 字型 |

各風格 mockup 見附錄 A。

### 5.3 配色（主題感知雙色盤）

依 `~/.claude/settings.json` 的 `theme` 自動切換（config `palette: "auto"|"light"|"dark"` 可覆寫）。優先用 256 色，終端機不支援則退回 8 色。

| 階別（依已用 %） | light（白底） | dark（黑底） | 8 色後備 |
|---|---|---|---|
| 0–50% | 深綠 | 亮綠 | 綠 32 |
| 51–80% | 橙褐（橘色階，白底可讀） | 亮黃 | 黃 33 |
| 81–100% | 深紅 | 亮紅 | 紅 31 |

上色套用於進度條已填滿部分與百分比數字；未填滿部分暗色（`\033[2m`），每段以 `\033[0m` 重置。auto-compact 以「已用比例」決定階別（與其他一致）。`colorThresholds` 可自訂綠/黃界線（預設 50 / 80）。

**⑦ Claude 簡潔風為例外配色（Claude 品牌色系，全珊瑚橙漸層）**：不使用紅綠燈三階，改為珊瑚橙由淺到深的三階漸層（沿用 `colorThresholds` 的 50 / 80 界線），暖灰底軌（`\033[2m`）：
- 0–50%：淺珊瑚 `#E8A088`（真彩 `38;2;232;160;136`；256 色後備 ≈ 216）。
- 51–80%：標準珊瑚橘 `#D97757`（真彩 `38;2;217;119;87`；256 色後備 ≈ 173）。
- 81–100%：深鏽紅 `#BE4B32`（真彩 `38;2;190;75;50`；256 色後備 ≈ 167）。
- 全程珊瑚色階、最貼 Claude 品牌；剛好契合 light（奶油底）主題。於不支援真彩/256 色或 Unicode 的終端機，安裝器會建議降級到 ②Classic 或 ⑤ASCII（見 §8）。
- 其餘六種風格維持綠/黃/紅三階。

### 5.4 進度條演算法

- 預設條寬 `barWidth = 8`；`"auto"` 時依 `COLUMNS` 縮放，缺 `COLUMNS`（舊版）退回 8。
- 填滿格數 = `round(used% / 100 × barWidth)`。

### 5.5 倒數與數字格式

- reset：`resets_at − now` 取最大兩單位（`3h12m`、`4d6h`、`<1m`）。
- token：整數 k（`47k`）；④Data 風格顯示小數與 `/200k`。
- %：整數；④Data 顯示一位小數。

### 5.6 優雅降級

- **首次渲染／無 `rate_limits`**：Session/Weekly 顯示 `— waiting for first message`。
- **免費／API key（永無 `rate_limits`）**：隱藏 Session/Weekly，僅留環境＋Context；config 可整段關閉。
- **非 git 目錄**：分支元素整段省略（連同分隔符）。
- **字型不足**：見 §8 安裝器偵測；③/④ 偵測不到時退回 ②，舊 console 退回 ⑤。

## 6. 設定檔 `~/.claude/claude-status.config.json`

安裝時建立，事後可手改，或用 `claude-status config` 子指令（見 §8.1）。讀不到檔案則用內建預設；**部分設定採深合併**——使用者只需寫想改的 key，未列出的自動沿用內建預設。`style`/`layout`/`palette` 僅接受固定清單值，非法值回退預設。

```json
{
  "style": "claude",
  "layout": "auto",
  "palette": "auto",
  "separator": " | ",
  "barWidth": 8,
  "colorThresholds": { "green": 50, "yellow": 80 },
  "elements": {
    "model": true, "project": true, "gitBranch": true,
    "context": true, "autoCompact": true, "session": true, "weekly": true
  },
  "autoCompact": { "thresholdPct": 83.5 },
  "refreshIntervalSec": 30
}
```

## 7. 架構

公開 npm 套件 `@ttigger/claude-status`，Node 執行（跨 Win/Mac/Linux，不依賴 jq/bash），三個 bin：

```
@ttigger/claude-status
├─ bin "claude-status"         → 安裝器 + config 管理（npx 進入點：install / uninstall / config…）
├─ bin "claude-status-render"  → 渲染器（settings.json 的 statusLine 指向此）
└─ bin "cc"                    → 啟動器（spawn `claude`，參數全透傳）
```

- 程式碼分層：
  - `render/`：純函式 `(stdinJSON, env, config, theme) → string`（無副作用、易測；含各 style 的格式器）。
  - `git.js`：以 `child_process` 取分支（timeout + try/catch）。
  - `detect.js`：終端機/字型偵測（§8）。
  - `installer/`：settings.json 合併、config 寫入、全域安裝、cc 別名、風格偵測建議。
  - `bin/`：三個薄殼。
- **原始碼位置**：放在（改名後的）`claude-status` 資料夾**根目錄**，不另開子層；現有 `docs/` 保留。

## 8. 安裝器行為 `npx @ttigger/claude-status install`

1. `npm install -g @ttigger/claude-status`（冪等；讓 `cc`、`claude-status-render` 永久在 PATH）。
2. **終端機/字型偵測 → 建議風格**：預設建議 ⑦Claude（需真彩/256 色 + Unicode）；偵測到不支援真彩但有 Nerd Font → ③Tech；僅基本 Unicode → ②Classic；舊 Windows console / 不支援 Unicode → ⑤ASCII。印出建議，使用者可接受或以 `--style <name>` 覆寫。
3. 寫入 `~/.claude/claude-status.config.json`（已存在則保留使用者修改，不覆寫）。
4. **合併**進 `~/.claude/settings.json` 的 `statusLine`：
   ```json
   "statusLine": { "type": "command", "command": "claude-status-render", "refreshInterval": 30 }
   ```
   先讀現有 JSON、寫 `settings.json.bak` 備份、僅改動 `statusLine`、保留其餘所有 key 後寫回。
5. 印出成功訊息與自訂/還原/更新方式。

- 全程冪等可重跑。`uninstall`：自 `.bak` 還原 statusLine、移除全域 bin。`--dry-run`：只印不落地。
- **更新機制**：各機器執行 `npx @ttigger/claude-status@latest install` 重跑即可升級。
- `--style <name>` 可在安裝時直接指定風格（方便逐機帶相同設定，因 config 不會跨機自動同步）。

### 8.1 `config` 子指令（一行切換，免開 JSON）

由 `claude-status` bin 提供，讀寫 `~/.claude/claude-status.config.json`（深合併、即時生效）：

```bash
claude-status config set <key> <value>   # 設定單一項目（套用後印出預覽，見下）
claude-status config get <key>           # 查看單一項目目前值
claude-status config list                # 列出所有設定的目前值與可選值/範圍
claude-status config reset [<key>]       # 重設某項（或全部）回預設
claude-status preview [--style <s>] [--layout <l>]   # 不套用、僅預覽指定風格/版面
```

- 巢狀 key 以點號表示：`claude-status config set elements.weekly false`、`config set autoCompact.thresholdPct 80`、`config set colorThresholds.green 40`。
- 對固定清單型（`style`/`layout`/`palette`）會驗證輸入值，非法值報錯並列出合法選項。
- 對布林/數字會做型別轉換與範圍檢查。
- 範例：
  ```bash
  claude-status config set style tech
  claude-status config set layout oneline
  claude-status config set elements.autoCompact false
  claude-status config list
  ```
- 與手改 JSON 完全等效，可混用。

#### 切換預覽（避免盲切）

切換 layout / style 時必須讓使用者**先看到結果**。預覽以**同一支純函式渲染器 + 內建範例資料（fixture）** 產生，故「所見即所得」（WYSIWYG），且套用真實的主題感知配色。

- **`claude-status preview --style tech`**：不寫入設定，直接印出該風格的範例 HUD。可同時指定 `--layout`。
  ```
  $ claude-status preview --style tech
  [tech]
   Opus 4.8 1M │  claude-status │  main
  󰍛 ███▱▱▱▱ 23% 47k │ ♻ 60%
   █████▱ 52% 3h12m │  ██▱▱▱ 31% 4d6h
  ```
- **`claude-status config set style <x>`／`set layout <x>`**：套用後**立即印出套用結果的預覽**，讓使用者確認。
  ```
  $ claude-status config set style minimal
  ✓ style → minimal。目前效果：
  Opus 4.8·1M | claude-status | main
  ctx ▪▪░░░░ 23% 47k · compact 60%
  ses ▪▪▪░░░ 52% 3h12m · wk ▪▪░░░ 31% 4d6h
  ```
- **`claude-status config list`**：列出 `style` 與 `layout` 時，每個選項附**一行縮圖預覽**（gallery），目前選中者標記。
- 範例資料涵蓋三色階（綠/橙/紅或珊瑚漸層皆能呈現），讓使用者看出配色差異；窄終端機則用 `COLUMNS` 真實寬度預覽自適應結果。

## 9. `cc` 啟動器與自訂

- 預設全域 `cc` → `claude`（所有參數/旗標/exit code 透傳；找不到 `claude` 時印出清楚錯誤）。
- **撞名防護**：macOS/Linux 的 `cc` 為傳統 C 編譯器別名。安裝器偵測 PATH 上既有 `cc`，**警告**並提供改名（如 `clc`、`cx`）或執意沿用。Windows 無衝突。
- **自訂名稱**：`--alias <name>`（或互動詢問）將所選名稱別名寫入偵測到的 shell profile（PowerShell `$PROFILE` 的 `Set-Alias`、`~/.zshrc` / `~/.bashrc` 的 `alias`）。預設仍為 `cc`。

## 10. 跨平台考量

- 渲染器與啟動器皆 Node，行為一致；全域 bin 由 npm 在各平台產生對應 shim（Windows `.cmd`/`.ps1`）。
- settings.json `command` 用裸指令名 `claude-status-render`（靠 PATH 解析），避免 `~` 在 Windows 不展開與絕對路徑逐機不同。

## 11. 測試

- **渲染器（純函式）單元測試**：色階邊界（50/51/80/81）、light/dark 色盤切換、各 style 格式、reset 倒數、缺 `rate_limits` 降級、1M 偵測、token k 計算、COLUMNS 縮放、auto-compact 近似（含 override）。
- **安裝器測試**：settings.json 合併斷言（既有 key 全存活）、`.bak` 產生、冪等重跑、`--dry-run`、偵測建議邏輯。
- **config 子指令測試**：`set`/`get`/`list`/`reset`、深合併（只寫單一 key 不影響其他）、巢狀點號 key、固定清單值驗證（非法值報錯）、布林/數字型別與範圍檢查。
- **預覽測試**：`preview` 與 `set` 後預覽皆走同一渲染器 + fixture（與實際輸出一致的 snapshot 測試）；`config list` gallery 縮圖；不同 `COLUMNS` 下自適應預覽。
- 以 fixture JSON 餵 stdin，不需實際 Claude Code 即可測。

## 12. 散佈

- 發佈到公開 npm，套件名 `@ttigger/claude-status`（需 `@ttigger` scope 的 npm 帳號）。
- 換電腦：`npx @ttigger/claude-status install`。

## 13. 風險與未決項

- **auto-compact 門檻（83.5%）未公開**：可能隨版本變動、略不準；config 可關閉、可調門檻。
- **`cc` 與 Unix C 編譯器撞名**：偵測 + 警告 + 可改名緩解。
- **字型/終端機相容性**：以偵測建議 + ⑤ASCII 保底緩解；偵測無法 100% 準確。
- **操作注意**：`claude-settings` 是本 session 的工作目錄，Windows 通常不允許改名「使用中的目錄」；實際改名為 `claude-status` 放到實作階段做（必要時由使用者於終端機執行）。該目錄非 git repo，暫不提交；如需版控可後續 `git init`。
- **未確認/前置**：`@ttigger` npm 帳號/scope 是否就緒、`claude-status` 名稱於 npm 是否可用、GitHub repo 是否建立、自動發版需在 repo 設 `NPM_TOKEN` secret。

## 14. 倉庫結構與文件

原始碼置於（改名後的）`claude-status` 目錄根，結構：

```
claude-status/
├─ package.json              # name @ttigger/claude-status、3 bins、files 白名單、keywords、repo、homepage
├─ README.md                 # npm + GitHub 首頁（衍生自 spec + registry）
├─ AGENTS.md                 # agent 文件「正本」（完整）
├─ CLAUDE.md                 # 指向 AGENTS.md + 少量 Claude Code 特定
├─ CONTRIBUTING.md           # 如何加風格/元素、跑測試、發版；指向閉環 skills
├─ SECURITY.md               # 回報管道 + 資料邊界聲明（見下）
├─ CHANGELOG.md              # 每次發版紀錄
├─ LICENSE                   # MIT
├─ .gitignore                # node_modules/ coverage/ *.log 暫存
├─ .github/workflows/
│  ├─ ci.yml                 # PR/push：跑測試 + doc-drift
│  └─ publish.yml            # tag v*：npm publish（需 NPM_TOKEN secret）
├─ bin/
│  ├─ claude-status.js       # 安裝器 + config + preview + help
│  ├─ claude-status-render.js# 渲染器
│  └─ cc.js                  # 啟動器
├─ src/
│  ├─ registry.js            # 單一事實來源：styles / layouts / config keys
│  ├─ render/                # 純函式渲染器 + 各 style 格式器
│  ├─ git.js  detect.js  config.js  installer/
│  └─ fixtures/sample.json   # 預覽/測試用範例資料
├─ test/
└─ docs/superpowers/specs/…-design.md   # 本設計文件
```

文件對象與來源關係見 §15。授權：**MIT**。**AGENTS.md 為 agent 文件正本**，CLAUDE.md 僅一句指向它 + Claude Code 特定補充（避免雙份維護）。

### 14.1 README.md 訊息骨架（「為何用／優勢／快速上手」）

- **為何用 / 優勢**：把 claude.ai 的用量上限（Session 5h + Weekly 7d）常駐搬進 CLI；`npx` 一行裝、換機免 clone；7 種風格（含 Claude 品牌風）+ 單行自適應 + 主題感知配色；附 `cc` 啟動器；config 即時切換含預覽；純 Node 跨 Win/Mac/Linux。
- **Quick Start**：`npx @ttigger/claude-status install` → 開新 session 即見 HUD。
- **章節**：特色 → 安裝 → HUD 圖解 → 風格 gallery → 設定（config 指令 + JSON）→ 指令速查 → 疑難排解 → 更新/解除安裝。

### 14.2 SECURITY.md 資料邊界（重點聲明）

本工具**不對外傳送任何資料**：僅於本機讀寫 `~/.claude/settings.json`（事前備份）、讀 config 與 theme、執行本機 `git`、spawn `claude`。stdin 收到的用量資料只渲染到終端機、不外送、不落地。附弱點回報管道。

## 15. 閉環維護機制（單一事實來源 + 防漂移）

- **`src/registry.js` = 單一事實來源**：集中定義所有 styles / layouts / config keys（名稱、說明、預設、合法值）。
- 下游全部讀同一份 registry → config 驗證、`config list`、`--help`、預覽 gallery 自動同步。
- **doc-drift 測試**：比對 `README.md` / 本 spec 的風格表 vs registry，未同步即失敗（由 CI 把關）。

參考關係（正本 → 擴散）：
```
design spec (WHY/WHAT 正本) ─▶ 程式碼、README、AGENTS.md
src/registry.js (styles/layouts/config keys 正本)
   ├─▶ config 驗證 / config list / --help / 預覽 gallery   (自動)
   └─▶ doc-drift 測試 ◀─ 比對 README & spec 風格表          (擋漏)
package.json (名稱/版本 正本) ─▶ README badge / CHANGELOG
```

### 15.1 `.claude/skills/`（閉環開發 skills）

| skill | 用途 | reference |
|---|---|---|
| `add-style` | 新增視覺風格的完整步驟（registry 註冊、測試、README/spec 同步點） | spec §5.2、registry |
| `add-hud-element` | 新增 HUD 元素（資料來源→各風格渲染→config 開關→spec §4→測試） | spec §4、registry |
| `release` | 版本 bump → CHANGELOG → `npm publish` → git tag | package.json、CHANGELOG |
| `sync-docs` | 「改 X 要更新哪些」維護地圖（§15 參考關係的正本敘述） | 全部 |

→ 例：新增風格時，`add-style` 引導 ①寫 `render/styles/<name>.js` ②registry 註冊 ③補 README gallery + spec 附錄 ④測試；漏步驟則 doc-drift 測試變紅。

## 16. CLI 內建說明 / 探索

- `claude-status --help` / `-h`：總覽所有指令。
- `claude-status <cmd> --help`：各子指令用法（install / config / preview）。
- `claude-status help <topic>`：主題說明（`styles`、`layout`、`colors`、`cc`、`troubleshooting`）。
- `claude-status config list`：列出每個設定的目前值、可選值、一行預覽縮圖——「找功能去改」的主要入口。
- 為 `claude-status` 自身的 help，與 Claude Code 的 `/help` 無關。

## 17. CI / 發佈（.github）

- `ci.yml`：PR/push 觸發，跑單元測試 + doc-drift。
- `publish.yml`：推 `v*` tag 觸發 `npm publish`（需在 repo 設定 `NPM_TOKEN` secret）。

## 附錄 A：七種風格 mockup

**⑦Claude 簡潔風（預設；珊瑚橘 #D97757，危險區深鏽紅）**
```
Opus 4.8·1M | claude-status | main
Ctx ▰▰▱▱▱▱ 23% 47k | compact 60%
Sess ▰▰▰▰▰▱ 52% 3h12m | Wk ▰▰▱▱▱ 31% 4d6h
```
**①Minimal**
```
Opus 4.8·1M | claude-status | main
ctx ▪▪░░░░ 23% 47k · compact 60%
ses ▪▪▪░░░ 52% 3h12m · wk ▪▪░░░ 31% 4d6h
```
**②Classic（保底預設）**
```
Opus 4.8·1M | claude-status | ⎇ main
Ctx ▓▓░░░░░░ 23% · 47k | compact in 60%
Sess ▓▓▓▓▓░ 52% · 3h12m | Wk ▓▓░░░ 31% · 4d6h
```
**③Tech（需 Nerd Font）**
```
 Opus 4.8 1M │  claude-status │  main
󰍛 ███▱▱▱▱ 23% 47k │ ♻ 60%
 █████▱ 52% 3h12m │  ██▱▱▱ 31% 4d6h
```
**④Data**
```
Opus-4.8[1M] | claude-status | git:main
CTX ⣿⣿⣀⠀⠀ 23.4% 47.0k/200k | AC 60.0%
5H  ⣿⣿⣿⣀⠀ 52.1% ⟳3h12m | 7D ⣿⣀⠀⠀⠀ 31.0% ⟳4d6h
```
**⑤ASCII（最相容）**
```
Opus 4.8 1M | claude-status | main
Ctx [##------] 23% 47k | compact 60%
Ses [####----] 52% 3h12m | Wk [##------] 31% 4d6h
```
**⑥Emoji**
```
🤖 Opus 4.8·1M | 📁 claude-status | 🌿 main
🧠 ▓▓░░░░ 23% 47k | ♻️ 60%
⏱️ ▓▓▓▓▓░ 52% 3h12m | 📅 ▓░░░░ 31% 4d6h
```
