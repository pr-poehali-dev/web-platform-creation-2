import { useEffect } from 'react';

interface TelegramAuthProps {
  botName: string;
  onAuth: (user: any) => void;
}

declare global {
  interface Window {
    TelegramLoginWidget?: {
      dataOnauth?: (user: any) => void;
    };
  }
}

export default function TelegramAuth({ botName, onAuth }: TelegramAuthProps) {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '10');
    script.setAttribute('data-onauth', 'TelegramLoginWidget.dataOnauth(user)');
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    window.TelegramLoginWidget = {
      dataOnauth: onAuth
    };

    const container = document.getElementById('telegram-login-container');
    if (container) {
      container.innerHTML = '';
      container.appendChild(script);
    }

    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [botName, onAuth]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div id="telegram-login-container" className="flex justify-center"></div>
      <p className="text-sm text-muted-foreground text-center">
        Войдите через Telegram для доступа к платформе
      </p>
    </div>
  );
}
