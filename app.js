/**
 * Planificador de Mesas a Escala - Adamil
 * Reglas:
 * 1. Mesa redonda grande: 2.0m diámetro · Máx 13 sillas
 * 2. Mesa redonda mediana: 1.8m diámetro · Máx 11 sillas
 * 3. Mesa redonda pequeña: 1.2m diámetro · Máx 4 sillas
 * 4. Mesa rectangular pequeña: 1.8m × 0.75m · Máx 3 sillas por largo
 * 5. Mesa rectangular grande: 2.0m × 0.90m · Máx 3 sillas por largo
 * 6. Mesa rectangular extra ancha: 1.8m × 1.20m · Máx 3 sillas por largo
 * - Fusión de mesas rectangulares: permite fusionarlas por el lado orientado a la mesa colindante (7 sillas por largo cada 2 mesas)
 * - Opción de sillas: suma 0.5m a las medidas de las mesas
 * - Distancia mínima entre mesas: 0.5m (Verde si >= 0.5m, Rojo si < 0.5m)
 */

const PLAN_WIDTH_PX = 734;
const PLAN_HEIGHT_PX = 1024;

const DEFAULT_HALL_WIDTH_PX = 598;
const DEFAULT_HALL_WIDTH_M = 18.08;
const DEFAULT_PX_PER_M = DEFAULT_HALL_WIDTH_PX / DEFAULT_HALL_WIDTH_M; // ~33.075 px/m

const TABLE_CATALOG = [
  {
    typeId: "round_lg",
    code: "1",
    name: "1. Mesa redonda grande",
    shape: "circle",
    diameter: 2.0,
    maxSeats: 13,
    defaultSeats: 13,
    desc: "Ø 2,00 m · Máx. 13 sillas"
  },
  {
    typeId: "round_md",
    code: "2",
    name: "2. Mesa redonda mediana",
    shape: "circle",
    diameter: 1.8,
    maxSeats: 11,
    defaultSeats: 11,
    desc: "Ø 1,80 m · Máx. 11 sillas"
  },
  {
    typeId: "round_sm",
    code: "3",
    name: "3. Mesa redonda pequeña",
    shape: "circle",
    diameter: 1.2,
    maxSeats: 4,
    defaultSeats: 4,
    desc: "Ø 1,20 m · Máx. 4 sillas"
  },
  {
    typeId: "rect_sm",
    code: "4",
    name: "4. Mesa rectangular pequeña",
    shape: "rect",
    length: 1.8,
    width: 0.75,
    maxSeatsPerSide: 3,
    defaultSeats: 6,
    desc: "1,80 × 0,75 m · Máx. 3 sillas/largo"
  },
  {
    typeId: "rect_lg",
    code: "5",
    name: "5. Mesa rectangular grande",
    shape: "rect",
    length: 2.0,
    width: 0.9,
    maxSeatsPerSide: 3,
    defaultSeats: 6,
    desc: "2,00 × 0,90 m · Máx. 3 sillas/largo"
  },
  {
    typeId: "rect_xl",
    code: "6",
    name: "6. Mesa rectangular extra ancha",
    shape: "rect",
    length: 1.8,
    width: 1.2,
    maxSeatsPerSide: 3,
    defaultSeats: 6,
    desc: "1,80 × 1,20 m · Máx. 3 sillas/largo"
  }
];

const state = {
  pxPerMeter: DEFAULT_PX_PER_M,
  minClearance: 0.5,
  chairExtraMeters: 0.5,
  chairMode: "total", // 'total' (+0.5m a las medidas) | 'per_side' (+0.5m por cada lado = +1.0m total)
  defaultAddChairs: true,
  showDimensions: true,
  showGrid: true,
  showClearanceHalo: false,
  cleanPlan: true,
  zoom: 1.0,
  panX: 0,
  panY: 0,
  tables: [],
  selectedId: null,
  nextCounter: 1,
  interactionMode: "normal",
  toolPoints: [],
  rulerLine: null
};

// Elementos DOM
const planImage = document.getElementById("planImage");
const planSvg = document.getElementById("planSvg");
const canvasWrapper = document.getElementById("canvasWrapper");
const gridLayer = document.getElementById("gridLayer");
const dimensionsLayer = document.getElementById("dimensionsLayer");
const tablesLayer = document.getElementById("tablesLayer");
const conflictsLayer = document.getElementById("conflictsLayer");
const toolOverlayLayer = document.getElementById("toolOverlayLayer");

const catalogList = document.getElementById("catalogList");
const chkDefaultChairs = document.getElementById("chkDefaultChairs");
const selChairMode = document.getElementById("selChairMode");
const inpHallWidth = document.getElementById("inpHallWidth");
const inpMinClearance = document.getElementById("inpMinClearance");
const chkShowDimensions = document.getElementById("chkShowDimensions");
const chkShowGrid = document.getElementById("chkShowGrid");
const chkShowClearanceHalo = document.getElementById("chkShowClearanceHalo");
const chkCleanPlan = document.getElementById("chkCleanPlan");
const lblScaleInfo = document.getElementById("lblScaleInfo");

const statTables = document.getElementById("statTables");
const statSeats = document.getElementById("statSeats");
const statStatus = document.getElementById("statStatus");
const lblZoom = document.getElementById("lblZoom");
const modeBanner = document.getElementById("modeBanner");
const modeBannerText = document.getElementById("modeBannerText");

// Inspector DOM
const inspectorEmpty = document.getElementById("inspectorEmpty");
const inspectorContent = document.getElementById("inspectorContent");
const inpTableName = document.getElementById("inpTableName");
const lblTableType = document.getElementById("lblTableType");
const lblTableBaseDim = document.getElementById("lblTableBaseDim");
const lblTableEffDim = document.getElementById("lblTableEffDim");
const chkTableChairs = document.getElementById("chkTableChairs");

// Controles específicos de sillas y fusión
const rectJoinControls = document.getElementById("rectJoinControls");
const lblJoinedCount = document.getElementById("lblJoinedCount");
const btnJoinRect = document.getElementById("btnJoinRect");
const btnUnjoinRect = document.getElementById("btnUnjoinRect");
const btnMergeNearbyRect = document.getElementById("btnMergeNearbyRect");
const btnFuseLeft = document.getElementById("btnFuseLeft");
const btnFuseRight = document.getElementById("btnFuseRight");
const lblMergeSideInfo = document.getElementById("lblMergeSideInfo");
const btnTopFuseRect = document.getElementById("btnTopFuseRect");

const roundSeatsControls = document.getElementById("roundSeatsControls");
const lblRoundSeatsMax = document.getElementById("lblRoundSeatsMax");
const inpTableSeats = document.getElementById("inpTableSeats");

const rectSeatsControls = document.getElementById("rectSeatsControls");
const lblRectPerSideMax = document.getElementById("lblRectPerSideMax");
const inpSeatsPerSide = document.getElementById("inpSeatsPerSide");
const selRectSides = document.getElementById("selRectSides");
const lblRectTotalSeats = document.getElementById("lblRectTotalSeats");

const rotationControls = document.getElementById("rotationControls");
const lblRotationVal = document.getElementById("lblRotationVal");
const rngTableRotation = document.getElementById("rngTableRotation");
const lblNearestDist = document.getElementById("lblNearestDist");
const tableListMini = document.getElementById("tableListMini");
const lblListCount = document.getElementById("lblListCount");

// Mobile Drawers & Quick Bar DOM
const sidebarLeft = document.getElementById("sidebarLeft");
const sidebarRight = document.getElementById("sidebarRight");
const mobileBackdrop = document.getElementById("mobileBackdrop");
const btnNavAdd = document.getElementById("btnNavAdd");
const btnNavInspect = document.getElementById("btnNavInspect");
const btnNavScale = document.getElementById("btnNavScale");
const mobileQuickBar = document.getElementById("mobileQuickBar");
const quickBarTitle = document.getElementById("quickBarTitle");
const btnQuickFuseNeighbor = document.getElementById("btnQuickFuseNeighbor");
const btnQuickFuseLeft = document.getElementById("btnQuickFuseLeft");
const btnQuickFuseRight = document.getElementById("btnQuickFuseRight");
const btnQuickChairs = document.getElementById("btnQuickChairs");
const btnQuickJoin = document.getElementById("btnQuickJoin");
const btnQuickUnjoin = document.getElementById("btnQuickUnjoin");
const btnQuickRotate = document.getElementById("btnQuickRotate");
const btnQuickDup = document.getElementById("btnQuickDup");
const btnQuickDel = document.getElementById("btnQuickDel");

function isMobileViewport() {
  return window.innerWidth <= 1024;
}

function fmtMeters(num) {
  return num.toFixed(2).replace(".", ",") + " m";
}

function getCatalogSpec(typeId) {
  return TABLE_CATALOG.find((t) => t.typeId === typeId) || TABLE_CATALOG[0];
}

/**
 * Calcula el máximo de sillas por largo en mesas rectangulares:
 * - 1 mesa individual suelta: máx 3 sillas por largo
 * - Mesas unidas en grupo: permite hasta 4 por módulo para cumplir 7 sillas cada 2 mesas (4 + 3 = 7)
 */
function getMaxSeatsPerLongSide(joinedCount, isFusedInGroup = false) {
  const n = Math.max(1, Math.round(joinedCount || 1));
  if (n > 1) {
    return Math.floor(n / 2) * 7 + (n % 2) * 3;
  }
  return isFusedInGroup ? 4 : 3;
}

function getGroupMembers(table) {
  if (!table) return [];
  if (!table.groupId) return [table];
  return state.tables.filter((t) => t.groupId === table.groupId);
}

function cleanupOrphanGroups() {
  const counts = new Map();
  for (const t of state.tables) {
    if (t.groupId) {
      counts.set(t.groupId, (counts.get(t.groupId) || 0) + 1);
    }
  }
  for (const t of state.tables) {
    if (t.groupId && (counts.get(t.groupId) || 0) < 2) {
      t.groupId = null;
      t.fusedTo = null;
    }
  }
}

function normalizeTableConfig(table) {
  const spec = getCatalogSpec(table.typeId);
  if (spec.shape === "circle") {
    table.joinedCount = 1;
    table.groupId = null;
    table.fusedTo = null;
    const maxS = spec.maxSeats || 13;
    if (table.seats === undefined || table.seats > maxS) {
      table.seats = maxS;
    }
    table.seats = Math.max(0, Math.min(maxS, Math.round(table.seats)));
  } else {
    table.joinedCount = Math.max(1, Math.min(12, Math.round(table.joinedCount || 1)));
    table.rectSides =
      table.rectSides === 1 ? 1 : table.rectSides === -1 ? -1 : 2;
    const inGroup = Boolean(table.groupId);
    const maxPerSide = getMaxSeatsPerLongSide(table.joinedCount, inGroup);
    if (table.seatsPerSide === undefined) {
      table.seatsPerSide = getMaxSeatsPerLongSide(table.joinedCount, false);
    }
    table.seatsPerSide = Math.max(
      0,
      Math.min(maxPerSide, Math.round(table.seatsPerSide))
    );
    const activeSides = Math.abs(table.rectSides) === 1 ? 1 : 2;
    table.seats = table.seatsPerSide * activeSides;
  }
}

function getEffectiveDimensions(table) {
  const spec = getCatalogSpec(table.typeId);
  const extra = table.hasChairs
    ? state.chairMode === "per_side"
      ? state.chairExtraMeters * 2
      : state.chairExtraMeters
    : 0;

  if (spec.shape === "circle") {
    const baseD = spec.diameter;
    const effD = baseD + extra;
    return {
      shape: "circle",
      joinedCount: 1,
      baseDiameter: baseD,
      effDiameter: effD,
      baseRadius: baseD / 2,
      effRadius: effD / 2
    };
  } else {
    const joined = Math.max(1, Math.round(table.joinedCount || 1));
    const unitL = spec.length;
    const baseL = unitL * joined;
    const baseW = spec.width;
    const effL = baseL + extra;
    const effW = baseW + extra;
    return {
      shape: "rect",
      joinedCount: joined,
      unitLength: unitL,
      baseLength: baseL,
      baseWidth: baseW,
      effLength: effL,
      effWidth: effW
    };
  }
}

/* ==========================================================================
   GEOMETRÍA Y DISTANCIA MÍNIMA ENTRE MESAS (CÍRCULOS Y RECTÁNGULOS ROTADOS)
   ========================================================================== */

function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

function getTableLocalAxes(table) {
  const rad = degToRad(table.rotation || 0);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    uL: { x: cos, y: sin },
    uW: { x: -sin, y: cos }
  };
}

function isWorldPointInsideTableBase(wx, wy, table, marginPx = 2) {
  const ppm = state.pxPerMeter;
  const dim = getEffectiveDimensions(table);
  if (dim.shape !== "rect") return false;
  const axes = getTableLocalAxes(table);
  const dx = wx - table.x;
  const dy = wy - table.y;
  const localL = dx * axes.uL.x + dy * axes.uL.y;
  const localW = dx * axes.uW.x + dy * axes.uW.y;
  const halfL = (dim.baseLength * ppm) / 2 + marginPx;
  const halfW = (dim.baseWidth * ppm) / 2 + marginPx;
  return Math.abs(localL) <= halfL && Math.abs(localW) <= halfW;
}

function getRectCornersMeters(cx, cy, length, width, angleDeg) {
  const rad = degToRad(angleDeg || 0);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const hl = length / 2;
  const hw = width / 2;
  const local = [
    { x: -hl, y: -hw },
    { x: hl, y: -hw },
    { x: hl, y: hw },
    { x: -hl, y: hw }
  ];
  return local.map((p) => ({
    x: cx + p.x * cos - p.y * sin,
    y: cy + p.x * sin + p.y * cos
  }));
}

function closestPointOnSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const lenSq = abx * abx + aby * aby;
  if (lenSq === 0) return { x: ax, y: ay };
  let t = ((px - ax) * abx + (py - ay) * aby) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return { x: ax + t * abx, y: ay + t * aby };
}

