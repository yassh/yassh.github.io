import * as THREE from "https://esm.sh/three@0.150.1"

// --- 要素 ---
const $canvas = document.getElementById("scene")
const $start = document.getElementById("start")
const $clock = document.getElementById("clock")

// --- レンダラ ---
const renderer = new THREE.WebGLRenderer({ canvas: $canvas, antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.outputEncoding = THREE.sRGBEncoding
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.1

// --- シーン ---
const scene = new THREE.Scene()
scene.fog = new THREE.FogExp2(0xbcd3e0, 0.012)

const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 400)
camera.position.set(0, 1.6, 2)
camera.rotation.order = "YXZ"

// --- ゲーム開始（AudioContext の解放） ---
let gameActive = false
$start.addEventListener("click", () => {
  if (gameActive) return
  gameActive = true
  startAudio()
  document.body.classList.add("locked")
  $start.classList.add("hidden")
  $start.blur()
})

// --- リサイズ ---
const resize = () => {
  const w = window.innerWidth
  const h = window.innerHeight
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}
resize()
window.addEventListener("resize", resize)

// --- 島（ひょうたん型：メイン楕円 + 桟橋と反対側の小島） ---
const ISLAND_A = 26 // メイン島 X 方向（長手）
const ISLAND_B = 13 // メイン島 Z 方向（短手）
const SMALL_ISLAND_A = 10 // 小島 X 半径
const SMALL_ISLAND_B = 7 // 小島 Z 半径
// 小島中心：桟橋と反対方向（-campFwd ≈ (-0.165, -0.986)）に、メインと 2m ほど重なる距離
const SMALL_ISLAND_CX = -3.0
const SMALL_ISLAND_CZ = -17.94

// 任意の楕円の中心からの正規化距離
const ellipseU = (x, z, cx, cz, a, b) => Math.hypot((x - cx) / a, (z - cz) / b)

// ひょうたんの両葉を合わせた最小正規化半径（=1 が汀線、どちらかに入っていれば walkable）
const islandNormR = (x, z) =>
  Math.min(
    ellipseU(x, z, 0, 0, ISLAND_A, ISLAND_B),
    ellipseU(
      x,
      z,
      SMALL_ISLAND_CX,
      SMALL_ISLAND_CZ,
      SMALL_ISLAND_A,
      SMALL_ISLAND_B,
    ),
  )

// 片側の島の標高寄与（falloff * maxH + 起伏）
const islandHeightAt = (x, z, cx, cz, a, b, maxH) => {
  const u = ellipseU(x, z, cx, cz, a, b)
  if (u >= 1) return 0
  const falloff = 1 - u
  const bump =
    Math.sin(x * 0.28 + 1.3) * 0.18 +
    Math.cos(z * 0.55 - 0.4) * 0.13 +
    Math.sin((x * 0.5 + z) * 0.2 + 0.7) * 0.1
  return maxH * falloff + bump * falloff
}

// 両島の最大値を採用（重なった部分は滑らかに繋がる）
const islandHeight = (x, z) =>
  Math.max(
    islandHeightAt(x, z, 0, 0, ISLAND_A, ISLAND_B, 0.55),
    islandHeightAt(
      x,
      z,
      SMALL_ISLAND_CX,
      SMALL_ISLAND_CZ,
      SMALL_ISLAND_A,
      SMALL_ISLAND_B,
      0.4,
    ),
  )

// 楕円状の島メッシュを作る共通関数
const makeIslandMesh = (a, b, cx, cz, segments) => {
  const geom = new THREE.CircleGeometry(1, segments)
  const pos = geom.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const ux = pos.getX(i)
    const uy = pos.getY(i)
    // CircleGeometry は XY 平面。rotation.x=-π/2 で worldZ = -geomY
    const wx = cx + ux * a
    const wz = cz + -uy * b
    pos.setX(i, ux * a)
    pos.setY(i, uy * b)
    pos.setZ(i, islandHeight(wx, wz))
  }
  pos.needsUpdate = true
  geom.computeVertexNormals()
  const mat = new THREE.MeshStandardMaterial({
    color: 0xe6d4a8,
    roughness: 1.0,
    metalness: 0.0,
  })
  const mesh = new THREE.Mesh(geom, mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(cx, 0, cz)
  return mesh
}
const island = makeIslandMesh(ISLAND_A, ISLAND_B, 0, 0, 160)
scene.add(island)
const smallIsland = makeIslandMesh(
  SMALL_ISLAND_A,
  SMALL_ISLAND_B,
  SMALL_ISLAND_CX,
  SMALL_ISLAND_CZ,
  128,
)
scene.add(smallIsland)

// 汀線の湿った砂（両方の楕円）
const makeShoreRing = (a, b, cx, cz, segments) => {
  const outer = new THREE.Shape()
  const inner = new THREE.Path()
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2
    const ox = Math.cos(t) * a
    const oy = Math.sin(t) * b
    if (i === 0) outer.moveTo(ox, oy)
    else outer.lineTo(ox, oy)
  }
  const inset = 1.2
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2
    const ix = Math.cos(t) * (a - inset)
    const iy = Math.sin(t) * (b - inset)
    if (i === 0) inner.moveTo(ix, iy)
    else inner.lineTo(ix, iy)
  }
  outer.holes.push(inner)
  const ring = new THREE.Mesh(
    new THREE.ShapeGeometry(outer, segments),
    new THREE.MeshStandardMaterial({
      color: 0xb89770,
      roughness: 1.0,
      transparent: true,
      opacity: 0.85,
    }),
  )
  ring.rotation.x = -Math.PI / 2
  ring.position.set(cx, 0.005, cz)
  return ring
}
scene.add(makeShoreRing(ISLAND_A, ISLAND_B, 0, 0, 160))
scene.add(
  makeShoreRing(
    SMALL_ISLAND_A,
    SMALL_ISLAND_B,
    SMALL_ISLAND_CX,
    SMALL_ISLAND_CZ,
    128,
  ),
)

// --- 海 ---
const SEA_SIZE = 200
const seaSegments = 96
const seaGeom = new THREE.PlaneGeometry(
  SEA_SIZE,
  SEA_SIZE,
  seaSegments,
  seaSegments,
)
const seaMat = new THREE.MeshStandardMaterial({
  color: 0x2a6b86,
  roughness: 0.5,
  metalness: 0.15,
  transparent: true,
  opacity: 0.92,
})
const sea = new THREE.Mesh(seaGeom, seaMat)
sea.rotation.x = -Math.PI / 2
sea.position.y = -0.35
scene.add(sea)

// --- 空（半球ドーム） ---
const skyGeom = new THREE.SphereGeometry(
  220,
  24,
  18,
  0,
  Math.PI * 2,
  0,
  Math.PI / 2,
)
const skyMat = new THREE.MeshBasicMaterial({
  color: 0x88b4d6,
  side: THREE.BackSide,
  fog: false,
  depthWrite: false,
  toneMapped: false, // ACES で desaturate されないよう素の色を保つ
})
const sky = new THREE.Mesh(skyGeom, skyMat)
scene.add(sky)

// 月・太陽のビルボード（天球内側に貼る円盤）
const sunDisc = new THREE.Mesh(
  new THREE.CircleGeometry(4, 24),
  new THREE.MeshBasicMaterial({
    color: 0xfff6db,
    fog: false,
    transparent: true,
    opacity: 0.95,
    toneMapped: false,
  }),
)
scene.add(sunDisc)

// --- ライト ---
const sunLight = new THREE.DirectionalLight(0xffe8c6, 1.0)
scene.add(sunLight)

const hemi = new THREE.HemisphereLight(0xcfe6ff, 0xc9ae78, 0.55)
scene.add(hemi)

