"use client";

import { JSX, MouseEvent, useEffect, useRef, useState } from "react";

interface Stroke {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color?: string;
  width?: number;
}

interface DrawEventMessage {
  type: "draw_event";
  stroke: Stroke;
}

interface JoinRoomMessage {
  type: "join_room";
  roomId: string;
}

type IncomingMessage =
  | DrawEventMessage
  | { type: "room_joined"; roomId: string };

export const Canvas = ({ roomId }: { roomId: string }): JSX.Element => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  const drawing = useRef<boolean>(false);
  const lastPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (!roomId) return;
    const socket = new WebSocket("ws://localhost:8080");

    socket.addEventListener("open", () => {
      const msg: JoinRoomMessage = {
        type: "join_room",
        roomId: String(roomId),
      };
      socket.send(JSON.stringify(msg));
    });

    socket.addEventListener("message", (event) => {
      const msg: IncomingMessage = JSON.parse(event.data);
      if (msg.type === "draw_event") {
        drawStroke(msg.stroke);
      }
    });

    setWs(socket);

    return () => {
      socket.close();
    };
  }, [roomId]);

  function drawStroke(stroke: Stroke) {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = stroke.color || "black";
    ctx.lineWidth = stroke.width || 2;
    ctx.beginPath();
    ctx.moveTo(stroke.from.x, stroke.from.y);
    ctx.lineTo(stroke.to.x, stroke.to.y);
    ctx.stroke();
  }

  function handleMouseDown(e: MouseEvent<HTMLCanvasElement>) {
    drawing.current = true;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    lastPos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handleMouseMove(e: MouseEvent<HTMLCanvasElement>) {
    if (!drawing.current || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const currentPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    const stroke: Stroke = {
      from: lastPos.current,
      to: currentPos,
      color: "black",
      width: 2,
    };
    drawStroke(stroke);

    if (ws && ws.readyState === WebSocket.OPEN) {
      const drawMsg: DrawEventMessage = { type: "draw_event", stroke };
      ws.send(JSON.stringify(drawMsg));
    }

    lastPos.current = currentPos;
  }

  function handleMouseUp() {
    drawing.current = false;
  }

  function handleMouseOut() {
    drawing.current = false;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  return (
    <div>
      <h1>Room: {roomId}</h1>
      <canvas
        ref={canvasRef}
        style={{ border: "1px solid #000" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseOut}
      />
    </div>
  );
};