function polygonsOverlapSAT(cornersA, cornersB) {
  const axes = [];
  for (const poly of [cornersA, cornersB]) {
    for (let i = 0; i < 4; i++) {
      const p1 = poly[i];
      const p2 = poly[(i + 1) % 4];
      const ex = p2.x - p1.x;
      const ey = p2.y - p1.y;
      const len = Math.hypot(ex, ey) || 1;
      axes.push({ x: -ey / len, y: ex / len });
    }
  }
  for (const axis of axes) {
    let minA = Infinity,
      maxA = -Infinity;
    for (const p of cornersA) {
      const proj = p.x * axis.x + p.y * axis.y;
      if (proj < minA) minA = proj;
      if (proj > maxA) maxA = proj;
    }
    let minB = Infinity,
      maxB = -Infinity;
    for (const p of cornersB) {
      const proj = p.x * axis.x + p.y * axis.y;
      if (proj < minB) minB = proj;
      if (proj > maxB) maxB = proj;
    }
    if (maxA < minB || maxB < minA) {
      return false;
    }
  }
  return true;
}

function computeTablePairDistanceMeters(tableA, tableB) {
  const ppm = state.pxPerMeter;
  const ax = tableA.x / ppm;
  const ay = tableA.y / ppm;
  const bx = tableB.x / ppm;
  const by = tableB.y / ppm;

  const dimA = getEffectiveDimensions(tableA);
  const dimB = getEffectiveDimensions(tableB);

  if (dimA.shape === "circle" && dimB.shape === "circle") {
    const dx = bx - ax;
    const dy = by - ay;
    const centerDist = Math.hypot(dx, dy);
    const ux = centerDist > 1e-6 ? dx / centerDist : 1;
    const uy = centerDist > 1e-6 ? dy / centerDist : 0;
    const pA = { x: ax + ux * dimA.effRadius, y: ay + uy * dimA.effRadius };
    const pB = { x: bx - ux * dimB.effRadius, y: by - uy * dimB.effRadius };
    const dist = centerDist - (dimA.effRadius + dimB.effRadius);
    return { distance: dist, pA, pB };
  }

  if (dimA.shape === "circle" && dimB.shape === "rect") {
    return circleToRectDistance(
      ax,
      ay,
      dimA.effRadius,
      bx,
      by,
      dimB.effLength,
      dimB.effWidth,
      tableB.rotation || 0,
      false
    );
  }
  if (dimA.shape === "rect" && dimB.shape === "circle") {
    return circleToRectDistance(
      bx,
      by,
      dimB.effRadius,
      ax,
      ay,
      dimA.effLength,
      dimA.effWidth,
      tableA.rotation || 0,
      true
    );
  }

  const cornersA = getRectCornersMeters(
    ax,
    ay,
    dimA.effLength,
    dimA.effWidth,
    tableA.rotation || 0
  );
  const cornersB = getRectCornersMeters(
    bx,
    by,
    dimB.effLength,
    dimB.effWidth,
    tableB.rotation || 0
  );

  if (polygonsOverlapSAT(cornersA, cornersB)) {
    return {
      distance: -0.01,
      pA: { x: ax, y: ay },
      pB: { x: bx, y: by }
    };
  }

  let bestDist = Infinity;
  let bestPA = cornersA[0];
  let bestPB = cornersB[0];

  for (const p of cornersA) {
    for (let j = 0; j < 4; j++) {
      const b1 = cornersB[j];
      const b2 = cornersB[(j + 1) % 4];
      const q = closestPointOnSegment(p.x, p.y, b1.x, b1.y, b2.x, b2.y);
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      if (d < bestDist) {
        bestDist = d;
        bestPA = p;
        bestPB = q;
      }
    }
  }

  for (const p of cornersB) {
    for (let i = 0; i < 4; i++) {
      const a1 = cornersA[i];
      const a2 = cornersA[(i + 1) % 4];
      const q = closestPointOnSegment(p.x, p.y, a1.x, a1.y, a2.x, a2.y);
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      if (d < bestDist) {
        bestDist = d;
        bestPA = q;
        bestPB = p;
      }
    }
  }

  return { distance: bestDist, pA: bestPA, pB: bestPB };
}

function circleToRectDistance(cx, cy, r, rx, ry, rl, rw, rAngleDeg, swapOrder) {
  const rad = degToRad(rAngleDeg);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const dx = cx - rx;
  const dy = cy - ry;
  const localX = dx * cos + dy * sin;
  const localY = -dx * sin + dy * cos;

  const hl = rl / 2;
  const hw = rw / 2;
  const clampedX = Math.max(-hl, Math.min(hl, localX));
  const clampedY = Math.max(-hw, Math.min(hw, localY));

  const inside = localX === clampedX && localY === clampedY;

  const rectPt = {
    x: rx + clampedX * cos - clampedY * sin,
    y: ry + clampedX * sin + clampedY * cos
  };

  const distToCenter = Math.hypot(cx - rectPt.x, cy - rectPt.y);
  let circlePt;
  if (distToCenter > 1e-6) {
    const ux = (rectPt.x - cx) / distToCenter;
    const uy = (rectPt.y - cy) / distToCenter;
    circlePt = { x: cx + ux * r, y: cy + uy * r };
  } else {
    circlePt = { x: cx, y: cy };
  }

  const dist = inside ? -r : distToCenter - r;
  return swapOrder
    ? { distance: dist, pA: rectPt, pB: circlePt }
    : { distance: dist, pA: circlePt, pB: rectPt };
}

function evaluateCollisions() {
  cleanupOrphanGroups();
  const n = state.tables.length;
  const conflicts = [];
  const EPS = 0.001;

  for (const t of state.tables) {
    normalizeTableConfig(t);
    t.isConflict = false;
    t.nearestDist = Infinity;
    t.nearestOther = null;
    t.nearestPairPoints = null;
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const tA = state.tables[i];
      const tB = state.tables[j];

      // Las mesas fusionadas dentro del mismo grupo (ej. forma en U, L o lineal)
      // forman una única estructura compuesta y no generan conflicto entre sí.
      if (tA.groupId && tB.groupId && tA.groupId === tB.groupId) {
        continue;
      }

      const res = computeTablePairDistanceMeters(tA, tB);

      if (res.distance < tA.nearestDist) {
        tA.nearestDist = res.distance;
        tA.nearestOther = tB;
        tA.nearestPairPoints = { pA: res.pA, pB: res.pB };
      }
      if (res.distance < tB.nearestDist) {
        tB.nearestDist = res.distance;
        tB.nearestOther = tA;
        tB.nearestPairPoints = { pA: res.pB, pB: res.pA };
      }

      if (res.distance < state.minClearance - EPS) {
        tA.isConflict = true;
        tB.isConflict = true;
        conflicts.push({
          tA,
          tB,
          distance: res.distance,
          pA: res.pA,
          pB: res.pB
        });
      }
    }
  }

  return conflicts;
}

/* ==========================================================================
   FUSIÓN DE MESAS RECTANGULARES MANTENIENDO SU ORIENTACIÓN (MESAS EN U / L / LINEALES)
   ========================================================================== */

/**
 * Obtiene los vectores normales (hacia afuera) en coordenadas de pantalla para los 4 bordes de `table`.
 */
function getTableEdgesWorld(table) {
  const axes = getTableLocalAxes(table);
  return [
    { key: "right_end", nx: axes.uL.x, ny: axes.uL.y },
    { key: "left_end", nx: -axes.uL.x, ny: -axes.uL.y },
    { key: "bottom_side", nx: axes.uW.x, ny: axes.uW.y },
    { key: "top_side", nx: -axes.uW.x, ny: -axes.uW.y }
  ];
}

/**
 * Traduce una dirección del plano ("left", "right", "top", "bottom") al `sideKey` local de `table`
 * cuyo borde apunta en esa dirección del mundo, sin importar el ángulo de rotación de la mesa.
 */
function getWorldSideKey(table, worldDir) {
  if (!worldDir || worldDir === "auto") return null;
  if (
    worldDir === "right_end" ||
    worldDir === "left_end" ||
    worldDir === "bottom_side" ||
    worldDir === "top_side"
  ) {
    return worldDir;
  }

  const edges = getTableEdgesWorld(table);
  if (worldDir === "left") {
    return edges.reduce((best, e) => (e.nx < best.nx ? e : best), edges[0]).key;
  }
  if (worldDir === "right") {
    return edges.reduce((best, e) => (e.nx > best.nx ? e : best), edges[0]).key;
  }
  if (worldDir === "top") {
    return edges.reduce((best, e) => (e.ny < best.ny ? e : best), edges[0]).key;
  }
  if (worldDir === "bottom") {
    return edges.reduce((best, e) => (e.ny > best.ny ? e : best), edges[0]).key;
  }
  return null;
}

function getWorldSideLabelFromNormal(nx, ny) {
  if (Math.abs(nx) >= Math.abs(ny)) {
    return nx < 0 ? "lado izquierdo" : "lado derecho";
  }
  return ny < 0 ? "lado superior" : "lado inferior";
}

/**
 * Calcula el acople exacto borde con borde entre `anchor` y `moving`
 * manteniendo intacta la rotación de ambas mesas (`anchor.rotation` y `moving.rotation`).
 * Soporta forzar el lado ("left", "right", "top", "bottom" o clave local).
 */
function computePairSnap(
  anchor,
  moving,
  forceSideKey = null,
  forceTangentMode = null
) {
  const ppm = state.pxPerMeter;
  const dimA = getEffectiveDimensions(anchor);
  const dimB = getEffectiveDimensions(moving);

  const axesA = getTableLocalAxes(anchor);
  const axesB = getTableLocalAxes(moving);

  const halfLA = (dimA.baseLength * ppm) / 2;
  const halfWA = (dimA.baseWidth * ppm) / 2;
  const halfLB = (dimB.baseLength * ppm) / 2;
  const halfWB = (dimB.baseWidth * ppm) / 2;

  const dotLL = Math.abs(axesB.uL.x * axesA.uL.x + axesB.uL.y * axesA.uL.y);
  const dotWL = Math.abs(axesB.uW.x * axesA.uL.x + axesB.uW.y * axesA.uL.y);
  const dotLW = Math.abs(axesB.uL.x * axesA.uW.x + axesB.uL.y * axesA.uW.y);
  const dotWW = Math.abs(axesB.uW.x * axesA.uW.x + axesB.uW.y * axesA.uW.y);

  // Semianchos de B proyectados sobre los ejes L y W de A
  const extentBL = halfLB * dotLL + halfWB * dotWL;
  const extentBW = halfLB * dotLW + halfWB * dotWW;

  const combinedL = halfLA + extentBL;
  const combinedW = halfWA + extentBW;

  const dx = moving.x - anchor.x;
  const dy = moving.y - anchor.y;

  const localL = dx * axesA.uL.x + dy * axesA.uL.y;
  const localW = dx * axesA.uW.x + dy * axesA.uW.y;

  const normL = Math.abs(localL) / Math.max(1, combinedL);
  const normW = Math.abs(localW) / Math.max(1, combinedW);

  let sideKey = getWorldSideKey(anchor, forceSideKey);
  let symmetricTangentMode = forceTangentMode;

  const peers = anchor.groupId
    ? getGroupMembers(anchor).filter(
        (p) => p.id !== anchor.id && p.id !== moving.id
      )
    : [];

  // Si `anchor` y `moving` son perpendiculares (ej. formando una L o una U):
  if (dotLL < 0.5) {
    // Si ya hay otra pata perpendicular en el grupo de `anchor`, heredar su alineación de esquina
    for (const peer of peers) {
      const axesP = getTableLocalAxes(peer);
      const peerDotLL = Math.abs(
        axesP.uL.x * axesA.uL.x + axesP.uL.y * axesA.uL.y
      );
      if (peerDotLL < 0.5) {
        if (!symmetricTangentMode && peer.fusedTo && peer.fusedTo.tangentMode) {
          symmetricTangentMode = peer.fusedTo.tangentMode;
        }
        if (!sideKey) {
          const leftSideKey = getWorldSideKey(anchor, "left");
          const rightSideKey = getWorldSideKey(anchor, "right");
          if (peer.x < anchor.x - 4) {
            sideKey = rightSideKey;
          } else if (peer.x > anchor.x + 4) {
            sideKey = leftSideKey;
          }
        }
      }
    }

    // En modo automático para mesas perpendiculares, acoplar al lado izquierdo o derecho según posición X
    if (!sideKey) {
      sideKey = getWorldSideKey(anchor, moving.x < anchor.x ? "left" : "right");
    }
  }

  if (!sideKey) {
    if (normL >= normW) {
      sideKey = localL >= 0 ? "right_end" : "left_end";
    } else {
      sideKey = localW >= 0 ? "bottom_side" : "top_side";
    }
  }

  let sideLabel;
  let edgeSegmentLocal;
  let edgeMidWorld;
  let targetL;
  let targetW;
  let tangentMode = symmetricTangentMode || "start";

  if (sideKey === "right_end" || sideKey === "left_end") {
    const sign = sideKey === "right_end" ? 1 : -1;
    const nx = sign * axesA.uL.x;
    const ny = sign * axesA.uL.y;
    sideLabel = getWorldSideLabelFromNormal(nx, ny);
    const ex = sign * halfLA;
    edgeSegmentLocal = { x1: ex, y1: -halfWA, x2: ex, y2: halfWA };
    edgeMidWorld = {
      x: anchor.x + ex * axesA.uL.x,
      y: anchor.y + ex * axesA.uL.y
    };
    targetL = sign * combinedL;

    const signW =
      Math.abs(axesA.uW.y) >= Math.abs(axesA.uW.x)
        ? axesA.uW.y >= 0
          ? 1
          : -1
        : axesA.uW.x >= 0
        ? 1
        : -1;
    const cStart = signW * (-halfWA + extentBW); // alinea borde superior/izquierdo del mundo
    const cEnd = signW * (halfWA - extentBW); // alinea borde inferior/derecho del mundo

    if (Math.abs(halfWA - extentBW) <= 2) {
      targetW = 0;
      tangentMode = "start";
    } else if (symmetricTangentMode === "start") {
      targetW = cStart;
      tangentMode = "start";
    } else if (symmetricTangentMode === "end") {
      targetW = cEnd;
      tangentMode = "end";
    } else if (symmetricTangentMode === "center") {
      targetW = 0;
      tangentMode = "center";
    } else {
      // Por defecto en mesas en U/L alinea el borde superior (U abierta hacia abajo)
      // salvo que la mesa móvil esté claramente por encima de la mesa ancla
      if (moving.y < anchor.y - halfWA) {
        targetW = cEnd;
        tangentMode = "end";
      } else {
        targetW = cStart;
        tangentMode = "start";
      }
    }
  } else {
    const sign = sideKey === "bottom_side" ? 1 : -1;
    const nx = sign * axesA.uW.x;
    const ny = sign * axesA.uW.y;
    sideLabel = getWorldSideLabelFromNormal(nx, ny);
    const ey = sign * halfWA;
    edgeSegmentLocal = { x1: -halfLA, y1: ey, x2: halfLA, y2: ey };
    edgeMidWorld = {
      x: anchor.x + ey * axesA.uW.x,
      y: anchor.y + ey * axesA.uW.y
    };
    targetW = sign * combinedW;

    const signL =
      Math.abs(axesA.uL.x) >= Math.abs(axesA.uL.y)
        ? axesA.uL.x >= 0
          ? 1
          : -1
        : axesA.uL.y >= 0
        ? 1
        : -1;
    const cStart = signL * (-halfLA + extentBL); // esquina izquierda/superior del mundo
    const cEnd = signL * (halfLA - extentBL); // esquina derecha/inferior del mundo

    if (Math.abs(halfLA - extentBL) <= 2) {
      targetL = 0;
      tangentMode = "start";
    } else if (symmetricTangentMode === "start") {
      targetL = cStart;
      tangentMode = "start";
    } else if (symmetricTangentMode === "end") {
      targetL = cEnd;
      tangentMode = "end";
    } else if (symmetricTangentMode === "center") {
      targetL = 0;
      tangentMode = "center";
    } else {
      if (
        Math.abs(axesA.uL.x) >= Math.abs(axesA.uL.y)
          ? moving.x < anchor.x
          : moving.y < anchor.y
      ) {
        targetL = cStart;
        tangentMode = "start";
      } else {
        targetL = cEnd;
        tangentMode = "end";
      }
    }
  }

  const relX = targetL * axesA.uL.x + targetW * axesA.uW.x;
  const relY = targetL * axesA.uL.y + targetW * axesA.uW.y;

  return {
    anchor,
    moving,
    sideKey,
    sideLabel,
    tangentMode,
    edgeSegmentLocal,
    edgeMidWorld,
    targetX: anchor.x + relX,
    targetY: anchor.y + relY,
    relX,
    relY,
    dotLL,
    dimA,
    dimB
  };
}

