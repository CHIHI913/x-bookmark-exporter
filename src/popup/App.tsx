import { useState, useEffect } from 'preact/hooks';
import { RangeSelector } from './components/RangeSelector';
import { Progress } from './components/Progress';
import { CaptureOptions, CaptureStatus } from '@/lib/types';

export function App() {
  const [status, setStatus] = useState<CaptureStatus | null>(null);
  const [options, setOptions] = useState<CaptureOptions>({
    mode: 'count',
    count: 20,
  });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_CAPTURE_STATUS' }, (response) => {
      if (response) {
        setStatus(response);
      }
    });

    // 進捗更新を購読
    const listener = (message: { type: string; payload?: CaptureStatus }) => {
      if (message.type === 'CAPTURE_PROGRESS') {
        if (message.payload) {
          setStatus(message.payload);
        }
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const handleFetchMore = () => {
    chrome.runtime.sendMessage({ type: 'FETCH_MORE', payload: options });
  };

  const handleExport = async (format: 'csv' | 'markdown') => {
    chrome.runtime.sendMessage({ type: 'EXPORT', payload: { format, options } }, async (response) => {
      if (response?.clipboard && response?.content) {
        try {
          await navigator.clipboard.writeText(response.content);
          setMessage(`${response.count}件をクリップボードにコピーしました`);
        } catch (error) {
          setMessage('クリップボードへのコピーに失敗しました');
        }
        setTimeout(() => setMessage(null), 3000);
      }
    });
  };

  return (
    <div className="popup">
      <header className="popup-header">
        <h1>X Bookmark Exporter</h1>
      </header>

      <main className="popup-main">
        <RangeSelector value={options} onChange={setOptions} />

        <Progress status={status} />

        <div className="actions">
          <button onClick={handleFetchMore} className="btn btn-primary">
            もっと取得
          </button>
        </div>

        <div className="export-section">
          <h2>エクスポート</h2>
          <div className="export-buttons">
            <button
              onClick={() => handleExport('csv')}
              disabled={!status?.count}
              className="btn btn-secondary"
            >
              CSV (ダウンロード)
            </button>
            <button
              onClick={() => handleExport('markdown')}
              disabled={!status?.count}
              className="btn btn-secondary"
            >
              Markdown (コピー)
            </button>
          </div>
          {message && <p className="message">{message}</p>}
        </div>
      </main>
    </div>
  );
}
