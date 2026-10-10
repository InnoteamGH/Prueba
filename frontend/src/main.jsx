import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
// Tipografía incluida en el paquete: no depende de que cargue Google Fonts.
import '@fontsource-variable/inter'
import '@fontsource-variable/manrope'
import './estilos/tokens.css'
import './ui/ui.css'

// La semilla de la demostración cambió (catálogo único, presupuesto con pieza y cara,
// documentos y casos compartidos con la ficha). Una sola vez, se descartan los datos
// demo guardados con la semilla anterior para que todas las pantallas lean la nueva.
const SEMILLA_DEMO = '2026-10-spec-uxui'
try {
  if (localStorage.getItem('dc_semilla') !== SEMILLA_DEMO) {
    Object.keys(localStorage).filter((k) => k.startsWith('dc_data_')).forEach((k) => localStorage.removeItem(k))
    localStorage.setItem('dc_semilla', SEMILLA_DEMO)
  }
} catch (e) { /* sin almacenamiento local */ }

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Sin esto, un error de render deja la pantalla en blanco y sin explicación. */}
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