// --- ラジカセ ---
const boombox = new THREE.Group()
{
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x1a1f2a,
    roughness: 0.55,
  })
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.4, 0.28), bodyMat)
  body.position.y = 0.2
  boombox.add(body)
  // スピーカー x2
  for (const dx of [-0.22, 0.22]) {
    const outer = new THREE.Mesh(
      new THREE.CircleGeometry(0.11, 24),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 }),
    )
    outer.position.set(dx, 0.2, 0.141)
    boombox.add(outer)
    const inner = new THREE.Mesh(
      new THREE.CircleGeometry(0.055, 20),
      new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.7 }),
    )
    inner.position.set(dx, 0.2, 0.142)
    boombox.add(inner)
  }
  // 中央のカセットデッキ窓
  const deck = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.12),
    new THREE.MeshStandardMaterial({
      color: 0x302820,
      roughness: 0.4,
      metalness: 0.3,
    }),
  )
  deck.position.set(0, 0.2, 0.141)
  boombox.add(deck)
  // 再生ランプ（音楽 ON でテープ色に光る）
  const lamp = new THREE.Mesh(
    new THREE.CircleGeometry(0.022, 16),
    new THREE.MeshBasicMaterial({ color: 0x330000 }),
  )
  lamp.position.set(0, 0.33, 0.141)
  lamp.name = "lamp"
  boombox.add(lamp)
  // アンテナ
  const ant = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.006, 0.38, 6),
    new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.3 }),
  )
  ant.position.set(0.3, 0.56, -0.1)
  ant.rotation.z = -0.3
  boombox.add(ant)
  // ハンドル
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.19, 0.02, 6, 20, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5 }),
  )
  handle.position.set(0, 0.44, 0)
  handle.rotation.x = Math.PI / 2
  boombox.add(handle)
}
const boomboxPos = { x: 0.9, z: -1.6 }
boombox.position.set(
  boomboxPos.x,
  islandHeight(boomboxPos.x, boomboxPos.z),
  boomboxPos.z,
)
boombox.rotation.y = -0.4
boombox.scale.setScalar(0.78)
scene.add(boombox)

// --- 景物（ヤシ・草・流木・貝殻） ---
// シード付き PRNG（毎回同じ配置）
const mulberry32 = (seed) => {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20260424)

const scenery = new THREE.Group()
scene.add(scenery)

// プレイヤー初期位置とラジカセ・キャンプサイトの周りは空けておく
const campPos = { x: 0, z: 0 } // 島の中心
// 以前の向き（atan2(-9, 1.5)）から 90° 回した角度
const campRotY = Math.atan2(-9, 1.5) + Math.PI / 2
// チェアの正面ベクトル（local +Z を campRotY 回転）
const campFwdX = Math.sin(campRotY)
const campFwdZ = Math.cos(campRotY)
const occupied = [
  { x: 0, z: 2, r: 1.2 }, // 初期視界
  { x: boomboxPos.x, z: boomboxPos.z, r: 1.1 },
  { x: campPos.x, z: campPos.z, r: 2.8 }, // タープ＋チェアの敷地
]
// チェアの正面側に景物が生えないよう視線コリドーを確保
for (const d of [3.2, 5.8, 8.4]) {
  occupied.push({
    x: campPos.x + campFwdX * d,
    z: campPos.z + campFwdZ * d,
    r: 2.1,
  })
}

// --- タープ＋リクライニングチェア（キャンプサイト） ---
const camp = new THREE.Group()
{
  // タープのポール（前が高く後が低い一枚葺き）
  const poleMat = new THREE.MeshStandardMaterial({
    color: 0xaaaaaa,
    roughness: 0.4,
    metalness: 0.4,
  })
  const polePts = [
    { x: -1.9, z: -1.2, h: 3.1 }, // 前左
    { x: 1.9, z: -1.2, h: 3.1 }, // 前右
    { x: 1.9, z: 1.2, h: 2.2 }, // 後右
    { x: -1.9, z: 1.2, h: 2.2 }, // 後左
  ]
  for (const p of polePts) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, p.h, 8),
      poleMat,
    )
    pole.position.set(p.x, p.h / 2, p.z)
    camp.add(pole)
  }
  // 屋根の布（4 角を各ポールの頂点に、中心をやや下げてサグ感）
  const canvasGeom = new THREE.BufferGeometry()
  const midY = (polePts[0].h + polePts[2].h) / 2 - 0.2
  const verts = new Float32Array([
    polePts[0].x,
    polePts[0].h,
    polePts[0].z,
    polePts[1].x,
    polePts[1].h,
    polePts[1].z,
    polePts[2].x,
    polePts[2].h,
    polePts[2].z,
    polePts[3].x,
    polePts[3].h,
    polePts[3].z,
    0,
    midY,
    0,
  ])
  canvasGeom.setAttribute("position", new THREE.BufferAttribute(verts, 3))
  canvasGeom.setIndex([0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4])
  canvasGeom.computeVertexNormals()
  const canvas = new THREE.Mesh(
    canvasGeom,
    new THREE.MeshStandardMaterial({
      color: 0xd4c4a0,
      roughness: 0.88,
      side: THREE.DoubleSide,
    }),
  )
  camp.add(canvas)
  // 張り綱（各ポール頂点から外向きの地面に伸ばす）
  const ropeMat = new THREE.LineBasicMaterial({ color: 0xd8cc9e })
  for (const p of polePts) {
    const sx = Math.sign(p.x) || 1
    const sz = Math.sign(p.z) || 1
    const rope = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(p.x, p.h, p.z),
      new THREE.Vector3(p.x + sx * 0.9, 0.02, p.z + sz * 0.9),
    ])
    camp.add(new THREE.Line(rope, ropeMat))
  }

  // リクライニングチェア（タープの下中央、前方をやや向く）
  const chair = new THREE.Group()
  const fabricMat = new THREE.MeshStandardMaterial({
    color: 0x365574,
    roughness: 0.85,
  })
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.5,
    metalness: 0.4,
  })
  // 座面
  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(0.58, 0.06, 0.62),
    fabricMat,
  )
  seat.position.y = 0.36
  chair.add(seat)
  // 背もたれ（後傾）
  const backPivot = new THREE.Group()
  backPivot.position.set(0, 0.38, -0.28)
  backPivot.rotation.x = -0.45
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(0.58, 0.72, 0.06),
    fabricMat,
  )
  back.position.y = 0.36
  backPivot.add(back)
  chair.add(backPivot)
  // フットレスト（前方に伸ばす）
  const footPivot = new THREE.Group()
  footPivot.position.set(0, 0.36, 0.3)
  footPivot.rotation.x = 0.25
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.05, 0.4), fabricMat)
  foot.position.z = 0.2
  footPivot.add(foot)
  chair.add(footPivot)
  // 脚 4 本
  for (const dx of [-0.27, 0.27]) {
    for (const dz of [-0.28, 0.28]) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.36, 6),
        frameMat,
      )
      leg.position.set(dx, 0.18, dz)
      chair.add(leg)
    }
  }
  // 肘掛け
  for (const dx of [-0.31, 0.31]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.5), frameMat)
    arm.position.set(dx, 0.55, -0.04)
    chair.add(arm)
  }
  chair.position.set(0, 0, 0.1)
  camp.add(chair)
}
camp.position.set(campPos.x, islandHeight(campPos.x, campPos.z), campPos.z)
camp.rotation.y = campRotY
scene.add(camp)

// --- 桟橋（チェアの正面方向に 20m 突き出す） ---
const PIER_LEN = 20
const PIER_WIDTH = 1.6
const PIER_Y = 0.3

// チェアの正面（+campFwd）方向
const pierDirX = campFwdX
const pierDirZ = campFwdZ
const pierRotY = campRotY

// 中心から pierDir 方向に汀線までの距離
const tShore = 1 / Math.hypot(pierDirX / ISLAND_A, pierDirZ / ISLAND_B)
const pierStartT = tShore - 1.5 // 汀線より 1.5m 内陸から始める
const pierBaseX = pierStartT * pierDirX
const pierBaseZ = pierStartT * pierDirZ
const pierCos = Math.cos(pierRotY)
const pierSin = Math.sin(pierRotY)

// 世界座標 (wx, wz) が桟橋の矩形上にあるか
const onPier = (wx, wz) => {
  // pier ローカル座標に戻す（pier.rotation.y = pierRotY の逆変換）
  const dx = wx - pierBaseX
  const dz = wz - pierBaseZ
  const lx = dx * pierCos - dz * pierSin
  const lz = dx * pierSin + dz * pierCos
  return Math.abs(lx) <= PIER_WIDTH / 2 && lz >= 0 && lz <= PIER_LEN
}

