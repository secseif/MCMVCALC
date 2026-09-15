import "./globals.css";

export const metadata = {
  title: "Calculadora MCMV",
  description:
    "Calculadora de parcelas do Minha Casa Minha Vida, com SAC e Tabela Price.",
};

export default function RootLayout({ children }) {
  const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

  return (
    <html lang="pt-BR">
      <head>
        {/* Só carrega o script do AdSense quando você já tiver preenchido
            NEXT_PUBLIC_ADSENSE_CLIENT_ID no .env (depois de aprovado). */}
        {adsenseClientId ? (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
            crossOrigin="anonymous"
          />
        ) : null}
      </head>
      <body>{children}</body>
    </html>
  );
}
