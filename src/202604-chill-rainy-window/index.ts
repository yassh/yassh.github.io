import * as THREE from "three"
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js"
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js"
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js"

const $canvas = document.getElementById("scene") as HTMLCanvasElement
const $start = document.getElementById("start") as HTMLButtonElement

const renderer = new THREE.WebGLRenderer({
  canvas: $canvas,
  antialias: true,
})
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.outputEncoding = THREE.sRGBEncoding
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.05

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x05030a)
// 午後5時・雨の湿り気（控えめに）
scene.fog = new THREE.Fog(0x80747e, 16, 56)

const camera = new THREE.PerspectiveCamera(66, 1, 0.1, 200)
camera.position.set(0, 2.4, -4.6)
const cameraTarget = new THREE.Vector3(0, 2.4, 6)
camera.lookAt(cameraTarget)

// 矢印キーで視線の上下・左右、スペースで前後ズーム
const cameraKeys = {
  up: false,
  down: false,
  left: false,
  right: false,
  space: false,
  shift: false,
}
let lookOffset = 0
let panOffset = 0
let zoomOffset = 0
const LOOK_MIN = -1.8
const LOOK_MAX = 4.5
const LOOK_SPEED = 0.02
const TARGET_TILT = 0.25
const PAN_MIN = -6
const PAN_MAX = 6
const PAN_SPEED = 0.04
const ZOOM_MIN = -1.2
const ZOOM_MAX = 7
const ZOOM_SPEED = 0.06

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp") {
    cameraKeys.up = true
    e.preventDefault()
  }
  if (e.key === "ArrowDown") {
    cameraKeys.down = true
    e.preventDefault()
  }
  if (e.key === "ArrowLeft") {
    cameraKeys.left = true
    e.preventDefault()
  }
  if (e.key === "ArrowRight") {
    cameraKeys.right = true
    e.preventDefault()
  }
  if (e.key === " ") {
    cameraKeys.space = true
    e.preventDefault()
  }
  if (e.key === "Shift") cameraKeys.shift = true
})
window.addEventListener("keyup", (e) => {
  if (e.key === "ArrowUp") cameraKeys.up = false
  if (e.key === "ArrowDown") cameraKeys.down = false
  if (e.key === "ArrowLeft") cameraKeys.left = false
  if (e.key === "ArrowRight") cameraKeys.right = false
  if (e.key === " ") cameraKeys.space = false
  if (e.key === "Shift") cameraKeys.shift = false
})

// ブルームで光を滲ませる
const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.55,
  0.55,
  0.82,
)
composer.addPass(bloom)

const resize = () => {
  const w = window.innerWidth
  const h = window.innerHeight
  renderer.setSize(w, h, false)
  composer.setSize(w, h)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}
resize()
window.addEventListener("resize", resize)

// --- 部屋 ---
const ROOM = { w: 14, h: 8.0, d: 12 }
const WIN = { w: 13.4, h: 7.5, cy: 3.85, z: 6 }

const mulberry32 = (seed: number) => {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const room = new THREE.Group()
scene.add(room)

const wallMat = new THREE.MeshStandardMaterial({
  color: 0x2a212e,
  roughness: 0.92,
})
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x120c14,
  roughness: 0.28,
  metalness: 0.15,
})
const ceilMat = new THREE.MeshStandardMaterial({
  color: 0x100b15,
  roughness: 0.95,
})

// 床（大理石っぽく艶あり）
{
  const m = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d), floorMat)
  m.rotation.x = -Math.PI / 2
  room.add(m)
}
// 天井
{
  const m = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d), ceilMat)
  m.rotation.x = Math.PI / 2
  m.position.y = ROOM.h
  room.add(m)
}
// 左右の壁
{
  const g = new THREE.PlaneGeometry(ROOM.d, ROOM.h)
  const left = new THREE.Mesh(g, wallMat)
  left.rotation.y = Math.PI / 2
  left.position.set(-ROOM.w / 2, ROOM.h / 2, 0)
  room.add(left)

  const right = new THREE.Mesh(g, wallMat)
  right.rotation.y = -Math.PI / 2
  right.position.set(ROOM.w / 2, ROOM.h / 2, 0)
  room.add(right)
}
// 背後の壁（カメラ側）
{
  const g = new THREE.PlaneGeometry(ROOM.w, ROOM.h)
  const m = new THREE.Mesh(g, wallMat)
  m.position.set(0, ROOM.h / 2, -ROOM.d / 2)
  room.add(m)
}
// パノラマ窓のくり抜き
{
  const winLeft = -WIN.w / 2
  const winRight = WIN.w / 2
  const winBottom = WIN.cy - WIN.h / 2
  const winTop = WIN.cy + WIN.h / 2

  // 上（コーニス）
  {
    const h = ROOM.h - winTop
    const m = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, h), wallMat)
    m.rotation.y = Math.PI
    m.position.set(0, winTop + h / 2, WIN.z)
    room.add(m)
  }
  // 下（腰壁）
  {
    const h = winBottom
    const m = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, h), wallMat)
    m.rotation.y = Math.PI
    m.position.set(0, h / 2, WIN.z)
    room.add(m)
  }
  // 左右の微小なスタブ
  if (ROOM.w / 2 - WIN.w / 2 > 0.05) {
    const w = ROOM.w / 2 - WIN.w / 2
    const m1 = new THREE.Mesh(new THREE.PlaneGeometry(w, WIN.h), wallMat)
    m1.rotation.y = Math.PI
    m1.position.set(-ROOM.w / 2 + w / 2, WIN.cy, WIN.z)
    room.add(m1)
    const m2 = new THREE.Mesh(new THREE.PlaneGeometry(w, WIN.h), wallMat)
    m2.rotation.y = Math.PI
    m2.position.set(ROOM.w / 2 - w / 2, WIN.cy, WIN.z)
    room.add(m2)
  }

  // 窓サッシ（黒いスリムなトリム・中桟なし）
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x0a0810,
    roughness: 0.4,
    metalness: 0.6,
  })
  const T = 0.06
  const D = 0.14
  // 上下横
  const h1 = new THREE.Mesh(
    new THREE.BoxGeometry(WIN.w + T * 2, T, D),
    frameMat,
  )
  h1.position.set(0, winTop, WIN.z)
  room.add(h1)
  const h2 = new THREE.Mesh(
    new THREE.BoxGeometry(WIN.w + T * 2, T, D),
    frameMat,
  )
  h2.position.set(0, winBottom, WIN.z)
  room.add(h2)
  // 左右縦
  const v1 = new THREE.Mesh(new THREE.BoxGeometry(T, WIN.h, D), frameMat)
  v1.position.set(winLeft, WIN.cy, WIN.z)
  room.add(v1)
  const v2 = new THREE.Mesh(new THREE.BoxGeometry(T, WIN.h, D), frameMat)
  v2.position.set(winRight, WIN.cy, WIN.z)
  room.add(v2)

  // サッシの分割（細い真鍮ラインを2本のみ）
  const slimMat = new THREE.MeshStandardMaterial({
    color: 0x1a1420,
    roughness: 0.4,
    metalness: 0.5,
  })
  for (const x of [-WIN.w / 3, WIN.w / 3]) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, WIN.h, D * 0.7),
      slimMat,
    )
    m.position.set(x, WIN.cy, WIN.z)
    room.add(m)
  }

  // 天井コーブライト（窓上の間接照明）
  const coveMat = new THREE.MeshBasicMaterial({ color: 0xffd8a0 })
  const cove = new THREE.Mesh(
    new THREE.BoxGeometry(WIN.w - 0.4, 0.02, 0.04),
    coveMat,
  )
  cove.position.set(0, winTop + 0.08, WIN.z - 0.12)
  room.add(cove)
}

