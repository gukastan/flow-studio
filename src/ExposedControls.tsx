import { useId } from "react";
import type { SettingChange, SettingValue } from "./exposedSettings";

type Props = {
  readonly values: readonly SettingValue[];
  readonly onChange: (change: SettingChange) => void;
};
export function ExposedControls({ values, onChange }: Props) {
  const prefix = useId();
  return (
    <div className="exposed-controls nodrag nopan nowheel">
      {values.map(({ setting, value }) => (
        <label className="exposed-control" key={setting.id} htmlFor={`${prefix}-${setting.id}`}>
          <span title={setting.label}>{setting.label}</span>
          {setting.property === "shape" ? (
            <select
              id={`${prefix}-${setting.id}`}
              aria-label={setting.label}
              value={value}
              onChange={(event) => onChange({ id: setting.id, value: event.target.value })}
            >
              <option value="process">프로세스</option>
              <option value="decision">조건 / 분기</option>
              <option value="terminal">시작 / 종료</option>
            </select>
          ) : setting.property === "color" ? (
            <input
              id={`${prefix}-${setting.id}`}
              type="color"
              aria-label={setting.label}
              value={value}
              onChange={(event) => onChange({ id: setting.id, value: event.target.value })}
            />
          ) : (
            <input
              id={`${prefix}-${setting.id}`}
              aria-label={setting.label}
              key={value}
              defaultValue={value}
              maxLength={1000}
              onBlur={(event) => {
                if (event.target.value !== value)
                  onChange({ id: setting.id, value: event.target.value });
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
            />
          )}
        </label>
      ))}
    </div>
  );
}
