import type { WhatsAppAllocationRecord, WhatsAppAllocationSplit } from "@shared/schema";

/**
 * Resolve the WhatsApp Business number assigned to an executive in
 * Company Admin Console → WhatsApp Lead Settings → Phone Number
 * Allocations. Used to render the `{executive_mobno}` template
 * placeholder for outbound WhatsApp messages.
 *
 * The placeholder is tied to the lead's owning executive — NOT to
 * whichever sender the user happens to pick in the Send From dropdown
 * — so that the customer is told to call back on the right line
 * regardless of which connected business number the message was
 * dispatched through.
 *
 * Resolution priority (first match wins, empty string if none):
 *  1. An enabled, single-user allocation for `(ownerUserId, leadSheetId)`.
 *  2. An enabled, single-user allocation for `ownerUserId` on any sheet.
 *  3. A split allocation containing `ownerUserId` whose row matches
 *     `leadSheetId`, picking the highest-percentage entry (deterministic
 *     tiebreak: lowest user_id).
 *  4. A split allocation containing `ownerUserId` on any sheet,
 *     same tiebreak.
 *  5. `""` — same fallback used by the existing four placeholder
 *     substitutions when a value is missing.
 *
 * "Single-user mode" vs "Split mode" is determined by whether any
 * `whatsapp_allocation_splits` rows exist for the phone — the parent
 * `whatsapp_allocations` row exists in both modes (and its `enabled`
 * flag governs the entire phone in both modes).
 */
export function resolveExecutiveBusinessPhone(args: {
  ownerUserId: string | null | undefined;
  leadSheetId: string;
  allocations: WhatsAppAllocationRecord[];
  splitsByPhone: Record<string, WhatsAppAllocationSplit[]>;
}): string {
  const { ownerUserId, leadSheetId, allocations, splitsByPhone } = args;
  if (!ownerUserId) return "";

  const allocByPhone = new Map<string, WhatsAppAllocationRecord>();
  for (const a of allocations) {
    if (!allocByPhone.has(a.display_phone_number)) {
      allocByPhone.set(a.display_phone_number, a);
    }
  }
  const isSplitPhone = (phone: string): boolean =>
    (splitsByPhone[phone]?.length ?? 0) > 0;
  const isPhoneEnabled = (phone: string): boolean =>
    allocByPhone.get(phone)?.enabled === true;

  // 1 & 2 — single-user allocations (phones with no split rows)
  const singleMatches = allocations.filter(
    (a) =>
      a.enabled &&
      a.user_id === ownerUserId &&
      !isSplitPhone(a.display_phone_number),
  );
  const exactSingle = singleMatches.find((a) => a.sheet_id === leadSheetId);
  if (exactSingle) return exactSingle.display_phone_number;
  if (singleMatches.length > 0) {
    return [...singleMatches].sort((a, b) =>
      a.display_phone_number.localeCompare(b.display_phone_number),
    )[0].display_phone_number;
  }

  // 3 & 4 — split allocations containing this user
  const matchingSplits: Array<{ phone: string; split: WhatsAppAllocationSplit }> = [];
  for (const [phone, splits] of Object.entries(splitsByPhone)) {
    if (!isPhoneEnabled(phone)) continue;
    for (const s of splits) {
      if (s.user_id === ownerUserId) matchingSplits.push({ phone, split: s });
    }
  }
  if (matchingSplits.length === 0) return "";

  const sortByPctThenPhoneThenUser = (
    a: { phone: string; split: WhatsAppAllocationSplit },
    b: { phone: string; split: WhatsAppAllocationSplit },
  ) => {
    if (b.split.percentage !== a.split.percentage) {
      return b.split.percentage - a.split.percentage;
    }
    // Equal-percentage ties: pick deterministically by phone (then user_id),
    // so iteration order over splitsByPhone never affects the result.
    if (a.phone !== b.phone) return a.phone.localeCompare(b.phone);
    return a.split.user_id.localeCompare(b.split.user_id);
  };

  const sheetSplitMatches = matchingSplits.filter(
    (m) => m.split.sheet_id === leadSheetId,
  );
  if (sheetSplitMatches.length > 0) {
    return sheetSplitMatches.sort(sortByPctThenPhoneThenUser)[0].phone;
  }
  return matchingSplits.sort(sortByPctThenPhoneThenUser)[0].phone;
}