/**
 * Elige qué mesa de un grupo debe actuar como ancla principal al acoplar `moving`.
 * Si `moving` es vertical, prioriza la mesa horizontal del grupo (travesaño de la U).
 */
function chooseAnchorInGroup(groupMembers, moving) {
  if (!groupMembers || groupMembers.length === 0) return null;
  if (groupMembers.length === 1) return groupMembers[0];

  const axesM = getTableLocalAxes(moving);
  const movingIsVertical = Math.abs(axesM.uL.y) > Math.abs(axesM.uL.x);

  if (movingIsVertical) {
    const horizontalMembers = groupMembers.filter((m) => {
      const ax = getTableLocalAxes(m);
      return Math.abs(ax.uL.x) >= Math.abs(ax.uL.y);
    });
    if (horizontalMembers.length > 0) {
      return horizontalMembers[0];
    }
  }

  let best = groupMembers[0];
  let bestD = Infinity;
  for (const m of groupMembers) {
    const d = Math.hypot(m.x - moving.x, m.y - moving.y);
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  }
  return best;
}

/**
 * Analiza la mesa rectangular más cercana a `table` que aún no esté fusionada con ella,
 * y determina el acople hacia esa mesa colindante.
 */
function analyzeColindanteRect(table, maxDistMeters = 5.0) {
  if (!table) return null;
  const spec = getCatalogSpec(table.typeId);
  if (spec.shape !== "rect") return null;

  let bestOther = null;
  let bestDist = Infinity;

  for (const other of state.tables) {
    if (other.id === table.id) continue;
    const otherSpec = getCatalogSpec(other.typeId);
    if (otherSpec.shape !== "rect") continue;
    if (table.groupId && other.groupId && table.groupId === other.groupId) {
      continue;
    }
    const res = computeTablePairDistanceMeters(table, other);
    if (res.distance < bestDist) {
      bestDist = res.distance;
      bestOther = other;
    }
  }

  // Si la mesa ya pertenece a un grupo y la otra mesa rectangular está muy lejos (ej. otra sala),
  // ignorarla para que los botones Izq./Dcha. permitan cambiar de lado dentro del propio grupo.
  if (!bestOther || (table.groupId && bestDist > maxDistMeters)) {
    return null;
  }

  const snapOnTable = computePairSnap(table, bestOther);

  return {
    table,
    other: bestOther,
    distanceMeters: bestDist,
    sideKey: snapOnTable.sideKey,
    sideLabel: snapOnTable.sideLabel,
    tangentMode: snapOnTable.tangentMode,
    edgeSegmentLocal: snapOnTable.edgeSegmentLocal,
    edgeMidWorld: snapOnTable.edgeMidWorld,
    dimA: snapOnTable.dimA,
    dimB: snapOnTable.dimB
  };
}

function findBestRectFusionTarget() {
  const sel = state.tables.find((t) => t.id === state.selectedId);
  if (sel && getCatalogSpec(sel.typeId).shape === "rect") {
    const info = analyzeColindanteRect(sel, Infinity);
    if (info) return info;
  }

  let bestInfo = null;
  for (const t of state.tables) {
    if (getCatalogSpec(t.typeId).shape !== "rect") continue;
    const info = analyzeColindanteRect(t, Infinity);
    if (info && (!bestInfo || info.distanceMeters < bestInfo.distanceMeters)) {
      bestInfo = info;
    }
  }
  return bestInfo;
}

/**
 * Cambia de lado (al lado izquierdo o derecho de su mesa ancla) una mesa que ya está fusionada.
 */
function switchFusedTableSide(table, direction) {
  if (!table || !table.groupId) return false;
  const members = getGroupMembers(table);
  if (members.length < 2) return false;

  let moving = table;
  let anchor = null;

  if (table.fusedTo && table.fusedTo.anchorId) {
    anchor = members.find((m) => m.id === table.fusedTo.anchorId);
  }
  if (!anchor) {
    const child = members.find(
      (m) => m.fusedTo && m.fusedTo.anchorId === table.id
    );
    if (child && members.length === 2) {
      // Si el usuario seleccionó la mesa horizontal/ancla en un grupo de 2 y pulsa Izq./Dcha.,
      // mover la pata acoplada al lado izquierdo o derecho de esta mesa
      const axesT = getTableLocalAxes(table);
      const axesC = getTableLocalAxes(child);
      if (Math.abs(axesT.uL.x) >= Math.abs(axesC.uL.x)) {
        anchor = table;
        moving = child;
      } else {
        anchor = child;
        moving = table;
      }
    } else {
      anchor = members.find((m) => m.id !== table.id);
    }
  }

  if (!anchor) return false;

  const currentTangent =
    moving.fusedTo && moving.fusedTo.tangentMode
      ? moving.fusedTo.tangentMode
      : "start";
  const snap = computePairSnap(anchor, moving, direction, currentTangent);
  moving.x = snap.targetX;
  moving.y = snap.targetY;
  moving.fusedTo = {
    anchorId: anchor.id,
    sideKey: snap.sideKey,
    tangentMode: snap.tangentMode
  };

  saveToLocalStorage();
  renderAll();
  return true;
}

/**
 * Fusiona dos mesas rectangulares colindantes por el lado indicado ("auto", "left" o "right"),
 * manteniendo cada mesa su propia orientación (permite formar mesas en U, en L o lineales).
 * Si la mesa ya está fusionada y se pulsa "left" o "right" sin otra mesa cercana, cambia la mesa a ese lado.
 */
function fuseWithColindanteRect(targetTable, direction = "auto") {
  const nearbyInfo = targetTable
    ? analyzeColindanteRect(targetTable, 4.5)
    : null;

  // Si la mesa seleccionada ya está en un grupo y no hay otra mesa suelta cerca (o ya es una pata acoplada),
  // pulsar Izq. o Dcha. mueve esa mesa directamente al lado izquierdo o derecho de su grupo.
  if (
    targetTable &&
    targetTable.groupId &&
    (direction === "left" || direction === "right") &&
    (!nearbyInfo ||
      (targetTable.fusedTo &&
        targetTable.fusedTo.anchorId &&
        nearbyInfo.distanceMeters > 2.2))
  ) {
    if (switchFusedTableSide(targetTable, direction)) {
      return;
    }
  }

  const info =
    nearbyInfo ||
    (targetTable
      ? analyzeColindanteRect(targetTable, Infinity)
      : findBestRectFusionTarget());

  if (!info || !info.other) {
    if (
      targetTable &&
      targetTable.groupId &&
      (direction === "left" || direction === "right")
    ) {
      if (switchFusedTableSide(targetTable, direction)) return;
    }
    alert(
      "Coloca al menos 2 mesas rectangulares para acoplarlas hacia el lado izquierdo o derecho."
    );
    return;
  }

  const groupA = getGroupMembers(info.table);
  const groupB = getGroupMembers(info.other);

  let anchor = info.other;
  let moving = info.table;
  let movingGroup = groupA;

  if (groupA.length > groupB.length) {
    moving = info.other;
    movingGroup = groupB;
    anchor = chooseAnchorInGroup(groupA, moving);
  } else if (groupB.length > groupA.length) {
    moving = info.table;
    movingGroup = groupA;
    anchor = chooseAnchorInGroup(groupB, moving);
  } else {
    // Ambos grupos tienen el mismo tamaño (ej. 2 mesas sueltas):
    // Si una es horizontal y la otra es vertical, la horizontal actúa como base (travesaño de la U)
    // y la vertical se acopla a su izquierda o derecha.
    const axesA = getTableLocalAxes(info.table);
    const axesB = getTableLocalAxes(info.other);
    const aHoriz = Math.abs(axesA.uL.x) >= Math.abs(axesA.uL.y);
    const bHoriz = Math.abs(axesB.uL.x) >= Math.abs(axesB.uL.y);

    if (aHoriz && !bHoriz) {
      anchor = info.table;
      moving = info.other;
      movingGroup = groupB;
    } else if (bHoriz && !aHoriz) {
      anchor = info.other;
      moving = info.table;
      movingGroup = groupA;
    } else {
      anchor = info.other;
      moving = info.table;
      movingGroup = groupA;
    }
  }

  const forceSide =
    direction === "left" || direction === "right" ? direction : null;
  const snap = computePairSnap(anchor, moving, forceSide);
  const shiftX = snap.targetX - moving.x;
  const shiftY = snap.targetY - moving.y;

  for (const m of movingGroup) {
    m.x += shiftX;
    m.y += shiftY;
  }

  const sharedGroupId =
    anchor.groupId ||
    moving.groupId ||
    "grp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);

  for (const m of [...groupA, ...groupB]) {
    m.groupId = sharedGroupId;
  }

  moving.fusedTo = {
    anchorId: anchor.id,
    sideKey: snap.sideKey,
    tangentMode: snap.tangentMode
  };

  // Si se unen alineadas extremo con extremo con la misma orientación, aplicar 7 sillas cada 2 mesas (4 + 3 = 7)
  if (
    snap.dotLL > 0.9 &&
    (snap.sideKey === "right_end" || snap.sideKey === "left_end")
  ) {
    const collinearMembers = getGroupMembers(anchor).filter((t) => {
      const ax = getTableLocalAxes(t);
      const axA = getTableLocalAxes(anchor);
      return Math.abs(ax.uL.x * axA.uL.x + ax.uL.y * axA.uL.y) > 0.9;
    });
    collinearMembers.sort((a, b) => a.x - b.x || a.y - b.y);
    for (let i = 0; i < collinearMembers.length; i++) {
      collinearMembers[i].seatsPerSide =
        i % 2 === 0 && i + 1 < collinearMembers.length ? 4 : 3;
      normalizeTableConfig(collinearMembers[i]);
    }
  } else {
    for (const m of [...groupA, ...groupB]) {
      normalizeTableConfig(m);
    }
  }

  saveToLocalStorage();
  renderAll();
}

/**
 * Re-acopla una mesa fusionada cuando el usuario cambia su ángulo de rotación,
 * manteniendo el lado (izquierdo o derecho) y esquina de unión con su mesa ancla.
 */
function reSnapFusedTableAfterRotation(table) {
  if (!table || !table.groupId) return;
  if (table.fusedTo && table.fusedTo.anchorId) {
    const anchor = state.tables.find(
      (t) => t.id === table.fusedTo.anchorId && t.groupId === table.groupId
    );
    if (anchor) {
      const snap = computePairSnap(
        anchor,
        table,
        table.fusedTo.sideKey,
        table.fusedTo.tangentMode
      );
      table.x = snap.targetX;
      table.y = snap.targetY;
      table.fusedTo.sideKey = snap.sideKey;
      table.fusedTo.tangentMode = snap.tangentMode;
      return;
    }
  }
  const child = state.tables.find(
    (t) =>
      t.groupId === table.groupId &&
      t.fusedTo &&
      t.fusedTo.anchorId === table.id
  );
  if (child && getGroupMembers(table).length === 2) {
    const preferredSide = table.x < child.x ? "left" : "right";
    const snap = computePairSnap(child, table, preferredSide);
    table.x = snap.targetX;
    table.y = snap.targetY;
  }
}

