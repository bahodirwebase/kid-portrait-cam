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
}

// Talab: 3 yoshgacha va 3 yoshdan kattalar uchun alohida qoidalar — hozircha qiymatlari bir xil
// (talabda farq berilmagan). Farq aniqlansa faqat shu ikki obyekt o'zgaradi.
export const RULES = {
  under3: { minFaceHeight: 0.15, maxFaceHeight: 0.95, maxCenterOffset: 0.22, minEyeOpen: 0.85 },
  from3: { minFaceHeight: 0.15, maxFaceHeight: 0.95, maxCenterOffset: 0.22, minEyeOpen: 0.85 },
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

/** Kadrdagi bitta yuz: chegaralari (kadrga nisbatan) va ko'zlar ochiqligi (0..1). */
export type Face = {
  top: number
  bottom: number
  left: number
  right: number
  eyeOpenLeft: number
  eyeOpenRight: number
}

export const CHECKS = ['oneFace', 'faceSize', 'centered', 'eyesOpen'] as const
export type CheckKey = (typeof CHECKS)[number]
export type CheckResult = Record<CheckKey, boolean>

export function evaluate(faces: Face[], r: Rules): CheckResult {
  const f = faces[0]
  // Yuz bitta bo'lmasa qolgan tekshiruvlarning ma'nosi yo'q.
  if (faces.length !== 1 || !f) return { oneFace: false, faceSize: false, centered: false, eyesOpen: false }

  const height = f.bottom - f.top
  const cx = (f.left + f.right) / 2
  const cy = (f.top + f.bottom) / 2

  return {
    oneFace: true,
    faceSize: height >= r.minFaceHeight && height <= r.maxFaceHeight,
    centered: Math.abs(cx - 0.5) <= r.maxCenterOffset && Math.abs(cy - 0.5) <= r.maxCenterOffset,
    eyesOpen: Math.min(f.eyeOpenLeft, f.eyeOpenRight) >= r.minEyeOpen,
  }
}

export const allPass = (r: CheckResult) => CHECKS.every((k) => r[k])
