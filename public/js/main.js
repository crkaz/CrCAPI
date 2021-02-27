//#region Consts
const COLOUR_PICKER = document.querySelector("#colour-picker");
const CANVAS = document.querySelector("canvas");
const CTX = CANVAS.getContext("2d");
const WIDTH = 1000;
const HALF_WIDTH = WIDTH / 2;
const BLACK = "#000000";
const WHITE = "#FFFFFF";
const YELLOW = '#eBD549';
const PI = Math.PI;
const TWO_PI = PI * 2;
const MAX_ZOOM = 2;
const MIN_ZOOM = 0.5;
const LOREM_DESC = ["A", "B", "C", "D", "E"];
//#endregion

canvasScale = 1;
panPos = [0, 0];
panning = false;
lastPanX = null;
lastPanY = null;
drawing = false;
erasing = false;
lastDrawX = null;
lastDrawY = null;
lastEDrawX = null;
lastEDrawY = null;
panOffsetX = 0;
panOffsetY = 0;
drawCoords = [];
deleting = false;
drawnObjects = [];
stickies = []
panRedrawInterval = 15; // TODO: temporary with current redraw methods.
panRedrawCounter = 0; // TODO: temporary with current redraw methods.
// TODO: for BBs of drawn objects of redraw method is changed to drawimage()
// drawMinX; drawMinY; drawMaxX; drawMaxY;

//#region Listeners
CANVAS.addEventListener("contextmenu", (e) => { e.preventDefault(); return false; });
CANVAS.addEventListener("mousedown", handleMouseDown);
CANVAS.addEventListener("mousemove", handleMouseMove);
CANVAS.addEventListener("mouseup", handleMouseUp);
CANVAS.addEventListener("mouseout", stopDrawing);
CANVAS.addEventListener("wheel", handleMouseWheel);
//#endregion

init();

// TODO: add touch compatibility http://jsfiddle.net/crkaz/bm5jsnyr/5/
// TODO: resume origin translation on init to simplify correcting the zoom feature

function init() {
  CTX.lineJoin = 'round';
  CTX.lineCap = 'round';
  CTX.lineWidth = 3;

  CTX.imageSmoothingEnabled = true;

  CTX.fillStyle = WHITE;
  CTX.fillRect(0, 0, WIDTH, WIDTH);
}

function handleMouseDown(e) {
  switch (e.which) {
    case 1:
      stickyCollisionDetection(e);
      drawing = true;
      break;
    case 2:
      erasing = true;
      break;
    case 3:
      panning = true;
      break;
  }
}

function handleMouseUp(e) {
  switch (e.which) {
    case 1:
      !deleting ? createSticky(e) : deleting = false; // Stops another sticky being created when the one is being deleted.
      break;
    case 2:
      break;
    case 3:
      redrawObjects(true);
      break;
  }
  stopDrawing();
}

function handleMouseMove(e) {
  switch (e.which) {
    case 1:
      draw(e);
      break;
    case 2:
      erase(e);
      break;
    case 3:
      pan(e);
      break;
  }
}

function handleMouseWheel(e) {
  zoom(e);
}

function draw(e) {
  if (!drawing) { return; }
  CTX.strokeStyle = getColour();
  CTX.beginPath();
  const x = (e.offsetX - (panOffsetX)) * inverseCanvasScale();
  const y = (e.offsetY - (panOffsetY)) * inverseCanvasScale();
  !lastDrawX ? [lastDrawX, lastDrawY] = [x, y] : CTX.moveTo(lastDrawX, lastDrawY);   // Ensure we start drawing from where user clicks rather than origin.
  drawCoords.push({ x: lastDrawX, y: lastDrawY });
  CTX.lineWidth = 2;
  CTX.lineTo(x, y);
  CTX.stroke();
  [lastDrawX, lastDrawY] = [x, y];
}

function erase(e) {
  if (!erasing) { return; }
  CTX.strokeStyle = WHITE;
  CTX.beginPath();
  const x = (e.offsetX - panOffsetX) * inverseCanvasScale();
  const y = (e.offsetY - panOffsetY) * inverseCanvasScale();
  !lastEDrawX ? [lastEDrawX, lastEDrawY] = [x, y] : CTX.moveTo(lastEDrawX, lastEDrawY);   // Ensure we start drawing from where user clicks rather than origin.
  CTX.lineWidth = 30;
  CTX.lineTo(x, y);
  CTX.stroke();
  [lastEDrawX, lastEDrawY] = [x, y];
}

