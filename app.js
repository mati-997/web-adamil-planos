/**
 * Planificador de Mesas a Escala - Adamil (Responsive Desktop & Mobile)
 * Reglas:
 * 1. Mesa redonda grande: 2.0m diámetro
 * 2. Mesa redonda mediana: 1.8m diámetro
 * 3. Mesa redonda pequeña: 1.2m diámetro
 * 4. Mesa rectangular pequeña: 1.8m largo x 0.75m ancho
 * 5. Mesa rectangular grande: 2.0m largo x 0.90m ancho
 * 6. Mesa rectangular extra ancha: 1.8m largo x 1.20m ancho
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
    defaultSeats: 10,
    desc: "Ø 2,00 m de diámetro"
  },
  {
    typeId: "round_md",
    code: "2",
    name: "2. Mesa redonda mediana",
    shape: "circle",
    diameter: 1.8,
    defaultSeats: 8,
    desc: "Ø 1,80 m de diámetro"
  },
  {
    typeId: "round_sm",
    code: "3",
    name: "3. Mesa redonda pequeña",
    shape: "circle",
    diameter: 1.2,
    defaultSeats: 6,
    desc: "Ø 1,20 m de diámetro"
  },
  {
    typeId: "rect_sm",
    code: "4",
    name: "4. Mesa rectangular pequeña",
    shape: "rect",
    length: 1.8,
    width: 0.75,
    defaultSeats: 6,
    desc: "1,80 m largo × 0,75 m ancho"
  },
  {
    typeId: "rect_lg",
    code: "5",
    name: "5. Mesa rectangular grande",
    shape: "rect",
    length: 2.0,
    width: 0.9,
    defaultSeats: 8,
    desc: "2,00 m largo × 0,90 m ancho"
  },
  {
    typeId: "rect_xl",
    code: "6",
    name: "6. Mesa rectangular extra ancha",
    shape: "rect",
    length: 1.8,
    width: 1.2,
    defaultSeats: 8,
    desc: "1,80 m largo × 1,20 m ancho"
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
  zoom: 0.85,
  panX: 0,
  panY: 0,
  tables: [],
  selectedId: null,
  nextCounter: 1,
  interactionMode: "normal", // 'normal' | 'calibrate' | 'ruler'
  toolPoints: [],
  rulerLine: null
};

// Elementos DOM
const planImage = document.getElementById("planImage");
const planSvg = document.getElementById("planSvg");
const canvasWrapper = document.getElementById("canvasWrapper");
const canvasStage = document.getElementById("canvasStage");
const gridLayer = document.getElementById("gridLayer");
const dimensionsLayer = document.getElementById("dimensionsLayer");
const tablesLayer = document.getElementById("tablesLayer");
const conflictsLayer = document.getElementById("conflictsLayer");
const toolOverlayLayer = document.getElementById("toolOverlayLayer");

const catalogList = document.getElementById("catalogList");
const chkDefaultChairs = document.getElementById("chkDefaultChairs");
const selChairMode = document.getElementById("selChairMode");
const chairModeHint = document.getElementById("chairModeHint");
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
const inpTableSeats = document.getElementById("inpTableSeats");
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
const btnQuickChairs = document.getElementById("btnQuickChairs");
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
      baseDiameter: baseD,
      effDiameter: effD,
      baseRadius: baseD / 2,
      effRadius: effD / 2
    };
  } else {
    const baseL = spec.length;
    const baseW = spec.width;
    const effL = baseL + extra;
    const effW = baseW + extra;
    return {
      shape: "rect",
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
  const n = state.tables.length;
  const conflicts = [];
  const EPS = 0.001;

  for (const t of state.tables) {
    t.isConflict = false;
    t.nearestDist = Infinity;
    t.nearestOther = null;
    t.nearestPairPoints = null;
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const tA = state.tables[i];
      const tB = state.tables[j];
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
      ? " (+1,00m con sillas)"
      : " (+0,50m con sillas)"
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

  const newTable = {
    id: "t_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    name: customProps.name || `M${state.nextCounter++}`,
    typeId: spec.typeId,
    x: pos.x,
    y: pos.y,
    rotation: customProps.rotation || 0,
    hasChairs,
    seats:
      customProps.seats !== undefined ? customProps.seats : spec.defaultSeats
  };

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

function buildChairsSvg(table, dim, ppm, strokeColor) {
  if (!table.hasChairs || table.seats <= 0) return "";
  const count = Math.min(30, Math.max(1, table.seats));
  const chairDepthPx = (state.chairMode === "per_side" ? 0.42 : 0.23) * ppm;
  const chairWidthPx = Math.min(0.45 * ppm, 16);
  let html = "";

  if (dim.shape === "circle") {
    const baseR = dim.baseRadius * ppm;
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
      )})" fill="#ffffff" stroke="${strokeColor}" stroke-width="1.2" opacity="0.9" />`;
    }
  } else {
    const baseL = dim.baseLength * ppm;
    const baseW = dim.baseWidth * ppm;
    const useEnds = count >= 6 && baseW >= 0.85 * ppm;
    const endSeats = useEnds ? 2 : 0;
    const sideSeats = Math.max(0, count - endSeats);
    const topCount = Math.ceil(sideSeats / 2);
    const botCount = Math.floor(sideSeats / 2);

    const offsetOut = chairDepthPx * 0.55;
    for (let i = 0; i < topCount; i++) {
      const x = -baseL / 2 + ((i + 0.5) / topCount) * baseL;
      const y = -baseW / 2 - offsetOut;
      html += `<rect x="${(x - chairWidthPx / 2).toFixed(1)}" y="${(
        y -
        chairDepthPx * 0.35
      ).toFixed(1)}" width="${chairWidthPx.toFixed(1)}" height="${(
        chairDepthPx * 0.7
      ).toFixed(1)}" rx="2.5" fill="#ffffff" stroke="${strokeColor}" stroke-width="1.2" opacity="0.9" />`;
    }
    for (let i = 0; i < botCount; i++) {
      const x = -baseL / 2 + ((i + 0.5) / botCount) * baseL;
      const y = baseW / 2 + offsetOut;
      html += `<rect x="${(x - chairWidthPx / 2).toFixed(1)}" y="${(
        y -
        chairDepthPx * 0.35
      ).toFixed(1)}" width="${chairWidthPx.toFixed(1)}" height="${(
        chairDepthPx * 0.7
      ).toFixed(1)}" rx="2.5" fill="#ffffff" stroke="${strokeColor}" stroke-width="1.2" opacity="0.9" />`;
    }
    if (useEnds) {
      const xLeft = -baseL / 2 - offsetOut;
      const xRight = baseL / 2 + offsetOut;
      html += `<rect x="${(xLeft - chairDepthPx * 0.35).toFixed(1)}" y="${(
        -chairWidthPx / 2
      ).toFixed(1)}" width="${(chairDepthPx * 0.7).toFixed(
        1
      )}" height="${chairWidthPx.toFixed(1)}" rx="2.5" fill="#ffffff" stroke="${strokeColor}" stroke-width="1.2" opacity="0.9" />`;
      html += `<rect x="${(xRight - chairDepthPx * 0.35).toFixed(1)}" y="${(
        -chairWidthPx / 2
      ).toFixed(1)}" width="${(chairDepthPx * 0.7).toFixed(
        1
      )}" height="${chairWidthPx.toFixed(1)}" rx="2.5" fill="#ffffff" stroke="${strokeColor}" stroke-width="1.2" opacity="0.9" />`;
    }
  }
  return html;
}

function renderTablesLayer() {
  tablesLayer.innerHTML = "";
  const ppm = state.pxPerMeter;

  for (const table of state.tables) {
    const dim = getEffectiveDimensions(table);
    const isSelected = table.id === state.selectedId;
    const isConflict = table.isConflict;

    const fillColor = isConflict ? "var(--red-fill)" : "var(--green-fill)";
    const strokeColor = isConflict ? "var(--red-stroke)" : "var(--green-stroke)";
    const chairZoneFill = isConflict ? "var(--red-chair)" : "var(--green-chair)";

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute(
      "class",
      `table-group ${isSelected ? "selected" : ""} ${isConflict ? "conflict" : ""}`
    );
    g.setAttribute(
      "transform",
      `translate(${table.x.toFixed(1)}, ${table.y.toFixed(1)}) rotate(${(
        table.rotation || 0
      ).toFixed(1)})`
    );
    g.dataset.id = table.id;

    let innerSvg = "";
    const halfClearancePx = (state.minClearance / 2) * ppm;

    if (dim.shape === "circle") {
      const baseR = dim.baseRadius * ppm;
      const effR = dim.effRadius * ppm;

      if (state.showClearanceHalo) {
        innerSvg += `<circle r="${(effR + halfClearancePx).toFixed(
          1
        )}" fill="none" stroke="${strokeColor}" stroke-width="1" stroke-dasharray="2 3" opacity="0.55" />`;
      }

      if (table.hasChairs) {
        innerSvg += `<circle r="${effR.toFixed(
          1
        )}" fill="${chairZoneFill}" stroke="${strokeColor}" stroke-width="1.3" stroke-dasharray="4 2" />`;
      }

      innerSvg += buildChairsSvg(table, dim, ppm, strokeColor);

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

      if (state.showClearanceHalo) {
        const haloL = effL + halfClearancePx * 2;
        const haloW = effW + halfClearancePx * 2;
        innerSvg += `<rect x="${(-haloL / 2).toFixed(1)}" y="${(
          -haloW / 2
        ).toFixed(1)}" width="${haloL.toFixed(1)}" height="${haloW.toFixed(
          1
        )}" rx="6" fill="none" stroke="${strokeColor}" stroke-width="1" stroke-dasharray="2 3" opacity="0.55" />`;
      }

      if (table.hasChairs) {
        innerSvg += `<rect x="${(-effL / 2).toFixed(1)}" y="${(
          -effW / 2
        ).toFixed(1)}" width="${effL.toFixed(1)}" height="${effW.toFixed(
          1
        )}" rx="5" fill="${chairZoneFill}" stroke="${strokeColor}" stroke-width="1.3" stroke-dasharray="4 2" />`;
      }

      innerSvg += buildChairsSvg(table, dim, ppm, strokeColor);

      innerSvg += `<rect x="${(-baseL / 2).toFixed(1)}" y="${(
        -baseW / 2
      ).toFixed(1)}" width="${baseL.toFixed(1)}" height="${baseW.toFixed(
        1
      )}" rx="3" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />`;

      if (isSelected) {
        const selL = effL + 8;
        const selW = effW + 8;
        innerSvg += `<rect class="selection-outline" x="${(-selL / 2).toFixed(
          1
        )}" y="${(-selW / 2).toFixed(1)}" width="${selL.toFixed(
          1
        )}" height="${selW.toFixed(1)}" rx="6" fill="none" />`;

        // Tirador de rotación más amplio para uso táctil en móvil
        const handleY = -effW / 2 - 20;
        innerSvg += `
          <g class="rotate-handle" data-rotate-id="${table.id}">
            <line x1="0" y1="${(-effW / 2).toFixed(1)}" x2="0" y2="${handleY.toFixed(
          1
        )}" stroke="#2563eb" stroke-width="2" />
            <circle cx="0" cy="${handleY.toFixed(
              1
            )}" r="12" fill="rgba(37, 99, 235, 0.15)" />
            <circle cx="0" cy="${handleY.toFixed(
              1
            )}" r="6.5" fill="#2563eb" stroke="#ffffff" stroke-width="1.5" />
          </g>
        `;
      }
    }

    const dimText =
      dim.shape === "circle"
        ? `Ø${dim.effDiameter.toFixed(1).replace(".", ",")}m`
        : `${dim.effLength.toFixed(1).replace(".", ",")}×${dim.effWidth
            .toFixed(2)
            .replace(/0$/, "")
            .replace(".", ",")}m`;

    const counterRot = -(table.rotation || 0);
    innerSvg += `
      <g transform="rotate(${counterRot})" pointer-events="none">
        <text x="0" y="-2" text-anchor="middle" font-size="10.5" font-weight="800" fill="#ffffff" style="paint-order: stroke; stroke: rgba(0,0,0,0.45); stroke-width: 2.5px;">${table.name}</text>
        <text x="0" y="9" text-anchor="middle" font-size="8.5" font-weight="700" fill="#ffffff" style="paint-order: stroke; stroke: rgba(0,0,0,0.45); stroke-width: 2px;">${dimText}</text>
      </g>
    `;

    g.innerHTML = innerSvg;
    tablesLayer.appendChild(g);
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
  const totalTables = state.tables.length;
  const totalSeats = state.tables.reduce(
    (acc, t) => acc + (t.hasChairs ? Number(t.seats) || 0 : 0),
    0
  );

  statTables.innerHTML = `Mesas: <strong>${totalTables}</strong>`;
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

    quickBarTitle.textContent = sel.name;
    btnQuickChairs.classList.toggle("active", !!sel.hasChairs);
    btnQuickRotate.style.display = dim.shape === "rect" ? "inline-flex" : "none";

    if (document.activeElement !== inpTableName) {
      inpTableName.value = sel.name;
    }
    lblTableType.textContent = spec.name;

    if (dim.shape === "circle") {
      lblTableBaseDim.textContent = `Ø ${fmtMeters(dim.baseDiameter)}`;
      lblTableEffDim.textContent = `Ø ${fmtMeters(dim.effDiameter)}${
        sel.hasChairs ? " (con sillas)" : ""
      }`;
      rotationControls.style.display = "none";
    } else {
      lblTableBaseDim.textContent = `${fmtMeters(dim.baseLength)} × ${fmtMeters(
        dim.baseWidth
      )}`;
      lblTableEffDim.textContent = `${fmtMeters(dim.effLength)} × ${fmtMeters(
        dim.effWidth
      )}${sel.hasChairs ? " (con sillas)" : ""}`;
      rotationControls.style.display = "block";
      lblRotationVal.textContent = `${Math.round(sel.rotation || 0)}°`;
      rngTableRotation.value = Math.round(sel.rotation || 0);
    }

    chkTableChairs.checked = !!sel.hasChairs;
    if (document.activeElement !== inpTableSeats) {
      inpTableSeats.value = sel.seats;
    }

    if (!Number.isFinite(sel.nearestDist)) {
      lblNearestDist.textContent = "Sin otras mesas";
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

  lblListCount.textContent = String(totalTables);
  if (totalTables === 0) {
    tableListMini.innerHTML = `<div class="empty-state" style="padding: 12px 4px;">No hay mesas todavía. Pulsa en cualquiera de los 6 modelos para añadirla.</div>`;
  } else {
    tableListMini.innerHTML = "";
    for (const t of state.tables) {
      const spec = getCatalogSpec(t.typeId);
      const row = document.createElement("div");
      row.className = `table-row-item ${t.id === state.selectedId ? "selected" : ""}`;
      const dotClass = t.isConflict ? "red" : "green";
      const chairTag = t.hasChairs ? `🪑 +0,5m` : `Sin sillas`;
      row.innerHTML = `
        <div style="display:flex;align-items:center;gap:7px;">
          <span class="dot ${dotClass}"></span>
          <strong>${t.name}</strong>
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
   INTERACCIÓN EN EL LIENZO: RATÓN + TÁCTIL (MOVER, ROTAR, PAN Y PINCH-ZOOM)
   ========================================================================== */