const pier = new THREE.Group()
{
  const deckMat = new THREE.MeshStandardMaterial({
    color: 0x8c6e42,
    roughness: 0.9,
  })
  const postMat = new THREE.MeshStandardMaterial({
    color: 0x5a3a1e,
    roughness: 0.95,
  })
  // 板張り（4 本の細長い板で隙間を表現）
  const planks = 4
  for (let i = 0; i < planks; i++) {
    const plankW = (PIER_WIDTH - 0.08) / planks
    const x = -PIER_WIDTH / 2 + 0.04 + plankW / 2 + i * plankW
    const plank = new THREE.Mesh(
      new THREE.BoxGeometry(plankW - 0.02, 0.06, PIER_LEN),
      deckMat,
    )
    plank.position.set(x, PIER_Y, PIER_LEN / 2)
    pier.add(plank)
  }
  // 縁の梁（両側）
  for (const xOff of [-PIER_WIDTH / 2 + 0.02, PIER_WIDTH / 2 - 0.02]) {
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.08, PIER_LEN),
      postMat,
    )
    beam.position.set(xOff, PIER_Y - 0.01, PIER_LEN / 2)
    pier.add(beam)
  }
  // 支柱（両側に等間隔）
  const nPiles = 9
  for (let i = 0; i < nPiles; i++) {
    const z = (i + 0.5) * (PIER_LEN / nPiles)
    for (const xOff of [-PIER_WIDTH / 2, PIER_WIDTH / 2]) {
      const pile = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 1.8, 8),
        postMat,
      )
      pile.position.set(xOff, PIER_Y - 0.9, z)
      pier.add(pile)
    }
  }
  // 先端の係留杭（ボラード）
  for (const xOff of [-PIER_WIDTH / 2, PIER_WIDTH / 2]) {
    const bollard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.7, 8),
      postMat,
    )
    bollard.position.set(xOff, PIER_Y + 0.35, PIER_LEN - 0.3)
    pier.add(bollard)
  }
}
pier.position.set(pierBaseX, 0, pierBaseZ)
pier.rotation.y = pierRotY
scene.add(pier)

// --- 小舟（桟橋の先端に係留） ---
const BOAT_LEN = 3.0
const BOAT_WIDTH = 1.1
const BOAT_DECK_Y = 0.08 // 船内の床の高さ（ boat.position.y 基準）
const BOAT_WATER_BASE_Y = -0.2 // 静水面付近（波・潮位で上下する）
// 桟橋ローカル座標での小舟中心
const boatLocalX = -(PIER_WIDTH / 2 + BOAT_WIDTH / 2 + 0.15) // 左舷側、隙間 0.15m
const boatLocalZ = PIER_LEN - 1.2

const boat = new THREE.Group()
{
  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x8a6b3f,
    roughness: 0.9,
  })
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x5f4322,
    roughness: 0.85,
  })
  const seatMat = new THREE.MeshStandardMaterial({
    color: 0x705236,
    roughness: 0.9,
  })
  // 船体：球をスケールしてボウル状に（上が開いたお椀）
  const hullGeom = new THREE.SphereGeometry(
    1,
    24,
    14,
    0,
    Math.PI * 2,
    Math.PI / 2.3, // phiStart（= 上を削って開口）
    Math.PI / 2.1, // phiLength（下端付近まで）
  )
  const hull = new THREE.Mesh(hullGeom, hullMat)
  hull.scale.set(BOAT_WIDTH / 2, 0.45, BOAT_LEN / 2)
  boat.add(hull)
  // 舷側の帯（リム）
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 8, 32), trimMat)
  rim.rotation.x = -Math.PI / 2
  rim.scale.set(BOAT_WIDTH / 2, BOAT_LEN / 2, 1)
  rim.position.y = 0.12
  boat.add(rim)
  // 船内の床（歩ける平面）
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(BOAT_WIDTH * 0.7, 0.03, BOAT_LEN * 0.85),
    seatMat,
  )
  floor.position.y = BOAT_DECK_Y
  boat.add(floor)
  // 座板（thwart）3 枚
  for (const zOff of [-0.8, 0, 0.8]) {
    const thwart = new THREE.Mesh(
      new THREE.BoxGeometry(BOAT_WIDTH * 0.8, 0.04, 0.18),
      seatMat,
    )
    thwart.position.set(0, BOAT_DECK_Y + 0.12, zOff)
    boat.add(thwart)
  }
  // 係留用クリート（小さな突起）
  const cleat = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.06, 8),
    trimMat,
  )
  cleat.position.set(BOAT_WIDTH / 2 - 0.05, 0.14, 0.1)
  boat.add(cleat)
}
boat.position.set(boatLocalX, BOAT_WATER_BASE_Y, boatLocalZ)
pier.add(boat)

// --- 係留ロープ（ボラード → 小舟のクリート、ゆるくたわませて表示） ---
const ROPE_PIER_X = -PIER_WIDTH / 2
const ROPE_PIER_Y = PIER_Y + 0.7 // ボラード上端
const ROPE_PIER_Z = PIER_LEN - 0.3
// クリートのおおよその pier-local 座標（静止状態）
const ROPE_BOAT_X = boatLocalX + BOAT_WIDTH / 2 - 0.05
const ROPE_BOAT_Y = BOAT_WATER_BASE_Y + 0.14
const ROPE_BOAT_Z = boatLocalZ + 0.1
const ropePts = [
  new THREE.Vector3(ROPE_PIER_X, ROPE_PIER_Y, ROPE_PIER_Z),
  new THREE.Vector3(
    (ROPE_PIER_X + ROPE_BOAT_X) / 2,
    (ROPE_PIER_Y + ROPE_BOAT_Y) / 2 - 0.15, // たわみ
    (ROPE_PIER_Z + ROPE_BOAT_Z) / 2,
  ),
  new THREE.Vector3(ROPE_BOAT_X, ROPE_BOAT_Y, ROPE_BOAT_Z),
]
const ropeGeom = new THREE.BufferGeometry().setFromPoints(ropePts)
const rope = new THREE.Line(
  ropeGeom,
  new THREE.LineBasicMaterial({ color: 0xd8cc9e }),
)
pier.add(rope)

// キャンプから桟橋に至る動線に景物が生えないようコリドーを確保
for (const d of [3.2, 5.8, 8.4, 11.0, 12.8]) {
  occupied.push({
    x: campPos.x + pierDirX * d,
    z: campPos.z + pierDirZ * d,
    r: 1.8,
  })
}

// 世界座標 (wx, wz) が小舟の矩形上にあるか
const onBoat = (wx, wz) => {
  const dx = wx - pierBaseX
  const dz = wz - pierBaseZ
  const lx = dx * pierCos - dz * pierSin
  const lz = dx * pierSin + dz * pierCos
  return (
    Math.abs(lx - boatLocalX) <= BOAT_WIDTH / 2 - 0.1 &&
    Math.abs(lz - boatLocalZ) <= BOAT_LEN / 2 - 0.2
  )
}

// --- 焚き火ゾーン（タープの右手。クリックで点火／消火） ---
// camp ローカル -X 方向（プレイヤーから見たタープの右側）
const fireSideX = -Math.cos(campRotY)
const fireSideZ = Math.sin(campRotY)
const firePos = {
  x: campPos.x + fireSideX * 5.2,
  z: campPos.z + fireSideZ * 5.2,
}
occupied.push({ x: firePos.x, z: firePos.z, r: 1.5 })

