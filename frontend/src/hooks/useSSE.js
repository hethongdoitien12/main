import { useEffect, useRef } from 'react';

export function useSSE(token, handlers) {
  const esRef = useRef(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!token) return;

    let retryDelay = 1000;
    let destroyed = false;

    function connect() {
      if (destroyed) return;
      const es = new EventSource(`/api/stream?token=${encodeURIComponent(token)}`);
      esRef.current = es;

      es.addEventListener('connected', () => { retryDelay = 1000; });

      const eventNames = ['balance_update', 'gift_feed', 'tip_received', 'notification'];
      eventNames.forEach(name => {
        es.addEventListener(name, (e) => {
          try {
            const data = JSON.parse(e.data);
            handlersRef.current?.[name]?.(data);
          } catch {}
        });
      });

      es.onerror = () => {
        es.close();
        if (!destroyed) {
          retryDelay = Math.min(retryDelay * 2, 30000);
          setTimeout(connect, retryDelay);
        }
      };
    }

    connect();
    return () => {
      destroyed = true;
      esRef.current?.close();
    };
  }, [token]);
}
