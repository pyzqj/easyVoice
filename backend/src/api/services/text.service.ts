// src/api/services/text.service.ts
import jieba from "@node-rs/jieba";
import { Segment } from "./tts.service";

export function splitText(text: string, maxLen: number = 500): Segment[] {
  const sentences = text.split(/[。！？]/).filter(Boolean);
  let current = "", segments: Segment[] = [];
  console.log(jieba)
  sentences.forEach((sent, i) => {
    if (current.length + sent.length > maxLen && current) {
      segments.push({ id: `seg_${i}`, text: current + "。" });
      current = sent;
    } else {
      current += sent + "。";
    }
  });
  if (current) segments.push({ id: `seg_${sentences.length}`, text: current });
  return segments;
}