const firePit = new THREE.Group()
{
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x6e6862,
    roughness: 0.95,
  })
  // 石を円形にリング状に配置
  const nStones = 7
  for (let i = 0; i < nStones; i++) {
    const a = (i / nStones) * Math.PI * 2 + rand() * 0.2
    const r = 0.5 + (rand() - 0.5) * 0.05
    const size = 0.15 + rand() * 0.06
    const stone = new THREE.Mesh(
      new THREE.DodecahedronGeometry(size, 0),
      stoneMat,
    )
    // 地面から 3/4 くらいが出るように、少しだけ埋める
    stone.position.set(Math.cos(a) * r, size * 0.75, Math.sin(a) * r)
    stone.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI)
    firePit.add(stone)
  }
  // 灰（中央の黒い円）
  const ash = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 24),
    new THREE.MeshStandardMaterial({ color: 0x1b1714, roughness: 1.0 }),
  )
  ash.rotation.x = -Math.PI / 2
  ash.position.y = 0.008
  firePit.add(ash)
  // 薪 2 本を X 字に
  const logMat = new THREE.MeshStandardMaterial({
    color: 0x5a3a1e,
    roughness: 0.95,
  })
  for (let i = 0; i < 2; i++) {
    const log = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.8, 8),
      logMat,
    )
    // 横倒し（+Z で lay flat）→ 水平面内で yaw させて X 字に
    log.rotation.z = Math.PI / 2
    log.rotation.y = (i === 0 ? 1 : -1) * (Math.PI / 6)
    log.position.y = 0.12 + i * 0.05 // 上下に少しずらして交差を見せる
    firePit.add(log)
  }
}
firePit.position.set(firePos.x, islandHeight(firePos.x, firePos.z), firePos.z)
scene.add(firePit)

// 炎（消灯時は hidden）
const flame = new THREE.Group()
flame.visible = false
{
  const makeCone = (h, r, color, opacity) =>
    new THREE.Mesh(
      new THREE.ConeGeometry(r, h, 8),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        fog: false,
      }),
    )
  const outer = makeCone(0.95, 0.24, 0xff7020, 0.55)
  outer.position.y = 0.47
  flame.add(outer)
  const mid = makeCone(0.7, 0.15, 0xffa838, 0.8)
  mid.position.y = 0.4
  flame.add(mid)
  const inner = makeCone(0.45, 0.08, 0xffe070, 0.95)
  inner.position.y = 0.33
  flame.add(inner)
}
flame.position.set(
  firePos.x,
  islandHeight(firePos.x, firePos.z) + 0.08,
  firePos.z,
)
scene.add(flame)

// 焚き火の光源
const fireLight = new THREE.PointLight(0xff9838, 0, 10, 1.6)
fireLight.position.set(
  firePos.x,
  islandHeight(firePos.x, firePos.z) + 0.6,
  firePos.z,
)
scene.add(fireLight)

let fireOn = false
const toggleFire = () => {
  fireOn = !fireOn
  flame.visible = fireOn
  fireLight.intensity = fireOn ? 2.6 : 0
}

// 楕円上に配置。minU/maxU は正規化半径 [0,1]（= 汀線）
const scatter = (
  count,
  minU,
  maxU,
  clearRadius,
  build,
  a = ISLAND_A,
  b = ISLAND_B,
  cx = 0,
  cz = 0,
) => {
  let placed = 0
  let tries = 0
  while (placed < count && tries < count * 40) {
    tries++
    const ang = rand() * Math.PI * 2
    const u = Math.sqrt(minU * minU + rand() * (maxU * maxU - minU * minU))
    const x = cx + Math.cos(ang) * a * u
    const z = cz + Math.sin(ang) * b * u
    let ok = true
    for (const o of occupied) {
      if (Math.hypot(x - o.x, z - o.z) < o.r + clearRadius) {
        ok = false
        break
      }
    }
    if (!ok) continue
    const obj = build()
    obj.position.set(x, islandHeight(x, z), z)
    scenery.add(obj)
    occupied.push({ x, z, r: clearRadius })
    placed++
  }
}

// ヤシの木
const trunkMat = new THREE.MeshStandardMaterial({
  color: 0x5a3d22,
  roughness: 0.9,
})
const leafMat = new THREE.MeshStandardMaterial({
  color: 0x3a6a2a,
  roughness: 0.8,
  side: THREE.DoubleSide,
})
const coconutMat = new THREE.MeshStandardMaterial({
  color: 0x3b2515,
  roughness: 0.9,
})
const buildPalm = () => {
  const tree = new THREE.Group()
  // 背の低い若木から大木までばらつかせる
  const h = 2.4 + rand() * 5.0 // 2.4 〜 7.4m
  const scale = h / 4.0
  // 幹の太さは高さに対して非線形に太くする（大きな木ほどどっしり）
  const trunkMul = Math.pow(scale, 1.35)
  const tilt = (rand() - 0.5) * 0.3
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09 * trunkMul, 0.14 * trunkMul, h, 10),
    trunkMat,
  )
  trunk.position.y = h / 2
  trunk.rotation.z = tilt
  tree.add(trunk)
  const leafCount = 6 + Math.floor(rand() * 4)
  const leafLen = (1.6 + rand() * 1.0) * Math.max(0.85, Math.sqrt(scale))
  const leafW = (0.34 + rand() * 0.14) * Math.max(0.85, Math.sqrt(scale))
  for (let i = 0; i < leafCount; i++) {
    const leaf = new THREE.Mesh(
      new THREE.PlaneGeometry(leafLen, leafW),
      leafMat,
    )
    const a = (i / leafCount) * Math.PI * 2
    const ringR = 0.55 * Math.max(0.8, scale)
    leaf.position.set(Math.cos(a) * ringR, h - 0.08, Math.sin(a) * ringR)
    leaf.rotation.y = -a
    leaf.rotation.z = -0.35 - rand() * 0.25
    tree.add(leaf)
  }
  // 椰子の実（葉の付け根に房状にいくつか）
  // 若木にはつけない。それ以外は 6〜7 割でつける
  if (scale > 0.7 && rand() < 0.7) {
    const nCoco = 3 + Math.floor(rand() * 4) // 3〜6 個
    const cocoR = 0.07 * Math.max(0.9, scale) // 実の半径
    const clusterR = 0.16 * Math.max(0.9, scale) // 幹まわりの房半径
    const cocoY = h - 0.2
    const baseAng = rand() * Math.PI * 2
    for (let i = 0; i < nCoco; i++) {
      const a = baseAng + i * ((Math.PI * 2) / nCoco) + (rand() - 0.5) * 0.3
      const r = clusterR * (0.85 + rand() * 0.25)
      const coco = new THREE.Mesh(
        new THREE.SphereGeometry(cocoR, 8, 6),
        coconutMat,
      )
      coco.position.set(
        Math.cos(a) * r,
        cocoY + (rand() - 0.5) * 0.06,
        Math.sin(a) * r,
      )
      coco.scale.y = 1.1 // 少し縦長にしてそれらしく
      tree.add(coco)
    }
  }
  tree.rotation.y = rand() * Math.PI * 2
  return tree
}
scatter(22, 0.16, 0.86, 1.9, buildPalm)

// 地面に落ちた椰子の実
const buildFallenCoconut = () => {
  const coco = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), coconutMat)
  coco.scale.set(1, 0.95, 1.05)
  coco.position.y = 0.08
  coco.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI)
  return coco
}
scatter(8, 0.2, 0.82, 0.28, buildFallenCoconut)

// 流木（海寄りに）
const woodMat = new THREE.MeshStandardMaterial({
  color: 0x6b5436,
  roughness: 1.0,
})
const buildDriftwood = () => {
  const len = 0.6 + rand() * 0.9
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.06, len, 6),
    woodMat,
  )
  m.rotation.z = Math.PI / 2 + (rand() - 0.5) * 0.35
  m.rotation.y = rand() * Math.PI * 2
  m.position.y = 0.06
  return m
}
scatter(16, 0.55, 0.92, 0.7, buildDriftwood)

// 草むら
const grassMat = new THREE.MeshStandardMaterial({
  color: 0x4a7a34,
  roughness: 0.9,
  side: THREE.DoubleSide,
})
const grassMatTall = new THREE.MeshStandardMaterial({
  color: 0x648c3a,
  roughness: 0.9,
  side: THREE.DoubleSide,
})
const buildGrass = () => {
  const g = new THREE.Group()
  const n = 3 + Math.floor(rand() * 4)
  const tall = rand() < 0.25
  const mat = tall ? grassMatTall : grassMat
  for (let i = 0; i < n; i++) {
    const hh = (tall ? 0.28 : 0.14) + rand() * 0.14
    const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.05, hh), mat)
    blade.position.set((rand() - 0.5) * 0.2, hh / 2, (rand() - 0.5) * 0.2)
    blade.rotation.y = rand() * Math.PI
    blade.rotation.z = (rand() - 0.5) * 0.45
    g.add(blade)
  }
  return g
}
scatter(220, 0.08, 0.86, 0.35, buildGrass)

