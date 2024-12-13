import WebSocket, { WebSocketServer } from "ws";

interface JoinRoomMessage {
  type: "join_room";
  roomId: string;
}

interface DrawEventMessage {
  type: "draw_event";
  stroke: {
    from: { x: number; y: number };
    to: { x: number; y: number };
    color?: string;
    width?: number;
  };
}

interface RoomJoinedResponse {
  type: "room_joined";
  roomId: string;
}

type IncomingMessage = JoinRoomMessage | DrawEventMessage;
type OutgoingMessage = RoomJoinedResponse | DrawEventMessage;

const rooms: Record<string, WebSocket[]> = {};

const wss = new WebSocketServer({ port: 8080 });

function broadcastToRoom(
  roomId: string,
  data: OutgoingMessage,
  except?: WebSocket,
): void {
  const room = rooms[roomId];
  if (!room) return;
  const jsonData = JSON.stringify(data);
  for (const client of room) {
    if (client !== except && client.readyState === WebSocket.OPEN) {
      client.send(jsonData);
    }
  }
}

wss.on("connection", (ws: WebSocket) => {
  let currentRoomId: string | null = null;

  ws.on("message", (message: string) => {
    try {
      const msg: IncomingMessage = JSON.parse(message);

      switch (msg.type) {
        case "join_room":
          currentRoomId = msg.roomId;
          if (!rooms[currentRoomId]) {
            rooms[currentRoomId] = [];
          }
          rooms[currentRoomId].push(ws);

          const joinMsg: RoomJoinedResponse = {
            type: "room_joined",
            roomId: currentRoomId,
          };
          ws.send(JSON.stringify(joinMsg));
          break;

        case "draw_event":
          if (currentRoomId) {
            const drawMsg: DrawEventMessage = {
              type: "draw_event",
              stroke: msg.stroke,
            };
            broadcastToRoom(currentRoomId, drawMsg, ws);
          }
          break;
      }
    } catch (e) {
      console.error("Error parsing message:", e);
    }
  });

  ws.on("close", () => {
    if (currentRoomId && rooms[currentRoomId]) {
      rooms[currentRoomId] = rooms[currentRoomId].filter(
        (client) => client !== ws,
      );
      if (rooms[currentRoomId].length === 0) {
        delete rooms[currentRoomId];
      }
    }
  });
});

console.log("WebSocket server is running on ws://localhost:8080");
