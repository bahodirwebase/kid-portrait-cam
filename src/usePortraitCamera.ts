import { FaceLandmarker, FilesetResolver, type FaceLandmarkerResult } from '@mediapipe/tasks-vision'
import { onBeforeUnmount, ref, shallowRef, type Ref } from 'vue'
import { allPass, evaluate, type CheckResult, type Face, type Rules } from './rules'

// Natija: 993×1275 JPEG (35×45 mm, ~720 dpi). Kadr shu nisbatda kesiladi. Talabdagi «3:4 ga kesib,
// 993×1275 ga o'zgartirish» da nisbatlar mos emas (0.75 va 0.779) — yuz ~4% eniga cho'zilardi.
export const OUT_W = 993
export const OUT_H = 1275
export const FRAME_ASPECT = OUT_W / OUT_H
const JPEG_QUALITY = 0.92

// ponytail: shuncha kadr ketma-ket o'tsa avtomatik suratga olinadi (~30 fps da ~0.3 s).
const STABLE_FRAMES = 10

const EMPTY: CheckResult = { oneFace: false, faceSize: false, centered: false, eyesOpen: false }

// Model va wasm public/ dan (wasm — postinstall nusxalaydi): tashqi CDN'ga bog'liq emas.
let landmarker: Promise<FaceLandmarker> | null = null
function getLandmarker() {
  const base = import.meta.env.BASE_URL
  const create = (delegate: 'GPU' | 'CPU') =>
    FilesetResolver.forVisionTasks(`${base}mediapipe`).then((files) =>
      FaceLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: `${base}models/face_landmarker.task`, delegate },
        runningMode: 'VIDEO',
        numFaces: 3, // 1 dan ko'p — aks holda ikkinchi yuzni ko'rmaymiz
        outputFaceBlendshapes: true,
      }),
    )
  // GPU hamma qurilmada ham ishlamaydi.
  landmarker ??= create('GPU').catch(() => create('CPU'))
  return landmarker
}

/** Videoning markazidagi eng katta FRAME_ASPECT to'rtburchagi — ekranda `object-fit: cover` ham shuni ko'rsatadi. */
export function cropRect(vw: number, vh: number) {
  if (vw / vh > FRAME_ASPECT) {
    const w = vh * FRAME_ASPECT
    return { x: (vw - w) / 2, y: 0, w, h: vh }
  }
  const h = vw / FRAME_ASPECT
  return { x: 0, y: (vh - h) / 2, w: vw, h }
}

// MediaPipe ko'z ochiqligini bermaydi, «ko'z yumilishi» (eyeBlink*) beradi: ochiqlik = 1 - yumilish.
// ML Kit ehtimolidan farq qiladi — 85% chegarasi real bolalarda sinab, rules.ts da sozlanadi.
function toFaces(res: FaceLandmarkerResult, vw: number, vh: number): Face[] {
  const c = cropRect(vw, vh)
  return res.faceLandmarks.map((points, i) => {
    const xs = points.map((p) => (p.x * vw - c.x) / c.w)
    const ys = points.map((p) => (p.y * vh - c.y) / c.h)
    const blink = (name: string) =>
      res.faceBlendshapes[i]?.categories.find((k) => k.categoryName === name)?.score ?? 1
    return {
      left: Math.min(...xs),
      right: Math.max(...xs),
      top: Math.min(...ys),
      bottom: Math.max(...ys),
      eyeOpenLeft: 1 - blink('eyeBlinkLeft'),
      eyeOpenRight: 1 - blink('eyeBlinkRight'),
    }
  })
}

