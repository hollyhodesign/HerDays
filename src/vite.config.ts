import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: 'src', // 新增這一行，告訴 Vite 從 src 開始找 index.html
  base: './',
  build: {
    outDir: '../dist', // 因為 root 改了，輸出路徑要往上一層
  }
})
