import { CaptureStatus } from '@/lib/types';

interface Props {
  status: CaptureStatus | null;
}

export function Progress({ status }: Props) {
  if (!status) {
    return (
      <div className="progress-section">
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="progress-section">
      <p>取得済み: {status.count}件</p>
      {status.isCapturing && (
        <>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: '100%' }} />
          </div>
          <p className="status-text">取得中...</p>
        </>
      )}
      {status.oldestDate && (
        <p className="status-text">
          最古: {new Date(status.oldestDate).toLocaleDateString('ja-JP')}
        </p>
      )}
    </div>
  );
}
