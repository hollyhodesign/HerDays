# 🌸 HerDays - Privacy-First Menstrual Tracker

![HerDays Banner](https://img.shields.io/badge/Design-hLh%20Studio-E9D5F5?style=for-the-badge)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Deployment](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

---

## 🌟 Overview / 專案簡介

[cite_start]**HerDays** is a minimalist, secure, and aesthetically pleasing menstrual cycle tracker built for users who prioritize privacy and design. [cite_start]In an era of data concerns, HerDays takes a different path: **No accounts, no cloud, no tracking.** Your personal health data stays exclusively on your device.

[cite_start]**HerDays** 是一款專為隱私與極簡主義者設計的經期追蹤工具 [cite: 33, 71][cite_start]。採用現代化的「磨砂玻璃（Glassmorphism）」視覺風格，並堅持「數據在地化」原則，讓所有健康資訊完整保留在使用者裝置中，絕不上傳雲端 [cite: 1, 31, 33]。

---

## 🚀 Key Features / 核心功能

### 📅 Smart Prediction & Visualization / 週期預測與視覺化
* [cite_start]**Cycle Forecasting**: Automatically predicts your next periods for the upcoming 4 months. [cite: 17, 33]
    * [cite_start]**動態預測**：根據歷史紀錄自動計算並顯示未來四個月的預期經期 [cite: 17, 33]。
* [cite_start]**Intuitive UI**: The calendar uses dynamic "flow fills" and "pain dots" to represent symptoms. [cite: 12, 13, 33, 86]
    * [cite_start]**直觀視覺**：日曆格透過背景填充比例顯示流量大小，並以點點數量量化疼痛程度 [cite: 12, 13, 33, 86]。

### 🔒 Uncompromising Privacy / 絕對隱私安全
* [cite_start]**Local-Only Storage**: Utilizes the browser's `localStorage`; no servers involved. [cite: 1, 3, 33]
    * [cite_start]**數據在地化**：數據儲存於 `localStorage`，無後端伺服器，無數據外洩風險 [cite: 1, 3, 33]。
* [cite_start]**PIN Protection**: Features an optional, customizable PIN lock for sensitive data. [cite: 33, 35, 136]
    * [cite_start]**自定義 PIN 碼**：內建安全鎖定功能，進入 App 前需經過驗證 [cite: 33, 35, 136]。

### ✍️ Comprehensive Logging / 完善的紀錄系統
* [cite_start]**Daily Logs**: Track flow intensity, pain levels, medication intake, and personal notes. [cite: 10, 33, 103, 110, 116]
    * [cite_start]**多維度日誌**：支援流量、疼痛等級、用藥紀錄及心情備註 [cite: 10, 33, 103, 110, 116]。
* [cite_start]**Smooth Navigation**: The logging panel includes intuitive "Previous/Next Day" buttons. [cite: 33, 58]
    * [cite_start]**快速切換**：紀錄面板內建「前一日/後一日」按鈕，方便連續紀錄 [cite: 33, 58]。

---

## 🎨 Design Philosophy / 設計語彙

* [cite_start]**Glassmorphism Aesthetic**: Inspired by modern UI trends, featuring backdrop blurs and soft shadows. [cite: 31, 33]
    * [cite_start]以「磨砂玻璃」為基調，營造溫柔且層次豐富的現代 Web App 質感 [cite: 31, 33]。
* [cite_start]**Mobile-First Experience**: Optimized for mobile Safari and Chrome (PWA support). 
    * [cite_start]針對行動端高度優化，支援「加入主畫面」達成全螢幕沉浸體驗 。

---

## 🛠️ Technical Specifications / 技術架構

```bash
# Core Framework / 核心框架
React.js (Functional Components & Hooks) [cite: 1, 33]

# Build Tool / 建置工具
Vite 

# Styling / 樣式處理
Tailwind CSS & Modern CSS-in-JS [cite: 9, 31, 33]

# Storage / 資料存儲
LocalStorage API [cite: 1, 3, 33]

# Deployment / 部署平台
Vercel
