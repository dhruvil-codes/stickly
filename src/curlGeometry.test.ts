import { describe, expect, it } from 'vitest';
import { curlGeometry, dragProgress, nearestCorner, peelDirection, peelThreshold, type Corner, type Point } from './curlGeometry';

function area(points: Point[]) {
  return Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0)) / 2;
}

describe('peel gesture distance', () => {
  it('ignores clicks and tiny movements, and reaches removal inside a normal window', () => {
    const threshold = peelThreshold(360, 420);
    expect(threshold).toBeCloseTo(.92 * (360 + 420) * Math.SQRT1_2);
    expect(dragProgress(0, 0, threshold)).toBe(0);
    expect(dragProgress(3, 4, threshold)).toBe(0);
    expect(dragProgress(6, 0, threshold)).toBeGreaterThan(0);
    expect(dragProgress(threshold, 0, threshold)).toBe(1);
    expect(dragProgress((threshold + 5) / 2, 0, threshold)).toBeCloseTo(.5);
    expect(dragProgress(1000, 1000, threshold)).toBe(1);
  });
  it('accepts pulls in every direction and scales the threshold for small paper', () => {
    expect(peelThreshold(100, 100)).toBeCloseTo(Math.hypot(100, 100) * .92);
    for (const [dx, dy] of [[90, 0], [-90, 0], [0, 90], [0, -90]]) {
      expect(dragProgress(dx, dy, 180)).toBeCloseTo(85 / 175);
    }
  });
  it('anchors each blank surface drag at the closest paper corner', () => {
    expect(nearestCorner(10, 10, 360, 420)).toBe('top-left');
    expect(nearestCorner(350, 10, 360, 420)).toBe('top-right');
    expect(nearestCorner(10, 410, 360, 420)).toBe('bottom-left');
    expect(nearestCorner(350, 410, 360, 420)).toBe('bottom-right');
  });
  it('keeps the initial tug a small curl before releasing more of the sheet', () => {
    const progress = dragProgress(48, -40, peelThreshold(320, 320));
    const shape = curlGeometry(320, 320, progress, 'bottom-left');
    expect(area(shape.front)).toBeGreaterThan(320 * 320 * .9);
  });
});

