import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

window.__ethicaT0 = performance.now()   // ★216 부팅 계측 기준점 = 모든 import 로드·평가 완료 시점(BootProbe가 읽는다)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