function updateStageTransform() {
  canvasStage.style.transform = `translate(calc(-50% + ${state.panX.toFixed(
    1
  )}px), calc(-50% + ${state.panY.toFixed(1)}px)) scale(${state.zoom})`;
  lblZoom.textContent = `${Math.round(state.zoom * 100)}%`;
}

function clientToSvgCoords(clientX, clientY) {
  const rect = planSvg.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * PLAN_WIDTH_PX;
  const y = ((clientY - rect.top) / rect.height) * PLAN_HEIGHT_PX;
  return {
    x: Math.max(10, Math.min(PLAN_WIDTH_PX - 10, x)),
    y: Math.max(10, Math.min(PLAN_HEIGHT_PX - 10, y))
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

  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  // Si hay 2 dedos en pantalla -> iniciar gesto de pellizco (pinch-to-zoom)
  if (activePointers.size === 2) {
    dragState = null;
    const pts = Array.from(activePointers.values());
    pinchStartDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    pinchStartZoom = state.zoom;
    return;
  }

  const pt = clientToSvgCoords(e.clientX, e.clientY);

  // Modo calibración o regla
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

  // Tirador de rotación
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

  // Tocar/arrastrar una mesa
  const tableGroup = e.target.closest(".table-group");
  if (tableGroup) {
    const id = tableGroup.dataset.id;
    const table = state.tables.find((t) => t.id === id);
    if (table) {
      state.selectedId = id;
      dragState = {
        type: "move",
        pointerId: e.pointerId,
        table,
        offsetX: pt.x - table.x,
        offsetY: pt.y - table.y
      };
      canvasWrapper.setPointerCapture(e.pointerId);
      renderAll();
      return;
    }
  }

  // Tocar en el fondo vacío -> permitir desplazar el plano (pan) y deseleccionar si es un toque corto
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

  // Gesto de pellizco con 2 dedos
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
    dragState.table.x = Math.max(
      25,
      Math.min(PLAN_WIDTH_PX - 25, pt.x - dragState.offsetX)
    );
    dragState.table.y = Math.max(
      25,
      Math.min(PLAN_HEIGHT_PX - 25, pt.y - dragState.offsetY)
    );
    renderAll();
  } else if (dragState.type === "rotate") {
    const dx = pt.x - dragState.table.x;
    const dy = pt.y - dragState.table.y;
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    deg = ((deg % 180) + 180) % 180;
    const snap15 = Math.round(deg / 15) * 15;
    if (Math.abs(deg - snap15) < 3) deg = snap15 % 180;
    dragState.table.rotation = deg;
    renderAll();
  } else if (dragState.type === "pan") {
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    if (Math.hypot(dx, dy) > 4) {
      dragState.moved = true;
    }
    state.panX = dragState.origPanX + dx;
    state.panY = dragState.origPanY + dy;
    updateStageTransform();
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
  if (state.chairMode === "total") {
    chairModeHint.innerHTML =
      "Modo actual: cada mesa con sillas suma <strong>+0,50 m a sus medidas</strong> (ej: Ø 2,0m → Ø 2,5m).";
  } else {
    chairModeHint.innerHTML =
      "Modo actual: cada mesa con sillas suma <strong>+0,50 m por cada lado</strong> (+1,0m al total, ej: Ø 2,0m → Ø 3,0m).";
  }
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
  planImage.src = state.cleanPlan ? "plano.png" : "plano_original.jpg";
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

// Controles del Inspector y Barra Rápida Móvil
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
    sel.seats = Math.max(0, Math.min(30, parseInt(inpTableSeats.value, 10) || 0));
    saveToLocalStorage();
    renderAll();
  }
});

