import { zonedParts } from "@repo/domain/product-timezone";

/**
 * The day picker works in the browser's calendar. These two convert at that
 * boundary so the picker shows, and returns, the product timezone's day.
 */
export function pickerDateFromInstant(instant: Date) {
  const { year, month, day } = zonedParts(instant);
  return new Date(year, month - 1, day);
}

export function dayInputValueFromPickerDate(picked: Date) {
  const month = String(picked.getMonth() + 1).padStart(2, "0");
  const day = String(picked.getDate()).padStart(2, "0");
  return `${picked.getFullYear()}-${month}-${day}`;
}