/**
 * Cambia la esquina de alineación (arriba <-> abajo, o izquierda <-> derecha) de una mesa fusionada.
 */
function cycleFusedCornerAlignment(table) {
  if (!table) return;
  if (!table.groupId) {
    fuseWithColindanteRect(table, "auto");
    return;
  }

  let bondOwner = table;
  if (!bondOwner.fusedTo || !bondOwner.fusedTo.anchorId) {
    const child = state.tables.find(
      (t) =>
        t.groupId === table.groupId &&
        t.fusedTo &&
        t.fusedTo.anchorId === table.id
    );
    if (child) bondOwner = child;
  }

  if (bondOwner.fusedTo && bondOwner.fusedTo.anchorId) {
    const anchor = state.tables.find((t) => t.id === bondOwner.fusedTo.anchorId);
    if (anchor) {
      const nextMode =
        bondOwner.fusedTo.tangentMode === "start" ? "end" : "start";
      bondOwner.fusedTo.tangentMode = nextMode;
      const snap = computePairSnap(
        anchor,
        bondOwner,
        bondOwner.fusedTo.sideKey,
        nextMode
      );
      bondOwner.x = snap.targetX;
      bondOwner.y = snap.targetY;
      saveToLocalStorage();
      renderAll();
    }
  }
}

/**
 * Separa la mesa seleccionada de su grupo de unión para poder moverla libremente.
 */
function separateTableFromGroup(table) {
  if (!table) return;
  if (table.groupId) {
    const members = getGroupMembers(table).filter((t) => t.id !== table.id);
    if (members.length > 0) {
      const cx = members.reduce((s, t) => s + t.x, 0) / members.length;
      const cy = members.reduce((s, t) => s + t.y, 0) / members.length;
      const dx = table.x - cx;
      const dy = table.y - cy;
      const dist = Math.hypot(dx, dy) || 1;
      table.x += (dx / dist) * 12;
      table.y += (dy / dist) * 12;
    }
    table.groupId = null;
    table.fusedTo = null;
    for (const t of state.tables) {
      if (t.fusedTo && t.fusedTo.anchorId === table.id) {
        t.fusedTo = null;
      }
    }
    cleanupOrphanGroups();
    if (table.seatsPerSide > 3 && (table.joinedCount || 1) === 1) {
      table.seatsPerSide = 3;
    }
    for (const t of state.tables) {
      normalizeTableConfig(t);
    }
    saveToLocalStorage();
    renderAll();
    return;
  }

  if ((table.joinedCount || 1) > 1) {
    table.joinedCount = Math.max(1, table.joinedCount - 1);
    table.seatsPerSide = getMaxSeatsPerLongSide(table.joinedCount, false);
    normalizeTableConfig(table);
    saveToLocalStorage();
    renderAll();
  }
}

/* ==========================================================================
   CAJONES MÓVILES (DRAWERS)
   ========================================================================== */

function closeMobileDrawers() {
  sidebarLeft.classList.remove("drawer-open");
  sidebarRight.classList.remove("drawer-open");
  mobileBackdrop.classList.remove("open");
  btnNavAdd.classList.remove("active");
  btnNavInspect.classList.remove("active");
  btnNavScale.classList.remove("active");
}

