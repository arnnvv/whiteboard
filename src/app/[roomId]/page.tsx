import { Canvas } from "@/components/Canvas";
import { JSX } from "react";

export default async function WhiteboardPage(props: {
  params: Promise<{ roomId: string }>;
}): Promise<JSX.Element> {
  const params = await props.params;
  const { roomId } = params;

  return <Canvas roomId={roomId} />;
}
