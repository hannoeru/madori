import type { H3Event } from 'h3'
import { Buffer } from 'node:buffer'
import { inflateSync } from 'node:zlib'
import { getRequestWebStream } from 'h3'
import { decode } from 'jpeg-js'
import * as v from 'valibot'

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_PIXELS = 12000000
export const MAX_JPEG_RESOLUTION_MP = 2
export const MAX_JPEG_MEMORY_MB = 32

function invalidImage(): never {
  throw createError({ statusCode: 400, statusMessage: '圖片內容無效。僅接受完整的 PNG 或 JPEG 點陣圖片。' })
}

function checkDimensions(width: number, height: number) {
  if (!width || !height || width > 12000 || height > 12000 || width * height > MAX_PIXELS)
    invalidImage()
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xFFFFFFFF
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0)
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function validatePng(bytes: Buffer): void {
  let offset = 8
  let width = 0
  let height = 0
  let channels = 0
  let palette = false
  let ended = false
  const data: Buffer[] = []
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset)
    if (length > bytes.length - offset - 12)
      invalidImage()
    const kind = bytes.toString('ascii', offset + 4, offset + 8)
    const chunk = bytes.subarray(offset + 8, offset + 8 + length)
    if (crc32(bytes.subarray(offset + 4, offset + 8 + length)) !== bytes.readUInt32BE(offset + 8 + length))
      invalidImage()
    if (offset === 8 && kind !== 'IHDR')
      invalidImage()
    if (kind === 'IHDR') {
      if (offset !== 8 || length !== 13)
        invalidImage()
      width = chunk.readUInt32BE(0)
      height = chunk.readUInt32BE(4)
      checkDimensions(width, height)
      const color = chunk[9]
      channels = color === 0 || color === 3 ? 1 : color === 2 ? 3 : color === 4 ? 2 : color === 6 ? 4 : 0
      if (chunk[8] !== 8 || !channels || chunk[10] !== 0 || chunk[11] !== 0 || chunk[12] !== 0)
        invalidImage()
    }
    else if (kind === 'PLTE') {
      if (!length || length % 3 || length > 768 || data.length)
        invalidImage()
      palette = true
    }
    else if (kind === 'IDAT') {
      if (bytes[25] === 3 && !palette)
        invalidImage()
      data.push(chunk)
    }
    else if (kind === 'IEND') {
      if (length !== 0 || offset + 12 !== bytes.length || !data.length)
        invalidImage()
      ended = true
      break
    }
    else if (kind[0] && kind[0] === kind[0].toUpperCase()) {
      invalidImage()
    }
    offset += length + 12
  }
  if (!ended)
    invalidImage()
  const rowLength = width * channels + 1
  const expected = rowLength * height
  let decoded: Buffer
  try {
    decoded = inflateSync(Buffer.concat(data), { maxOutputLength: expected })
  }
  catch {
    invalidImage()
  }
  if (decoded.length !== expected)
    invalidImage()
  for (let row = 0; row < height; row++) {
    const filter = decoded[row * rowLength]
    if (filter == null || filter > 4)
      invalidImage()
  }
}

function validateJpeg(bytes: Buffer): void {
  try {
    const image = decode(bytes, {
      useTArray: true,
      formatAsRGBA: false,
      tolerantDecoding: false,
      maxResolutionInMP: MAX_JPEG_RESOLUTION_MP,
      maxMemoryUsageInMB: MAX_JPEG_MEMORY_MB,
    })
    checkDimensions(image.width, image.height)
    if (!(image.data instanceof Uint8Array) || image.data.length !== image.width * image.height * 3)
      invalidImage()
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'JPEG無法完整解碼，或超過200萬像素／32 MiB解碼記憶體限制。請縮小圖片後重試。' })
  }
}

export function validatedImageType(bytes: Buffer): 'image/png' | 'image/jpeg' {
  if (!bytes.length)
    invalidImage()
  if (bytes.length > MAX_IMAGE_BYTES)
    throw createError({ statusCode: 413, statusMessage: '每張圖片不可超過10 MiB。' })
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    validatePng(bytes)
    return 'image/png'
  }
  if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
    validateJpeg(bytes)
    return 'image/jpeg'
  }
  return invalidImage()
}

const uploadFieldsSchema = v.object({
  kind: v.picklist(['photo', 'floor_plan']),
  alt: v.pipe(v.string(), v.trim(), v.minLength(1, '請填寫圖片說明。'), v.maxLength(200, '圖片說明不可超過200字。')),
  isCover: v.optional(v.picklist(['true', 'false']), 'false'),
})

export async function readImageUpload(event: H3Event) {
  const stream = getRequestWebStream(event)
  if (!stream)
    throw createError({ statusCode: 400, statusMessage: '請選擇要上傳的圖片。' })
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done)
        break
      if (!(value instanceof Uint8Array))
        invalidImage()
      size += value.byteLength
      if (size > MAX_IMAGE_BYTES + 65536) {
        await reader.cancel()
        throw createError({ statusCode: 413, statusMessage: '每次僅能上傳一張10 MiB以內的圖片。' })
      }
      chunks.push(value)
    }
  }
  finally {
    reader.releaseLock()
  }
  let form: FormData
  try {
    form = await new Response(Buffer.concat(chunks), { headers: { 'content-type': getHeader(event, 'content-type') ?? '' } }).formData()
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: '圖片上傳格式無效。' })
  }
  const keys = [...form.keys()]
  if (keys.length !== new Set(keys).size || keys.some(key => !['file', 'kind', 'alt', 'isCover'].includes(key)))
    throw createError({ statusCode: 400, statusMessage: '圖片上傳欄位無效。' })
  const parsed = v.safeParse(uploadFieldsSchema, { kind: form.get('kind'), alt: form.get('alt'), isCover: form.get('isCover') ?? undefined })
  if (!parsed.success)
    throw createError({ statusCode: 400, statusMessage: parsed.issues[0]?.message ?? '圖片資料無效。' })
  const file = form.get('file')
  if (!file || typeof file === 'string' || !file.name || /[\\/]/.test(file.name) || [...file.name].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) || file.name.length > 200)
    throw createError({ statusCode: 400, statusMessage: '圖片檔名無效。' })
  if (parsed.output.kind === 'floor_plan' && parsed.output.isCover === 'true')
    throw createError({ statusCode: 400, statusMessage: '格局圖不可設為照片封面。' })
  const bytes = Buffer.from(await file.arrayBuffer())
  return { ...parsed.output, bytes, contentType: validatedImageType(bytes) }
}
