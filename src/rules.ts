// Bola portreti qoidalari. Barcha o'lchovlar portret kadriga nisbatan (0..1): x — chapdan, y — tepadan.

export type Rules = {
  /** Yuz balandligi kadr balandligining shu ulushidan kam bo'lmasin. */
  minFaceHeight: number
  /** ...va shu ulushidan oshmasin. */
  maxFaceHeight: number
  /** Yuz markazi kadr markazidan har o'q bo'yicha shu ulushdan uzoq bo'lmasin. */
  maxCenterOffset: number
  /** Ikkala ko'z ochiqligi ehtimoli shundan kam bo'lmasin (0..1). */
  minEyeOpen: number
  /** Bosh qiyaligi (roll) shu darajadan oshmasin (gradusda). */
  maxHeadTiltDeg: number
  /** Og'iz ochiqligi (jawOpen) shu ulushdan oshmasin (0..1). */
  maxMouthOpen: number
  /** O'rtacha yorug'lik (0..255) shu oraliqda bo'lsin. */
  minBrightness: number
  maxBrightness: number
  /** Laplasian dispersiyasi (aniqlik) shundan kam bo'lmasin. */
  minSharpness: number
}

// Talab: 3 yoshgacha va 3 yoshdan kattalar uchun alohida qoidalar — asosiy chegaralar hozircha bir xil.
// Farq aniqlansa faqat shu ikki obyekt o'zgaradi.
export const RULES = {
  under3: {
    minFaceHeight: 0.15,
    maxFaceHeight: 0.95,
    maxCenterOffset: 0.22,
    minEyeOpen: 0.85,
    maxHeadTiltDeg: 12,
    maxMouthOpen: 0.2,
    minBrightness: 60,
    maxBrightness: 225,
    minSharpness: 45,
  },
  from3: {
    minFaceHeight: 0.15,
    maxFaceHeight: 0.95,
    maxCenterOffset: 0.22,
    minEyeOpen: 0.85,
    maxHeadTiltDeg: 10,
    maxMouthOpen: 0.18,
    minBrightness: 60,
    maxBrightness: 225,
    minSharpness: 45,
  },
} satisfies Record<string, Rules>

export const AGE_LIMIT = 3

/** `on` sanasidagi to'liq yosh. */
export function ageInYears(birth: Date, on: Date = new Date()): number {
  let age = on.getFullYear() - birth.getFullYear()
  const hadBirthday =
    on.getMonth() > birth.getMonth() || (on.getMonth() === birth.getMonth() && on.getDate() >= birth.getDate())
  if (!hadBirthday) age--
  return age
}

/** Tug'ilgan sana noma'lum bo'lsa — kattalar qoidasi. */
export function rulesFor(birth: Date | null, on: Date = new Date()): Rules {
  return birth && ageInYears(birth, on) < AGE_LIMIT ? RULES.under3 : RULES.from3
}

/** Kadrdagi bitta yuz: chegaralari (kadrga nisbatan), ko'zlar, bosh qiyaligi va og'iz holati. */
export type Face = {
  top: number
  bottom: number
  left: number
  right: number
  eyeOpenLeft: number
  eyeOpenRight: number
  headTiltDeg: number
  mouthOpen: number
}

/** Kesilgan kadrning umumiy sifat ko'rsatkichlari. */
export type FrameQuality = {
  brightness: number
  sharpness: number
}

export const CHECKS = [
  'oneFace',
  'faceSize',
  'centered',
  'eyesOpen',
  'headTilt',
  'mouth',
  'lighting',
  'blur',
] as const
export type CheckKey = (typeof CHECKS)[number]
export type CheckResult = Record<CheckKey, boolean>

function isInFrame(f: Face): boolean {
  const cx = (f.left + f.right) / 2
  const cy = (f.top + f.bottom) / 2
  return cx >= 0 && cx <= 1 && cy >= 0 && cy <= 1
}

export function evaluate(faces: Face[], r: Rules, quality?: FrameQuality): CheckResult {
  const inFrame = faces.filter(isInFrame)
  const f = inFrame[0]

  const lighting = quality
    ? quality.brightness >= r.minBrightness && quality.brightness <= r.maxBrightness
    : false
  const blur = quality ? quality.sharpness >= r.minSharpness : false

  // Yuz bitta bo'lmasa yuzga oid qolgan tekshiruvlarning ma'nosi yo'q.
  if (inFrame.length !== 1 || !f) {
    return {
      oneFace: false,
      faceSize: false,
      centered: false,
      eyesOpen: false,
      headTilt: false,
      mouth: false,
      lighting,
      blur,
    }
  }

  const height = f.bottom - f.top
  const cx = (f.left + f.right) / 2
  const cy = (f.top + f.bottom) / 2

  return {
    oneFace: true,
    faceSize: height >= r.minFaceHeight && height <= r.maxFaceHeight,
    centered: Math.abs(cx - 0.5) <= r.maxCenterOffset && Math.abs(cy - 0.5) <= r.maxCenterOffset,
    eyesOpen: Math.min(f.eyeOpenLeft, f.eyeOpenRight) >= r.minEyeOpen,
    headTilt: Math.abs(f.headTiltDeg) <= r.maxHeadTiltDeg,
    mouth: f.mouthOpen <= r.maxMouthOpen,
    lighting,
    blur,
  }
}

export const allPass = (r: CheckResult) => CHECKS.every((k) => r[k])
