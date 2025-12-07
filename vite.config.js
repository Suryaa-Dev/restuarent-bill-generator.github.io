import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// import {qr} from 'vite-plugin-qrcode';
import { qrcode } from "vite-plugin-qrcode";


// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), qrcode()],
})
