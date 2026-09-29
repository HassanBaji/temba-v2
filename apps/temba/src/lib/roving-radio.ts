export function rovingRadioIndex(
  key: string,
  currentIndex: number,
  count: number,
): number | null {
  if (count <= 0) {
    return null;
  }
  const last = count - 1;
  switch (key) {
    case "Home":
      return 0;
    case "End":
      return last;
    case "ArrowLeft":
    case "ArrowUp":
      return currentIndex <= 0 ? last : currentIndex - 1;
    case "ArrowRight":
    case "ArrowDown":
      return currentIndex < 0 || currentIndex >= last ? 0 : currentIndex + 1;
    default:
      return null;
  }
}
