import type { WhatsAppAllocationRecord, WhatsAppAllocationSplit } from "@shared/schema";

export interface SendFromOption {
  display_phone_number: string;
  user_id: string;
  user_name: string | null;
  is_lead_owner: boolean;
}

const MAX_SPLIT_LABEL_LENGTH = 80;

function buildSplitLabel(
  splits: WhatsAppAllocationSplit[],
  userNamesById: Map<string, string | null | undefined>,
): string {
  const sorted = [...splits].sort((a, b) => {
    if (b.percentage !== a.percentage) return b.percentage - a.percentage;
    return a.user_id.localeCompare(b.user_id);
  });
  const parts = sorted.map((s) => {
    const name = userNamesById.get(s.user_id) || "Unknown";
    return `${name} ${s.percentage}%`;
  });
  let label = `Split: ${parts.join(" / ")}`;
  if (label.length > MAX_SPLIT_LABEL_LENGTH) {
    label = label.slice(0, MAX_SPLIT_LABEL_LENGTH - 1) + "…";
  }
  return label;
}

/**
 * Build the "Send From" dropdown options for the Send WhatsApp dialog.
 *
 * Treats any phone with rows in `splitsByPhone` as a split-mode phone:
 *  - Label is composed from the split contributors (`Split: A 50% / B 50%`),
 *    NOT the parent `whatsapp_allocations` row's user_id (which can be
 *    stale leftover data from before split conversion).
 *  - `(Lead Owner)` badge fires only when the lead owner is one of the
 *    split contributors for that phone.
 *
 * Single-user phones (no split rows) keep the existing behavior: dedupe by
 * `display_phone_number`, prefer the lead-owner row when multiple
 * `(user_id, sheet_id)` rows exist for the same phone.
 *
 * Output is sorted: lead-owner phones first, then by phone number ascending,
 * matching the legacy ordering exactly.
 */
export function buildSendFromOptions(args: {
  ownerUserId: string | null | undefined;
  allocations: WhatsAppAllocationRecord[];
  splitsByPhone: Record<string, WhatsAppAllocationSplit[]>;
  connectedPhones: Set<string>;
  userNamesById: Map<string, string | null | undefined>;
}): SendFromOption[] {
  const { ownerUserId, allocations, splitsByPhone, connectedPhones, userNamesById } = args;

  const allocsByPhone = new Map<string, WhatsAppAllocationRecord[]>();
  for (const a of allocations) {
    if (!a.enabled) continue;
    if (!connectedPhones.has(a.display_phone_number)) continue;
    if (!allocsByPhone.has(a.display_phone_number)) {
      allocsByPhone.set(a.display_phone_number, []);
    }
    allocsByPhone.get(a.display_phone_number)!.push(a);
  }

  const options: SendFromOption[] = [];
  for (const [phone, allocs] of Array.from(allocsByPhone.entries())) {
    const phoneSplits = splitsByPhone[phone] || [];
    if (phoneSplits.length > 0) {
      const label = buildSplitLabel(phoneSplits, userNamesById);
      const isOwner = !!ownerUserId && phoneSplits.some((s) => s.user_id === ownerUserId);
      options.push({
        display_phone_number: phone,
        user_id: allocs[0].user_id, // parent row's user_id; not surfaced in label for split phones
        user_name: label,
        is_lead_owner: isOwner,
      });
    } else {
      const ownerRow = ownerUserId ? allocs.find((a) => a.user_id === ownerUserId) : null;
      const chosen = ownerRow ?? allocs[0];
      options.push({
        display_phone_number: phone,
        user_id: chosen.user_id,
        user_name: userNamesById.get(chosen.user_id) || null,
        is_lead_owner: !!ownerRow,
      });
    }
  }

  options.sort((a, b) => {
    if (a.is_lead_owner !== b.is_lead_owner) return a.is_lead_owner ? -1 : 1;
    return a.display_phone_number.localeCompare(b.display_phone_number);
  });
  return options;
}
