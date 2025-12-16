import { useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface AutoFillRule {
  id: string;
  trigger_column_key: string;
  trigger_value: string;
  target_column_key: string;
  target_value: string;
  priority: number;
  enabled: boolean;
}

interface CompanySettings {
  auto_fill_rules?: AutoFillRule[];
  [key: string]: any;
}

interface AutoFillResult {
  column_key: string;
  value: string;
  rule_id: string;
}

export function useAutoFillRules() {
  const { toast } = useToast();
  
  const { data: settingsData } = useQuery<{ settings: CompanySettings }>({
    queryKey: ["/api/company/settings"],
    staleTime: 5 * 60 * 1000,
  });

  const rules = useMemo(() => {
    const rawRules = settingsData?.settings?.auto_fill_rules;
    if (!rawRules || !Array.isArray(rawRules)) return [];
    return rawRules
      .filter(r => r.enabled)
      .sort((a, b) => a.priority - b.priority);
  }, [settingsData]);

  const applyAutoFillRules = useCallback((
    changedColumnKey: string,
    newValue: string,
    currentData: Record<string, any>,
    onAutoFill: (updates: Record<string, any>) => void,
    options?: { showToast?: boolean }
  ): AutoFillResult[] => {
    if (rules.length === 0) return [];
    
    const results: AutoFillResult[] = [];
    const updates: Record<string, any> = {};
    const appliedTargets = new Set<string>();
    
    for (const rule of rules) {
      if (rule.trigger_column_key !== changedColumnKey) continue;
      if (rule.trigger_value !== newValue) continue;
      if (appliedTargets.has(rule.target_column_key)) continue;
      
      if (currentData[rule.target_column_key] !== rule.target_value) {
        updates[rule.target_column_key] = rule.target_value;
        appliedTargets.add(rule.target_column_key);
        results.push({
          column_key: rule.target_column_key,
          value: rule.target_value,
          rule_id: rule.id,
        });
      }
    }
    
    if (Object.keys(updates).length > 0) {
      onAutoFill(updates);
      
      if (options?.showToast !== false) {
        const fieldNames = results.map(r => r.column_key).join(", ");
        toast({
          title: "Fields auto-filled",
          description: `Updated: ${fieldNames}`,
          duration: 3000,
        });
      }
    }
    
    return results;
  }, [rules, toast]);

  return {
    rules,
    applyAutoFillRules,
    hasRules: rules.length > 0,
  };
}
