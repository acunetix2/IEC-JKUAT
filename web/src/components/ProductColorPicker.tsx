const COLOR_SWATCHES: Record<string, string> = {
  black: '#171717',
  white: '#fff',
  blue: '#2563eb',
  navy: '#12324f',
  red: '#dc2626',
  green: '#16804b',
  yellow: '#f5c542',
  gray: '#9ca3af',
  grey: '#9ca3af',
  beige: '#d6c3a1',
  orange: '#f97316',
  purple: '#7c3aed',
  maroon: '#7f1d1d',
  brown: '#795548',
  pink: '#ec4899',
};

interface ProductColorPickerProps {
  colors: string[];
  value: string | null;
  onChange: (color: string) => void;
}

export default function ProductColorPicker({ colors, value, onChange }: ProductColorPickerProps) {
  if (!colors.length) return null;

  return (
    <fieldset className="product-color-picker">
      <legend>Choose a color</legend>
      <div className="product-color-options">
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            className={`product-color-option${value === color ? ' is-selected' : ''}`}
            aria-label={`Choose ${color}`}
            aria-pressed={value === color}
            title={color}
            onClick={() => onChange(color)}
          >
            <span
              className="product-color-swatch"
              aria-hidden="true"
              style={{ backgroundColor: COLOR_SWATCHES[color.toLowerCase()] ?? '#cbd5e1' }}
            />
            <span>{color}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