// 貝殻っぽい小さな白い粒（汀線寄り）
const shellMat = new THREE.MeshStandardMaterial({
  color: 0xf0e6d4,
  roughness: 0.8,
})
const buildShell = () => {
  const s = 0.04 + rand() * 0.04
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), shellMat)
  m.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI)
  m.scale.set(1, 0.5, 1)
  m.position.y = s * 0.3
  return m
}
scatter(65, 0.66, 0.94, 0.12, buildShell)

// --- 小島にも景物を配置 ---
scatter(
  6,
  0.15,
  0.85,
  1.9,
  buildPalm,
  SMALL_ISLAND_A,
  SMALL_ISLAND_B,
  SMALL_ISLAND_CX,
  SMALL_ISLAND_CZ,
)
scatter(
  4,
  0.5,
  0.9,
  0.7,
  buildDriftwood,
  SMALL_ISLAND_A,
  SMALL_ISLAND_B,
  SMALL_ISLAND_CX,
  SMALL_ISLAND_CZ,
)
scatter(
  80,
  0.08,
  0.86,
  0.35,
  buildGrass,
  SMALL_ISLAND_A,
  SMALL_ISLAND_B,
  SMALL_ISLAND_CX,
  SMALL_ISLAND_CZ,
)
scatter(
  25,
  0.66,
  0.94,
  0.12,
  buildShell,
  SMALL_ISLAND_A,
  SMALL_ISLAND_B,
  SMALL_ISLAND_CX,
  SMALL_ISLAND_CZ,
)
scatter(
  4,
  0.2,
  0.8,
  0.28,
  buildFallenCoconut,
  SMALL_ISLAND_A,
  SMALL_ISLAND_B,
  SMALL_ISLAND_CX,
  SMALL_ISLAND_CZ,
)

// --- 入力 ---
// ←→ 視点左右、↑↓ 視点上下、WASD で移動、Shift で走る、Space で前進、Shift+Space で後退
const keys = {
  lookLeft: false,
  lookRight: false,
  lookUp: false,
  lookDown: false,
  fwd: false,
  back: false,
  strafeL: false,
  strafeR: false,
  run: false,
  space: false,
}
const PREVENT_DEFAULT = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Space",
])
window.addEventListener("keydown", (e) => {
  if (PREVENT_DEFAULT.has(e.code)) e.preventDefault()
  if (e.code === "ArrowLeft") keys.lookLeft = true
  else if (e.code === "ArrowRight") keys.lookRight = true
  else if (e.code === "ArrowUp") keys.lookUp = true
  else if (e.code === "ArrowDown") keys.lookDown = true
  else if (e.code === "KeyW") keys.fwd = true
  else if (e.code === "KeyS") keys.back = true
  else if (e.code === "KeyA") keys.strafeL = true
  else if (e.code === "KeyD") keys.strafeR = true
  else if (e.code === "ShiftLeft" || e.code === "ShiftRight") keys.run = true
  else if (e.code === "Space") keys.space = true
  else if (e.key === ">") speedMul = Math.min(128, speedMul * 2)
  else if (e.key === "<") speedMul = Math.max(1, speedMul / 2)
})
window.addEventListener("keyup", (e) => {
  if (e.code === "ArrowLeft") keys.lookLeft = false
  else if (e.code === "ArrowRight") keys.lookRight = false
  else if (e.code === "ArrowUp") keys.lookUp = false
  else if (e.code === "ArrowDown") keys.lookDown = false
  else if (e.code === "KeyW") keys.fwd = false
  else if (e.code === "KeyS") keys.back = false
  else if (e.code === "KeyA") keys.strafeL = false
  else if (e.code === "KeyD") keys.strafeR = false
  else if (e.code === "ShiftLeft" || e.code === "ShiftRight") keys.run = false
  else if (e.code === "Space") keys.space = false
})

// --- ラジカセ操作（マウスでクリック → 再生／停止） ---
const MUSIC_VOLUME = 1.6
const SONG_LAMP_COLOR = 0xff7a33 // Lo-fi のウォームな色
const SONG_BAR_DUR = 3.6 // 4/4、約 67 BPM（Lo-fi ヒップホップのゆるめ）
const SONG_CHORDS = [
  [57, 60, 64, 67], // Am7
  [53, 57, 60, 64], // Fmaj7
  [52, 55, 59, 62], // Em7
  [50, 53, 57, 60], // Dm7
]
let musicOn = false

const toggleMusic = () => {
  if (!audioCtx) return
  musicOn = !musicOn
  const target = musicOn ? MUSIC_VOLUME : 0
  musicMasterGain.gain.cancelScheduledValues(audioCtx.currentTime)
  musicMasterGain.gain.setTargetAtTime(target, audioCtx.currentTime, 0.4)
  const lamp = boombox.getObjectByName("lamp")
  if (lamp) lamp.material.color.setHex(musicOn ? SONG_LAMP_COLOR : 0x330000)
}

const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const setPointerFromEvent = (e) => {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1
}
const isHoveringBoombox = () => {
  raycaster.setFromCamera(pointer, camera)
  return raycaster.intersectObject(boombox, true).length > 0
}
const isHoveringFire = () => {
  raycaster.setFromCamera(pointer, camera)
  return raycaster.intersectObject(firePit, true).length > 0
}

document.addEventListener("mousemove", (e) => {
  if (!gameActive) return
  setPointerFromEvent(e)
  const hover = isHoveringBoombox() || isHoveringFire()
  document.body.classList.toggle("hover-interactive", hover)
})

document.addEventListener("click", (e) => {
  if (!gameActive) return
  if (e.target === $start) return
  setPointerFromEvent(e)
  if (isHoveringBoombox()) toggleMusic()
  else if (isHoveringFire()) toggleFire()
})

// --- ゲーム時間 ---
const GAME_SPEED = 24 // 実時間 1s = ゲーム時間 24s（1時間で 1日）
let speedMul = 1 // > / < で 1, 2, 4, 8, 16, 32, 64, 128 倍速
const TIDE_PERIOD_GAME_SEC = 44712 // 半日周潮 ≈ 12.42h。実時間では ~31 分で 1 往復
let gameTime = 10 * 3600 // 午前 10:00 スタート

// 時刻キーフレーム（色・光量）。hour in [0, 24]
const timeKeys = [
  {
    t: 0,
    sky: 0x0b1430,
    fog: 0x0b1430,
    sea: 0x0e2536,
    sand: 0x5a5a6a,
    sun: 0x2a3050,
    hemiTop: 0x0a1228,
    hemiBot: 0x050a18,
    sunI: 0.05,
    hemiI: 0.18,
  },
  {
    t: 5,
    sky: 0xffb085,
    fog: 0xffbfa0,
    sea: 0x6a6a88,
    sand: 0xd2a888,
    sun: 0xffaa66,
    hemiTop: 0xffb099,
    hemiBot: 0xccaa88,
    sunI: 0.45,
    hemiI: 0.5,
  },
  {
    t: 7,
    sky: 0xa6dbf5,
    fog: 0xd0e6f2,
    sea: 0x3c9ec2,
    sand: 0xefdcaa,
    sun: 0xfff1c8,
    hemiTop: 0xcde6fb,
    hemiBot: 0xd6c08a,
    sunI: 1.0,
    hemiI: 0.7,
  },
  {
    t: 12,
    sky: 0x5fbff5,
    fog: 0xc8e4f2,
    sea: 0x2fb0d8,
    sand: 0xf5e2b2,
    sun: 0xfffbe6,
    hemiTop: 0xd8eeff,
    hemiBot: 0xd2b680,
    sunI: 1.2,
    hemiI: 0.78,
  },
  {
    t: 15,
    sky: 0x6cc3ee,
    fog: 0xccdae6,
    sea: 0x33a8ce,
    sand: 0xf0deaa,
    sun: 0xfff0c8,
    hemiTop: 0xd2ebff,
    hemiBot: 0xd0b480,
    sunI: 1.1,
    hemiI: 0.75,
  },
  {
    t: 18,
    sky: 0xf0a070,
    fog: 0xf0a070,
    sea: 0xa26a5c,
    sand: 0xe0b784,
    sun: 0xff8a4c,
    hemiTop: 0xffc090,
    hemiBot: 0xa67a4c,
    sunI: 0.8,
    hemiI: 0.55,
  },
  {
    t: 20,
    sky: 0x39406e,
    fog: 0x2c3250,
    sea: 0x273052,
    sand: 0x7a6a6a,
    sun: 0x88a0d8,
    hemiTop: 0x2c3250,
    hemiBot: 0x181828,
    sunI: 0.18,
    hemiI: 0.3,
  },
  {
    t: 22,
    sky: 0x0b1430,
    fog: 0x0a1228,
    sea: 0x0e2636,
    sand: 0x555560,
    sun: 0x2a3050,
    hemiTop: 0x0a1228,
    hemiBot: 0x050a18,
    sunI: 0.07,
    hemiI: 0.2,
  },
  {
    t: 24,
    sky: 0x0b1430,
    fog: 0x0b1430,
    sea: 0x0e2536,
    sand: 0x5a5a6a,
    sun: 0x2a3050,
    hemiTop: 0x0a1228,
    hemiBot: 0x050a18,
    sunI: 0.05,
    hemiI: 0.18,
  },
]