rngTableRotation.addEventListener("input", () => {
  const sel = state.tables.find((t) => t.id === state.selectedId);
  if (sel) {
    sel.rotation = parseFloat(rngTableRotation.value) || 0;
    saveToLocalStorage();
    renderAll();
  }
});

document.querySelectorAll(".quick-angles .btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const sel = state.tables.find((t) => t.id === state.selectedId);
    if (sel) {
      sel.rotation = parseFloat(btn.dataset.angle) || 0;
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

// Botones de la barra rápida móvil
btnQuickChairs.addEventListener("click", () => {
  const sel = state.tables.find((t) => t.id === state.selectedId);
  if (sel) {
    sel.hasChairs = !sel.hasChairs;
    saveToLocalStorage();
    renderAll();
  }
});

btnQuickRotate.addEventListener("click", () => {
  const sel = state.tables.find((t) => t.id === state.selectedId);
  if (sel) {
    sel.rotation = ((sel.rotation || 0) + 45) % 180;
    saveToLocalStorage();
    renderAll();
  }
});

btnQuickDup.addEventListener("click", duplicateSelectedTable);
btnQuickDel.addEventListener("click", deleteSelectedTable);

// Botones de barra superior
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

// Zoom
function applyZoom(newZoom) {
  state.zoom = Math.max(0.2, Math.min(2.6, newZoom));
  updateStageTransform();
}

function fitPlanToViewport() {
  const rect = canvasWrapper.getBoundingClientRect();
  if (rect.width < 20 || rect.height < 20) return;
  const padX = isMobileViewport() ? 12 : 40;
  const padY = isMobileViewport() ? 64 : 40;
  const scaleX = (rect.width - padX) / PLAN_WIDTH_PX;
  const scaleY = (rect.height - padY) / PLAN_HEIGHT_PX;
  state.panX = 0;
  state.panY = 0;
  applyZoom(Math.min(scaleX, scaleY, 1.15));
}

document.getElementById("btnZoomIn").addEventListener("click", () => {
  applyZoom(state.zoom + 0.1);
});
document.getElementById("btnZoomOut").addEventListener("click", () => {
  applyZoom(state.zoom - 0.1);
});
document
  .getElementById("btnZoomFit")
  .addEventListener("click", fitPlanToViewport);

canvasWrapper.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.06 : -0.06;
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
  }
});