// --- 外の景色 ---
const outside = new THREE.Group()
scene.add(outside)

// 空＋ホライズンの街の熱
{
  const canvas = document.createElement("canvas")
  canvas.width = 2048
  canvas.height = 1024
  const cctx = canvas.getContext("2d")!
  // 午後5時・夕方の兆し。上は青灰、ホライゾン手前に淡い暖色
  const grad = cctx.createLinearGradient(0, 0, 0, 1024)
  grad.addColorStop(0, "#3a424e")
  grad.addColorStop(0.3, "#5e5e74")
  grad.addColorStop(0.55, "#86748a")
  grad.addColorStop(0.78, "#b08a86")
  grad.addColorStop(0.92, "#3c3040")
  grad.addColorStop(1, "#141418")
  cctx.fillStyle = grad
  cctx.fillRect(0, 0, 2048, 1024)

  // ホライゾン付近の僅かな暖色グロー（日没前の淡い光）
  const glow = cctx.createLinearGradient(0, 700, 0, 920)
  glow.addColorStop(0, "rgba(240, 190, 140, 0)")
  glow.addColorStop(0.5, "rgba(230, 170, 130, 0.2)")
  glow.addColorStop(1, "rgba(200, 140, 120, 0)")
  cctx.fillStyle = glow
  cctx.fillRect(0, 700, 2048, 220)

  // 厚めの雨雲（暗めのグレーを縞状に）
  for (let i = 0; i < 14; i++) {
    const cx = Math.random() * 2048
    const cy = 80 + Math.random() * 420
    const cw = 240 + Math.random() * 560
    const ch = 18 + Math.random() * 40
    const lum = 50 + Math.floor(Math.random() * 40)
    cctx.fillStyle = `rgba(${lum}, ${lum + 2}, ${lum + 8}, ${
      0.35 + Math.random() * 0.3
    })`
    cctx.fillRect(cx, cy, cw, ch)
    cctx.fillRect(cx + 20, cy - 6, Math.max(cw - 40, 10), 6)
  }
  // 星は昼間なし
  const tex = new THREE.CanvasTexture(canvas)
  tex.encoding = THREE.sRGBEncoding
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 110),
    new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.DoubleSide,
      fog: false,
    }),
  )
  m.position.set(0, 30, 44)
  m.rotation.y = Math.PI
  outside.add(m)
}

// 月は雨雲に隠れているので出さない

// ビル生成（canvas-textureで窓グリッド）
const aviationLights: THREE.Mesh[] = []
const buildingWindows: THREE.Mesh[] = []

