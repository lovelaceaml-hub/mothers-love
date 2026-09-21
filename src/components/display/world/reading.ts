// Grapheme boundaries preserve emoji families and combining marks across TV pages.
export function messagePages(message: string): string[] {
  const graphemes = [
    ...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(
      message,
    ),
  ].map((item) => item.segment);
  const pages: string[] = [];
  let start = 0;
  while (start < graphemes.length) {
    let end = Math.min(start + 220, graphemes.length),
      lines = 0;
    for (let i = start; i < end; i++)
      if (graphemes[i].includes("\n") && ++lines === 5) {
        end = i + 1;
        break;
      }
    if (end < graphemes.length && lines < 5) {
      for (let i = end - 1; i > start + (end - start) / 2; i--)
        if (/\s/u.test(graphemes[i])) {
          end = i + 1;
          break;
        }
    }
    pages.push(graphemes.slice(start, end).join(""));
    start = end;
  }
  return pages.length ? pages : [""];
}
export function readingSeconds(message: string, minimum = 20) {
  const graphemes = [
    ...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(
      message,
    ),
  ].length;
  return Math.max(
    minimum,
    8 + message.trim().split(/\s+/u).length / 2.4,
    8 + graphemes / 13,
    messagePages(message).length * 10,
  );
}
