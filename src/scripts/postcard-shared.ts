// Общее для страницы гостевой книги и модуля на главной.

/** Исходные координаты холста — рисуем в них. */
export const W = 480;
export const H = 800;

/** Открытка всегда чёрным по белому, тема сайта ни при чём. */
export const INK = '#000000';
export const PAPER = '#ffffff';

export const API =
  import.meta.env.PUBLIC_POSTCARDS_API?.replace(/\/$/, '') ??
  'http://localhost:4400';

export type Tool = 'pen' | 'eraser';

export type Stroke = {
  tool: Tool;
  size: number;
  points: number[];
};

export type Card = {
  id: string;
  pending?: boolean;
  message: string;
  link: string;
  createdAt: number;
  strokes: Stroke[];
};

/** Штрих; `upTo` рисует его частично — для живого пера. */
export function paintStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  upTo = Infinity,
) {
  const p = stroke.points;
  const count = Math.min(p.length / 2, upTo);
  if (count < 1) return;

  const color = stroke.tool === 'eraser' ? PAPER : INK;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = stroke.size;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;

  if (count === 1) {
    ctx.beginPath();
    ctx.arc(p[0], p[1], stroke.size / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(p[0], p[1]);

  if (count === 2) {
    ctx.lineTo(p[2], p[3]);
  } else {
    for (let i = 1; i < count - 1; i++) {
      const cx = p[i * 2];
      const cy = p[i * 2 + 1];
      ctx.quadraticCurveTo(
        cx,
        cy,
        (cx + p[i * 2 + 2]) / 2,
        (cy + p[i * 2 + 3]) / 2,
      );
    }
    ctx.lineTo(p[(count - 1) * 2], p[(count - 1) * 2 + 1]);
  }

  ctx.stroke();
}

export function paintAll(ctx: CanvasRenderingContext2D, strokes: Stroke[]) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();

  for (const stroke of strokes) paintStroke(ctx, stroke);
}

/** Последние записки; бросает, если хранилище недоступно. */
export async function fetchPostcards(limit: number): Promise<Card[]> {
  const response = await fetch(`${API}/api/postcards?limit=${limit}`);

  if (!response.ok) throw new Error(String(response.status));

  const { postcards } = (await response.json()) as { postcards: Card[] };

  return postcards;
}