const _ca = new THREE.Color()
const _cb = new THREE.Color()
const lerpColorInto = (target, a, b, t) => {
  _ca.setHex(a)
  _cb.setHex(b)
  target.copy(_ca).lerp(_cb, t)
}
const lerp = (a, b, t) => a + (b - a) * t

// 一時カラー（毎フレーム生成しないため使い回し）
const envColors = {
  sky: new THREE.Color(),
  fog: new THREE.Color(),
  sea: new THREE.Color(),
  sand: new THREE.Color(),
  sun: new THREE.Color(),
  hemiTop: new THREE.Color(),
  hemiBot: new THREE.Color(),
}
const env = {
  ...envColors,
  sunI: 1,
  hemiI: 0.5,
}

const sampleEnv = (hour) => {
  for (let i = 0; i < timeKeys.length - 1; i++) {
    const a = timeKeys[i]
    const b = timeKeys[i + 1]
    if (hour >= a.t && hour <= b.t) {
      const u = (hour - a.t) / (b.t - a.t)
      lerpColorInto(env.sky, a.sky, b.sky, u)
      lerpColorInto(env.fog, a.fog, b.fog, u)
      lerpColorInto(env.sea, a.sea, b.sea, u)
      lerpColorInto(env.sand, a.sand, b.sand, u)
      lerpColorInto(env.sun, a.sun, b.sun, u)
      lerpColorInto(env.hemiTop, a.hemiTop, b.hemiTop, u)
      lerpColorInto(env.hemiBot, a.hemiBot, b.hemiBot, u)
      env.sunI = lerp(a.sunI, b.sunI, u)
      env.hemiI = lerp(a.hemiI, b.hemiI, u)
      return
    }
  }
}

// --- WebAudio（波 + ラジカセ音楽） ---
let audioCtx = null
let audioStarted = false
let musicMasterGain = null
let musicBoomboxGain = null

const makeNoiseBuffer = (ac, seconds) => {
  const buf = ac.createBuffer(1, ac.sampleRate * seconds, ac.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buf
}
const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12)

// 倍音加算合成のやわらかいピアノ
const playPiano = (ac, dest, midi, startTime, holdSec, velocity) => {
  const freq = midiToHz(midi)
  const out = ac.createGain()
  out.connect(dest)
  const peak = Math.max(velocity, 0.0002)
  out.gain.setValueAtTime(0.0001, startTime)
  out.gain.exponentialRampToValueAtTime(peak, startTime + 0.006)
  out.gain.exponentialRampToValueAtTime(peak * 0.4, startTime + 0.25)
  out.gain.exponentialRampToValueAtTime(
    Math.max(peak * 0.02, 0.0002),
    startTime + holdSec,
  )
  out.gain.exponentialRampToValueAtTime(0.0001, startTime + holdSec + 0.4)
  const harmonics = [1, 2, 3, 4, 5]
  const amps = [1, 0.5, 0.28, 0.15, 0.08]
  for (let i = 0; i < harmonics.length; i++) {
    const osc = ac.createOscillator()
    osc.type = "sine"
    osc.frequency.value = freq * harmonics[i]
    const g = ac.createGain()
    g.gain.value = amps[i] * 0.13
    osc.connect(g)
    g.connect(out)
    osc.start(startTime)
    osc.stop(startTime + holdSec + 0.6)
  }
}

const playKick = (ac, dest, start, velocity = 0.35) => {
  const osc = ac.createOscillator()
  osc.type = "sine"
  osc.frequency.setValueAtTime(110, start)
  osc.frequency.exponentialRampToValueAtTime(38, start + 0.16)
  const g = ac.createGain()
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(velocity, start + 0.005)
  g.gain.exponentialRampToValueAtTime(0.001, start + 0.22)
  osc.connect(g).connect(dest)
  osc.start(start)
  osc.stop(start + 0.28)
}

// ソフトなパッド（ゆっくり立ち上がり長く伸びる）
const playPad = (ac, dest, midi, startTime, holdSec, velocity) => {
  const freq = midiToHz(midi)
  const out = ac.createGain()
  out.connect(dest)
  const peak = Math.max(velocity, 0.0002)
  out.gain.setValueAtTime(0.0001, startTime)
  out.gain.exponentialRampToValueAtTime(peak, startTime + 0.8)
  out.gain.exponentialRampToValueAtTime(peak * 0.75, startTime + holdSec)
  out.gain.exponentialRampToValueAtTime(0.0001, startTime + holdSec + 2.0)
  // 基音 + オクターブ下 + 5 度でわずかにデチューン
  const voices = [
    { freq: freq, amp: 1.0, detune: 0 },
    { freq: freq * 0.5, amp: 0.6, detune: -3 },
    { freq: freq * 1.5, amp: 0.35, detune: +4 },
  ]
  for (const v of voices) {
    const osc = ac.createOscillator()
    osc.type = "sine"
    osc.frequency.value = v.freq
    osc.detune.value = v.detune
    const g = ac.createGain()
    g.gain.value = v.amp * 0.09
    osc.connect(g)
    g.connect(out)
    osc.start(startTime)
    osc.stop(startTime + holdSec + 2.2)
  }
}

// ハイハット（ノイズの高域だけ短く）
const playHat = (ac, dest, noiseBuf, start, velocity = 0.06) => {
  const src = ac.createBufferSource()
  src.buffer = noiseBuf
  const hp = ac.createBiquadFilter()
  hp.type = "highpass"
  hp.frequency.value = 7500
  const g = ac.createGain()
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(velocity, start + 0.002)
  g.gain.exponentialRampToValueAtTime(0.0001, start + 0.06)
  src.connect(hp).connect(g).connect(dest)
  src.start(start)
  src.stop(start + 0.08)
}

// スネア（軽いクラップ／リムショット感のノイズ）
const playSnare = (ac, dest, noiseBuf, start, velocity = 0.18) => {
  const src = ac.createBufferSource()
  src.buffer = noiseBuf
  const bp = ac.createBiquadFilter()
  bp.type = "bandpass"
  bp.frequency.value = 1800
  bp.Q.value = 1.2
  const g = ac.createGain()
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(velocity, start + 0.003)
  g.gain.exponentialRampToValueAtTime(0.0001, start + 0.14)
  src.connect(bp).connect(g).connect(dest)
  src.start(start)
  src.stop(start + 0.16)
}

