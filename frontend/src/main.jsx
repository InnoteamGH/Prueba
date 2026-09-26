import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
// Tipografía incluida en el paquete: no depende de que cargue Google Fonts.
import '@fontsource-variable/inter'
import '@fontsource-variable/manrope'
import './estilos/tokens.css'
import './ui/ui.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Sin esto, un error de render deja la pantalla en blanco y sin explicación. */}
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
