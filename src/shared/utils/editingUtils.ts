import { ranges, segmentLength } from '../composables/useEditingState'

export function buildOutputRangeName(range: { tag: string }, index: number) {
  const fallbackName = `Range ${index + 1}`
  const rangeName = sanitizeFilePart(range.tag || fallbackName) || fallbackName
  return rangeName
}
export function buildOutputSegmentName(
  range: { tag: string },
  index: number,
  segmentIndex: number,
  totalSegments: number
) {
  const base = buildOutputRangeName(range, index)
  const width = Math.max(3, String(totalSegments).length)
  const suffix = String(segmentIndex + 1).padStart(width, '0')
  return `${base} - ${suffix}.mp4`
}
export function joinPath(base: string, name: string) {
  const separator = base.includes('\\') ? '\\' : '/'
  const trimmed = base.endsWith('/') || base.endsWith('\\') ? base.slice(0, -1) : base
  return `${trimmed}${separator}${name}`
}

export function getRangeSegmentCount(range: { start: number; end: number }) {
  const start = Math.max(0, range.start)
  const end = Math.max(start, range.end)
  const length = Math.max(1, segmentLength.value)
  return Math.max(1, Math.ceil((end - start) / length))
}

export function buildSummaryItems(index?: number) {
  if (index !== undefined) {
    const range = ranges.value[index]
    if (!range) return []
    const start = Math.max(0, range.start)
    const end = Math.max(start, range.end)
    const fileCount = getRangeSegmentCount(range)
    return [
      {
        range_name: buildOutputRangeName(range, index),
        start,
        end,
        file_count: fileCount,
      },
    ]
  }

  return ranges.value.map((range, rangeIndex) => {
    const start = Math.max(0, range.start)
    const end = Math.max(start, range.end)
    return {
      range_name: buildOutputRangeName(range, rangeIndex),
      start,
      end,
      file_count: getRangeSegmentCount(range),
    }
  })
}

export function formatTime(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '00:00'
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function sanitizeFilePart(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, '').trim()
}

export function parseTagList(value: string) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function stripExtension(filename: string) {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot <= 0) return filename
  return filename.slice(0, lastDot)
}