function openLeftDrawer(scrollToScale = false) {
  const alreadyOpen = sidebarLeft.classList.contains("drawer-open");
  closeMobileDrawers();
  if (alreadyOpen && !scrollToScale && btnNavAdd.classList.contains("active")) {
    return;
  }
  sidebarLeft.classList.add("drawer-open");
  mobileBackdrop.classList.add("open");
  if (scrollToScale) {
    btnNavScale.classList.add("active");
    const scaleEl = document.getElementById("scaleSection");
    if (scaleEl) scaleEl.scrollIntoView({ behavior: "smooth" });
  } else {
    btnNavAdd.classList.add("active");
    sidebarLeft.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function openRightDrawer() {
  const alreadyOpen = sidebarRight.classList.contains("drawer-open");
  closeMobileDrawers();
  if (alreadyOpen) return;
  sidebarRight.classList.add("drawer-open");
  mobileBackdrop.classList.add("open");
  btnNavInspect.classList.add("active");
}

btnNavAdd.addEventListener("click", () => openLeftDrawer(false));
btnNavScale.addEventListener("click", () => openLeftDrawer(true));
btnNavInspect.addEventListener("click", openRightDrawer);
mobileBackdrop.addEventListener("click", closeMobileDrawers);
document
  .getElementById("btnCloseLeftDrawer")
  .addEventListener("click", closeMobileDrawers);
document
  .getElementById("btnCloseRightDrawer")
  .addEventListener("click", closeMobileDrawers);

/* ==========================================================================
   RENDERIZADO DEL CATÁLOGO Y DEL LIENZO SVG
   ========================================================================== */

function renderCatalog() {
  catalogList.innerHTML = "";
  const extraLabel = state.defaultAddChairs
    ? state.chairMode === "per_side"
      ? " (+1,0m sillas)"
      : " (+0,5m sillas)"
    : "";

  for (const item of TABLE_CATALOG) {
    const btn = document.createElement("button");
    btn.className = "catalog-item";
    btn.type = "button";

    let shapeHtml = "";
    if (item.shape === "circle") {
      const sizePx = Math.round((item.diameter / 2.0) * 30);
      shapeHtml = `<div class="shape-preview"><div class="shape-circle" style="width:${sizePx}px;height:${sizePx}px;"></div></div>`;
    } else {
      const wPx = Math.round((item.length / 2.0) * 32);
      const hPx = Math.round((item.width / 1.2) * 22);
      shapeHtml = `<div class="shape-preview"><div class="shape-rect" style="width:${wPx}px;height:${hPx}px;"></div></div>`;
    }

    btn.innerHTML = `
      <div class="catalog-item-left">
        ${shapeHtml}
        <div class="catalog-info">
          <h3>${item.name}</h3>
          <p>${item.desc}${extraLabel}</p>
        </div>
      </div>
      <span class="catalog-add-badge">+ Añadir</span>
    `;

    btn.addEventListener("click", () => {
      addTable(item.typeId);
      if (isMobileViewport()) {
        closeMobileDrawers();
      }
    });

    catalogList.appendChild(btn);
  }
}

function findSmartSpawnPosition(typeId, hasChairs) {
  const candidates = [];
  for (let y = 260; y <= 520; y += 85) {
    for (let x = 150; x <= 590; x += 95) {
      candidates.push({ x, y });
    }
  }
  for (let y = 660; y <= 910; y += 85) {
    candidates.push({ x: 155, y });
    candidates.push({ x: 585, y });
  }

  const probe = {
    id: "__probe__",
    typeId,
    x: 371,
    y: 380,
    rotation: 0,
    joinedCount: 1,
    hasChairs
  };

  for (const pt of candidates) {
    probe.x = pt.x;
    probe.y = pt.y;
    let ok = true;
    for (const existing of state.tables) {
      const res = computeTablePairDistanceMeters(probe, existing);
      if (res.distance < state.minClearance) {
        ok = false;
        break;
      }
    }
    if (ok) return pt;
  }

  const offset = (state.tables.length % 7) * 18;
  return { x: 340 + offset, y: 350 + offset };
}

function addTable(typeId, customProps = {}) {
  const spec = getCatalogSpec(typeId);
  const hasChairs =
    customProps.hasChairs !== undefined
      ? customProps.hasChairs
      : state.defaultAddChairs;

  const pos =
    customProps.x !== undefined && customProps.y !== undefined
      ? { x: customProps.x, y: customProps.y }
      : findSmartSpawnPosition(typeId, hasChairs);

  const joinedCount = customProps.joinedCount || 1;
  const rectSides = customProps.rectSides || 2;
  const seatsPerSide =
    customProps.seatsPerSide !== undefined
      ? customProps.seatsPerSide
      : spec.shape === "rect"
      ? getMaxSeatsPerLongSide(joinedCount)
      : undefined;

  const newTable = {
    id: "t_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    name: customProps.name || `M${state.nextCounter++}`,
    typeId: spec.typeId,
    x: pos.x,
    y: pos.y,
    rotation: customProps.rotation || 0,
    hasChairs,
    joinedCount,
    rectSides,
    seatsPerSide,
    seats:
      customProps.seats !== undefined ? customProps.seats : spec.defaultSeats
  };

  normalizeTableConfig(newTable);
  state.tables.push(newTable);
  state.selectedId = newTable.id;
  saveToLocalStorage();
  renderAll();
}

function duplicateSelectedTable() {
  const sel = state.tables.find((t) => t.id === state.selectedId);
  if (!sel) return;
  const dim = getEffectiveDimensions(sel);
  const stepM =
    (dim.shape === "circle" ? dim.effDiameter : dim.effLength) +
    state.minClearance +
    0.05;
  const stepPx = stepM * state.pxPerMeter;

  let nx = sel.x + stepPx;
  let ny = sel.y;
  if (nx > 630) {
    nx = sel.x;
    ny = Math.min(930, sel.y + stepPx);
  }

  addTable(sel.typeId, {
    x: nx,
    y: ny,
    rotation: sel.rotation,
    hasChairs: sel.hasChairs,
    joinedCount: sel.joinedCount,
    rectSides: sel.rectSides,
    seatsPerSide: sel.seatsPerSide,
    seats: sel.seats
  });
}

function deleteSelectedTable() {
  if (!state.selectedId) return;
  state.tables = state.tables.filter((t) => t.id !== state.selectedId);
  state.selectedId = null;
  saveToLocalStorage();
  renderAll();
}

/* ==========================================================================
   CAPAS SVG: CUADRÍCULA, COTAS DEL PLANO, MESAS Y DISTANCIAS
   ========================================================================== */

function renderGridLayer() {
  gridLayer.innerHTML = "";
  if (!state.showGrid) return;

  const ppm = state.pxPerMeter;
  const originX = 72;
  const originY = 41;

  const halfStep = ppm * 0.5;
  let svgHtml = "";

  for (let x = originX; x <= 672; x += halfStep) {
    const isMeter = Math.round((x - originX) / halfStep) % 2 === 0;
    svgHtml += `<line x1="${x.toFixed(1)}" y1="41" x2="${x.toFixed(1)}" y2="965" stroke="${
      isMeter ? "rgba(37, 99, 235, 0.16)" : "rgba(37, 99, 235, 0.07)"
    }" stroke-width="${isMeter ? "1" : "0.6"}" />`;
  }

  for (let y = originY; y <= 965; y += halfStep) {
    const isMeter = Math.round((y - originY) / halfStep) % 2 === 0;
    svgHtml += `<line x1="72" y1="${y.toFixed(1)}" x2="670" y2="${y.toFixed(1)}" stroke="${
      isMeter ? "rgba(37, 99, 235, 0.16)" : "rgba(37, 99, 235, 0.07)"
    }" stroke-width="${isMeter ? "1" : "0.6"}" />`;
  }

  gridLayer.innerHTML = svgHtml;
}

function drawDimensionLineSvg(x1, y1, x2, y2, label, color = "#1e293b") {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  const textRot = angle > 90 || angle < -90 ? angle + 180 : angle;
  const padW = label.length * 6.4 + 10;

  return `
    <g class="dim-line" opacity="0.88" pointer-events="none">
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1.4" stroke-dasharray="4 2" marker-start="url(#arrowStart)" marker-end="url(#arrowEnd)" />
      <g transform="translate(${mx}, ${my}) rotate(${textRot})">
        <rect x="${-padW / 2}" y="-9" width="${padW}" height="18" rx="4" fill="#ffffff" stroke="${color}" stroke-width="1" />
        <text x="0" y="4" text-anchor="middle" font-size="10.5" font-weight="700" fill="${color}">${label}</text>
      </g>
    </g>
  `;
}

function renderDimensionsLayer() {
  dimensionsLayer.innerHTML = "";
  if (!state.showDimensions) return;

  const ppm = state.pxPerMeter;
  const hallW = (670 - 72) / ppm;
  const stageW = (558 - 184) / ppm;
  const hallL = (586 - 180) / ppm;
  const leftWingW = (238 - 76) / ppm;
  const rightWingW = (668 - 505) / ppm;
  const wingL = (964 - 595) / ppm;

  let html = "";
  html += drawDimensionLineSvg(
    184,
    62,
    558,
    62,
    `Cabecera: ${fmtMeters(stageW)}`,
    "#334155"
  );
  html += drawDimensionLineSvg(
    72,
    310,
    670,
    310,
    `Ancho Sala Principal: ${fmtMeters(hallW)} (288,11 m²)`,
    "#1e40af"
  );
  html += drawDimensionLineSvg(
    102,
    180,
    102,
    586,
    `Largo: ${fmtMeters(hallL)}`,
    "#334155"
  );
  html += drawDimensionLineSvg(
    76,
    635,
    238,
    635,
    `Ala Izq: ${fmtMeters(leftWingW)} (54,55 m²)`,
    "#0f766e"
  );
  html += drawDimensionLineSvg(
    96,
    595,
    96,
    964,
    `${fmtMeters(wingL)}`,
    "#0f766e"
  );
  html += drawDimensionLineSvg(
    505,
    635,
    668,
    635,
    `Ala Dcha: ${fmtMeters(rightWingW)} (55,11 m²)`,
    "#0f766e"
  );

  dimensionsLayer.innerHTML = html;
}

function getFreeLongSideInterval(table, baseL, sideYLocal) {
  if (!table.groupId) {
    return { minX: -baseL / 2, maxX: baseL / 2, blockedAll: false };
  }
  const peers = getGroupMembers(table).filter((t) => t.id !== table.id);
  if (peers.length === 0) {
    return { minX: -baseL / 2, maxX: baseL / 2, blockedAll: false };
  }

  const axes = getTableLocalAxes(table);
  const steps = 24;
  const freeXs = [];
  for (let i = 0; i <= steps; i++) {
    const lx = -baseL / 2 + (i / steps) * baseL;
    const wx = table.x + lx * axes.uL.x + sideYLocal * axes.uW.x;
    const wy = table.y + lx * axes.uL.y + sideYLocal * axes.uW.y;
    let covered = false;
    for (const p of peers) {
      if (isWorldPointInsideTableBase(wx, wy, p, 3)) {
        covered = true;
        break;
      }
    }
    if (!covered) {
      freeXs.push(lx);
    }
  }

  if (freeXs.length < 3) {
    return { minX: 0, maxX: 0, blockedAll: true };
  }
  return {
    minX: freeXs[0],
    maxX: freeXs[freeXs.length - 1],
    blockedAll: false
  };
}

function buildChairsSvg(table, dim, ppm, strokeColor) {
  if (!table.hasChairs || table.seats <= 0) return "";
  const chairDepthPx = (state.chairMode === "per_side" ? 0.42 : 0.23) * ppm;
  let html = "";

  if (dim.shape === "circle") {
    const count = Math.max(0, table.seats);
    if (count === 0) return "";
    const baseR = dim.baseRadius * ppm;
    const circumference = 2 * Math.PI * baseR;
    const chairWidthPx = Math.min(0.42 * ppm, (circumference / count) * 0.72, 15);
    const rCenter = baseR + chairDepthPx * 0.55;

    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2;
      const deg = (ang * 180) / Math.PI + 90;
      const cx = Math.cos(ang) * rCenter;
      const cy = Math.sin(ang) * rCenter;
      html += `<rect x="${(cx - chairWidthPx / 2).toFixed(1)}" y="${(
        cy -
        chairDepthPx * 0.35
      ).toFixed(1)}" width="${chairWidthPx.toFixed(1)}" height="${(
        chairDepthPx * 0.7
      ).toFixed(
        1
      )}" rx="3" transform="rotate(${deg.toFixed(1)}, ${cx.toFixed(1)}, ${cy.toFixed(
        1
      )})" fill="#ffffff" stroke="${strokeColor}" stroke-width="1.2" opacity="0.92" />`;
    }
  } else {
    const perSide = Math.max(0, table.seatsPerSide || 0);
    if (perSide === 0) return "";
    const baseL = dim.baseLength * ppm;
    const baseW = dim.baseWidth * ppm;
    const offsetOut = chairDepthPx * 0.55;

    const drawSideChairs = (sideYLocal) => {
      const interval = getFreeLongSideInterval(table, baseL, sideYLocal);
      if (interval.blockedAll) return;
      const spanL = interval.maxX - interval.minX;
      if (spanL < 12) return;
      const chairWidthPx = Math.min(0.42 * ppm, (spanL / perSide) * 0.72, 16);
      for (let i = 0; i < perSide; i++) {
        const x = interval.minX + ((i + 0.5) / perSide) * spanL;
        html += `<rect x="${(x - chairWidthPx / 2).toFixed(1)}" y="${(
          sideYLocal -
          chairDepthPx * 0.35
        ).toFixed(1)}" width="${chairWidthPx.toFixed(1)}" height="${(
          chairDepthPx * 0.7
        ).toFixed(1)}" rx="2.5" fill="#ffffff" stroke="${strokeColor}" stroke-width="1.2" opacity="0.92" />`;
      }
    };

    const sidesMode = table.rectSides === 1 ? 1 : table.rectSides === -1 ? -1 : 2;
    if (sidesMode === 2 || sidesMode === 1) {
      drawSideChairs(-baseW / 2 - offsetOut);
    }
    if (sidesMode === 2 || sidesMode === -1) {
      drawSideChairs(baseW / 2 + offsetOut);
    }
  }
  return html;
}

function renderTablesLayer() {
  tablesLayer.innerHTML = "";
  const ppm = state.pxPerMeter;
  const selTable = state.tables.find((t) => t.id === state.selectedId);
  const selectedGroupId = selTable && selTable.groupId ? selTable.groupId : null;

  // Pasada 1: Halos, zonas de sillas y sillas (debajo de los tableros de madera para que las uniones en U o L se vean limpias)
  for (const table of state.tables) {
    const dim = getEffectiveDimensions(table);
    const isConflict = table.isConflict;
    const strokeColor = isConflict ? "var(--red-stroke)" : "var(--green-stroke)";
    const chairZoneFill = isConflict ? "var(--red-chair)" : "var(--green-chair)";
    const halfClearancePx = (state.minClearance / 2) * ppm;

    const gUnder = document.createElementNS("http://www.w3.org/2000/svg", "g");
    gUnder.setAttribute("class", `table-group ${isConflict ? "conflict" : ""}`);
    gUnder.setAttribute(
      "transform",
      `translate(${table.x.toFixed(1)}, ${table.y.toFixed(1)}) rotate(${(
        table.rotation || 0
      ).toFixed(1)})`
    );
    gUnder.dataset.id = table.id;

    let underSvg = "";
    if (dim.shape === "circle") {
      const effR = dim.effRadius * ppm;
      if (state.showClearanceHalo) {
        underSvg += `<circle r="${(effR + halfClearancePx).toFixed(
          1
        )}" fill="none" stroke="${strokeColor}" stroke-width="1" stroke-dasharray="2 3" opacity="0.55" />`;
      }
      if (table.hasChairs) {
        underSvg += `<circle r="${effR.toFixed(
          1
        )}" fill="${chairZoneFill}" stroke="${strokeColor}" stroke-width="1.3" stroke-dasharray="4 2" />`;
      }
      underSvg += buildChairsSvg(table, dim, ppm, strokeColor);
    } else {
      const effL = dim.effLength * ppm;
      const effW = dim.effWidth * ppm;
      if (state.showClearanceHalo) {
        const haloL = effL + halfClearancePx * 2;
        const haloW = effW + halfClearancePx * 2;
        underSvg += `<rect x="${(-haloL / 2).toFixed(1)}" y="${(
          -haloW / 2
        ).toFixed(1)}" width="${haloL.toFixed(1)}" height="${haloW.toFixed(
          1
        )}" rx="6" fill="none" stroke="${strokeColor}" stroke-width="1" stroke-dasharray="2 3" opacity="0.55" />`;
      }
      if (table.hasChairs) {
        underSvg += `<rect x="${(-effL / 2).toFixed(1)}" y="${(
          -effW / 2
        ).toFixed(1)}" width="${effL.toFixed(1)}" height="${effW.toFixed(
          1
        )}" rx="5" fill="${chairZoneFill}" stroke="${strokeColor}" stroke-width="1.3" stroke-dasharray="4 2" />`;
      }
      underSvg += buildChairsSvg(table, dim, ppm, strokeColor);
    }

    gUnder.innerHTML = underSvg;
    tablesLayer.appendChild(gUnder);
  }

  // Pasada 2: Tableros de las mesas, etiquetas, bordes de grupo y controles de selección
  for (const table of state.tables) {
    const dim = getEffectiveDimensions(table);
    const isSelected = table.id === state.selectedId;
    const isSameGroupAsSelected =
      !isSelected && selectedGroupId && table.groupId === selectedGroupId;
    const isConflict = table.isConflict;

    const fillColor = isConflict ? "var(--red-fill)" : "var(--green-fill)";
    const strokeColor = isConflict ? "var(--red-stroke)" : "var(--green-stroke)";

    const gTop = document.createElementNS("http://www.w3.org/2000/svg", "g");
    gTop.setAttribute(
      "class",
      `table-group ${isSelected ? "selected" : ""} ${isConflict ? "conflict" : ""}`
    );
    gTop.setAttribute(
      "transform",
      `translate(${table.x.toFixed(1)}, ${table.y.toFixed(1)}) rotate(${(
        table.rotation || 0
      ).toFixed(1)})`
    );
    gTop.dataset.id = table.id;

    let innerSvg = "";

    if (dim.shape === "circle") {
      const baseR = dim.baseRadius * ppm;
      const effR = dim.effRadius * ppm;

      innerSvg += `<circle r="${baseR.toFixed(
        1
      )}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />`;

      if (isSelected) {
        innerSvg += `<circle class="selection-outline" r="${(effR + 4).toFixed(
          1
        )}" fill="none" />`;
      }
    } else {
      const baseL = dim.baseLength * ppm;
      const baseW = dim.baseWidth * ppm;
      const effL = dim.effLength * ppm;
      const effW = dim.effWidth * ppm;

      innerSvg += `<rect x="${(-baseL / 2).toFixed(1)}" y="${(
        -baseW / 2
      ).toFixed(1)}" width="${baseL.toFixed(1)}" height="${baseW.toFixed(
        1
      )}" rx="3" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />`;

      if (dim.joinedCount > 1) {
        const unitLPx = baseL / dim.joinedCount;
        for (let k = 1; k < dim.joinedCount; k++) {
          const seamX = -baseL / 2 + k * unitLPx;
          innerSvg += `<line x1="${seamX.toFixed(1)}" y1="${(
            -baseW / 2
          ).toFixed(1)}" x2="${seamX.toFixed(1)}" y2="${(
            baseW / 2
          ).toFixed(1)}" stroke="#ffffff" stroke-width="1.6" stroke-dasharray="3 2" opacity="0.85" />`;
        }
      }

      if (isSameGroupAsSelected) {
        innerSvg += `<rect x="${(-baseL / 2 - 2).toFixed(1)}" y="${(
          -baseW / 2 - 2
        ).toFixed(1)}" width="${(baseL + 4).toFixed(1)}" height="${(
          baseW + 4
        ).toFixed(
          1
        )}" rx="4" fill="none" stroke="#2563eb" stroke-width="1.8" stroke-dasharray="4 2" opacity="0.85" />`;
      }

      if (isSelected) {
        // Resaltar en azul el lado de esta mesa rectangular que está orientado hacia la mesa colindante
        const colInfo = analyzeColindanteRect(table);
        if (colInfo && colInfo.edgeSegmentLocal) {
          const seg = colInfo.edgeSegmentLocal;
          innerSvg += `<line x1="${seg.x1.toFixed(1)}" y1="${seg.y1.toFixed(
            1
          )}" x2="${seg.x2.toFixed(1)}" y2="${seg.y2.toFixed(
            1
          )}" stroke="#2563eb" stroke-width="4.5" stroke-linecap="round" />`;
        }

        const selL = effL + 8;
        const selW = effW + 8;
        innerSvg += `<rect class="selection-outline" x="${(-selL / 2).toFixed(
          1
        )}" y="${(-selW / 2).toFixed(1)}" width="${selL.toFixed(
          1
        )}" height="${selW.toFixed(1)}" rx="6" fill="none" />`;

        const handleY = -effW / 2 - 20;
        innerSvg += `
          <g class="rotate-handle" data-rotate-id="${table.id}">
            <line x1="0" y1="${(-effW / 2).toFixed(1)}" x2="0" y2="${handleY.toFixed(
          1
        )}" stroke="#2563eb" stroke-width="2" />
            <circle cx="0" cy="${handleY.toFixed(
              1
            )}" r="14" fill="rgba(37, 99, 235, 0.15)" />
            <circle cx="0" cy="${handleY.toFixed(
              1
            )}" r="6.5" fill="#2563eb" stroke="#ffffff" stroke-width="1.5" />
          </g>
        `;
      }
    }

    const groupBadge = table.groupId ? " 🔗" : "";
    const joinedBadge =
      dim.shape === "rect" && dim.joinedCount > 1 ? ` (×${dim.joinedCount})` : "";
    const seatsBadge = table.hasChairs ? ` · ${table.seats}🪑` : "";
    const dimText =
      dim.shape === "circle"
        ? `Ø${dim.effDiameter.toFixed(1).replace(".", ",")}m${seatsBadge}`
        : `${dim.effLength.toFixed(1).replace(".", ",")}×${dim.effWidth
            .toFixed(2)
            .replace(/0$/, "")
            .replace(".", ",")}m${seatsBadge}`;

    const counterRot = -(table.rotation || 0);
    innerSvg += `
      <g transform="rotate(${counterRot})" pointer-events="none">
        <text x="0" y="-2" text-anchor="middle" font-size="10" font-weight="800" fill="#ffffff" style="paint-order: stroke; stroke: rgba(0,0,0,0.45); stroke-width: 2.5px;">${table.name}${joinedBadge}${groupBadge}</text>
        <text x="0" y="9" text-anchor="middle" font-size="8" font-weight="700" fill="#ffffff" style="paint-order: stroke; stroke: rgba(0,0,0,0.45); stroke-width: 2px;">${dimText}</text>
      </g>
    `;

    gTop.innerHTML = innerSvg;
    tablesLayer.appendChild(gTop);
  }
}

function renderConflictsLayer(conflicts) {
  conflictsLayer.innerHTML = "";
  const ppm = state.pxPerMeter;
  let html = "";

  for (const c of conflicts) {
    const x1 = c.pA.x * ppm;
    const y1 = c.pA.y * ppm;
    const x2 = c.pB.x * ppm;
    const y2 = c.pB.y * ppm;
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const label =
      c.distance <= 0
        ? "¡Solapadas!"
        : `${c.distance.toFixed(2).replace(".", ",")} m (< ${state.minClearance
            .toFixed(2)
            .replace(".", ",")}m)`;
    const boxW = label.length * 6.2 + 12;

    html += `
      <g pointer-events="none">
        <line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(
      1
    )}" y2="${y2.toFixed(
      1
    )}" stroke="#dc2626" stroke-width="2.2" stroke-dasharray="3 2" />
        <circle cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r="3" fill="#dc2626" />
        <circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="3" fill="#dc2626" />
        <g transform="translate(${mx.toFixed(1)}, ${(my - 10).toFixed(1)})">
          <rect x="${(-boxW / 2).toFixed(1)}" y="-9" width="${boxW.toFixed(
      1
    )}" height="18" rx="9" fill="#dc2626" stroke="#ffffff" stroke-width="1.2" />
          <text x="0" y="3.5" text-anchor="middle" font-size="9.5" font-weight="700" fill="#ffffff">${label}</text>
        </g>
      </g>
    `;
  }

  const sel = state.tables.find((t) => t.id === state.selectedId);
  if (
    sel &&
    !sel.isConflict &&
    sel.nearestOther &&
    sel.nearestPairPoints &&
    Number.isFinite(sel.nearestDist)
  ) {
    const x1 = sel.nearestPairPoints.pA.x * ppm;
    const y1 = sel.nearestPairPoints.pA.y * ppm;
    const x2 = sel.nearestPairPoints.pB.x * ppm;
    const y2 = sel.nearestPairPoints.pB.y * ppm;
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const label = `Paso: ${sel.nearestDist.toFixed(2).replace(".", ",")} m ✓`;
    const boxW = label.length * 6.2 + 12;

    html += `
      <g pointer-events="none" opacity="0.92">
        <line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(
      1
    )}" y2="${y2.toFixed(
      1
    )}" stroke="#15803d" stroke-width="1.8" stroke-dasharray="4 3" />
        <circle cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r="2.8" fill="#15803d" />
        <circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="2.8" fill="#15803d" />
        <g transform="translate(${mx.toFixed(1)}, ${(my - 10).toFixed(1)})">
          <rect x="${(-boxW / 2).toFixed(1)}" y="-9" width="${boxW.toFixed(
      1
    )}" height="18" rx="9" fill="#15803d" stroke="#ffffff" stroke-width="1.2" />
          <text x="0" y="3.5" text-anchor="middle" font-size="9.5" font-weight="700" fill="#ffffff">${label}</text>
        </g>
      </g>
    `;
  }

  // Si la mesa seleccionada es rectangular, mostrar controles rápidos en el plano para fusionar a Izq., Auto o Dcha.
  if (sel && getCatalogSpec(sel.typeId).shape === "rect") {
    const colInfo = analyzeColindanteRect(sel, 3.5);
    if (colInfo && colInfo.other && colInfo.distanceMeters <= 3.5) {
      const x1 = colInfo.edgeMidWorld.x;
      const y1 = colInfo.edgeMidWorld.y;
      const x2 = colInfo.other.x;
      const y2 = colInfo.other.y;
      const mx = Math.max(115, Math.min(PLAN_WIDTH_PX - 115, (x1 + x2) / 2));
      const my = Math.max(25, Math.min(PLAN_HEIGHT_PX - 40, (y1 + y2) / 2 + 12));

      html += `
        <g pointer-events="none">
          <line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(
        1
      )}" y2="${y2.toFixed(
        1
      )}" stroke="#2563eb" stroke-width="2" stroke-dasharray="3 3" />
          <circle cx="${x1.toFixed(1)}" cy="${y1.toFixed(
        1
      )}" r="4" fill="#2563eb" stroke="#fff" stroke-width="1.2" />
        </g>
        <g transform="translate(${mx.toFixed(1)}, ${my.toFixed(1)})">
          <g class="svg-fuse-btn" data-fuse-table="${
            sel.id
          }" data-fuse-dir="left" style="cursor: pointer;" transform="translate(-74, 0)">
            <rect x="-28" y="-11" width="56" height="22" rx="11" fill="#1d4ed8" stroke="#ffffff" stroke-width="1.4" />
            <text x="0" y="3.5" text-anchor="middle" font-size="9.5" font-weight="700" fill="#ffffff">⬅️ Izq.</text>
          </g>
          <g class="svg-fuse-btn" data-fuse-table="${
            sel.id
          }" data-fuse-dir="auto" style="cursor: pointer;">
            <rect x="-42" y="-11" width="84" height="22" rx="11" fill="#2563eb" stroke="#ffffff" stroke-width="1.5" />
            <text x="0" y="3.5" text-anchor="middle" font-size="9.5" font-weight="700" fill="#ffffff">🔗 Fusionar</text>
          </g>
          <g class="svg-fuse-btn" data-fuse-table="${
            sel.id
          }" data-fuse-dir="right" style="cursor: pointer;" transform="translate(74, 0)">
            <rect x="-28" y="-11" width="56" height="22" rx="11" fill="#1d4ed8" stroke="#ffffff" stroke-width="1.4" />
            <text x="0" y="3.5" text-anchor="middle" font-size="9.5" font-weight="700" fill="#ffffff">Dcha. ➡️</text>
          </g>
        </g>
      `;
    }

    if (sel.groupId) {
      const dimSel = getEffectiveDimensions(sel);
      const sepX = Math.max(120, Math.min(PLAN_WIDTH_PX - 120, sel.x));
      const sepY = Math.min(
        PLAN_HEIGHT_PX - 16,
        sel.y + (Math.max(dimSel.effLength, dimSel.effWidth) * ppm) / 2 + 18
      );
      html += `
        <g transform="translate(${sepX.toFixed(1)}, ${sepY.toFixed(1)})">
          <g class="svg-fuse-btn" data-fuse-table="${
            sel.id
          }" data-fuse-dir="left" style="cursor: pointer;" transform="translate(-80, 0)">
            <rect x="-28" y="-10" width="56" height="20" rx="10" fill="#1d4ed8" stroke="#ffffff" stroke-width="1.3" />
            <text x="0" y="3.5" text-anchor="middle" font-size="9" font-weight="700" fill="#ffffff">⬅️ Izq.</text>
          </g>
          <g class="svg-separate-btn" data-separate-table="${
            sel.id
          }" style="cursor: pointer;">
            <rect x="-48" y="-10" width="96" height="20" rx="10" fill="#475569" stroke="#ffffff" stroke-width="1.4" />
            <text x="0" y="3.5" text-anchor="middle" font-size="9.2" font-weight="700" fill="#ffffff">🔓 Separar</text>
          </g>
          <g class="svg-fuse-btn" data-fuse-table="${
            sel.id
          }" data-fuse-dir="right" style="cursor: pointer;" transform="translate(80, 0)">
            <rect x="-28" y="-10" width="56" height="20" rx="10" fill="#1d4ed8" stroke="#ffffff" stroke-width="1.3" />
            <text x="0" y="3.5" text-anchor="middle" font-size="9" font-weight="700" fill="#ffffff">Dcha. ➡️</text>
          </g>
        </g>
      `;
    }
  }

  conflictsLayer.innerHTML = html;
}

function renderToolOverlay() {
  toolOverlayLayer.innerHTML = "";
  let html = "";

  if (state.rulerLine) {
    const { x1, y1, x2, y2 } = state.rulerLine;
    const distM = Math.hypot(x2 - x1, y2 - y1) / state.pxPerMeter;
    html += drawDimensionLineSvg(
      x1,
      y1,
      x2,
      y2,
      `Medida: ${fmtMeters(distM)}`,
      "#7c3aed"
    );
  }

  for (const pt of state.toolPoints) {
    html += `<circle cx="${pt.x}" cy="${pt.y}" r="5" fill="#7c3aed" stroke="#ffffff" stroke-width="2" />`;
  }

  toolOverlayLayer.innerHTML = html;
}

/* ==========================================================================
   PANEL INSPECTOR Y ESTADÍSTICAS SUPERIORES
   ========================================================================== */

function updateStatsAndInspector() {
  const totalPhysicalTables = state.tables.reduce(
    (acc, t) => acc + Math.max(1, t.joinedCount || 1),
    0
  );
  const totalSeats = state.tables.reduce(
    (acc, t) => acc + (t.hasChairs ? Number(t.seats) || 0 : 0),
    0
  );

  statTables.innerHTML = `Mesas: <strong>${totalPhysicalTables}</strong>`;
  statSeats.innerHTML = `Sillas: <strong>${totalSeats}</strong>`;

  const conflictTablesCount = state.tables.filter((t) => t.isConflict).length;
  if (conflictTablesCount === 0) {
    statStatus.className = "stat-pill status-ok";
    statStatus.innerHTML = `<span class="dot green"></span> <span>Paso ≥ ${fmtMeters(
      state.minClearance
    )} OK</span>`;
  } else {
    statStatus.className = "stat-pill status-conflict";
    statStatus.innerHTML = `<span class="dot red"></span> <span>${conflictTablesCount} en rojo (&lt; ${fmtMeters(
      state.minClearance
    )})</span>`;
  }

  lblScaleInfo.textContent = `${state.pxPerMeter
    .toFixed(2)
    .replace(".", ",")} px/m`;

  const sel = state.tables.find((t) => t.id === state.selectedId);
  if (!sel) {
    inspectorEmpty.style.display = "block";
    inspectorContent.style.display = "none";
    mobileQuickBar.classList.remove("visible");
  } else {
    inspectorEmpty.style.display = "none";
    inspectorContent.style.display = "flex";
    mobileQuickBar.classList.add("visible");

    const spec = getCatalogSpec(sel.typeId);
    const dim = getEffectiveDimensions(sel);
    const groupMembers = getGroupMembers(sel);
    const isGrouped = Boolean(sel.groupId && groupMembers.length > 1);

    quickBarTitle.textContent = isGrouped
      ? `${sel.name} (🔗${groupMembers.length})`
      : dim.shape === "rect" && dim.joinedCount > 1
      ? `${sel.name} (×${dim.joinedCount})`
      : sel.name;
    btnQuickChairs.classList.toggle("active", !!sel.hasChairs);
    btnQuickRotate.style.display = dim.shape === "rect" ? "inline-flex" : "none";
    btnQuickJoin.style.display =
      dim.shape === "rect" && isGrouped ? "inline-flex" : "none";
    btnQuickUnjoin.style.display =
      dim.shape === "rect" && (isGrouped || dim.joinedCount > 1)
        ? "inline-flex"
        : "none";

    if (document.activeElement !== inpTableName) {
      inpTableName.value = sel.name;
    }
    lblTableType.textContent = spec.name;
    chkTableChairs.checked = !!sel.hasChairs;

    if (dim.shape === "circle") {
      rectJoinControls.style.display = "none";
      roundSeatsControls.style.display = "flex";
      rectSeatsControls.style.display = "none";
      rotationControls.style.display = "none";
      btnQuickFuseNeighbor.style.display = "none";
      btnQuickFuseLeft.style.display = "none";
      btnQuickFuseRight.style.display = "none";

      lblTableBaseDim.textContent = `Ø ${fmtMeters(dim.baseDiameter)}`;
      lblTableEffDim.textContent = `Ø ${fmtMeters(dim.effDiameter)}${
        sel.hasChairs ? " (con sillas)" : ""
      }`;

      const maxRound = spec.maxSeats || 13;
      lblRoundSeatsMax.textContent = `Nº de sillas (máx. ${maxRound}):`;
      inpTableSeats.max = String(maxRound);
      if (document.activeElement !== inpTableSeats) {
        inpTableSeats.value = sel.seats;
      }
    } else {
      rectJoinControls.style.display = "block";
      roundSeatsControls.style.display = "none";
      rectSeatsControls.style.display = "flex";
      rotationControls.style.display = "block";

      if (isGrouped) {
        lblJoinedCount.textContent = `Grupo unido (${groupMembers.length} mesas)`;
      } else if (dim.joinedCount > 1) {
        lblJoinedCount.textContent = `${dim.joinedCount} tramos unidos`;
      } else {
        lblJoinedCount.textContent = "1 mesa suelta";
      }

      btnUnjoinRect.disabled = !isGrouped && dim.joinedCount <= 1;
      btnJoinRect.disabled = !isGrouped;

      const colInfo = analyzeColindanteRect(sel, 5.0);
      const canFuseLeftRight = Boolean((colInfo && colInfo.other) || isGrouped);
      btnFuseLeft.disabled = !canFuseLeftRight;
      btnFuseRight.disabled = !canFuseLeftRight;
      btnQuickFuseLeft.style.display = canFuseLeftRight
        ? "inline-flex"
        : "none";
      btnQuickFuseRight.style.display = canFuseLeftRight
        ? "inline-flex"
        : "none";

      if (colInfo && colInfo.other) {
        btnMergeNearbyRect.disabled = false;
        btnMergeNearbyRect.textContent = `🔗 Fusionar con ${colInfo.other.name} (Auto)`;
        lblMergeSideInfo.innerHTML = `Puedes fusionar hacia el <strong>lado izquierdo</strong> o el <strong>lado derecho</strong> (o automático por el <strong>${colInfo.sideLabel}</strong> con <strong>${colInfo.other.name}</strong>).`;
        btnQuickFuseNeighbor.style.display = "inline-flex";
        btnQuickFuseNeighbor.textContent = `🔗 Fusionar (${colInfo.other.name})`;
      } else {
        btnMergeNearbyRect.disabled = true;
        btnMergeNearbyRect.textContent = `🔗 Fusionar por lado orientado (Auto)`;
        lblMergeSideInfo.textContent = isGrouped
          ? "Usa «⬅️ Fusionar Izq.» o «Fusionar Dcha. ➡️» para cambiar esta mesa de lado, o añade otra mesa rectangular para completar la forma en U."
          : "Añade otra mesa rectangular al plano para poder fusionarla hacia la izquierda o hacia la derecha.";
        btnQuickFuseNeighbor.style.display = "none";
      }

      lblTableBaseDim.textContent = `${fmtMeters(dim.baseLength)} × ${fmtMeters(
        dim.baseWidth
      )}`;
      lblTableEffDim.textContent = `${fmtMeters(dim.effLength)} × ${fmtMeters(
        dim.effWidth
      )}${sel.hasChairs ? " (con sillas)" : ""}`;

      const maxPerSide = getMaxSeatsPerLongSide(dim.joinedCount, isGrouped);
      lblRectPerSideMax.textContent = `Sillas por largo (máx. ${maxPerSide}):`;
      inpSeatsPerSide.max = String(maxPerSide);
      if (document.activeElement !== inpSeatsPerSide) {
        inpSeatsPerSide.value = sel.seatsPerSide;
      }
      selRectSides.value = String(sel.rectSides || 2);
      const activeSides = Math.abs(sel.rectSides) === 1 ? 1 : 2;
      lblRectTotalSeats.textContent = sel.hasChairs
        ? `${sel.seats} sillas (${sel.seatsPerSide} × ${activeSides} ${
            activeSides === 1 ? "largo" : "largos"
          })`
        : "0 (sillas desactivadas)";

      lblRotationVal.textContent = `${Math.round(sel.rotation || 0)}°`;
      rngTableRotation.value = Math.round(sel.rotation || 0);
    }

    if (!Number.isFinite(sel.nearestDist)) {
      lblNearestDist.textContent = "Sin otras mesas externas";
      lblNearestDist.style.color = "var(--text-muted)";
    } else if (sel.isConflict) {
      lblNearestDist.textContent = `${fmtMeters(
        Math.max(0, sel.nearestDist)
      )} (ROJO < ${fmtMeters(state.minClearance)})`;
      lblNearestDist.style.color = "#dc2626";
    } else {
      lblNearestDist.textContent = `${fmtMeters(sel.nearestDist)} (VERDE ✓)`;
      lblNearestDist.style.color = "#15803d";
    }
  }

  lblListCount.textContent = String(state.tables.length);
  if (state.tables.length === 0) {
    tableListMini.innerHTML = `<div class="empty-state" style="padding: 12px 4px;">No hay mesas todavía. Pulsa en cualquiera de los 6 modelos para añadirla.</div>`;
  } else {
    tableListMini.innerHTML = "";
    for (const t of state.tables) {
      const spec = getCatalogSpec(t.typeId);
      const row = document.createElement("div");
      row.className = `table-row-item ${t.id === state.selectedId ? "selected" : ""}`;
      const dotClass = t.isConflict ? "red" : "green";
      const grpStr = t.groupId ? " 🔗" : "";
      const joinedStr =
        spec.shape === "rect" && t.joinedCount > 1 ? ` (×${t.joinedCount})` : "";
      const chairTag = t.hasChairs ? `🪑 ${t.seats}` : `Sin sillas`;
      row.innerHTML = `
        <div style="display:flex;align-items:center;gap:7px;">
          <span class="dot ${dotClass}"></span>
          <strong>${t.name}${joinedStr}${grpStr}</strong>
          <span style="color:var(--text-muted);font-size:11px;">${spec.name.replace(/^\d+\.\s*/, "")}</span>
        </div>
        <span style="font-size:11px;color:var(--text-muted);">${chairTag}</span>
      `;
      row.addEventListener("click", () => {
        state.selectedId = t.id;
        renderAll();
      });
      tableListMini.appendChild(row);
    }
  }
}

function renderAll() {
  const conflicts = evaluateCollisions();
  renderGridLayer();
  renderDimensionsLayer();
  renderTablesLayer();
  renderConflictsLayer(conflicts);
  renderToolOverlay();
  updateStatsAndInspector();
}

/* ==========================================================================
   VIEWBOX NATIVO Y COORDENADAS SVG (AJUSTE AUTOMÁTICO EN MÓVIL Y ESCRITORIO)
   ========================================================================== */

function updateSvgViewBox() {
  const vbW = PLAN_WIDTH_PX / state.zoom;
  const vbH = PLAN_HEIGHT_PX / state.zoom;
  const cx = PLAN_WIDTH_PX / 2 - state.panX;
  const cy = PLAN_HEIGHT_PX / 2 - state.panY;
  const vbX = cx - vbW / 2;
  const vbY = cy - vbH / 2;
  planSvg.setAttribute(
    "viewBox",
    `${vbX.toFixed(1)} ${vbY.toFixed(1)} ${vbW.toFixed(1)} ${vbH.toFixed(1)}`
  );
  lblZoom.textContent = `${Math.round(state.zoom * 100)}%`;
}

function clientToSvgCoords(clientX, clientY) {
  const ctm = planSvg.getScreenCTM();
  if (ctm) {
    const pt = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return {
      x: Math.max(10, Math.min(PLAN_WIDTH_PX - 10, pt.x)),
      y: Math.max(10, Math.min(PLAN_HEIGHT_PX - 10, pt.y))
    };
  }
  const rect = planSvg.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * PLAN_WIDTH_PX,
    y: ((clientY - rect.top) / rect.height) * PLAN_HEIGHT_PX
  };
}