export function usePortraitCamera(video: Ref<HTMLVideoElement | null>, rules: Ref<Rules>) {
  const status = ref<'idle' | 'loading' | 'ready' | 'captured' | 'error'>('idle')
  const error = ref('')
  const checks = ref<CheckResult>({ ...EMPTY })
  const progress = ref(0) // 0..1 — avtomatik suratga olishgacha
  const facing = ref<'user' | 'environment'>('user')
  const photo = shallowRef<{ blob: Blob; url: string } | null>(null)

  let stream: MediaStream | null = null
  let frame = 0
  let lastTime = -1
  let stable = 0

  function stopStream() {
    cancelAnimationFrame(frame)
    stream?.getTracks().forEach((t) => t.stop())
    stream = null
  }

  async function start() {
    stopStream()
    status.value = 'loading'
    error.value = ''
    // http://192.168.x.x kabi xavfsiz bo'lmagan manzilda brauzer mediaDevices'ni umuman bermaydi.
    if (!navigator.mediaDevices?.getUserMedia) {
      status.value = 'error'
      error.value = window.isSecureContext
        ? "Bu brauzer kamerani qo'llab-quvvatlamaydi."
        : "Kamera faqat xavfsiz manzilda ishlaydi: sahifani https:// orqali (yoki shu kompyuterda localhost'da) oching."
      return
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        // 1275 px balandlikdagi natija uchun yuqori o'lcham so'raladi; bermasa kamera o'zinikini beradi.
        video: { facingMode: facing.value, width: { ideal: 1920 }, height: { ideal: 1920 } },
        audio: false,
      })
      const v = video.value!
      v.srcObject = stream
      await v.play()
      const detector = await getLandmarker()
      status.value = 'ready'
      loop(detector)
    } catch (e) {
      status.value = 'error'
      const name = e instanceof DOMException ? e.name : ''
      error.value =
        name === 'NotAllowedError'
          ? 'Kameraga ruxsat berilmadi. Brauzer sozlamalarida ruxsat bering.'
          : name === 'NotFoundError' || name === 'OverconstrainedError'
            ? 'Qurilmada kamera topilmadi.'
            : name === 'NotReadableError'
              ? "Kamera band — uni ishlatayotgan boshqa dasturni yoping."
              : `Kamerani ishga tushirib bo'lmadi: ${(e as Error).message}`
    }
  }

  function loop(detector: FaceLandmarker) {
    const v = video.value
    if (!v || status.value !== 'ready') return
    if (v.currentTime !== lastTime && v.videoWidth) {
      lastTime = v.currentTime
      const faces = toFaces(detector.detectForVideo(v, performance.now()), v.videoWidth, v.videoHeight)
      checks.value = evaluate(faces, rules.value)
      stable = allPass(checks.value) ? stable + 1 : 0
      progress.value = Math.min(stable / STABLE_FRAMES, 1)
      if (stable >= STABLE_FRAMES) return void capture()
    }
    frame = requestAnimationFrame(() => loop(detector))
  }

  async function capture() {
    const v = video.value!
    const c = cropRect(v.videoWidth, v.videoHeight)
    const canvas = document.createElement('canvas')
    canvas.width = OUT_W
    canvas.height = OUT_H
    // Natija oynadagidek teskari emas — haqiqiy ko'rinish.
    canvas.getContext('2d')!.drawImage(v, c.x, c.y, c.w, c.h, 0, 0, OUT_W, OUT_H)
    const blob = await new Promise<Blob>((ok, fail) =>
      canvas.toBlob((b) => (b ? ok(b) : fail(new Error('JPEG yaratilmadi'))), 'image/jpeg', JPEG_QUALITY),
    )
    stopStream()
    photo.value = { blob, url: URL.createObjectURL(blob) }
    status.value = 'captured'
  }

  function retake() {
    if (photo.value) URL.revokeObjectURL(photo.value.url)
    photo.value = null
    stable = 0
    progress.value = 0
    checks.value = { ...EMPTY }
    start()
  }

  function switchCamera() {
    facing.value = facing.value === 'user' ? 'environment' : 'user'
    start()
  }

  onBeforeUnmount(() => {
    stopStream()
    if (photo.value) URL.revokeObjectURL(photo.value.url)
  })

  return { status, error, checks, progress, facing, photo, start, retake, switchCamera }
}
