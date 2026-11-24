# kid-portrait-cam

Bolaning portret suratini brauzerda (telefon yoki kompyuter kamerasi) olish va tekshirish.
Yuz aniqlash — [MediaPipe Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker),
qurilmaning o'zida ishlaydi, rasm hech qayerga yuborilmaydi.

## Tekshiruvlar (`src/rules.ts`)

| Tekshiruv | Qoida |
|---|---|
| Kadrda bitta yuz | aynan 1 ta |
| Yuz o'lchami | yuz balandligi kadr balandligining 15–95% |
| Markazda | yuz markazi kadr markazidan har o'q bo'yicha ≤ 22% |
| Ko'zlar ochiq | ikkala ko'z ochiqligi ≥ 85% (`1 − eyeBlink*`) |

3 yoshgacha va 3 yoshdan kattalar uchun qoidalar alohida (`RULES.under3`, `RULES.from3`), hozircha qiymatlari bir xil.
Yosh `?birthDate=YYYY-MM-DD` yoki sahifadagi sana maydonidan olinadi; sana bo'lmasa — kattalar qoidasi.

To'rttasi ketma-ket 10 kadr o'tsa surat avtomatik olinadi: markazdan kesiladi va 993×1275 JPEG qilinadi.

## Ishga tushirish

```sh
npm install      # postinstall MediaPipe wasm'ni public/mediapipe ga nusxalaydi
npm run dev      # kamera faqat https yoki localhost'da ishlaydi
npm test
npm run build
```

Model: `public/models/face_landmarker.task` (repoda).