const startAudio = () => {
  if (audioStarted) return
  audioStarted = true
  audioCtx = new AudioContext()
  const ac = audioCtx

  const master = ac.createGain()
  master.gain.value = 0.9
  master.connect(ac.destination)

  // --- 波音：ノイズを帯域整形して LFO で寄せ波／引き波に ---
  const waveBuf = makeNoiseBuffer(ac, 4)
  const waveSrc = ac.createBufferSource()
  waveSrc.buffer = waveBuf
  waveSrc.loop = true
  const waveHP = ac.createBiquadFilter()
  waveHP.type = "highpass"
  waveHP.frequency.value = 120
  const waveLP = ac.createBiquadFilter()
  waveLP.type = "lowpass"
  waveLP.frequency.value = 800
  const waveGain = ac.createGain()
  waveGain.gain.value = 0.18
  waveSrc.connect(waveHP).connect(waveLP).connect(waveGain).connect(master)
  waveSrc.start()

  // 寄せ波／引き波の息遣い（~11 秒周期）
  const swellLFO = ac.createOscillator()
  swellLFO.frequency.value = 0.09
  const swellDepth = ac.createGain()
  swellDepth.gain.value = 0.13
  swellLFO.connect(swellDepth).connect(waveGain.gain)
  swellLFO.start()

  // さらに遅く音色を揺らす
  const colorLFO = ac.createOscillator()
  colorLFO.frequency.value = 0.03
  const colorDepth = ac.createGain()
  colorDepth.gain.value = 260
  colorLFO.connect(colorDepth).connect(waveLP.frequency)
  colorLFO.start()

  // --- 音楽系チェーン ---
  musicMasterGain = ac.createGain()
  musicMasterGain.gain.value = 0 // 初期 OFF
  musicBoomboxGain = ac.createGain() // 距離減衰
  musicBoomboxGain.gain.value = 1.0

  // Lo-fi 感の LPF（少し狭めて中音強調）
  const musicLP = ac.createBiquadFilter()
  musicLP.type = "lowpass"
  musicLP.frequency.value = 2100
  musicLP.Q.value = 0.7

  // 小型スピーカー風に低域をカット
  const musicHP = ac.createBiquadFilter()
  musicHP.type = "highpass"
  musicHP.frequency.value = 220
  musicHP.Q.value = 0.6

  // ミッドの帯域ブースト（ラジカセ感）
  const musicMid = ac.createBiquadFilter()
  musicMid.type = "peaking"
  musicMid.frequency.value = 900
  musicMid.Q.value = 0.9
  musicMid.gain.value = 4

  // 軽いテープサチュレーション（波形を丸める）
  const shaper = ac.createWaveShaper()
  {
    const n = 2048
    const curve = new Float32Array(n)
    const k = 2.2
    const norm = Math.tanh(k)
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1
      curve[i] = Math.tanh(x * k) / norm
    }
    shaper.curve = curve
    shaper.oversample = "2x"
  }

  // ディレイ（山びこ）
  const delay = ac.createDelay()
  delay.delayTime.value = 0.38
  const delayFb = ac.createGain()
  delayFb.gain.value = 0.3
  const delaySend = ac.createGain()
  delaySend.gain.value = 0.22

  // 楽器 → LP → HP → Mid ブースト → サチュレータ → (master & ディレイ分岐)
  musicLP.connect(musicHP)
  musicHP.connect(musicMid)
  musicMid.connect(shaper)
  shaper.connect(musicMasterGain)
  shaper.connect(delaySend).connect(delay)
  delay.connect(delayFb).connect(delay)
  delay.connect(musicMasterGain)
  musicMasterGain.connect(musicBoomboxGain).connect(master)

  // ビニール／テープのクラックル（少し強めに）
  {
    const sec = 6
    const buf = ac.createBuffer(1, ac.sampleRate * sec, ac.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * 0.05
      // 時々大きめのパチッというノイズ
      if (Math.random() < 0.0005) d[i] += (Math.random() * 2 - 1) * 0.6
    }
    const src = ac.createBufferSource()
    src.buffer = buf
    src.loop = true
    const hp = ac.createBiquadFilter()
    hp.type = "highpass"
    hp.frequency.value = 1600
    const g = ac.createGain()
    g.gain.value = 0.16
    src.connect(hp).connect(g).connect(musicMasterGain)
    src.start()
  }

  // 高域テープヒス（ずっと鳴ってる白っぽいノイズ）
  {
    const sec = 3
    const buf = ac.createBuffer(1, ac.sampleRate * sec, ac.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.5
    const src = ac.createBufferSource()
    src.buffer = buf
    src.loop = true
    const bp = ac.createBiquadFilter()
    bp.type = "bandpass"
    bp.frequency.value = 4200
    bp.Q.value = 0.8
    const g = ac.createGain()
    g.gain.value = 0.035
    src.connect(bp).connect(g).connect(musicMasterGain)
    src.start()
  }

  const noiseBuf = makeNoiseBuffer(ac, 0.5)

  let nextTime = ac.currentTime + 0.3
  let barIndex = 0

  // 1 小節ぶんの再生（Lo-fi ヒップホップ。パッド層 + ピアノ + ブームバップ風ドラム）
  const playBar = (chord, startBar, barDur) => {
    // 薄く伸びるパッド層（背景でコードの雰囲気）
    for (let i = 0; i < chord.length; i++) {
      playPad(ac, musicLP, chord[i], startBar + i * 0.04, barDur * 0.92, 0.05)
    }
    // ベース（ルートのオクターブ下、長めに）
    playPiano(ac, musicLP, chord[0] - 24, startBar, barDur * 1.05, 0.28)

    // ピアノ・アルペジオ 4 音（ハーモニーをなぞる）
    const arp = [0, 2, 1, 3]
    const step = barDur / arp.length
    for (let i = 0; i < arp.length; i++) {
      const humanize = (Math.random() - 0.5) * 0.04
      playPiano(
        ac,
        musicLP,
        chord[arp[i]],
        startBar + i * step + humanize,
        step * 1.5,
        0.16 + Math.random() * 0.04,
      )
    }

    // ブームバップ風キック（1 拍目と「2 と半」拍、軽いシンコペーション）
    playKick(ac, musicMasterGain, startBar, 0.3)
    playKick(ac, musicMasterGain, startBar + barDur * 0.625, 0.22)

    // スネア／クラップ：2 拍目・4 拍目に薄めに
    playSnare(ac, musicMasterGain, noiseBuf, startBar + barDur * 0.25, 0.12)
    playSnare(ac, musicMasterGain, noiseBuf, startBar + barDur * 0.75, 0.12)

    // オフビートのハット
    for (let i = 1; i < 8; i += 2) {
      const t = startBar + i * (barDur / 8) + (Math.random() - 0.5) * 0.02
      playHat(ac, musicMasterGain, noiseBuf, t, 0.04)
    }
  }

  const scheduleAhead = () => {
    while (nextTime < ac.currentTime + 1.5) {
      const chord = SONG_CHORDS[barIndex % SONG_CHORDS.length]
      playBar(chord, nextTime, SONG_BAR_DUR)
      nextTime += SONG_BAR_DUR
      barIndex++
    }
  }
  setInterval(scheduleAhead, 250)
}

// --- メインループ ---
const fwdVec = new THREE.Vector3()
let prevT = performance.now() / 1000

// 視点角（ラジアン）
let yaw = 0 // Three.js の既定で yaw=0 は -Z 方向（島中央・ラジカセ方向）
let pitch = 0
const PITCH_MAX = Math.PI / 2 - 0.05
const TURN_SPEED = 1.6 // rad/s
const LOOK_SPEED = 1.2 // rad/s

// 汀線までの正規化半径（潮位に応じて縮む）
// くびれ部を通れるよう少し余裕のある設定。潮位の効きもやや控えめに
const shorelineMaxU = (tide) => Math.max(0.3, 0.93 - tide * 0.06)

