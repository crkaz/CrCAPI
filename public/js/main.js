//#region Consts
const COLOUR_PICKER = document.querySelector("#colour-picker");
const CANVAS = document.querySelector("canvas");
const CTX = CANVAS.getContext("2d");
const WIDTH = 1000;
const HALF_WIDTH = WIDTH / 2;
const BLACK = "#000000";
const WHITE = "#FFFFFF";
const PI = Math.PI;
const TWO_PI = PI * 2;
//#endregion

canvasScale = 1;
panning = false;
lastPanX = false;
lastPanY = false;
drawing = false;
lastDrawX = false;
lastDrawY = false;
panOffsetX = 0;
panOffsetY = 0;
drawCoords = [];
drawnObjects = []; // As Image objects
panRedrawInterval = 20; // TODO: temporary with current redraw methods.
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
      drawing = true;
      break;
    case 2:
      break;
    case 3:
      panning = true;
      break;
  }
}

function handleMouseUp(e) {
  switch (e.which) {
    case 1:
      createSticky(e);
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
      break;
    case 3:
      pan(e);
      break;
  }
}

function handleMouseWheel(e) {
  const dY = e.wheelDeltaY;
  const scaleFactor = 0.1;
  dY > 0 ? canvasScale = 1 + scaleFactor : canvasScale = 1 - scaleFactor;

  // scene graph or drawimage()
  CTX.scale(canvasScale, canvasScale);

  // TODO: temp
  redrawObjects(true);
}

function draw(e) {
  // stop the function if they are not mouse down
  if (!drawing) return;
  CTX.strokeStyle = getColour();
  CTX.beginPath();
  !lastDrawX ? [lastDrawX, lastDrawY] = [e.offsetX - panOffsetX, e.offsetY - panOffsetY] : null;  // Ensure we start drawing from where user clicks rather than origin.
  drawCoords.push({ x: lastDrawX, y: lastDrawY });
  CTX.moveTo(lastDrawX, lastDrawY);
  CTX.lineTo(e.offsetX - panOffsetX, e.offsetY - panOffsetY);
  CTX.stroke();
  [lastDrawX, lastDrawY] = [e.offsetX - panOffsetX, e.offsetY - panOffsetY];
}

// TODO: doesn't persist with redraw (scene graph?)
function createSticky(e) {
  if (drawCoords.length < 2) {
    CTX.fillStyle = getColour();
    CTX.fillRect(e.offsetX - panOffsetX, e.offsetY - panOffsetY, 20, 20);
  }
}

function pan(e) {
  const panRate = 0.5;
  x = panRate * Math.abs(lastPanX - e.offsetX );
  y = panRate * Math.abs(lastPanY - e.offsetY );
  let left = false;
  let up = false;
  if (lastPanX) {
    lastPanX < e.offsetX ? left = true : left = false;
    lastPanY < e.offsetY ? up = true : up = false;
    left ? translate(-x, null) : translate(x, null);
    up ? translate(null, -y) : translate(null, y);
  }
  [lastPanX, lastPanY] = [e.offsetX, e.offsetY];

  // TODO: temp
  redrawObjects();
}

function stopDrawing(e) {
  drawing = false;
  panning = false;
  lastDrawX = false;  // Ensure we start drawing from where user clicks rather than origin.
  lastPanX = false;
  drawnObjects.push(drawCoords);
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
  x ? panOffsetX += x : null;
  y ? panOffsetY += y : null;
}

// TODO: too slow - may be better to save drawing as an image 
function redrawObjects(force = false) {
  if (!force && panRedrawCounter++ % panRedrawInterval !== 0) return;

  CTX.clearRect(0 - panOffsetX, 0 - panOffsetY, WIDTH, WIDTH);

  CTX.strokeStyle = BLACK; // TODO: drawn objects don't currently retain colour info.
  // TODO: can complexity be simplified.
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
}