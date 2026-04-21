import { Trash2, Plus } from "lucide-react";
import type { KeyValueEntry } from "@/lib/flow/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { VariablePicker } from "./VariablePicker";

interface Props {
  entries: KeyValueEntry[];
  onUpdate: (id: string, patch: Partial<KeyValueEntry>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  pickerAvailable?: boolean;
}

export function KeyValueEditor({
  entries,
  onUpdate,
  onAdd,
  onRemove,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
  pickerAvailable,
}: Props) {
  return (
    <div className="space-y-2">
      {entries.map((e) => (
        <div key={e.id} className="flex items-center gap-2 group">
          <Checkbox
            checked={e.enabled}
            onCheckedChange={(v) => onUpdate(e.id, { enabled: !!v })}
            className="shrink-0"
          />
          <Input
            value={e.key}
            onChange={(ev) => onUpdate(e.id, { key: ev.target.value })}
            placeholder={keyPlaceholder}
            className="h-8 text-sm flex-1"
          />
          <div className="flex-1 flex items-center gap-1">
            <Input
              value={e.value}
              onChange={(ev) => onUpdate(e.id, { value: ev.target.value })}
              placeholder={valuePlaceholder}
              className="h-8 text-sm"
            />
            {pickerAvailable && (
              <VariablePicker onInsert={(t) => onUpdate(e.id, { value: e.value + t })} />
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition"
            onClick={() => onRemove(e.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={onAdd} className="text-xs gap-1">
        <Plus className="h-3 w-3" /> Add row
      </Button>
    </div>
  );
}