function createSticky(e) {
  if (drawCoords.length < 2) {
    const colour = YELLOW;
    const x = (e.offsetX - panOffsetX) * inverseCanvasScale();
    const y = (e.offsetY - panOffsetY) * inverseCanvasScale();
    const width = 130;
    const height = 110;
    const maxCharsPerLine = 25;
    const text = chunkStr(LOREM_DESC[Math.floor(Math.random() * 4) + 1], maxCharsPerLine).join('\n');
    CTX.fillStyle = colour;
    stickies.push({ x, y, width, height, colour, text });
    CTX.fillRect(x, y, width, height);
    CTX.fillStyle = BLACK;
    CTX.font = '10px Arial';
    let i = 1;
    for (const subStr of text.split('\n')) {
      CTX.fillText(subStr, x, y + (10 * i));
      i += 1;
    }
  }
}

function zoom(e) {
  const dY = e.wheelDeltaY;
  const scaleFactor = 0.1;
  let scale = 1;
  dY > 0 ? scale += scaleFactor : scale -= scaleFactor;

  const acs = canvasScale * scale;
  if (between(acs, MIN_ZOOM, MAX_ZOOM)) {
    canvasScale = acs;
    CTX.scale(scale, scale);
    redrawObjects(true);
  }
}

function pan(e) {
  const left = lastPanX < e.offsetX;
  const right = lastPanX > e.offsetX;
  const up = lastPanY < e.offsetY;
  const down = lastPanY > e.offsetY;
  const panRate = 2;
  if (lastPanX) {
    left ? translate(-panRate, null) : null;
    right ? translate(panRate, null) : null;
    up ? translate(null, -panRate) : null;
    down ? translate(null, panRate) : null;
    left ? panPos[0] -= panRate : null;
    right ? panPos[0] += panRate : null;
    up ? panPos[1] -= panRate : null;
    up ? panPos[1] += panRate : null;
  }
  [lastPanX, lastPanY] = [e.offsetX, e.offsetY];

  redrawObjects();
}

function stopDrawing(e) {
  drawing = false;
  erasing = false;
  panning = false;
  lastDrawX = null;
  lastPanX = null;
  const shouldDraw = drawCoords.length > 10 * canvasScale;
  shouldDraw ? drawnObjects.push(drawCoords) : redrawObjects(true);
  drawCoords = [];
}

function getColour() {
  let colour = COLOUR_PICKER.value;
  if (colour.length != 6 && colour[0] != '#') {
    colour = BLACK;
  }
  return colour;
}

function translate(x, y) {
  CTX.translate(x, y);
  x ? panOffsetX += x / inverseCanvasScale() : null;
  y ? panOffsetY += y / inverseCanvasScale() : null;
}

function between(val, lower, upper, equiv = true) {
  if (equiv) {
    if (val >= lower && val <= upper) return true;
  }
  if (val > lower && val < upper) return true;
  return false;
}

function chunkStr(str, n) {
  const ret = [];
  let i;
  let len;

  for (i = 0, len = str.length; i < len; i += n) {
    ret.push(str.substr(i, n));
  }

  return ret;
}

function inverseCanvasScale() {
  return 1 / canvasScale;
}

// TODO: slow - may be better to save drawing as an image ro find alt method
function redrawObjects(force = false) {
  if (!force && panRedrawCounter++ % panRedrawInterval !== 0) { return; }

  const virtualWidth = WIDTH * inverseCanvasScale();
  CTX.clearRect(0 - panOffsetX * inverseCanvasScale(), 0 - panOffsetY * inverseCanvasScale(), virtualWidth, virtualWidth);

  CTX.strokeStyle = BLACK;
  CTX.lineWidth = 2;
  drawnObjects.forEach(obj => {
    let [lX, lY] = [null, null];
    obj.forEach(coords => {
      if (!lX) {
        [lX, lY] = [coords.x, coords.y];
        CTX.beginPath();
      } else {
        CTX.moveTo(lX, lY);
        CTX.lineTo(coords.x, coords.y);
        [lX, lY] = [coords.x, coords.y];
      }
    });
    CTX.stroke();
  });

  stickies.forEach(sticky => {
    CTX.fillStyle = sticky.colour;
    CTX.fillRect(sticky.x, sticky.y, sticky.width, sticky.height);
    CTX.fillStyle = BLACK;
    CTX.font = '10px Arial';
    let i = 1;
    for (const subStr of sticky.text.split('\n')) {
      CTX.fillText(subStr, sticky.x, sticky.y + (10 * i));
      i += 1;
    }
  });
}

function stickyCollisionDetection(e) {
  try {
    stickies.forEach(sticky => {
      const x = (e.offsetX - panOffsetX) * inverseCanvasScale();
      const y = (e.offsetY - panOffsetY) * inverseCanvasScale();

      if (sticky.x < x &&
        sticky.x + sticky.width > x &&
        sticky.y < y &&
        sticky.y + sticky.height > y) {
        const index = stickies.indexOf(sticky);
        if (index > -1) {
          stickies.splice(index, 1);
          redrawObjects(true);
          deleting = true;
          return true;
        }
      }
    });
  } catch {
  }
  return false;
}
