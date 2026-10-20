import { useId } from "react";

export function TextField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly multiline?: boolean;
}) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      {label}
      {multiline ? (
        <textarea
          id={id}
          key={value}
          rows={3}
          defaultValue={value}
          maxLength={1000}
          onBlur={(e) => {
            if (value !== e.target.value) onChange(e.target.value);
          }}
        />
      ) : (
        <input
          id={id}
          key={value}
          defaultValue={value}
          maxLength={200}
          onBlur={(e) => {
            if (value !== e.target.value) onChange(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
      )}
    </label>
  );
}