let dragState = null;
const activePointers = new Map();
let pinchStartDist = null;
let pinchStartZoom = null;

canvasWrapper.addEventListener("pointerdown", (e) => {
  if (
    e.target.closest(".floating-toolbar") ||
    e.target.closest(".mobile-quick-bar") ||
    e.target.closest(".calibration-banner")
  ) {
    return;
  }

  // Comprobar si se pulsó alguno de los botones flotantes de fusión (Izq., Auto o Dcha.) en el propio SVG
  const fuseBtn = e.target.closest("[data-fuse-table]");
  if (fuseBtn) {
    e.stopPropagation();
    const id = fuseBtn.dataset.fuseTable;
    const dir = fuseBtn.dataset.fuseDir || "auto";
    const table = state.tables.find((t) => t.id === id);
    if (table) {
      fuseWithColindanteRect(table, dir);
    }
    return;
  }

  // Comprobar si se pulsó el botón flotante de separar en el propio SVG
  const sepBtn = e.target.closest("[data-separate-table]");
  if (sepBtn) {
    e.stopPropagation();
    const id = sepBtn.dataset.separateTable;
    const table = state.tables.find((t) => t.id === id);
    if (table) {
      separateTableFromGroup(table);
    }
    return;
  }

  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (activePointers.size === 2) {
    dragState = null;
    const pts = Array.from(activePointers.values());
    pinchStartDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    pinchStartZoom = state.zoom;
    return;
  }

  const pt = clientToSvgCoords(e.clientX, e.clientY);

  if (state.interactionMode === "calibrate" || state.interactionMode === "ruler") {
    state.toolPoints.push(pt);
    if (state.toolPoints.length === 1) {
      modeBannerText.textContent = "Ahora toca el segundo punto sobre el plano...";
      state.rulerLine = { x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y };
      renderToolOverlay();
    } else if (state.toolPoints.length === 2) {
      const p1 = state.toolPoints[0];
      const p2 = state.toolPoints[1];
      const distPx = Math.hypot(p2.x - p1.x, p2.y - p1.y);

      if (state.interactionMode === "calibrate" && distPx > 5) {
        const currentMeters = (distPx / state.pxPerMeter).toFixed(2);
        const input = prompt(
          "Introduce la medida real en metros entre esos dos puntos:",
          currentMeters
        );
        if (input !== null) {
          const val = parseFloat(input.replace(",", "."));
          if (val > 0.1 && val < 200) {
            state.pxPerMeter = distPx / val;
            inpHallWidth.value = (DEFAULT_HALL_WIDTH_PX / state.pxPerMeter).toFixed(2);
            saveToLocalStorage();
          }
        }
      } else if (state.interactionMode === "ruler") {
        state.rulerLine = { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
      }

      setInteractionMode("normal");
      renderAll();
    }
    return;
  }

  const rotateGroup = e.target.closest("[data-rotate-id]");
  if (rotateGroup) {
    const id = rotateGroup.dataset.rotateId;
    const table = state.tables.find((t) => t.id === id);
    if (table) {
      e.stopPropagation();
      state.selectedId = id;
      dragState = {
        type: "rotate",
        pointerId: e.pointerId,
        table
      };
      canvasWrapper.setPointerCapture(e.pointerId);
      renderAll();
      return;
    }
  }

  const tableGroup = e.target.closest(".table-group");
  if (tableGroup) {
    const id = tableGroup.dataset.id;
    const table = state.tables.find((t) => t.id === id);
    if (table) {
      state.selectedId = id;
      const members = getGroupMembers(table);
      dragState = {
        type: "move",
        pointerId: e.pointerId,
        table,
        startPtX: pt.x,
        startPtY: pt.y,
        memberStarts: members.map((m) => ({
          table: m,
          startX: m.x,
          startY: m.y
        }))
      };
      canvasWrapper.setPointerCapture(e.pointerId);
      renderAll();
      return;
    }
  }

  dragState = {
    type: "pan",
    pointerId: e.pointerId,
    startX: e.clientX,
    startY: e.clientY,
    origPanX: state.panX,
    origPanY: state.panY,
    moved: false
  };
  canvasWrapper.setPointerCapture(e.pointerId);
});

canvasWrapper.addEventListener("pointermove", (e) => {
  if (activePointers.has(e.pointerId)) {
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  if (activePointers.size === 2 && pinchStartDist > 10) {
    const pts = Array.from(activePointers.values());
    const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    const scaleFactor = dist / pinchStartDist;
    applyZoom(pinchStartZoom * scaleFactor);
    return;
  }

  const pt = clientToSvgCoords(e.clientX, e.clientY);

  if (
    (state.interactionMode === "calibrate" || state.interactionMode === "ruler") &&
    state.toolPoints.length === 1
  ) {
    const p1 = state.toolPoints[0];
    state.rulerLine = { x1: p1.x, y1: p1.y, x2: pt.x, y2: pt.y };
    renderToolOverlay();
    return;
  }

  if (!dragState || dragState.pointerId !== e.pointerId) return;

  if (dragState.type === "move") {
    const dx = pt.x - dragState.startPtX;
    const dy = pt.y - dragState.startPtY;
    for (const item of dragState.memberStarts) {
      item.table.x = Math.max(
        25,
        Math.min(PLAN_WIDTH_PX - 25, item.startX + dx)
      );
      item.table.y = Math.max(
        25,
        Math.min(PLAN_HEIGHT_PX - 25, item.startY + dy)
      );
    }
    renderAll();
  } else if (dragState.type === "rotate") {
    const dx = pt.x - dragState.table.x;
    const dy = pt.y - dragState.table.y;
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    deg = ((deg % 180) + 180) % 180;
    const snap15 = Math.round(deg / 15) * 15;
    if (Math.abs(deg - snap15) < 3) deg = snap15 % 180;
    dragState.table.rotation = deg;
    reSnapFusedTableAfterRotation(dragState.table);
    renderAll();
  } else if (dragState.type === "pan") {
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    if (Math.hypot(dx, dy) > 4) {
      dragState.moved = true;
    }
    const ctm = planSvg.getScreenCTM();
    const scaleScreenToSvg = ctm && ctm.a ? 1 / ctm.a : 1;
    state.panX = dragState.origPanX + dx * scaleScreenToSvg;
    state.panY = dragState.origPanY + dy * scaleScreenToSvg;
    updateSvgViewBox();
  }
});

function handlePointerUpOrCancel(e) {
  activePointers.delete(e.pointerId);
  if (activePointers.size < 2) {
    pinchStartDist = null;
  }

  if (dragState && dragState.pointerId === e.pointerId) {
    if (dragState.type === "pan" && !dragState.moved) {
      state.selectedId = null;
      state.rulerLine = null;
      renderAll();
    } else if (dragState.type === "move" || dragState.type === "rotate") {
      saveToLocalStorage();
    }
    dragState = null;
  }
}

canvasWrapper.addEventListener("pointerup", handlePointerUpOrCancel);
canvasWrapper.addEventListener("pointercancel", handlePointerUpOrCancel);

/* ==========================================================================
   CONTROLES DE INTERFAZ Y EVENTOS
   ========================================================================== */

function setInteractionMode(mode) {
  state.interactionMode = mode;
  state.toolPoints = [];
  const btnRuler = document.getElementById("btnToggleRuler");
  const btnCal = document.getElementById("btnCalibrateTwoPoints");

  btnRuler.classList.toggle("active", mode === "ruler");
  btnCal.classList.toggle("active", mode === "calibrate");

  if (mode === "normal") {
    modeBanner.classList.remove("visible");
  } else if (mode === "calibrate") {
    closeMobileDrawers();
    modeBanner.classList.add("visible");
    modeBannerText.textContent =
      "Calibrar: Toca el primer extremo de una pared conocida...";
  } else if (mode === "ruler") {
    closeMobileDrawers();
    modeBanner.classList.add("visible");
    modeBannerText.textContent =
      "Regla: Toca dos puntos del plano para medir su distancia...";
  }
}

chkDefaultChairs.addEventListener("change", () => {
  state.defaultAddChairs = chkDefaultChairs.checked;
  renderCatalog();
  saveToLocalStorage();
});

selChairMode.addEventListener("change", () => {
  state.chairMode = selChairMode.value;
  renderCatalog();
  renderAll();
  saveToLocalStorage();
});

document.getElementById("btnChairsAllOn").addEventListener("click", () => {
  for (const t of state.tables) t.hasChairs = true;
  saveToLocalStorage();
  renderAll();
});

document.getElementById("btnChairsAllOff").addEventListener("click", () => {
  for (const t of state.tables) t.hasChairs = false;
  saveToLocalStorage();
  renderAll();
});

inpHallWidth.addEventListener("change", () => {
  const val = parseFloat(inpHallWidth.value);
  if (val >= 4 && val <= 100) {
    state.pxPerMeter = DEFAULT_HALL_WIDTH_PX / val;
    saveToLocalStorage();
    renderAll();
  }
});

inpMinClearance.addEventListener("change", () => {
  const val = parseFloat(inpMinClearance.value);
  if (val >= 0.05 && val <= 5) {
    state.minClearance = val;
    saveToLocalStorage();
    renderAll();
  }
});

chkShowDimensions.addEventListener("change", () => {
  state.showDimensions = chkShowDimensions.checked;
  renderAll();
});

chkShowGrid.addEventListener("change", () => {
  state.showGrid = chkShowGrid.checked;
  renderAll();
});

chkShowClearanceHalo.addEventListener("change", () => {
  state.showClearanceHalo = chkShowClearanceHalo.checked;
  renderAll();
});

chkCleanPlan.addEventListener("change", () => {
  state.cleanPlan = chkCleanPlan.checked;
  planImage.setAttribute(
    "href",
    state.cleanPlan ? "plano.png" : "plano_original.jpg"
  );
});

document.getElementById("btnCalibrateTwoPoints").addEventListener("click", () => {
  setInteractionMode(
    state.interactionMode === "calibrate" ? "normal" : "calibrate"
  );
});

document.getElementById("btnToggleRuler").addEventListener("click", () => {
  setInteractionMode(state.interactionMode === "ruler" ? "normal" : "ruler");
});

document.getElementById("btnCancelMode").addEventListener("click", () => {
  state.rulerLine = null;
  setInteractionMode("normal");
  renderToolOverlay();
});

document.getElementById("btnResetScale").addEventListener("click", () => {
  state.pxPerMeter = DEFAULT_PX_PER_M;
  inpHallWidth.value = DEFAULT_HALL_WIDTH_M.toFixed(2);
  saveToLocalStorage();
  renderAll();
});

inpTableName.addEventListener("input", () => {
  const sel = state.tables.find((t) => t.id === state.selectedId);
  if (sel) {
    sel.name = inpTableName.value || "Mesa";
    saveToLocalStorage();
    renderAll();
  }
});

chkTableChairs.addEventListener("change", () => {
  const sel = state.tables.find((t) => t.id === state.selectedId);
  if (sel) {
    sel.hasChairs = chkTableChairs.checked;
    saveToLocalStorage();
    renderAll();
  }
});

inpTableSeats.addEventListener("input", () => {
  const sel = state.tables.find((t) => t.id === state.selectedId);
  if (sel) {
    const spec = getCatalogSpec(sel.typeId);
    const maxRound = spec.maxSeats || 13;
    sel.seats = Math.max(
      0,
      Math.min(maxRound, parseInt(inpTableSeats.value, 10) || 0)
    );
    inpTableSeats.value = sel.seats;
    saveToLocalStorage();
    renderAll();
  }
});

inpSeatsPerSide.addEventListener("input", () => {
  const sel = state.tables.find((t) => t.id === state.selectedId);
  if (sel) {
    const maxPerSide = getMaxSeatsPerLongSide(
      sel.joinedCount || 1,
      Boolean(sel.groupId)
    );
    sel.seatsPerSide = Math.max(
      0,
      Math.min(maxPerSide, parseInt(inpSeatsPerSide.value, 10) || 0)
    );
    inpSeatsPerSide.value = sel.seatsPerSide;
    normalizeTableConfig(sel);
    saveToLocalStorage();
    renderAll();
  }
});

selRectSides.addEventListener("change", () => {
  const sel = state.tables.find((t) => t.id === state.selectedId);
  if (sel) {
    const val = parseInt(selRectSides.value, 10);
    sel.rectSides = val === 1 ? 1 : val === -1 ? -1 : 2;
    normalizeTableConfig(sel);
    saveToLocalStorage();
    renderAll();
  }
});

// Botones de fusión y unión de mesas rectangulares
btnMergeNearbyRect.addEventListener("click", () => {
  const sel = state.tables.find((t) => t.id === state.selectedId);
  fuseWithColindanteRect(sel, "auto");
});

btnFuseLeft.addEventListener("click", () => {
  const sel = state.tables.find((t) => t.id === state.selectedId);
  fuseWithColindanteRect(sel, "left");
});

btnFuseRight.addEventListener("click", () => {
  const sel = state.tables.find((t) => t.id === state.selectedId);
  fuseWithColindanteRect(sel, "right");
});

btnTopFuseRect.addEventListener("click", () => {
  const sel = state.tables.find((t) => t.id === state.selectedId);
  fuseWithColindanteRect(
    sel && getCatalogSpec(sel.typeId).shape === "rect" ? sel : null,
    "auto"
  );
});

btnQuickFuseNeighbor.addEventListener("click", () => {
  const sel = state.tables.find((t) => t.id === state.selectedId);
  fuseWithColindanteRect(sel, "auto");
});

btnQuickFuseLeft.addEventListener("click", () => {
  const sel = state.tables.find((t) => t.id === state.selectedId);
  fuseWithColindanteRect(sel, "left");
});

btnQuickFuseRight.addEventListener("click", () => {
  const sel = state.tables.find((t) => t.id === state.selectedId);
  fuseWithColindanteRect(sel, "right");
});

btnJoinRect.addEventListener("click", () => {
  const sel = state.tables.find((t) => t.id === state.selectedId);
  cycleFusedCornerAlignment(sel);
});

btnUnjoinRect.addEventListener("click", () => {
  const sel = state.tables.find((t) => t.id === state.selectedId);
  separateTableFromGroup(sel);
});

rngTableRotation.addEventListener("input", () => {
  const sel = state.tables.find((t) => t.id === state.selectedId);
  if (sel) {
    sel.rotation = parseFloat(rngTableRotation.value) || 0;
    reSnapFusedTableAfterRotation(sel);
    saveToLocalStorage();
    renderAll();
  }
});

document.querySelectorAll(".quick-angles .btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const sel = state.tables.find((t) => t.id === state.selectedId);
    if (sel) {
      sel.rotation = parseFloat(btn.dataset.angle) || 0;
      reSnapFusedTableAfterRotation(sel);
      saveToLocalStorage();
      renderAll();
    }
  });
});