const makeBuildingTexture = (
  texW: number,
  texH: number,
  brng: () => number,
) => {
  const canvas = document.createElement("canvas")
  canvas.width = texW
  canvas.height = texH
  const cctx = canvas.getContext("2d")!
  const bodyGrad = cctx.createLinearGradient(0, 0, 0, texH)
  // 夕陽を受ける側の色味（ウォーム寄り）
  const r1 = 50 + Math.floor(brng() * 40)
  const g1 = 38 + Math.floor(brng() * 30)
  const b1 = 45 + Math.floor(brng() * 30)
  bodyGrad.addColorStop(0, `rgb(${r1 + 20}, ${g1 + 10}, ${b1})`)
  bodyGrad.addColorStop(1, `rgb(${r1 >> 1}, ${g1 >> 1}, ${b1 >> 1})`)
  cctx.fillStyle = bodyGrad
  cctx.fillRect(0, 0, texW, texH)

  // 窓グリッド
  const cellW = 14
  const cellH = 20
  const winW = 8
  const winH = 12
  const cols = Math.floor((texW - 12) / cellW)
  const rows = Math.floor((texH - 16) / cellH)
  const marginX = (texW - cols * cellW) / 2
  const marginY = 10

  // 午後5時・暗くなり始めて点灯が増えつつある
  for (let r = 0; r < rows; r++) {
    const floorLit = 0.1 + brng() * 0.18
    for (let c = 0; c < cols; c++) {
      const lit = brng() < floorLit
      const x = marginX + c * cellW + (cellW - winW) / 2
      const y = marginY + r * cellH + (cellH - winH) / 2
      if (lit) {
        const hue = 38 + brng() * 16
        const sat = 45 + brng() * 25
        const lum = 55 + brng() * 22
        cctx.fillStyle = `hsl(${hue}, ${sat}%, ${lum}%)`
      } else {
        // 曇天の昼を反射するガラス（青灰）
        const hue = 210 + brng() * 30
        const lum = 40 + brng() * 18
        cctx.fillStyle = `hsl(${hue}, 20%, ${lum}%)`
      }
      cctx.fillRect(x, y, winW, winH)
    }
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.encoding = THREE.sRGBEncoding
  return tex
}

// 街全体を視線より少し下にオフセット（中層階・目線の高さ付近にビルの上階）
const cityGroup = new THREE.Group()
cityGroup.position.y = -9
outside.add(cityGroup)

{
  const brng = mulberry32(7777)
  const darkMat = new THREE.MeshBasicMaterial({ color: 0x06041a })

  const addBox = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
  ) => {
    const tex = makeBuildingTexture(
      192,
      Math.max(192, Math.floor(h * 24)),
      brng,
    )
    const frontMat = new THREE.MeshBasicMaterial({ map: tex })
    const mats = [darkMat, darkMat, darkMat, darkMat, darkMat, frontMat]
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats)
    box.position.set(x, y + h / 2, z)
    cityGroup.add(box)
  }

  const addAviation = (x: number, z: number, top: number) => {
    const av = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff3020 }),
    )
    av.position.set(x, top + 0.35, z)
    cityGroup.add(av)
    aviationLights.push(av)
  }

  const addSpire = (x: number, z: number, top: number) => {
    const spire = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 1.6 + brng() * 1.4, 6),
      darkMat,
    )
    const spH = 1.6
    spire.position.set(x, top + spH / 2, z)
    cityGroup.add(spire)
    return top + spH
  }

  const makeBuilding = (params: {
    x: number
    z: number
    w: number
    d: number
    h: number
    style: "basic" | "tiered" | "spire"
    av: boolean
  }) => {
    const { x, z, w, d, h, style } = params
    if (style === "basic") {
      addBox(x, 0, z, w, h, d)
      if (params.av) addAviation(x, z, h)
    } else if (style === "tiered") {
      const levels = 2 + Math.floor(brng() * 2)
      let curY = 0
      let curW = w
      let curD = d
      let top = 0
      for (let i = 0; i < levels; i++) {
        const segH = (h * (0.5 + brng() * 0.25) * (levels - i)) / levels
        addBox(x, curY, z, curW, segH, curD)
        curY += segH
        top = curY
        curW *= 0.78
        curD *= 0.82
      }
      if (brng() < 0.6) top = addSpire(x, z, top)
      if (params.av) addAviation(x, z, top)
    } else {
      // spire
      addBox(x, 0, z, w, h, d)
      const top = addSpire(x, z, h)
      if (params.av) addAviation(x, z, top)
    }
  }

  // 手前のビルは置かず、全て遠景に配置（開放感のある眺め）
  // 中景のビル群（横に広く、一部は超高層）
  for (let i = 0; i < 32; i++) {
    const x = -48 + i * 3.1 + (brng() - 0.5) * 1.4
    const z = 24 + brng() * 4
    const w = 2.2 + brng() * 3
    const d = 2.5 + brng() * 2.5
    const isSkyscraper = brng() < 0.18
    const h = isSkyscraper ? 22 + brng() * 16 : 6 + brng() * 12
    const roll = brng()
    const style: "basic" | "tiered" | "spire" = isSkyscraper
      ? roll < 0.5
        ? "tiered"
        : "spire"
      : roll < 0.25
      ? "tiered"
      : roll < 0.35
      ? "spire"
      : "basic"
    makeBuilding({ x, z, w, d, h, style, av: h > 11 && brng() < 0.7 })
  }
  // さらに遠景（さらに広く）
  for (let i = 0; i < 26; i++) {
    const x = -56 + i * 4.4 + (brng() - 0.5) * 2.2
    const z = 32 + brng() * 5
    const w = 3 + brng() * 4
    const d = 3 + brng() * 3
    const isSkyscraper = brng() < 0.12
    const h = isSkyscraper ? 18 + brng() * 14 : 4 + brng() * 9
    const style: "basic" | "tiered" | "spire" = isSkyscraper
      ? "tiered"
      : brng() < 0.15
      ? "tiered"
      : "basic"
    makeBuilding({ x, z, w, d, h, style, av: h > 9 && brng() < 0.45 })
  }
  // 最遠景（輪郭だけ霞む）
  for (let i = 0; i < 20; i++) {
    const x = -64 + i * 6.5 + (brng() - 0.5) * 3
    const z = 40 + brng() * 5
    const w = 3 + brng() * 5
    const d = 3 + brng() * 3
    const h = 3 + brng() * 7
    makeBuilding({ x, z, w, d, h, style: "basic", av: false })
  }
  // 遠景の街明かり帯（控えめな暖色）
  const farGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 1.2),
    new THREE.MeshBasicMaterial({
      color: 0xc06a48,
      transparent: true,
      opacity: 0.2,
      fog: false,
    }),
  )
  farGlow.position.set(0, 0.8, 32)
  cityGroup.add(farGlow)

  // 地面（深い濡れたアスファルト）
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 80),
    new THREE.MeshBasicMaterial({ color: 0x141418 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.set(0, 0.02, 22)
  cityGroup.add(ground)
}

// --- 雨 ---
const RAIN_COUNT = 380
const rainGeo = new THREE.BufferGeometry()
const rainPositions = new Float32Array(RAIN_COUNT * 6)
const rainSpeeds = new Float32Array(RAIN_COUNT)
for (let i = 0; i < RAIN_COUNT; i++) {
  const x = (Math.random() - 0.5) * 32
  const y = Math.random() * 20
  const z = 7 + Math.random() * 20
  const len = 0.3 + Math.random() * 0.22
  rainPositions[i * 6 + 0] = x
  rainPositions[i * 6 + 1] = y
  rainPositions[i * 6 + 2] = z
  rainPositions[i * 6 + 3] = x - 0.04
  rainPositions[i * 6 + 4] = y - len
  rainPositions[i * 6 + 5] = z
  rainSpeeds[i] = 0.15 + Math.random() * 0.1
}
rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3))
const rainMat = new THREE.LineBasicMaterial({
  color: 0xc0ccf8,
  transparent: true,
  opacity: 0.28,
})
const rain = new THREE.LineSegments(rainGeo, rainMat)
outside.add(rain)

// --- マテリアル ---
const leatherMat = new THREE.MeshStandardMaterial({
  color: 0x24202a,
  roughness: 0.45,
  metalness: 0.08,
})
const leatherTrimMat = new THREE.MeshStandardMaterial({
  color: 0x1a171e,
  roughness: 0.5,
})
const brassMat = new THREE.MeshStandardMaterial({
  color: 0xb58a3a,
  roughness: 0.28,
  metalness: 0.85,
})
const darkWoodMat = new THREE.MeshStandardMaterial({
  color: 0x201510,
  roughness: 0.7,
})
const glassMat = new THREE.MeshStandardMaterial({
  color: 0x15121a,
  roughness: 0.08,
  metalness: 0.4,
  transparent: true,
  opacity: 0.55,
})

// --- 家具 ---

// L字セクショナルソファ（ローモダン・低プロファイル）
const makeSectional = () => {
  const g = new THREE.Group()

  // メイン部分（窓に平行）
  const mainW = 4.2
  const mainD = 1.25
  const mainSeat = new THREE.Mesh(
    new THREE.BoxGeometry(mainW, 0.28, mainD),
    leatherMat,
  )
  mainSeat.position.set(-0.5, 0.22, 0)
  g.add(mainSeat)

  const mainBack = new THREE.Mesh(
    new THREE.BoxGeometry(mainW, 0.45, 0.22),
    leatherMat,
  )
  mainBack.position.set(-0.5, 0.55, mainD / 2 - 0.11)
  g.add(mainBack)

  // 左アーム（低め）
  const armL = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.5, mainD),
    leatherTrimMat,
  )
  armL.position.set(-0.5 - mainW / 2 + 0.12, 0.5, 0)
  g.add(armL)

  // クッション（メイン側3枚・薄め）
  for (let i = 0; i < 3; i++) {
    const cw = (mainW - 0.4) / 3
    const c = new THREE.Mesh(
      new THREE.BoxGeometry(cw - 0.04, 0.12, mainD - 0.1),
      leatherMat,
    )
    c.position.set(-0.5 - mainW / 2 + 0.22 + i * cw + cw / 2, 0.42, -0.05)
    g.add(c)
  }

  // 背クッション（低め）
  for (let i = 0; i < 3; i++) {
    const cw = (mainW - 0.4) / 3
    const c = new THREE.Mesh(
      new THREE.BoxGeometry(cw - 0.04, 0.35, 0.2),
      leatherMat,
    )
    c.position.set(
      -0.5 - mainW / 2 + 0.22 + i * cw + cw / 2,
      0.6,
      mainD / 2 - 0.2,
    )
    g.add(c)
  }

  // シェーズ（チェイス）部分
  const chaiseW = 1.3
  const chaiseD = 2.3
  const chaiseX = -0.5 + mainW / 2 + chaiseW / 2 - 0.05
  const chaiseZ = 0 - (chaiseD - mainD) / 2
  const chaiseSeat = new THREE.Mesh(
    new THREE.BoxGeometry(chaiseW, 0.28, chaiseD),
    leatherMat,
  )
  chaiseSeat.position.set(chaiseX, 0.22, chaiseZ)
  g.add(chaiseSeat)

  // チェイス側の低いアーム（背もたれの代わり）
  const chaiseBack = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.45, chaiseD - 0.1),
    leatherMat,
  )
  chaiseBack.position.set(chaiseX + chaiseW / 2 - 0.11, 0.55, chaiseZ)
  g.add(chaiseBack)

  // チェイスのクッション
  const chaiseC = new THREE.Mesh(
    new THREE.BoxGeometry(chaiseW - 0.1, 0.12, chaiseD - 0.15),
    leatherMat,
  )
  chaiseC.position.set(chaiseX - 0.04, 0.42, chaiseZ)
  g.add(chaiseC)

  // 脚（真鍮）
  const legH = 0.1
  const legPoints = [
    [-0.5 - mainW / 2 + 0.1, 0 - mainD / 2 + 0.1],
    [-0.5 - mainW / 2 + 0.1, 0 + mainD / 2 - 0.1],
    [chaiseX + chaiseW / 2 - 0.1, chaiseZ - chaiseD / 2 + 0.1],
    [chaiseX + chaiseW / 2 - 0.1, chaiseZ + chaiseD / 2 - 0.1],
    [-0.5 + mainW / 2 - 0.1, 0 - mainD / 2 + 0.1],
  ]
  for (const [lx, lz] of legPoints) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, legH, 10),
      brassMat,
    )
    leg.position.set(lx, legH / 2, lz)
    g.add(leg)
  }

  return g
}

