import './App.css'

function App() {
  return (
    <main className="workspace">
      <header className="workspace__header">
        <a className="workspace__brand" href="/" aria-label="COZY 홈">
          COZY
        </a>
        <span className="workspace__status">Frontend workspace</span>
      </header>

      <section className="workspace__content" aria-labelledby="workspace-title">
        <p className="workspace__eyebrow">COFFEE ORDER APP</p>
        <h1 id="workspace-title">프런트엔드 개발 환경이 준비되었습니다.</h1>
        <p className="workspace__description">
          React와 바닐라 JavaScript를 사용해 주문하기 화면과 관리자 화면을
          개발할 수 있습니다.
        </p>
        <ul className="workspace__screens">
          <li>주문하기</li>
          <li>관리자</li>
        </ul>
      </section>
    </main>
  )
}

export default App