document
  .getElementById("btnDuplicateTable")
  .addEventListener("click", duplicateSelectedTable);
document
  .getElementById("btnDeleteTable")
  .addEventListener("click", deleteSelectedTable);

btnQuickChairs.addEventListener("click", () => {
  const sel = state.tables.find((t) => t.id === state.selectedId);
  if (sel) {
    sel.hasChairs = !sel.hasChairs;
    saveToLocalStorage();
    renderAll();
  }
});

btnQuickJoin.addEventListener("click", () => {
  const sel = state.tables.find((t) => t.id === state.selectedId);
  cycleFusedCornerAlignment(sel);
});

btnQuickUnjoin.addEventListener("click", () => {
  const sel = state.tables.find((t) => t.id === state.selectedId);
  separateTableFromGroup(sel);
});

btnQuickRotate.addEventListener("click", () => {
  const sel = state.tables.find((t) => t.id === state.selectedId);
  if (sel) {
    sel.rotation = ((sel.rotation || 0) + 45) % 180;
    reSnapFusedTableAfterRotation(sel);
    saveToLocalStorage();
    renderAll();
  }
});

btnQuickDup.addEventListener("click", duplicateSelectedTable);
btnQuickDel.addEventListener("click", deleteSelectedTable);

document.getElementById("btnClearAll").addEventListener("click", () => {
  if (state.tables.length === 0) return;
  if (confirm("¿Seguro que quieres borrar todas las mesas del plano?")) {
    state.tables = [];
    state.selectedId = null;
    state.nextCounter = 1;
    saveToLocalStorage();
    renderAll();
  }
});

