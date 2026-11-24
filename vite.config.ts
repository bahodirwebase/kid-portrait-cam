import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import basicSsl from '@vitejs/plugin-basic-ssl'

// Kamera (getUserMedia) faqat xavfsiz manzilda ishlaydi: https yoki localhost. Boshqa qurilmadan
// http://192.168.x.x orqali ochilganda brauzer navigator.mediaDevices'ni umuman bermaydi — shuning
// uchun dev/preview o'z-o'zidan imzolangan sertifikat bilan https da ishlaydi.
export default defineConfig({
  plugins: [vue(), basicSsl()],
})
