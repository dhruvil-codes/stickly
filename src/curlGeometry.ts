export type Corner = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
export interface Point { x: number; y: number }
export type PeelPose = 'removal' | 'held';

export const peelThreshold = (width: number, height: number, normal: Point = { x: Math.SQRT1_2, y: Math.SQRT1_2 }) => .92 * (width * normal.x + height * normal.y);
export const dragProgress = (dx: number, dy: number, threshold: number) => Math.max(0, Math.min(1, (Math.hypot(dx, dy) - 5) / (threshold - 5)));
export function nearestCorner(x: number, y: number, width: number, height: number): Corner {
  return `${y < height / 2 ? 'top' : 'bottom'}-${x < width / 2 ? 'left' : 'right'}`;
}

export function peelDirection(dx: number, dy: number): Point {
  const length = Math.hypot(dx, dy);
  if (length < 1) return { x: Math.SQRT1_2, y: Math.SQRT1_2 };
  // Keep the crease within the sheet even when the grip is pulled past an edge.
  const x = Math.max(.12, Math.abs(dx) / length), y = Math.max(.12, Math.abs(dy) / length);
  const magnitude = Math.hypot(x, y);
  return { x: x / magnitude, y: y / magnitude };
}

function clip(points: Point[], distance: number, normal: Point, keepFront: boolean): Point[] {
  const result: Point[] = [];
  for (let index = 0; index < points.length; index++) {
    const a = points[index], b = points[(index + 1) % points.length];
    const da = a.x * normal.x + a.y * normal.y - distance, db = b.x * normal.x + b.y * normal.y - distance;
    const insideA = keepFront ? da >= 0 : da <= 0;
    const insideB = keepFront ? db >= 0 : db <= 0;
    if (insideA) result.push(a);
    if (insideA !== insideB) {
      const t = da / (da - db);
      result.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return result.filter((p, i, all) => !all.slice(0, i).some(q => Math.hypot(q.x - p.x, q.y - p.y) < .001));
}

const coordinate = (point: Point) => `${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
const polygonPath = (points: Point[]) => points.length < 3 ? '' : `M${points.map(coordinate).join('L')}Z`;

function curvedPath(points: Point[], radius: number, crease: Point[]) {
  if (points.length < 3) return '';
  const corners = points.map((point, index) => {
    const previous = points[(index + points.length - 1) % points.length], next = points[(index + 1) % points.length];
    const toward = (other: Point) => {
      const amount = Math.min(.22, radius / Math.max(1, Math.hypot(other.x - point.x, other.y - point.y)));
      return { x: point.x + (other.x - point.x) * amount, y: point.y + (other.y - point.y) * amount };
    };
    return { point, incoming: toward(previous), outgoing: toward(next) };
  });
  const center = { x: points.reduce((sum, point) => sum + point.x, 0) / points.length, y: points.reduce((sum, point) => sum + point.y, 0) / points.length };
  const onCrease = (point: Point) => crease.some(edge => Math.hypot(edge.x - point.x, edge.y - point.y) < .001);
  return `M${coordinate(corners[0].outgoing)}${corners.slice(1).concat(corners[0]).map((corner, index) => {
    const previous = corners[index];
    const midpoint = { x: (previous.outgoing.x + corner.incoming.x) / 2, y: (previous.outgoing.y + corner.incoming.y) / 2 };
    const bow = { x: midpoint.x + (center.x - midpoint.x) * .025, y: midpoint.y + (center.y - midpoint.y) * .025 };
    const edge = onCrease(previous.point) && onCrease(corner.point) ? `L${coordinate(corner.incoming)}` : `Q${coordinate(bow)} ${coordinate(corner.incoming)}`;
    return `${edge}Q${coordinate(corner.point)} ${coordinate(corner.outgoing)}`;
  }).join('')}Z`;
}

export function curlGeometry(width: number, height: number, progress: number, corner: Corner, normal: Point = { x: Math.SQRT1_2, y: Math.SQRT1_2 }, pose: PeelPose = 'held') {
  const p = Math.max(0, Math.min(1, progress));
  const fullDistance = width * normal.x + height * normal.y;
  const heldDistance = .9 * Math.min(width * normal.x, height * normal.y);
  const distance = (pose === 'removal' ? fullDistance : heldDistance) * p;
  const rectangle = [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }];
  const toCanvas = ({ x, y }: Point): Point => ({ x: corner.endsWith('left') ? x : width - x, y: corner.startsWith('top') ? y : height - y });
  const localFront = clip(rectangle, distance, normal, true);
  const front = localFront.map(toCanvas);
  const backSource = p === 0 ? [] : clip(rectangle, distance, normal, false);
  const reflect = (point: Point) => {
    const reflection = 2 * (distance - point.x * normal.x - point.y * normal.y);
    return toCanvas({ x: point.x + reflection * normal.x, y: point.y + reflection * normal.y });
  };
  const back = backSource.map(reflect);
  const crease = backSource.filter(point => Math.abs(point.x * normal.x + point.y * normal.y - distance) < .001).map(reflect);
  const midpoint = crease.length ? { x: crease.reduce((sum, point) => sum + point.x, 0) / crease.length, y: crease.reduce((sum, point) => sum + point.y, 0) / crease.length } : toCanvas({ x: 0, y: 0 });
  const points = [...front, ...back];
  const left = Math.min(...points.map(point => point.x)), top = Math.min(...points.map(point => point.y));
  const right = Math.max(...points.map(point => point.x)), bottom = Math.max(...points.map(point => point.y));
  const liftedTip = toCanvas({ x: distance * normal.x * 2, y: distance * normal.y * 2 });
  const radius = Math.min(6, distance * .04);
  const tipIndex = back.findIndex(point => Math.hypot(point.x - liftedTip.x, point.y - liftedTip.y) < .001);
  const gripTip = { ...liftedTip };
  if (tipIndex >= 0) {
    for (const neighbour of [back[(tipIndex + back.length - 1) % back.length], back[(tipIndex + 1) % back.length]]) {
      const amount = Math.min(.22, radius / Math.max(1, Math.hypot(neighbour.x - liftedTip.x, neighbour.y - liftedTip.y)));
      gripTip.x += (neighbour.x - liftedTip.x) * amount * .25;
      gripTip.y += (neighbour.y - liftedTip.y) * amount * .25;
    }
  }
  const scale = pose === 'removal' ? 1 : Math.min(1, width / Math.max(1, right - left), height / Math.max(1, bottom - top));
  const tx = pose === 'removal' ? 0 : width / 2 - (left + right) / 2 * scale, ty = pose === 'removal' ? 0 : height / 2 - (top + bottom) / 2 * scale;
  return {
    front, back, creaseDistance: distance, frontPath: polygonPath(front), backPath: curvedPath(back, radius, crease),
    creasePath: crease.length === 2 ? `M${coordinate(crease[0])}L${coordinate(crease[1])}` : '',
    gradientStart: midpoint, gradientEnd: liftedTip,
    surfaceTransform: `matrix(${scale},0,0,${scale},${tx},${ty})`, scale, tx, ty,
    gripPoint: { x: gripTip.x * scale + tx, y: gripTip.y * scale + ty },
    shadowBlur: 1.5 + Math.sin(p * Math.PI) * 2,
  };
}
