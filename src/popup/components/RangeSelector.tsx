import { CaptureOptions } from '@/lib/types';

interface Props {
  value: CaptureOptions;
  onChange: (options: CaptureOptions) => void;
  disabled?: boolean;
}

export function RangeSelector({ value, onChange, disabled }: Props) {
  const getToday = (): string => {
    return new Date().toISOString().split('T')[0];
  };

  const getDefaultStartDate = (): string => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="range-selector">
      <h2>取得範囲</h2>

      <div className="radio-group">
        <label>
          <input
            type="radio"
            name="mode"
            checked={value.mode === 'all'}
            onChange={() => onChange({ mode: 'all' })}
            disabled={disabled}
          />
          全件
        </label>

        <label>
          <input
            type="radio"
            name="mode"
            checked={value.mode === 'count'}
            onChange={() => onChange({ mode: 'count', count: 20 })}
            disabled={disabled}
          />
          件数指定
        </label>

        <label>
          <input
            type="radio"
            name="mode"
            checked={value.mode === 'period'}
            onChange={() =>
              onChange({
                mode: 'period',
                startDate: getDefaultStartDate(),
                endDate: getToday(),
              })
            }
            disabled={disabled}
          />
          期間指定
        </label>
      </div>

      {value.mode === 'count' && (
        <div className="input-group">
          <label>
            最新
            <input
              type="number"
              min="1"
              max="10000"
              value={value.count ?? 20}
              onChange={(e) =>
                onChange({
                  ...value,
                  count: parseInt((e.target as HTMLInputElement).value) || 100,
                })
              }
              disabled={disabled}
            />
            件
          </label>
        </div>
      )}

      {value.mode === 'period' && (
        <div className="input-group">
          <label>
            開始日
            <input
              type="date"
              value={value.startDate}
              onChange={(e) =>
                onChange({
                  ...value,
                  startDate: (e.target as HTMLInputElement).value,
                })
              }
              disabled={disabled}
            />
          </label>
          <label>
            終了日
            <input
              type="date"
              value={value.endDate}
              onChange={(e) =>
                onChange({
                  ...value,
                  endDate: (e.target as HTMLInputElement).value,
                })
              }
              disabled={disabled}
            />
          </label>
        </div>
      )}
    </div>
  );
}