// 猫
const makeCat = () => {
  const g = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({
    color: 0x0a0608,
    roughness: 0.95,
  })
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.2, 0.35), mat)
  body.position.set(0, 0.1, 0)
  g.add(body)
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.22), mat)
  head.position.set(0.2, 0.2, 0)
  g.add(head)
  const earL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.06), mat)
  earL.position.set(0.25, 0.34, -0.07)
  g.add(earL)
  const earR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.06), mat)
  earR.position.set(0.25, 0.34, 0.07)
  g.add(earR)
  return g
}

// ガラステーブル＋真鍮フレーム
const makeGlassTable = () => {
  const g = new THREE.Group()
  const topW = 2.4
  const topD = 1.3
  const topH = 0.45
  // トップ（暗いガラス）
  const top = new THREE.Mesh(new THREE.BoxGeometry(topW, 0.035, topD), glassMat)
  top.position.set(0, topH, 0)
  g.add(top)
  // 真鍮フレーム（天板の縁）
  const frameMat = brassMat
  for (const [dx, dz, axis] of [
    [0, topD / 2 - 0.01, "x"],
    [0, -topD / 2 + 0.01, "x"],
    [topW / 2 - 0.01, 0, "z"],
    [-topW / 2 + 0.01, 0, "z"],
  ] as const) {
    const len = axis === "x" ? topW : topD
    const geo =
      axis === "x"
        ? new THREE.BoxGeometry(len, 0.04, 0.04)
        : new THREE.BoxGeometry(0.04, 0.04, len)
    const m = new THREE.Mesh(geo, frameMat)
    m.position.set(dx, topH - 0.01, dz)
    g.add(m)
  }
  // 脚（4本・真鍮細身）
  for (const [lx, lz] of [
    [-topW / 2 + 0.08, -topD / 2 + 0.08],
    [topW / 2 - 0.08, -topD / 2 + 0.08],
    [-topW / 2 + 0.08, topD / 2 - 0.08],
    [topW / 2 - 0.08, topD / 2 - 0.08],
  ]) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, topH, 12),
      frameMat,
    )
    leg.position.set(lx, topH / 2, lz)
    g.add(leg)
  }
  // ロー・シェルフ（下段の真鍮リング）
  const shelf = new THREE.Mesh(
    new THREE.BoxGeometry(topW - 0.2, 0.025, topD - 0.2),
    new THREE.MeshStandardMaterial({
      color: 0x0a0608,
      roughness: 0.4,
      metalness: 0.3,
    }),
  )
  shelf.position.set(0, 0.12, 0)
  g.add(shelf)
  return g
}

// ウィスキーデキャンタ
const makeDecanter = () => {
  const g = new THREE.Group()
  const liquid = new THREE.MeshStandardMaterial({
    color: 0xaa5a20,
    transparent: true,
    opacity: 0.75,
    roughness: 0.1,
    metalness: 0.2,
  })
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.13, 0.26, 16),
    liquid,
  )
  body.position.set(0, 0.13, 0)
  g.add(body)
  // 肩（すぼみ）
  const shoulder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.1, 0.07, 16),
    liquid,
  )
  shoulder.position.set(0, 0.3, 0)
  g.add(shoulder)
  // ネック
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.06, 12),
    liquid,
  )
  neck.position.set(0, 0.365, 0)
  g.add(neck)
  // ストッパー
  const stopper = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), liquid)
  stopper.position.set(0, 0.44, 0)
  g.add(stopper)
  return g
}

// タンブラー
const makeTumbler = () => {
  const g = new THREE.Group()
  const crystal = new THREE.MeshStandardMaterial({
    color: 0xc0a880,
    transparent: true,
    opacity: 0.55,
    roughness: 0.08,
    metalness: 0.2,
  })
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.05, 0.09, 16),
    crystal,
  )
  glass.position.set(0, 0.045, 0)
  g.add(glass)
  // 中身
  const liquid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.048, 0.04, 12),
    new THREE.MeshStandardMaterial({ color: 0xaa6030 }),
  )
  liquid.position.set(0, 0.035, 0)
  g.add(liquid)
  return g
}

// 小さなキャンドル（真鍮ホルダー）
const makeCandle = () => {
  const g = new THREE.Group()
  const holder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 0.04, 12),
    brassMat,
  )
  holder.position.set(0, 0.02, 0)
  g.add(holder)
  const wax = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.1, 12),
    new THREE.MeshStandardMaterial({ color: 0xeadfd0 }),
  )
  wax.position.set(0, 0.09, 0)
  g.add(wax)
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffc870 })
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 8), flameMat)
  flame.position.set(0, 0.18, 0)
  g.add(flame)
  return { group: g, flame }
}

// ハードカバーの本（テーブルの上）
const makeHardcover = (color: number) => {
  const g = new THREE.Group()
  const cover = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.04, 0.24),
    new THREE.MeshStandardMaterial({ color, roughness: 0.7 }),
  )
  cover.position.set(0, 0.02, 0)
  g.add(cover)
  return g
}

// オーキッド（小さな花瓶）
const makeOrchid = () => {
  const g = new THREE.Group()
  const vase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.05, 0.16, 12),
    new THREE.MeshStandardMaterial({ color: 0x1a1520, roughness: 0.2 }),
  )
  vase.position.set(0, 0.08, 0)
  g.add(vase)
  // 茎
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.005, 0.3, 6),
    new THREE.MeshStandardMaterial({ color: 0x3a5a22 }),
  )
  stem.position.set(0, 0.31, 0)
  g.add(stem)
  // 花
  const flowerMat = new THREE.MeshStandardMaterial({ color: 0xf0eaf4 })
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), flowerMat)
    const a = (i / 4) * Math.PI * 2
    f.position.set(Math.cos(a) * 0.04, 0.42 + i * 0.02, Math.sin(a) * 0.04)
    g.add(f)
  }
  return g
}

