const GARBLED_TEXT_PATTERN = /[ÃÄÂá»]/;

export function repairText(value) {
  if (typeof value !== 'string' || !GARBLED_TEXT_PATTERN.test(value)) {
    return value;
  }

  try {
    return decodeURIComponent(escape(value));
  } catch {
    return value;
  }
}

export function repairDeep(value) {
  if (Array.isArray(value)) {
    return value.map(repairDeep);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, repairDeep(item)]));
  }

  return repairText(value);
}