describe('curl geometry', () => {
  const corners: Corner[] = ['bottom-left', 'bottom-right', 'top-left', 'top-right'];
  it.each(corners)('peels into a curled flap while preserving the front face at %s', corner => {
    let previousArea = 360 * 420;
    for (let step = 0; step <= 100; step++) {
      const shape = curlGeometry(360, 420, step / 100, corner);
      const nextArea = area(shape.front);
      expect(nextArea).toBeLessThanOrEqual(previousArea + .001);
      expect(shape.front.every(point => point.x >= 0 && point.x <= 360 && point.y >= 0 && point.y <= 420)).toBe(true);
      expect(shape.frontPath + shape.backPath).not.toMatch(/NaN|Infinity/);
      previousArea = nextArea;
    }
    expect(previousArea).toBeGreaterThan(360 * 420 * .5);
    expect(curlGeometry(360, 420, 0, corner).backPath).toBe('');
    const lifted = curlGeometry(360, 420, 1, corner);
    expect(area(lifted.front) + area(lifted.back)).toBeCloseTo(360 * 420);
    expect(lifted.frontPath).not.toBe('');
    expect(lifted.creasePath).not.toBe('');
  });
  it('reflects a lower-left curl inward and uses curved SVG edges', () => {
    const shape = curlGeometry(360, 420, .1, 'bottom-left');
    expect(shape.front).not.toContainEqual({ x: 0, y: 420 });
    expect(shape.front).toContainEqual({ x: 360, y: 0 });
    expect(shape.back.some(point => Math.abs(point.x - 32.4) < .001 && Math.abs(point.y - 387.6) < .001)).toBe(true);
    expect(shape.backPath).toContain('Q');
    expect(shape.creasePath).not.toBe('');
  });
  it.each(corners)('keeps the entire lifted underside inside the window at %s', corner => {
    for (const [width, height] of [[240, 200], [320, 320], [520, 300]]) {
      for (const [dx, dy] of [[100, 1], [1, 100], [100, 100], [-40, 90]]) {
        for (const progress of [.1, .4, .7, .99, 1]) {
          const shape = curlGeometry(width, height, progress, corner, peelDirection(dx, dy));
          expect(shape.backPath).toContain('Q');
          expect(area(shape.front)).toBeGreaterThan(width * height * .5);
          expect(shape.creasePath).not.toBe('');
          for (const point of [...shape.front, ...shape.back]) {
            expect(point.x * shape.scale + shape.tx).toBeGreaterThanOrEqual(-.001);
            expect(point.y * shape.scale + shape.ty).toBeGreaterThanOrEqual(-.001);
            expect(point.x * shape.scale + shape.tx).toBeLessThanOrEqual(width + .001);
            expect(point.y * shape.scale + shape.ty).toBeLessThanOrEqual(height + .001);
          }
        }
      }
    }
  });
  it('follows cursor direction and keeps the held pose continuous while applying', () => {
    const horizontal = curlGeometry(320, 320, .3, 'bottom-left', peelDirection(90, 10));
    const vertical = curlGeometry(320, 320, .3, 'bottom-left', peelDirection(10, 90));
    expect(horizontal.creasePath).not.toBe(vertical.creasePath);
    const before = curlGeometry(320, 320, .99999, 'bottom-left');
    const carried = curlGeometry(320, 320, 1, 'bottom-left');
    expect(before.tx).toBeCloseTo(carried.tx, 1);
    expect(before.ty).toBeCloseTo(carried.ty, 1);
    expect(before.gradientStart.x).toBeCloseTo(carried.gradientStart.x, 1);
    expect(before.gradientStart.y).toBeCloseTo(carried.gradientStart.y, 1);
  });
  it.each(corners)('keeps the curled cursor grip on the visible sheet from %s', corner => {
    for (const [dx, dy] of [[100, 1], [1, 100], [100, 100]]) {
      const shape = curlGeometry(320, 280, 1, corner, peelDirection(dx, dy));
      expect(shape.gripPoint.x).toBeGreaterThanOrEqual(0);
      expect(shape.gripPoint.x).toBeLessThanOrEqual(320);
      expect(shape.gripPoint.y).toBeGreaterThanOrEqual(0);
      expect(shape.gripPoint.y).toBeLessThanOrEqual(280);
    }
  });
  it('uses the same shape when applying in reverse', () => {
    const peeling = Array.from({ length: 21 }, (_, index) => curlGeometry(360, 420, index / 20, 'bottom-left').frontPath);
    const applying = Array.from({ length: 21 }, (_, index) => curlGeometry(360, 420, (20 - index) / 20, 'bottom-left').frontPath);
    expect(applying).toEqual([...peeling].reverse());
  });
});

describe('complete removal before cursor carry', () => {
  const corners: Corner[] = ['bottom-left', 'bottom-right', 'top-left', 'top-right'];
  it.each(corners)('releases all adhesion while preserving one continuous sheet at %s', corner => {
    for (const [width, height] of [[240, 200], [320, 320], [520, 300]]) {
      for (const [dx, dy] of [[100, 1], [1, 100], [100, 100]]) {
        const normal = peelDirection(dx, dy);
        let previous = width * height;
        let lastCrease = -1;
        for (let step = 0; step <= 50; step++) {
          const removal = curlGeometry(width, height, step / 50, corner, normal, 'removal');
          expect(area(removal.front)).toBeLessThanOrEqual(previous + .001);
          expect(area(removal.front) + area(removal.back)).toBeCloseTo(width * height, 3);
          expect(removal.creaseDistance).toBeGreaterThan(lastCrease);
          expect(removal.surfaceTransform).toBe('matrix(1,0,0,1,0,0)');
          expect((removal.creasePath.match(/M/g) ?? []).length).toBeLessThanOrEqual(1);
          expect(removal.frontPath + removal.backPath).not.toMatch(/NaN|Infinity/);
          previous = area(removal.front);
          lastCrease = removal.creaseDistance;
        }
        const removed = curlGeometry(width, height, 1, corner, normal, 'removal');
        expect(previous).toBe(0);
        expect(removed.frontPath).toBe('');
        const held = curlGeometry(width, height, 1, corner, normal, 'held');
        expect(held.frontPath).not.toBe('');
        expect(held.creasePath).not.toBe('');
        for (const point of removed.back) {
          const x = corner.endsWith('left') ? point.x : width - point.x;
          const y = corner.startsWith('top') ? point.y : height - point.y;
          expect(x * normal.x + y * normal.y).toBeGreaterThanOrEqual(width * normal.x + height * normal.y - .001);
        }
      }
    }
  });
});
