import "./globals.css";
 
export const metadata = {
  title: "Gestion de Equipos",
  description: "Sistema de gestion de entrada y salida de equipos tecnologicos",
};
 
export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-100">
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💻</span>
                <span className="font-bold text-gray-800 text-lg">
                  Gestion de Equipos
                </span>
              </div>
              <div className="flex items-center gap-4">
                <a
                  href="/"
                  className="text-gray-600 hover:text-blue-600 font-medium text-sm transition-colors"
                >
                  Equipos
                </a>
                <a
                  href="/mantenimiento"
                  className="text-gray-600 hover:text-blue-600 font-medium text-sm transition-colors"
                >
                  Mantenimiento
                </a>
                <a
                  href="/equipos/nuevo"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  + Nuevo Equipo
                </a>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}