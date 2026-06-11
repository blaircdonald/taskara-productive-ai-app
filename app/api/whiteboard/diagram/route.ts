import { GoogleGenAI } from "@google/genai";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const diagramTypes = ["flowchart", "mind-map", "system-architecture", "user-journey", "process"] as const;
const colors = ["#fef3c7", "#dbeafe", "#dcfce7", "#fce7f3", "#ede9fe", "#ffedd5"];

type Node = { id: string; label: string; x: number; y: number; color?: string };
type Edge = { from: string; to: string; label?: string };
type DiagramType = typeof diagramTypes[number];

function errorStatus(error: unknown) {
  if (!error || typeof error !== "object") return undefined;
  const value = error as { status?: unknown; code?: unknown; error?: { code?: unknown } };
  const status = Number(value.status ?? value.code ?? value.error?.code);
  return Number.isFinite(status) ? status : undefined;
}

function isRetryable(error: unknown) {
  const status = errorStatus(error);
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504
    || (error instanceof Error && /high demand|unavailable|temporar|rate limit/i.test(error.message));
}

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function generateDiagram(ai: GoogleGenAI, contents: string) {
  const models = [...new Set([
    process.env.GEMINI_MODEL || "gemini-3.5-flash",
    process.env.GEMINI_FALLBACK_MODEL || "gemini-2.5-flash",
  ])];
  let lastError: unknown;
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await ai.models.generateContent({
          model,
          contents,
          config: { responseMimeType: "application/json" },
        });
      } catch (error) {
        lastError = error;
        if (!isRetryable(error)) throw error;
        if (attempt === 0) await wait(600);
      }
    }
  }
  throw lastError;
}

function parseJson(text: string) {
  const clean = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(clean) as { nodes?: unknown; edges?: unknown };
}

function layoutNodes(nodes: Node[], edges: Edge[], type: DiagramType) {
  if (type === "mind-map") {
    const center = nodes[0];
    if (!center) return nodes;
    const radius = Math.max(320, (nodes.length - 1) * 45);
    return nodes.map((node, index) => index === 0 ? { ...node, x: radius, y: radius } : {
      ...node,
      x: radius + Math.cos((index - 1) / Math.max(1, nodes.length - 1) * Math.PI * 2) * radius,
      y: radius + Math.sin((index - 1) / Math.max(1, nodes.length - 1) * Math.PI * 2) * radius,
    });
  }

  if (type === "system-architecture") {
    const columns = Math.min(3, Math.max(2, Math.ceil(Math.sqrt(nodes.length))));
    return nodes.map((node, index) => ({ ...node, x: (index % columns) * 360, y: Math.floor(index / columns) * 220 }));
  }

  const incoming = new Map(nodes.map((node) => [node.id, 0]));
  edges.forEach((edge) => incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1));
  const level = new Map<string, number>();
  const queue = nodes.filter((node) => incoming.get(node.id) === 0).map((node) => node.id);
  if (!queue.length && nodes[0]) queue.push(nodes[0].id);
  queue.forEach((id) => level.set(id, 0));
  while (queue.length) {
    const id = queue.shift()!;
    const nextLevel = (level.get(id) ?? 0) + 1;
    edges.filter((edge) => edge.from === id).forEach((edge) => {
      if (!level.has(edge.to) || nextLevel > level.get(edge.to)!) {
        level.set(edge.to, nextLevel);
        if (nextLevel < nodes.length) queue.push(edge.to);
      }
    });
  }
  nodes.forEach((node) => { if (!level.has(node.id)) level.set(node.id, Math.max(0, ...level.values()) + 1); });
  const rows = new Map<number, Node[]>();
  nodes.forEach((node) => rows.set(level.get(node.id)!, [...(rows.get(level.get(node.id)!) ?? []), node]));
  return nodes.map((node) => {
    const row = rows.get(level.get(node.id)!)!;
    const index = row.findIndex((item) => item.id === node.id);
    return { ...node, x: index * 340, y: level.get(node.id)! * 220 };
  });
}

function validateDiagram(value: { nodes?: unknown; edges?: unknown }, type: DiagramType) {
  if (!Array.isArray(value.nodes) || !Array.isArray(value.edges)) throw new Error("Invalid diagram response.");
  const nodes = value.nodes.slice(0, 30).map((item, index): Node => {
    if (!item || typeof item !== "object") throw new Error("Invalid diagram node.");
    const node = item as Partial<Node>;
    const label = typeof node.label === "string" ? node.label.trim().slice(0, 80) : "";
    if (!label) throw new Error("Invalid diagram node label.");
    return {
      id: typeof node.id === "string" && node.id ? node.id.slice(0, 40) : `node-${index + 1}`,
      label,
      x: Math.max(0, Math.min(1600, Number(node.x) || 0)),
      y: Math.max(0, Math.min(1200, Number(node.y) || 0)),
      color: typeof node.color === "string" && /^#[0-9a-fA-F]{6}$/.test(node.color) ? node.color : colors[index % colors.length],
    };
  });
  const ids = new Set(nodes.map((node) => node.id));
  const edges = value.edges.slice(0, 50).flatMap((item): Edge[] => {
    if (!item || typeof item !== "object") return [];
    const edge = item as Partial<Edge>;
    if (typeof edge.from !== "string" || typeof edge.to !== "string" || !ids.has(edge.from) || !ids.has(edge.to)) return [];
    return [{ from: edge.from, to: edge.to, label: typeof edge.label === "string" ? edge.label.trim().slice(0, 50) : undefined }];
  });
  return { nodes: layoutNodes(nodes, edges, type), edges };
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: "AI diagrams are not configured. Add GEMINI_API_KEY to the server environment." }, { status: 503 });
  try {
    const body = await request.json();
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const type = diagramTypes.includes(body.type) ? body.type : "flowchart";
    if (!prompt || prompt.length > 2000) return NextResponse.json({ error: "Enter a prompt between 1 and 2,000 characters." }, { status: 400 });
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await generateDiagram(ai, `Create a concise ${type} diagram for: ${prompt}

Return only valid JSON with this shape:
{"nodes":[{"id":"unique-id","label":"short label","color":"#fef3c7"}],"edges":[{"from":"node-id","to":"node-id","label":"optional"}]}

Use 4-15 nodes. Keep labels brief. Use only light hex background colors. The application will arrange the nodes.`,
    );
    if (!response.text) throw new Error("Gemini returned an empty response.");
    return NextResponse.json(validateDiagram(parseJson(response.text), type));
  } catch (error) {
    console.error("AI diagram generation failed", error);
    if (isRetryable(error)) return NextResponse.json({ error: "Gemini is temporarily busy. Please try again in a moment." }, { status: 503 });
    return NextResponse.json({ error: "AI could not generate this diagram. Try a more specific prompt." }, { status: 500 });
  }
}
