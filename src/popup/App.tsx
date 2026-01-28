import { useState, useEffect } from 'preact/hooks';
import { CaptureStatus } from '@/lib/types';

export function App() {
  const [status, setStatus] = useState<CaptureStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_CAPTURE_STATUS' }, (response) => {
      if (response) {
        setStatus(response);
      }
    });
  }, []);

  const handleExport = async (format: 'csv' | 'markdown') => {
    chrome.runtime.sendMessage({ type: 'EXPORT', payload: { format } }, async (response) => {
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
        <div className="status">
          <p>取得済み: {status?.count ?? 0}件</p>
        </div>

        <div className="export-section">
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
