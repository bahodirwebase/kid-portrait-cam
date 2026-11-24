import { describe, expect, it } from 'vitest'
import { ageInYears, allPass, evaluate, rulesFor, RULES, type Face } from './rules'

const face = (p: Partial<Face> = {}): Face => ({
  top: 0.25, bottom: 0.75, left: 0.3, right: 0.7, eyeOpenLeft: 0.95, eyeOpenRight: 0.95, ...p,
})

describe('evaluate', () => {
  const r = RULES.from3

  it('yaxshi kadr — hammasi o\'tadi', () => expect(allPass(evaluate([face()], r))).toBe(true))

  it('yuz yo\'q yoki ikkita — hammasi yiqiladi', () => {
    expect(allPass(evaluate([], r))).toBe(false)
    expect(evaluate([face(), face()], r).oneFace).toBe(false)
  })

  it('yuz o\'lchami 15%..95%', () => {
    expect(evaluate([face({ top: 0.45, bottom: 0.55 })], r).faceSize).toBe(false) // 10%
    expect(evaluate([face({ top: 0.42, bottom: 0.58 })], r).faceSize).toBe(true) // 16%
    expect(evaluate([face({ top: 0.01, bottom: 0.99 })], r).faceSize).toBe(false) // 98%
  })

  it('markazdan 22% ichida', () => {
    expect(evaluate([face({ left: 0.5, right: 0.9 })], r).centered).toBe(true) // 0.2
    expect(evaluate([face({ left: 0.55, right: 0.95 })], r).centered).toBe(false) // 0.25
    expect(evaluate([face({ top: 0.5, bottom: 0.95 })], r).centered).toBe(false) // pastda
  })

  it('ikkala ko\'z kamida 85% ochiq', () => {
    expect(evaluate([face({ eyeOpenLeft: 0.84 })], r).eyesOpen).toBe(false)
    expect(evaluate([face({ eyeOpenLeft: 0.85, eyeOpenRight: 0.9 })], r).eyesOpen).toBe(true)
  })
})

describe('yosh', () => {
  const on = new Date(2026, 10, 24)

  it('tug\'ilgan kuni hisobga olinadi', () => {
    expect(ageInYears(new Date(2023, 10, 24), on)).toBe(3)
    expect(ageInYears(new Date(2023, 10, 25), on)).toBe(2)
  })

  it('3 yoshgacha / 3 yoshdan katta qoidasi', () => {
    expect(rulesFor(new Date(2024, 0, 1), on)).toBe(RULES.under3)
    expect(rulesFor(new Date(2020, 0, 1), on)).toBe(RULES.from3)
    expect(rulesFor(null, on)).toBe(RULES.from3)
  })
})