// 本棚（open-front）
const makeBookshelf = () => {
  const g = new THREE.Group()
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x1e120d,
    roughness: 0.85,
  })
  const W = 1.6
  const H = 3.2
  const D = 0.4
  const t = 0.06
  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.04), woodMat)
  back.position.set(0, H / 2, -D / 2 + 0.02)
  g.add(back)
  const sideL = new THREE.Mesh(new THREE.BoxGeometry(t, H, D), woodMat)
  sideL.position.set(-W / 2, H / 2, 0)
  g.add(sideL)
  const sideR = new THREE.Mesh(new THREE.BoxGeometry(t, H, D), woodMat)
  sideR.position.set(W / 2, H / 2, 0)
  g.add(sideR)
  const top = new THREE.Mesh(new THREE.BoxGeometry(W, t, D), woodMat)
  top.position.set(0, H - t / 2, 0)
  g.add(top)
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(W, t, D), woodMat)
  bottom.position.set(0, t / 2, 0)
  g.add(bottom)

  const shelfCount = 4
  for (let i = 1; i < shelfCount; i++) {
    const y = (H / shelfCount) * i
    const s = new THREE.Mesh(
      new THREE.BoxGeometry(W - t * 2, t, D - 0.02),
      woodMat,
    )
    s.position.set(0, y, 0)
    g.add(s)
  }

  const colors = [
    0x9a4a32, 0xb88050, 0x466a90, 0x8a6e50, 0x3a5d45, 0xa86030, 0x553060,
    0xae6a48, 0x3a5a85, 0x7a4034,
  ]
  const rng = mulberry32(20260420)
  for (let i = 0; i < shelfCount; i++) {
    const yBase = (H / shelfCount) * i + t
    const shelfHeight = H / shelfCount - t
    let x = -W / 2 + t + 0.02
    while (x < W / 2 - t - 0.08) {
      const bw = 0.07 + rng() * 0.06
      const bh = 0.32 + rng() * 0.14
      if (bh > shelfHeight - 0.05) break
      const color = colors[Math.floor(rng() * colors.length)]
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(bw, bh, 0.26),
        new THREE.MeshStandardMaterial({ color, roughness: 0.85 }),
      )
      book.position.set(x + bw / 2, yBase + bh / 2, D / 2 - 0.18)
      g.add(book)
      x += bw + 0.015
    }
  }
  return g
}

// アーチ型フロアランプ（真鍮・高背）
const makeArcLamp = () => {
  const g = new THREE.Group()
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.34, 0.09, 20),
    new THREE.MeshStandardMaterial({
      color: 0x1a1318,
      roughness: 0.35,
      metalness: 0.6,
    }),
  )
  base.position.set(0, 0.045, 0)
  g.add(base)
  const ring = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.34, 0.02, 20),
    brassMat,
  )
  ring.position.set(0, 0.09, 0)
  g.add(ring)
  // 高く伸びるアーチ
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.09, 0),
    new THREE.Vector3(0, 3.4, 0),
    new THREE.Vector3(-0.4, 4.5, -0.1),
    new THREE.Vector3(-1.4, 5.1, -0.3),
    new THREE.Vector3(-2.7, 4.9, -0.6),
  ])
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 50, 0.03, 10, false),
    brassMat,
  )
  g.add(tube)
  const shade = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 20, 20, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({
      color: 0x3a2a20,
      roughness: 0.5,
      metalness: 0.4,
      side: THREE.DoubleSide,
    }),
  )
  shade.position.set(-2.7, 4.9, -0.6)
  g.add(shade)
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffd89a }),
  )
  bulb.position.set(-2.7, 4.76, -0.6)
  g.add(bulb)
  return g
}

// ペンダントライト（コーヒーテーブルの上）
const makePendant = (hangLen: number) => {
  const g = new THREE.Group()
  // ロッド（高天井に合わせて長め）
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, hangLen, 8),
    brassMat,
  )
  rod.position.set(0, -hangLen / 2, 0)
  g.add(rod)
  // 天井プレート
  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.02, 16),
    brassMat,
  )
  plate.position.set(0, 0, 0)
  g.add(plate)
  // シェード（ガラスグローブ）
  const shade = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 20, 20),
    new THREE.MeshStandardMaterial({
      color: 0xf0d6a0,
      emissive: 0xffaa50,
      emissiveIntensity: 1.1,
      roughness: 0.3,
      transparent: true,
      opacity: 0.9,
    }),
  )
  shade.position.set(0, -hangLen - 0.2, 0)
  g.add(shade)
  return { group: g, shadeY: -hangLen - 0.2 }
}

// 観葉植物（モンステラ風・大）
const makeBigPlant = () => {
  const g = new THREE.Group()
  // 真鍮系のポット
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.32, 0.6, 20),
    new THREE.MeshStandardMaterial({
      color: 0x1e1812,
      roughness: 0.4,
      metalness: 0.35,
    }),
  )
  pot.position.set(0, 0.3, 0)
  g.add(pot)
  // ポットの真鍮リング
  const ring = new THREE.Mesh(
    new THREE.CylinderGeometry(0.41, 0.41, 0.04, 20),
    brassMat,
  )
  ring.position.set(0, 0.58, 0)
  g.add(ring)
  // 葉（大きくて不規則に）
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x1e5830,
    roughness: 0.8,
  })
  const leafMatDark = new THREE.MeshStandardMaterial({
    color: 0x143820,
    roughness: 0.85,
  })
  const rng = mulberry32(99)
  for (let i = 0; i < 24; i++) {
    const w = 0.35 + rng() * 0.35
    const h = 0.45 + rng() * 0.5
    const leaf = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, 0.04),
      rng() < 0.5 ? leafMat : leafMatDark,
    )
    const a = rng() * Math.PI * 2
    const r = 0.05 + rng() * 0.22
    const y = 0.6 + rng() * 1.3
    leaf.position.set(Math.cos(a) * r, y, Math.sin(a) * r)
    leaf.rotation.set((rng() - 0.5) * 0.7, a + Math.PI / 2, (rng() - 0.5) * 1.0)
    g.add(leaf)
  }
  return g
}

// ラグ
const makeRug = () => {
  const g = new THREE.Group()
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 0.02, 2.8),
    new THREE.MeshStandardMaterial({
      color: 0x2a1e2a,
      roughness: 0.95,
    }),
  )
  base.position.set(0, 0.01, 0)
  g.add(base)
  const border = new THREE.Mesh(
    new THREE.BoxGeometry(4.0, 0.022, 2.6),
    new THREE.MeshStandardMaterial({
      color: 0x3a2a3a,
      roughness: 0.95,
    }),
  )
  border.position.set(0, 0.013, 0)
  g.add(border)
  // ごく薄い模様
  const pattern = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 0.024, 2.0),
    new THREE.MeshStandardMaterial({
      color: 0x1c141c,
      roughness: 0.95,
    }),
  )
  pattern.position.set(0, 0.016, 0)
  g.add(pattern)
  return g
}

