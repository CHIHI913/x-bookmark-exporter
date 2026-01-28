import { useState, useEffect } from 'preact/hooks';
import { RangeSelector } from './components/RangeSelector';
import { Progress } from './components/Progress';
import { CaptureOptions, CaptureStatus } from '@/lib/types';

export function App() {
  const [status, setStatus] = useState<CaptureStatus | null>(null);
  const [options, setOptions] = useState<CaptureOptions>({
    mode: 'all',
  });

  useEffect(() => {
    // 初期状態を取得
    chrome.runtime.sendMessage({ type: 'GET_CAPTURE_STATUS' }, (response) => {
      if (response) {
        setStatus(response);
      }
    });

    // 進捗更新を購読
    const listener = (message: { type: string; payload?: CaptureStatus }) => {
      if (message.type === 'CAPTURE_PROGRESS' || message.type === 'CAPTURE_COMPLETED') {
        if (message.payload) {
          setStatus(message.payload);
        }
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const handleStart = () => {
    chrome.runtime.sendMessage({ type: 'START_CAPTURE', payload: options });
    setStatus((prev) => (prev ? { ...prev, isCapturing: true } : prev));
  };

  const handleStop = () => {
    chrome.runtime.sendMessage({ type: 'STOP_CAPTURE' });
    setStatus((prev) => (prev ? { ...prev, isCapturing: false } : prev));
  };

  const handleExport = (format: 'csv' | 'markdown') => {
    chrome.runtime.sendMessage({ type: 'EXPORT', payload: { format } });
  };

  const handleClear = () => {
    if (confirm('取得済みデータを全て削除しますか？')) {
      chrome.runtime.sendMessage({ type: 'CLEAR_DATA' }, () => {
        setStatus((prev) => (prev ? { ...prev, count: 0, oldestDate: null } : prev));
      });
    }
  };

  return (
    <div className="popup">
      <header className="popup-header">
        <h1>X Bookmark Exporter</h1>
      </header>

      <main className="popup-main">
        <RangeSelector
          value={options}
          onChange={setOptions}
          disabled={status?.isCapturing}
        />

        <div className="actions">
          {status?.isCapturing ? (
            <button onClick={handleStop} className="btn btn-danger">
              停止
            </button>
          ) : (
            <button onClick={handleStart} className="btn btn-primary">
              ブックマークを取得
            </button>
          )}
        </div>

        <Progress status={status} />

        <div className="export-section">
          <h2>エクスポート</h2>
          <div className="export-buttons">
            <button
              onClick={() => handleExport('csv')}
              disabled={!status?.count}
              className="btn btn-secondary"
            >
              CSV
            </button>
            <button
              onClick={() => handleExport('markdown')}
              disabled={!status?.count}
              className="btn btn-secondary"
            >
              Markdown
            </button>
          </div>
        </div>

        <div className="clear-section">
          <button onClick={handleClear} className="btn btn-text" disabled={!status?.count}>
            データをクリア
          </button>
        </div>
      </main>
    </div>
  );
}