document.getElementById("btnAutoDemo").addEventListener("click", () => {
  loadSampleLayout();
});

document.getElementById("btnExportImg").addEventListener("click", () => {
  window.print();
});

// Zoom y encaje
function applyZoom(newZoom) {
  state.zoom = Math.max(0.6, Math.min(4.0, newZoom));
  updateSvgViewBox();
}

function fitPlanToViewport() {
  state.zoom = 1.0;
  state.panX = 0;
  state.panY = 0;
  updateSvgViewBox();
}

document.getElementById("btnZoomIn").addEventListener("click", () => {
  applyZoom(state.zoom + 0.2);
});
document.getElementById("btnZoomOut").addEventListener("click", () => {
  applyZoom(state.zoom - 0.2);
});
document
  .getElementById("btnZoomFit")
  .addEventListener("click", fitPlanToViewport);

canvasWrapper.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.12 : -0.12;
    applyZoom(state.zoom + delta);
  },
  { passive: false }
);

// Atajos de teclado
window.addEventListener("keydown", (e) => {
  if (
    document.activeElement &&
    ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)
  ) {
    return;
  }

  if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    deleteSelectedTable();
  } else if (e.key.toLowerCase() === "d") {
    e.preventDefault();
    duplicateSelectedTable();
  } else if (e.key.toLowerCase() === "r") {
    const sel = state.tables.find((t) => t.id === state.selectedId);
    if (sel) {
      sel.rotation = ((sel.rotation || 0) + 45) % 180;
      reSnapFusedTableAfterRotation(sel);
      saveToLocalStorage();
      renderAll();
    }
  } else if (e.key.toLowerCase() === "s") {
    const sel = state.tables.find((t) => t.id === state.selectedId);
    if (sel) {
      sel.hasChairs = !sel.hasChairs;
      saveToLocalStorage();
      renderAll();
    }
  } else if (e.key.toLowerCase() === "f") {
    const sel = state.tables.find((t) => t.id === state.selectedId);
    if (sel && getCatalogSpec(sel.typeId).shape === "rect") {
      e.preventDefault();
      fuseWithColindanteRect(sel);
    }
  }
});

/* ==========================================================================
   PERSISTENCIA Y EJEMPLO INICIAL
   ========================================================================== */

const STORAGE_KEY = "adamil_plano_mesas_v2";

function saveToLocalStorage() {
  try {
    const payload = {
      pxPerMeter: state.pxPerMeter,
      minClearance: state.minClearance,
      chairMode: state.chairMode,
      defaultAddChairs: state.defaultAddChairs,
      nextCounter: state.nextCounter,
      tables: state.tables
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (_) {}
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data && Array.isArray(data.tables)) {
      state.pxPerMeter = data.pxPerMeter || DEFAULT_PX_PER_M;
      state.minClearance = data.minClearance || 0.5;
      state.chairMode = data.chairMode || "total";
      state.defaultAddChairs =
        data.defaultAddChairs !== undefined ? data.defaultAddChairs : true;
      state.nextCounter = data.nextCounter || data.tables.length + 1;

      const expandedTables = [];
      for (const t of data.tables) {
        const spec = getCatalogSpec(t.typeId);
        const k = Math.max(1, Math.round(t.joinedCount || 1));
        if (spec.shape === "rect" && k > 1) {
          const grpId =
            t.groupId ||
            "grp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
          const unitLPx = spec.length * state.pxPerMeter;
          const axes = getTableLocalAxes(t);
          let prevId = null;
          for (let i = 0; i < k; i++) {
            const offset = (i - (k - 1) / 2) * unitLPx;
            const pieceId =
              i === 0
                ? t.id
                : "t_" + Date.now() + "_" + i + "_" + Math.random().toString(36).slice(2, 5);
            const piece = {
              ...t,
              id: pieceId,
              name: i === 0 ? t.name : `${t.name}-${i + 1}`,
              x: t.x + offset * axes.uL.x,
              y: t.y + offset * axes.uL.y,
              joinedCount: 1,
              groupId: grpId,
              seatsPerSide: i % 2 === 0 && i + 1 < k ? 4 : 3,
              fusedTo: prevId
                ? { anchorId: prevId, sideKey: "right_end", tangentMode: "start" }
                : null
            };
            normalizeTableConfig(piece);
            expandedTables.push(piece);
            prevId = pieceId;
          }
        } else {
          normalizeTableConfig(t);
          expandedTables.push(t);
        }
      }
      state.tables = expandedTables;

      inpHallWidth.value = (DEFAULT_HALL_WIDTH_PX / state.pxPerMeter).toFixed(2);
      inpMinClearance.value = state.minClearance.toFixed(2);
      selChairMode.value = state.chairMode;
      chkDefaultChairs.checked = state.defaultAddChairs;
      return true;
    }
  } catch (_) {}
  return false;
}

function loadSampleLayout() {
  state.tables = [];
  state.nextCounter = 1;

  addTable("rect_xl", {
    name: "Presidencia",
    x: 371,
    y: 125,
    rotation: 0,
    hasChairs: true,
    joinedCount: 1,
    rectSides: 1,
    seatsPerSide: 3
  });

  addTable("round_lg", { name: "M1", x: 185, y: 270, hasChairs: true, seats: 13 });
  addTable("round_lg", { name: "M2", x: 371, y: 270, hasChairs: true, seats: 13 });
  addTable("round_lg", { name: "M3", x: 555, y: 270, hasChairs: true, seats: 13 });

  addTable("round_md", { name: "M4", x: 185, y: 410, hasChairs: true, seats: 11 });
  addTable("round_md", { name: "M5", x: 371, y: 410, hasChairs: true, seats: 11 });
  addTable("round_md", { name: "M6", x: 555, y: 410, hasChairs: true, seats: 11 });

  addTable("round_sm", { name: "M7", x: 260, y: 525, hasChairs: true, seats: 4 });
  addTable("round_sm", { name: "M8", x: 480, y: 525, hasChairs: true, seats: 4 });

  addTable("rect_lg", {
    name: "Mesa Izq",
    x: 155,
    y: 925,
    rotation: 0,
    hasChairs: true,
    joinedCount: 1,
    rectSides: 2,
    seatsPerSide: 3
  });
  addTable("rect_sm", {
    name: "Mesa Dcha",
    x: 585,
    y: 925,
    rotation: 0,
    hasChairs: true,
    joinedCount: 1,
    rectSides: 2,
    seatsPerSide: 3
  });

  state.selectedId = state.tables[0].id;
  saveToLocalStorage();
  renderAll();
}

// Inicialización
window.addEventListener("DOMContentLoaded", () => {
  const loaded = loadFromLocalStorage();
  renderCatalog();
  if (!loaded || state.tables.length === 0) {
    loadSampleLayout();
  } else {
    renderAll();
  }
  fitPlanToViewport();
});

window.addEventListener("resize", () => {
  if (!isMobileViewport()) {
    closeMobileDrawers();
  }
});