// 大きな抽象画
const makeLargeArt = () => {
  const g = new THREE.Group()
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x0a0608,
    roughness: 0.4,
    metalness: 0.3,
  })
  const w = 1.8
  const h = 2.4
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.04), frameMat)
  g.add(frame)
  const canvas = document.createElement("canvas")
  canvas.width = 256
  canvas.height = 340
  const cctx = canvas.getContext("2d")!
  const grad = cctx.createLinearGradient(0, 0, 0, 340)
  grad.addColorStop(0, "#1a1232")
  grad.addColorStop(0.55, "#6a3d5a")
  grad.addColorStop(1, "#c2845a")
  cctx.fillStyle = grad
  cctx.fillRect(0, 0, 256, 340)
  // 抽象的なストローク
  cctx.globalAlpha = 0.6
  cctx.fillStyle = "#08040c"
  for (let i = 0; i < 6; i++) {
    cctx.beginPath()
    cctx.moveTo(Math.random() * 256, 200 + Math.random() * 140)
    cctx.bezierCurveTo(
      Math.random() * 256,
      200 + Math.random() * 140,
      Math.random() * 256,
      200 + Math.random() * 140,
      Math.random() * 256,
      200 + Math.random() * 140,
    )
    cctx.lineWidth = 4 + Math.random() * 10
    cctx.strokeStyle = "#08040c"
    cctx.stroke()
  }
  cctx.globalAlpha = 1
  const tex = new THREE.CanvasTexture(canvas)
  tex.encoding = THREE.sRGBEncoding
  const inner = new THREE.Mesh(
    new THREE.PlaneGeometry(w - 0.05, h - 0.05),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }),
  )
  inner.position.set(0, 0, 0.025)
  g.add(inner)
  return g
}

// ライティングデスク（広めのエグゼクティブ）
const makeDesk = () => {
  const g = new THREE.Group()
  const deskW = 3.6
  const deskD = 1.9
  const deskH = 0.78
  // 天板（超薄・ダークウォルナット）
  const desktop = new THREE.Mesh(
    new THREE.BoxGeometry(deskW, 0.026, deskD),
    new THREE.MeshStandardMaterial({
      color: 0x1e140e,
      roughness: 0.4,
      metalness: 0.08,
    }),
  )
  desktop.position.set(0, deskH, 0)
  g.add(desktop)

  // ブレード脚（両端・内側に傾斜・メタリック）
  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0x20202a,
    roughness: 0.2,
    metalness: 0.95,
  })
  const legH = deskH - 0.04
  for (const sign of [-1, 1]) {
    // 上下で奥行きが変わる台形ブレード（下に行くほど広い）
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, legH, deskD - 0.25),
      bladeMat,
    )
    blade.position.set(sign * (deskW / 2 - 0.08), legH / 2 + 0.02, 0)
    blade.rotation.z = -sign * 0.05
    g.add(blade)
    // 床面のフィート（接地プレート）
    const foot = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.02, deskD - 0.1),
      bladeMat,
    )
    foot.position.set(sign * (deskW / 2 - 0.08), 0.01, 0)
    g.add(foot)
  }

  // モニター（外付けディスプレイ＋スタンド）
  const monitorMat = new THREE.MeshStandardMaterial({
    color: 0x121216,
    roughness: 0.4,
    metalness: 0.55,
  })
  // ベース
  const monBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.03, 0.18),
    monitorMat,
  )
  monBase.position.set(0, deskH + 0.015, 0)
  g.add(monBase)
  // スタンド支柱
  const monStem = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.28, 0.04),
    monitorMat,
  )
  monStem.position.set(0, deskH + 0.17, -0.02)
  g.add(monStem)
  // モニター本体（ウルトラワイド風）
  const monW = 1.4
  const monH = 0.55
  const monBody = new THREE.Mesh(
    new THREE.BoxGeometry(monW, monH, 0.04),
    monitorMat,
  )
  monBody.position.set(0, deskH + 0.62, -0.03)
  g.add(monBody)
  // スクリーンの発光（夕方を反射する青み）
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(monW - 0.04, monH - 0.04),
    new THREE.MeshBasicMaterial({ color: 0x526a92 }),
  )
  screen.position.set(0, deskH + 0.62, -0.008)
  g.add(screen)

  // キーボード（モニター手前・やや左寄り）
  const keyboard = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.018, 0.14),
    new THREE.MeshStandardMaterial({
      color: 0x14141a,
      roughness: 0.5,
      metalness: 0.2,
    }),
  )
  keyboard.position.set(-0.08, deskH + 0.009, 0.55)
  g.add(keyboard)
  // キー表面のグリッド感（薄いトッププレート）
  const keyTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.003, 0.128),
    new THREE.MeshStandardMaterial({
      color: 0x24242c,
      roughness: 0.55,
    }),
  )
  keyTop.position.set(-0.08, deskH + 0.0195, 0.55)
  g.add(keyTop)

  // トラックパッド（キーボードの右隣・Magic Trackpad風）
  const trackpad = new THREE.Mesh(
    new THREE.BoxGeometry(0.17, 0.008, 0.12),
    new THREE.MeshStandardMaterial({
      color: 0xd8d8de,
      roughness: 0.25,
      metalness: 0.35,
    }),
  )
  trackpad.position.set(0.3, deskH + 0.004, 0.56)
  g.add(trackpad)
  // トラックパッドのサブフレーム（側面のシルバー感）
  const trackpadBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.172, 0.004, 0.122),
    new THREE.MeshStandardMaterial({
      color: 0x8a8a92,
      roughness: 0.3,
      metalness: 0.7,
    }),
  )
  trackpadBase.position.set(0.3, deskH + 0.001, 0.56)
  g.add(trackpadBase)

  // ノートブック（右利きなのでシッター右側＝local +x に配置）
  const notebook1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.035, 0.38),
    new THREE.MeshStandardMaterial({ color: 0x2a1820, roughness: 0.75 }),
  )
  notebook1.position.set(1.15, deskH + 0.02, -0.15)
  g.add(notebook1)
  const notebook2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.03, 0.34),
    new THREE.MeshStandardMaterial({ color: 0x5a3824, roughness: 0.75 }),
  )
  notebook2.position.set(1.15, deskH + 0.055, -0.13)
  notebook2.rotation.y = -0.08
  g.add(notebook2)

  // 開いたノート＋鉛筆
  const openNote = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.01, 0.22),
    new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.85 }),
  )
  openNote.position.set(0.85, deskH + 0.012, 0.1)
  openNote.rotation.y = -0.18
  g.add(openNote)
  const pencil = new THREE.Mesh(
    new THREE.CylinderGeometry(0.007, 0.007, 0.18, 8),
    new THREE.MeshStandardMaterial({ color: 0xa06030, roughness: 0.8 }),
  )
  pencil.position.set(0.72, deskH + 0.02, 0.18)
  pencil.rotation.z = Math.PI / 2
  pencil.rotation.y = -0.25
  g.add(pencil)

  // マグカップ
  const mug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.055, 0.1, 14),
    new THREE.MeshStandardMaterial({
      color: 0x0a0a0e,
      roughness: 0.5,
    }),
  )
  mug.position.set(1.4, deskH + 0.05, 0.25)
  g.add(mug)

  return g
}

