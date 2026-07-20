const TENTATIVE_MEMO_MARKER = '[[shift-app:tentative]]';

export function decodeShiftMetadata(memo: string | null | undefined, databaseFlag?: boolean | null) {
  const rawMemo = memo ?? '';
  const hasFallbackMarker = rawMemo.startsWith(TENTATIVE_MEMO_MARKER);
  const cleanMemo = hasFallbackMarker
    ? rawMemo.slice(TENTATIVE_MEMO_MARKER.length).replace(/^\r?\n/, '')
    : rawMemo;

  return {
    memo: cleanMemo,
    isTentative: Boolean(databaseFlag) || hasFallbackMarker,
  };
}

export function encodeTentativeMemo(memo: string | undefined, isTentative: boolean) {
  const cleanMemo = decodeShiftMetadata(memo).memo;
  return isTentative
    ? `${TENTATIVE_MEMO_MARKER}${cleanMemo ? `\n${cleanMemo}` : ''}`
    : cleanMemo;
}
