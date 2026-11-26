<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { AGE_LIMIT, ageInYears, CHECKS, rulesFor, type CheckKey } from './rules'
import { OUT_H, OUT_W, usePortraitCamera } from './usePortraitCamera'

// Tug'ilgan sana ?birthDate=YYYY-MM-DD orqali ham beriladi (boshqa tizimdan ochilganda).
const birthDate = ref(new URLSearchParams(location.search).get('birthDate') ?? '')
const birth = computed(() => (birthDate.value ? new Date(`${birthDate.value}T00:00:00`) : null))
const rules = computed(() => rulesFor(birth.value))
const ageGroup = computed(() =>
  !birth.value
    ? "Tug'ilgan sana kiritilmagan — 3 yoshdan kattalar qoidasi"
    : ageInYears(birth.value) < AGE_LIMIT
      ? `${AGE_LIMIT} yoshgacha`
      : `${AGE_LIMIT} yoshdan katta`,
)

const video = ref<HTMLVideoElement | null>(null)
const { status, error, checks, progress, facing, photo, start, retake, switchCamera } = usePortraitCamera(video, rules)

const pct = (v: number) => `${Math.round(v * 100)}%`
const labels = computed<Record<CheckKey, string>>(() => ({
  oneFace: 'Kadrda faqat bitta yuz',
  faceSize: `Yuz o'lchami: kadr balandligining ${pct(rules.value.minFaceHeight)}–${pct(rules.value.maxFaceHeight)}`,
  centered: `Yuz markazda (${pct(rules.value.maxCenterOffset)} ichida)`,
  eyesOpen: `Ikkala ko'z ochiq (≥ ${pct(rules.value.minEyeOpen)})`,
  headTilt: `Bosh tekis (qiyalik ≤ ${rules.value.maxHeadTiltDeg}°)`,
  mouth: "Og'iz yopiq / neytral",
  lighting: "Yorug'lik yetarli",
  blur: 'Tasvir aniq (xira emas)',
}))
const ruleNote = computed(
  () =>
    `Yuz ${pct(rules.value.minFaceHeight)}–${pct(rules.value.maxFaceHeight)}, markazdan ±${pct(rules.value.maxCenterOffset)}, ko'z ochiqligi ≥ ${pct(rules.value.minEyeOpen)}`,
)

onMounted(start)
</script>

<template>
  <main class="app">
    <h1>Bola portreti</h1>

    <label class="birth">
      Tug'ilgan sana
      <input v-model="birthDate" type="date" />
    </label>
    <p class="muted">{{ ageGroup }} · {{ ruleNote }}</p>

    <section v-show="status !== 'captured'" class="frame">
      <video ref="video" :class="{ mirror: facing === 'user' }" playsinline muted />
      <div class="guide" :class="{ ok: progress > 0 }" aria-hidden="true" />
      <div class="bar" :style="{ width: pct(progress) }" />
      <p v-if="status === 'loading'" class="overlay">Kamera va model yuklanmoqda…</p>
      <p v-if="status === 'error'" class="overlay error">{{ error }}</p>
    </section>

    <section v-if="photo" class="result">
      <img :src="photo.url" :width="OUT_W" :height="OUT_H" alt="Olingan portret" />
      <p class="muted">{{ OUT_W }}×{{ OUT_H }} JPEG · {{ Math.round(photo.blob.size / 1024) }} KB</p>
    </section>

    <ul v-if="status === 'ready'" class="checks">
      <li v-for="k in CHECKS" :key="k" :class="checks[k] ? 'pass' : 'fail'">
        <span class="mark">{{ checks[k] ? '✓' : '✗' }}</span>{{ labels[k] }}
      </li>
    </ul>
    <p v-if="status === 'ready'" class="muted">Hammasi yashil bo'lib turganda surat avtomatik olinadi.</p>

    <div class="actions">
      <template v-if="photo">
        <button type="button" @click="retake">Qayta olish</button>
        <a class="btn primary" :href="photo.url" download="portrait.jpg">Yuklab olish</a>
      </template>
      <button v-else-if="status === 'ready'" type="button" @click="switchCamera">Kamerani almashtirish</button>
      <button v-else-if="status === 'error'" type="button" @click="start">Qayta urinish</button>
    </div>
  </main>
</template>

<style>
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); }
</style>

<style scoped>
.app { max-width: 420px; margin: 0 auto; padding: 16px; display: grid; gap: 12px; }
h1 { margin: 0; font-size: 20px; }
.birth { display: flex; gap: 8px; align-items: center; font-size: 14px; }
.birth input { flex: 1; padding: 6px 8px; font: inherit; }
.muted { margin: 0; font-size: 12px; color: var(--muted); }

/* Ekrandagi kadr natija bilan bir xil nisbatda: object-fit: cover = cropRect. */
.frame { position: relative; aspect-ratio: 993 / 1275; overflow: hidden; border-radius: 12px; background: var(--black); }
.frame video { width: 100%; height: 100%; object-fit: cover; display: block; }
.frame video.mirror { transform: scaleX(-1); }
.guide { position: absolute; left: 20%; right: 20%; top: 15%; bottom: 23%; border: 2px dashed var(--surface); border-radius: 50%; opacity: 0.8; }
.guide.ok { border-style: solid; border-color: var(--success); }
.bar { position: absolute; left: 0; bottom: 0; height: 4px; background: var(--success); transition: width 0.1s; }
.overlay { position: absolute; inset: auto 12px 12px; margin: 0; padding: 8px 12px; border-radius: 8px; background: var(--overlay); color: var(--surface); font-size: 14px; }
.overlay.error { background: var(--danger); }

.result img { width: 100%; height: auto; border-radius: 12px; display: block; }

.checks { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; font-size: 14px; }
.checks li { display: flex; gap: 8px; align-items: center; }
.mark { width: 20px; height: 20px; border-radius: 50%; display: inline-grid; place-items: center; font-size: 12px; color: var(--surface); }
.pass .mark { background: var(--success); }
.fail .mark { background: var(--border); }

.actions { display: flex; gap: 8px; }
button, .btn { flex: 1; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); font: inherit; color: inherit; text-align: center; text-decoration: none; cursor: pointer; }
.primary { background: var(--primary); border-color: var(--primary); color: var(--surface); }
</style>