const tick = () => {
  const now = performance.now() / 1000
  const dt = Math.min(now - prevT, 0.05)
  prevT = now

  gameTime += dt * GAME_SPEED * speedMul
  const hour = (((gameTime / 3600) % 24) + 24) % 24

  sampleEnv(hour)
  skyMat.color.copy(env.sky)
  scene.fog.color.copy(env.fog)
  renderer.setClearColor(env.sky, 1)
  sunLight.color.copy(env.sun)
  sunLight.intensity = env.sunI
  hemi.color.copy(env.hemiTop)
  hemi.groundColor.copy(env.hemiBot)
  hemi.intensity = env.hemiI
  seaMat.color.copy(env.sea)
  island.material.color.copy(env.sand)

  // 太陽の位置（東昇り・南中・西沈み）と月（反対側）
  const sunAngle = ((hour - 6) / 24) * Math.PI * 2
  const sunDir = new THREE.Vector3(
    Math.cos(sunAngle),
    Math.sin(sunAngle),
    Math.sin(sunAngle * 0.5) * 0.2,
  ).normalize()
  sunLight.position.copy(sunDir).multiplyScalar(40)
  // 太陽ディスク（夜は月の位置に置き換えて白くする）
  const isNight = sunDir.y < 0
  const discDir = isNight ? sunDir.clone().multiplyScalar(-1) : sunDir
  sunDisc.position.copy(discDir).multiplyScalar(180)
  sunDisc.lookAt(0, 0, 0)
  sunDisc.material.color.setHex(isNight ? 0xe8ecff : 0xfff6db)
  sunDisc.material.opacity = isNight ? 0.75 : 0.95

  // 潮位（半日周潮）
  const tide = Math.sin((gameTime / TIDE_PERIOD_GAME_SEC) * Math.PI * 2) * 0.28
  sea.position.y = -0.35 + tide

  // 海面の揺れ（頂点変位）
  const pos = seaGeom.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i)
    const py = pos.getY(i)
    const w =
      Math.sin(px * 0.28 + now * 0.9) * 0.08 +
      Math.cos(py * 0.33 - now * 0.7) * 0.07 +
      Math.sin((px + py) * 0.55 + now * 1.3) * 0.04
    pos.setZ(i, w)
  }
  pos.needsUpdate = true
  seaGeom.computeVertexNormals()

  // 視点回転（矢印キー）と移動（WASD + Space）
  if (gameActive) {
    if (keys.lookLeft) yaw += TURN_SPEED * dt
    if (keys.lookRight) yaw -= TURN_SPEED * dt
    if (keys.lookUp) pitch += LOOK_SPEED * dt
    if (keys.lookDown) pitch -= LOOK_SPEED * dt
    pitch = Math.max(-PITCH_MAX, Math.min(PITCH_MAX, pitch))
    camera.rotation.y = yaw
    camera.rotation.x = pitch
    camera.rotation.z = 0

    // yaw から水平前方・右手ベクトルを計算
    const fx = -Math.sin(yaw)
    const fz = -Math.cos(yaw)
    const rx = Math.cos(yaw)
    const rz = -Math.sin(yaw)

    let mx = 0
    let mz = 0
    if (keys.fwd) {
      mx += fx
      mz += fz
    }
    if (keys.back) {
      mx -= fx
      mz -= fz
    }
    if (keys.strafeR) {
      mx += rx
      mz += rz
    }
    if (keys.strafeL) {
      mx -= rx
      mz -= rz
    }
    // Space = 前進 / Shift+Space = 後退
    if (keys.space) {
      if (keys.run) {
        mx -= fx
        mz -= fz
      } else {
        mx += fx
        mz += fz
      }
    }
    const speed = (keys.run ? 3.2 : 1.8) * dt
    const len = Math.hypot(mx, mz)
    if (len > 0) {
      mx = (mx / len) * speed
      mz = (mz / len) * speed
      const nextX = camera.position.x + mx
      const nextZ = camera.position.z + mz
      const maxU = shorelineMaxU(tide)
      // メイン島と小島それぞれの正規化距離
      const u1 = ellipseU(nextX, nextZ, 0, 0, ISLAND_A, ISLAND_B)
      const u2 = ellipseU(
        nextX,
        nextZ,
        SMALL_ISLAND_CX,
        SMALL_ISLAND_CZ,
        SMALL_ISLAND_A,
        SMALL_ISLAND_B,
      )
      const wasOnStructure =
        onPier(camera.position.x, camera.position.z) ||
        onBoat(camera.position.x, camera.position.z)
      const nextOnStructure = onPier(nextX, nextZ) || onBoat(nextX, nextZ)
      if (u1 <= maxU || u2 <= maxU || nextOnStructure) {
        camera.position.x = nextX
        camera.position.z = nextZ
      } else if (wasOnStructure) {
        // 桟橋や舟から海に踏み出そうとしたらブロック（落下防止）
      } else {
        // 汀線に沿ってクランプ（どちらか近い方の島の端に寄せる）
        if (u1 <= u2) {
          const k = maxU / u1
          camera.position.x = nextX * k
          camera.position.z = nextZ * k
        } else {
          const k = maxU / u2
          camera.position.x = SMALL_ISLAND_CX + (nextX - SMALL_ISLAND_CX) * k
          camera.position.z = SMALL_ISLAND_CZ + (nextZ - SMALL_ISLAND_CZ) * k
        }
      }
    }
    // 地面・桟橋・小舟のどれに乗っているかで目線高さ調整（目線 1.6m）
    let nowY
    if (onBoat(camera.position.x, camera.position.z)) {
      // 小舟はゆらゆら動くので、boat.position.y（＋床の高さ）に追従
      nowY = boat.position.y + BOAT_DECK_Y
    } else if (onPier(camera.position.x, camera.position.z)) {
      nowY = PIER_Y
    } else {
      nowY = islandHeight(camera.position.x, camera.position.z)
    }
    camera.position.y = nowY + 1.6
  }

  // 潮位が上がって可動域が縮んだら汀線内に引き戻す（桟橋・小舟上は除外）
  {
    const maxU = shorelineMaxU(tide)
    const px = camera.position.x
    const pz = camera.position.z
    const u1 = ellipseU(px, pz, 0, 0, ISLAND_A, ISLAND_B)
    const u2 = ellipseU(
      px,
      pz,
      SMALL_ISLAND_CX,
      SMALL_ISLAND_CZ,
      SMALL_ISLAND_A,
      SMALL_ISLAND_B,
    )
    if (u1 > maxU && u2 > maxU && !onPier(px, pz) && !onBoat(px, pz)) {
      if (u1 <= u2) {
        const k = maxU / u1
        camera.position.x = px * k
        camera.position.z = pz * k
      } else {
        const k = maxU / u2
        camera.position.x = SMALL_ISLAND_CX + (px - SMALL_ISLAND_CX) * k
        camera.position.z = SMALL_ISLAND_CZ + (pz - SMALL_ISLAND_CZ) * k
      }
      camera.position.y =
        islandHeight(camera.position.x, camera.position.z) + 1.6
    }
  }

  // ラジカセの距離減衰（カメラからの水平距離）
  if (musicBoomboxGain) {
    const dx = camera.position.x - boombox.position.x
    const dz = camera.position.z - boombox.position.z
    const d = Math.hypot(dx, dz)
    const vol = Math.max(0, 1 - d / 10)
    musicBoomboxGain.gain.setTargetAtTime(vol, audioCtx.currentTime, 0.15)
  }

  // 小舟のゆらゆら（上下のボブ＋ピッチ＋ロール）
  {
    const bob = Math.sin(now * 0.7) * 0.05 + Math.sin(now * 1.3 + 0.5) * 0.03
    const pitch = Math.sin(now * 0.6 + 0.3) * 0.04
    const roll = Math.sin(now * 0.9) * 0.05
    boat.position.y = BOAT_WATER_BASE_Y + tide + bob
    boat.rotation.x = pitch
    boat.rotation.z = roll
  }

  // 焚き火のちらつき
  if (fireOn) {
    const flicker =
      0.92 + Math.sin(now * 12) * 0.07 + Math.sin(now * 7.3) * 0.04
    flame.scale.y = flicker
    flame.scale.x = 0.95 + Math.sin(now * 9.1) * 0.06
    flame.scale.z = flame.scale.x
    fireLight.intensity = 2.6 * (0.85 + Math.sin(now * 11) * 0.12)
  }

  // HUD 時刻
  const hh = Math.floor(hour).toString().padStart(2, "0")
  const mm = Math.floor((hour % 1) * 60)
    .toString()
    .padStart(2, "0")
  $clock.textContent = `${hh}:${mm} · ${speedMul}x`

  renderer.render(scene, camera)
  requestAnimationFrame(tick)
}
requestAnimationFrame(tick)