// オフィスチェア（シンプルなハイバック）
const makeChair = () => {
  const g = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({
    color: 0x141014,
    roughness: 0.55,
  })
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.5), mat)
  seat.position.set(0, 0.48, 0)
  g.add(seat)
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.08), mat)
  back.position.set(0, 0.85, 0.22)
  g.add(back)
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.45, 10),
    new THREE.MeshStandardMaterial({
      color: 0x181418,
      metalness: 0.6,
      roughness: 0.3,
    }),
  )
  stem.position.set(0, 0.22, 0)
  g.add(stem)
  // 5本足
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.03, 0.07),
      new THREE.MeshStandardMaterial({
        color: 0x181418,
        metalness: 0.6,
        roughness: 0.3,
      }),
    )
    leg.position.set(Math.cos(a) * 0.13, 0.04, Math.sin(a) * 0.13)
    leg.rotation.y = a
    g.add(leg)
  }
  return g
}

// --- 配置 ---
// ソファ・コーヒーテーブル・その上の小物・ラグは視覚ノイズが多いので撤去

// 本棚（右壁・開口部を室内向きに）
const bookshelf = makeBookshelf()
bookshelf.position.set(ROOM.w / 2 - 0.22, 0, 2.0)
bookshelf.rotation.y = -Math.PI / 2
scene.add(bookshelf)

// 観葉植物（左奥コーナー・窓際）
const plant = makeBigPlant()
plant.position.set(-5.6, 0, 5.0)
scene.add(plant)

// デスク：窓寄りの中央に。窓向きに正対
const desk = makeDesk()
desk.position.set(0, 0, 4.5)
desk.rotation.y = Math.PI
scene.add(desk)

// チェア（デスクの手前＝カメラ側）
const chair = makeChair()
chair.position.set(0, 0, 3.3)
chair.rotation.y = Math.PI
scene.add(chair)

// 大きな抽象画（左壁）
const art = makeLargeArt()
art.position.set(-ROOM.w / 2 + 0.04, 2.8, -1.5)
art.rotation.y = Math.PI / 2
scene.add(art)

// ラグ

// --- ライティング ---
scene.add(new THREE.AmbientLight(0x909ab0, 0.95))

// 午後5時・やや暖色を帯びた拡散光
const sunLight = new THREE.DirectionalLight(0xf0dcc0, 0.75)
sunLight.position.set(6, 5, 10)
sunLight.target.position.set(-1, 1, -2)
scene.add(sunLight)
scene.add(sunLight.target)

// 窓からの光（夕方に向かう淡い暖色）
const windowGlow = new THREE.PointLight(0xd8b898, 1.0, 12, 1.4)
windowGlow.position.set(0, 2.5, 5)
scene.add(windowGlow)

// コーブライト（窓上・日中は控えめ）
const coveLight = new THREE.RectAreaLight(0xffd8a0, 0.6, WIN.w - 0.4, 0.1)
coveLight.position.set(0, ROOM.h - 0.3, WIN.z - 0.3)
coveLight.rotation.x = -Math.PI / 2
scene.add(coveLight)

// --- アニメーション ---
let last = performance.now()
const animate = () => {
  const now = performance.now()
  const dt = (now - last) / 1000
  last = now

  // 雨
  const posAttr = rainGeo.attributes.position as THREE.BufferAttribute
  const pos = posAttr.array as Float32Array
  const wind = 0.018
  for (let i = 0; i < RAIN_COUNT; i++) {
    const speed = rainSpeeds[i]
    pos[i * 6 + 1] -= speed
    pos[i * 6 + 4] -= speed
    pos[i * 6 + 0] -= wind
    pos[i * 6 + 3] -= wind
    if (pos[i * 6 + 4] < -2) {
      const x = (Math.random() - 0.5) * 32
      const y = 20 + Math.random() * 4
      const len = 0.25 + Math.random() * 0.2
      pos[i * 6 + 0] = x
      pos[i * 6 + 1] = y
      pos[i * 6 + 3] = x - 0.04
      pos[i * 6 + 4] = y - len
    }
  }
  posAttr.needsUpdate = true

  // 矢印キーで視線の上下・左右、スペースで前後ズーム
  if (cameraKeys.up) lookOffset = Math.min(LOOK_MAX, lookOffset + LOOK_SPEED)
  if (cameraKeys.down) lookOffset = Math.max(LOOK_MIN, lookOffset - LOOK_SPEED)
  if (cameraKeys.left) panOffset = Math.min(PAN_MAX, panOffset + PAN_SPEED)
  if (cameraKeys.right) panOffset = Math.max(PAN_MIN, panOffset - PAN_SPEED)
  if (cameraKeys.space) {
    if (cameraKeys.shift)
      zoomOffset = Math.max(ZOOM_MIN, zoomOffset - ZOOM_SPEED)
    else zoomOffset = Math.min(ZOOM_MAX, zoomOffset + ZOOM_SPEED)
  }

  // カメラの微かなスウェイ＋キーによる上下・前後移動
  camera.position.x = Math.sin(now * 0.00018) * 0.18
  camera.position.y = 2.4 + lookOffset + Math.sin(now * 0.00033) * 0.05
  camera.position.z = -4.6 + zoomOffset
  // 上に昇ったらやや下を向き、下に下がったらやや上を向く＋左右に振る
  cameraTarget.x = panOffset
  cameraTarget.y = 2.4 - lookOffset * TARGET_TILT
  camera.lookAt(cameraTarget)

  // 航空障害灯の点滅（ビルの上）
  for (let i = 0; i < aviationLights.length; i++) {
    const av = aviationLights[i]
    const phase = now * 0.002 + i * 0.65
    const on = Math.sin(phase) > 0.2
    const mat = av.material as THREE.MeshBasicMaterial
    mat.transparent = true
    mat.opacity = on ? 1 : 0.1
  }

  composer.render()
  requestAnimationFrame(animate)
}
requestAnimationFrame(animate)

// --- 音楽 ---
const midiToHz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12)

const progression = [
  [50, 53, 57, 60],
  [55, 59, 62, 65],
  [48, 52, 55, 59],
  [57, 60, 64, 67],
]

const pentatonic = [60, 62, 64, 67, 69, 72, 74, 76]

let audioCtx: AudioContext | null = null
let started = false

const makeNoiseBuffer = (ac: AudioContext, seconds: number) => {
  const buf = ac.createBuffer(2, ac.sampleRate * seconds, ac.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch)
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1
    }
  }
  return buf
}