/* ==========================================================================
   PERSISTENCIA Y EJEMPLO INICIAL
   ========================================================================== */

const STORAGE_KEY = "adamil_plano_mesas_v1";

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
      state.tables = data.tables;

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
    seats: 8
  });

  addTable("round_lg", { name: "M1", x: 185, y: 270, hasChairs: true });
  addTable("round_lg", { name: "M2", x: 371, y: 270, hasChairs: true });
  addTable("round_lg", { name: "M3", x: 555, y: 270, hasChairs: true });

  addTable("round_md", { name: "M4", x: 185, y: 410, hasChairs: true });
  addTable("round_md", { name: "M5", x: 371, y: 410, hasChairs: true });
  addTable("round_md", { name: "M6", x: 555, y: 410, hasChairs: true });

  addTable("round_sm", { name: "M7", x: 260, y: 525, hasChairs: true });
  addTable("round_sm", { name: "M8", x: 480, y: 525, hasChairs: true });

  addTable("rect_lg", {
    name: "Mesa Izq",
    x: 155,
    y: 925,
    rotation: 0,
    hasChairs: true
  });
  addTable("rect_sm", {
    name: "Mesa Dcha",
    x: 585,
    y: 925,
    rotation: 0,
    hasChairs: true
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
  requestAnimationFrame(fitPlanToViewport);
  setTimeout(fitPlanToViewport, 120);
});

planImage.addEventListener("load", fitPlanToViewport);
window.addEventListener("orientationchange", () =>
  setTimeout(fitPlanToViewport, 150)
);

window.addEventListener("resize", () => {
  if (!isMobileViewport()) {
    closeMobileDrawers();
  }
  fitPlanToViewport();
});
