# 🌸 HerDays - Privacy-First Menstrual Tracker

![Design](https://img.shields.io/badge/Design-hLh%20Studio-E9D5F5?style=for-the-badge)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![Deployment](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

---

## 🌟 Overview / 專案簡介

**HerDays** is a minimalist, secure, and aesthetically pleasing menstrual cycle tracker built for users who prioritize privacy and design. Unlike traditional apps, HerDays stores all health data locally on your device—no accounts, no cloud, no tracking.

**HerDays** 是一款專為注重隱私與美感的女性設計的經期追蹤工具。採用現代化的「磨砂玻璃（Glassmorphism）」視覺風格，並堅持「數據在地化」原則，讓敏感的健康資訊完整保留在使用者裝置中，絕不上傳雲端。

---

## 🚀 Key Features / 核心功能

### 📅 Smart Prediction & Visualization / 週期預測與視覺化
* **Cycle Forecasting**: Automatically predicts your next periods for the upcoming 4 months.
  * **動態預測**：根據歷史數據自動計算並顯示未來四個月的預期經期。
* **Intuitive UI**: The calendar uses dynamic "flow fills" (red percentages) and "pain dots" (dot count) to represent symptoms at a glance.
  * **直觀視覺**：日曆格透過背景填充比例顯示流量，並以「點點數量」量化疼痛程度，資訊層級清晰易讀。

### 🔒 Uncompromising Privacy / 絕對隱私安全
* **Local-Only Storage**: Utilizes the browser's `localStorage`; your data never leaves your device.
  * **數據在地化**：所有資料儲存於瀏覽器內，無後端伺服器，無數據外洩風險。
* **PIN Protection with Toggle**: Features an optional security lock that can be enabled or disabled in settings.
  * **自定義密碼鎖**：內建 PIN 碼鎖定功能，並可透過開關自由切換啟用狀態，兼顧安全與便利。

### ✍️ Comprehensive Logging / 完善的紀錄系統
* **Daily Logs**: Track flow intensity, pain levels, medication, and personal notes.
  * **全方位日誌**：支援流量、疼痛等級、用藥紀錄及心情備註。
* **Smooth Navigation**: Intuitive "Previous/Next Day" buttons for efficient multi-day entries.
  * **快速切換**：紀錄面板內建前後日切換按鈕，方便使用者連續補上記錄。

---

## 🎨 Design Philosophy / 設計語彙

* **Glassmorphism Aesthetic**: Featuring backdrop blurs, soft shadows, and a sophisticated lavender-to-magenta gradient.
  * 以粉紫色調搭配半透明毛玻璃質感，營造溫柔且層次豐富的現代 Web App 視覺。
* **Mobile-First Experience**: Optimized for mobile browsers (PWA support), offering a seamless full-screen app experience when added to the home screen.
  * 針對行動端高度優化，支援「加入主畫面」以達成全螢幕沉浸式體驗。

---

## 🛠️ Technical Specifications / 技術架構

```bash
# Core Framework
React.js (Hooks, Functional Components)

# Build Tool
Vite

# Styling
Tailwind CSS & Inline Styles (CSS-in-JS)

# Storage
LocalStorage API

# Deployment
Vercel


🚀 Getting Started / 快速開始
1. Installation / 安裝
Bash
npm install
2. Local Development / 本地開發
Bash
npm run dev
3. Build for Production / 編譯生產版本
Bash
npm run build
🔒 Privacy Policy / 隱私權聲明
HerDays respects your privacy. No trackers, no analytics, and no cloud syncing. All your personal data stays exclusively on your own device.
HerDays 重視您的數據安全。絕無追蹤器、無第三方分析工具，所有數據永不離開您的裝置。

👩‍🎨 About Developer / 關於開發者
Developed with ❤️ by hLh Studio (hollyhodesign).
致力於將精緻美感與實用功能完美結合，為生活細節打造優雅的解決方案。