const playPiano = (
  ac: AudioContext,
  dest: AudioNode,
  midi: number,
  startTime: number,
  holdSec: number,
  velocity: number,
) => {
  const freq = midiToHz(midi)
  const out = ac.createGain()
  out.connect(dest)
  const peak = Math.max(velocity, 0.0002)
  out.gain.setValueAtTime(0.0001, startTime)
  out.gain.exponentialRampToValueAtTime(peak, startTime + 0.004)
  out.gain.exponentialRampToValueAtTime(peak * 0.35, startTime + 0.2)
  out.gain.exponentialRampToValueAtTime(
    Math.max(peak * 0.02, 0.0002),
    startTime + holdSec,
  )
  out.gain.exponentialRampToValueAtTime(0.0001, startTime + holdSec + 0.4)

  const harmonics = [1, 2, 3, 4, 5, 6]
  const amps = [1, 0.55, 0.3, 0.18, 0.1, 0.05]
  for (let i = 0; i < harmonics.length; i++) {
    const osc = ac.createOscillator()
    osc.type = "sine"
    osc.frequency.value = freq * harmonics[i]
    const g = ac.createGain()
    g.gain.value = amps[i] * 0.14
    osc.connect(g)
    g.connect(out)
    osc.start(startTime)
    osc.stop(startTime + holdSec + 0.6)
  }
}

const playKick = (ac: AudioContext, dest: AudioNode, start: number) => {
  const osc = ac.createOscillator()
  osc.type = "sine"
  osc.frequency.setValueAtTime(110, start)
  osc.frequency.exponentialRampToValueAtTime(40, start + 0.15)
  const g = ac.createGain()
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(0.4, start + 0.005)
  g.gain.exponentialRampToValueAtTime(0.001, start + 0.22)
  osc.connect(g).connect(dest)
  osc.start(start)
  osc.stop(start + 0.28)
}

const playHat = (
  ac: AudioContext,
  dest: AudioNode,
  noiseBuf: AudioBuffer,
  start: number,
  velocity = 0.08,
) => {
  const src = ac.createBufferSource()
  src.buffer = noiseBuf
  const hp = ac.createBiquadFilter()
  hp.type = "highpass"
  hp.frequency.value = 7000
  const g = ac.createGain()
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(velocity, start + 0.002)
  g.gain.exponentialRampToValueAtTime(0.0001, start + 0.05)
  src.connect(hp)
  hp.connect(g)
  g.connect(dest)
  src.start(start)
  src.stop(start + 0.08)
}

const playSnap = (
  ac: AudioContext,
  dest: AudioNode,
  noiseBuf: AudioBuffer,
  start: number,
) => {
  const src = ac.createBufferSource()
  src.buffer = noiseBuf
  const bp = ac.createBiquadFilter()
  bp.type = "bandpass"
  bp.frequency.value = 2000
  bp.Q.value = 1.5
  const g = ac.createGain()
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(0.12, start + 0.003)
  g.gain.exponentialRampToValueAtTime(0.0001, start + 0.13)
  src.connect(bp)
  bp.connect(g)
  g.connect(dest)
  src.start(start)
  src.stop(start + 0.18)
}

const startAudio = () => {
  if (started) return
  started = true

  audioCtx = new AudioContext()
  const ac = audioCtx

  const master = ac.createGain()
  master.gain.value = 1.55
  master.connect(ac.destination)

  const pianoLP = ac.createBiquadFilter()
  pianoLP.type = "lowpass"
  pianoLP.frequency.value = 3500
  pianoLP.Q.value = 0.5
  pianoLP.connect(master)

  const delay = ac.createDelay()
  delay.delayTime.value = 0.33
  const delayFb = ac.createGain()
  delayFb.gain.value = 0.3
  const delaySend = ac.createGain()
  delaySend.gain.value = 0.22
  pianoLP.connect(delaySend)
  delaySend.connect(delay)
  delay.connect(delayFb)
  delayFb.connect(delay)
  delay.connect(master)

  // ビニールのクラックル（lofi感）
  {
    const vinylSec = 6
    const vinylBuf = ac.createBuffer(1, ac.sampleRate * vinylSec, ac.sampleRate)
    const vData = vinylBuf.getChannelData(0)
    for (let i = 0; i < vData.length; i++) {
      vData[i] = (Math.random() * 2 - 1) * 0.04
      if (Math.random() < 0.0004) {
        vData[i] += (Math.random() * 2 - 1) * 0.6
      }
    }
    const vinylSrc = ac.createBufferSource()
    vinylSrc.buffer = vinylBuf
    vinylSrc.loop = true
    const vinylHP = ac.createBiquadFilter()
    vinylHP.type = "highpass"
    vinylHP.frequency.value = 1800
    const vinylGain = ac.createGain()
    vinylGain.gain.value = 0.11
    vinylSrc.connect(vinylHP)
    vinylHP.connect(vinylGain)
    vinylGain.connect(master)
    vinylSrc.start()
  }

  // 雨のノイズ（ごく控えめ）
  const rainBuf = makeNoiseBuffer(ac, 2)
  const rainSrc = ac.createBufferSource()
  rainSrc.buffer = rainBuf
  rainSrc.loop = true
  const rainHP = ac.createBiquadFilter()
  rainHP.type = "highpass"
  rainHP.frequency.value = 900
  const rainLPf = ac.createBiquadFilter()
  rainLPf.type = "lowpass"
  rainLPf.frequency.value = 4800
  const rainGain = ac.createGain()
  rainGain.gain.value = 0.012
  rainSrc.connect(rainHP)
  rainHP.connect(rainLPf)
  rainLPf.connect(rainGain)
  rainGain.connect(master)
  rainSrc.start()

  const lfo = ac.createOscillator()
  lfo.frequency.value = 0.07
  const lfoGain = ac.createGain()
  lfoGain.gain.value = 0.004
  lfo.connect(lfoGain)
  lfoGain.connect(rainGain.gain)
  lfo.start()

  const barDur = 4
  let nextTime = ac.currentTime + 0.3
  let index = 0

  const scheduleBar = (chord: number[], startBar: number) => {
    playPiano(ac, pianoLP, chord[0] - 12, startBar, barDur * 1.1, 0.32)

    const pattern = [0, 2, 1, 3, 2]
    const noteSpace = barDur / pattern.length
    for (let i = 0; i < pattern.length; i++) {
      const midi = chord[pattern[i]]
      const humanize = (Math.random() - 0.5) * 0.04
      const vel = 0.22 + Math.random() * 0.06
      playPiano(
        ac,
        pianoLP,
        midi,
        startBar + i * noteSpace + humanize,
        2.4,
        vel,
      )
    }

    if (Math.random() < 0.7) {
      const melodyCount = 1 + Math.floor(Math.random() * 2)
      for (let i = 0; i < melodyCount; i++) {
        const t = startBar + 0.4 + Math.random() * (barDur - 0.8)
        const midi = pentatonic[Math.floor(Math.random() * pentatonic.length)]
        playPiano(ac, pianoLP, midi, t, 1.8, 0.2 + Math.random() * 0.08)
      }
    }
  }

  const schedule = () => {
    if (!audioCtx) return
    const now = audioCtx.currentTime
    while (nextTime < now + 8) {
      const chord = progression[index % progression.length]
      scheduleBar(chord, nextTime)
      nextTime += barDur
      index++
    }
  }

  schedule()
  setInterval(schedule, 1500)
}

$start.addEventListener("click", () => {
  startAudio()
  $start.classList.add("hidden")
})
