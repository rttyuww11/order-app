import { useRef, useState } from 'react'
import './App.css'

const menuItems = [
  {
    id: 'americano-ice',
    name: '아메리카노 (ICE)',
    description: '산뜻하고 깔끔한 밸런스의 아이스 커피',
    price: 4000,
    tone: 'ice',
    options: [
      { id: 'extra-shot', name: '샷 추가', price: 500 },
      { id: 'vanilla-syrup', name: '바닐라 시럽', price: 0 },
    ],
  },
  {
    id: 'americano-hot',
    name: '아메리카노 (HOT)',
    description: '고소한 향을 따뜻하게 즐기는 커피',
    price: 4000,
    tone: 'hot',
    options: [
      { id: 'extra-shot', name: '샷 추가', price: 500 },
      { id: 'vanilla-syrup', name: '바닐라 시럽', price: 0 },
    ],
  },
  {
    id: 'cafe-latte',
    name: '카페라떼',
    description: '부드러운 우유와 진한 에스프레소',
    price: 5000,
    tone: 'latte',
    options: [
      { id: 'extra-shot', name: '샷 추가', price: 500 },
      { id: 'vanilla-syrup', name: '바닐라 시럽', price: 0 },
    ],
  },
]

const formatPrice = (price) => `${price.toLocaleString('ko-KR')}원`

function App() {
  const [selectedOptions, setSelectedOptions] = useState({})
  const [cart, setCart] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState(null)
  const submittingRef = useRef(false)

  const cartCount = cart.reduce((count, item) => count + item.quantity, 0)
  const totalPrice = cart.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0,
  )

  function toggleOption(menuId, optionId) {
    setSelectedOptions((current) => {
      const menuOptions = current[menuId] ?? []
      const isSelected = menuOptions.includes(optionId)

      return {
        ...current,
        [menuId]: isSelected
          ? menuOptions.filter((id) => id !== optionId)
          : [...menuOptions, optionId],
      }
    })
  }

  function addToCart(menu) {
    const options = menu.options.filter((option) =>
      (selectedOptions[menu.id] ?? []).includes(option.id),
    )
    const optionKey = options
      .map((option) => option.id)
      .sort()
      .join(',')
    const cartItemId = `${menu.id}:${optionKey}`
    const unitPrice =
      menu.price + options.reduce((total, option) => total + option.price, 0)

    setCart((current) => {
      const existingItem = current.find((item) => item.id === cartItemId)

      if (existingItem) {
        return current.map((item) =>
          item.id === cartItemId
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      }

      return [
        ...current,
        {
          id: cartItemId,
          menuId: menu.id,
          name: menu.name,
          options,
          quantity: 1,
          unitPrice,
        },
      ]
    })
    setNotice({ type: 'success', message: `${menu.name} 메뉴를 담았어요.` })
  }

  function changeQuantity(itemId, change) {
    setCart((current) =>
      current
        .map((item) =>
          item.id === itemId
            ? { ...item, quantity: item.quantity + change }
            : item,
        )
        .filter((item) => item.quantity > 0),
    )
  }

  async function submitOrder() {
    if (cart.length === 0 || submittingRef.current) return

    submittingRef.current = true
    setSubmitting(true)
    setNotice({ type: 'info', message: '주문을 접수하고 있어요.' })

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((item) => ({
            menuId: item.menuId,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            options: item.options.map(({ id, name, price }) => ({
              id,
              name,
              price,
            })),
          })),
          totalPrice,
        }),
      })

      if (!response.ok) {
        throw new Error(`주문 접수에 실패했어요. (${response.status})`)
      }

      setCart([])
      setNotice({ type: 'success', message: '주문이 접수되었어요. 감사합니다!' })
    } catch (error) {
      setNotice({
        type: 'error',
        message:
          error instanceof TypeError
            ? '주문 서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.'
            : error.message,
      })
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="COZY 홈">
          COZY<span className="brand__dot">.</span>
        </a>
        <nav className="main-nav" aria-label="주요 메뉴">
          <a className="main-nav__link main-nav__link--active" href="/" aria-current="page">
            주문하기
          </a>
          <a className="main-nav__link" href="/admin">
            관리자
          </a>
        </nav>
      </header>

      <main className="main-content">
        <section className="menu-section" aria-labelledby="menu-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">MADE FRESH FOR YOU</p>
              <h1 id="menu-title">오늘의 커피</h1>
              <p className="section-description">
                취향에 맞는 커피를 골라 여유로운 한 잔을 즐겨보세요.
              </p>
            </div>
            <span className="menu-count">COFFEE MENU</span>
          </div>

          <div className="menu-grid">
            {menuItems.map((menu) => (
              <article className="menu-card" key={menu.id}>
                <div
                  className={`menu-card__visual menu-card__visual--${menu.tone}`}
                  aria-hidden="true"
                >
                  <span className="visual-sun" />
                  <span className="visual-beans visual-beans--one" />
                  <span className="visual-beans visual-beans--two" />
                  <span className="coffee-cup">
                    <span className="coffee-cup__lid" />
                    <span className="coffee-cup__sleeve">COZY</span>
                  </span>
                  <span className="visual-caption">COZY COFFEE</span>
                </div>

                <div className="menu-card__body">
                  <div className="menu-card__title-row">
                    <h2>{menu.name}</h2>
                    <span className="menu-card__price">{formatPrice(menu.price)}</span>
                  </div>
                  <p className="menu-card__description">{menu.description}</p>

                  <fieldset className="option-list">
                    <legend className="sr-only">{menu.name} 옵션 선택</legend>
                    {menu.options.map((option) => {
                      const checked = (selectedOptions[menu.id] ?? []).includes(
                        option.id,
                      )

                      return (
                        <label className="option-row" key={option.id}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleOption(menu.id, option.id)}
                          />
                          <span>{option.name}</span>
                          <span className="option-price">
                            {option.price > 0
                              ? `+${formatPrice(option.price)}`
                              : '+0원'}
                          </span>
                        </label>
                      )
                    })}
                  </fieldset>

                  <button
                    className="button button--outline menu-card__add"
                    type="button"
                    onClick={() => addToCart(menu)}
                  >
                    <span aria-hidden="true">+</span> 담기
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="cart-section" aria-labelledby="cart-title">
          <div className="cart-heading">
            <div>
              <p className="eyebrow">YOUR SELECTION</p>
              <h2 id="cart-title">
                장바구니 <span className="cart-count">{cartCount}</span>
              </h2>
            </div>
            {cart.length > 0 && (
              <span className="cart-heading__hint">주문 내용을 확인해 주세요</span>
            )}
          </div>

          <div className="cart-content">
            {cart.length === 0 ? (
              <div className="cart-empty">
                <span className="cart-empty__icon" aria-hidden="true">
                  ☕
                </span>
                <p>아직 담긴 메뉴가 없어요.</p>
                <span>마음에 드는 커피를 장바구니에 담아보세요.</span>
              </div>
            ) : (
              <ul className="cart-items">
                {cart.map((item) => (
                  <li className="cart-item" key={item.id}>
                    <div className="cart-item__details">
                      <span className="cart-item__name">{item.name}</span>
                      {item.options.length > 0 && (
                        <span className="cart-item__options">
                          {item.options
                            .map(
                              (option) =>
                                `${option.name}${
                                  option.price > 0
                                    ? ` (+${formatPrice(option.price)})`
                                    : ''
                                }`,
                            )
                            .join(' · ')}
                        </span>
                      )}
                    </div>
                    <div
                      className="cart-quantity-control"
                      aria-label={`${item.name} 수량`}
                    >
                      <button
                        className="cart-quantity-control__button"
                        type="button"
                        aria-label={`${item.name} 수량 줄이기`}
                        onClick={() => changeQuantity(item.id, -1)}
                      >
                        −
                      </button>
                      <span
                        className="cart-quantity-control__value"
                        aria-live="polite"
                      >
                        {item.quantity}
                      </span>
                      <button
                        className="cart-quantity-control__button"
                        type="button"
                        aria-label={`${item.name} 수량 늘리기`}
                        onClick={() => changeQuantity(item.id, 1)}
                      >
                        +
                      </button>
                    </div>
                    <span className="cart-item__total">
                      {formatPrice(item.unitPrice * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="cart-summary">
              <div className="cart-summary__total">
                <span>총 금액</span>
                <strong>{formatPrice(totalPrice)}</strong>
              </div>
              <button
                className="button button--primary cart-summary__submit"
                type="button"
                onClick={submitOrder}
                disabled={cart.length === 0 || submitting}
              >
                {submitting ? '접수 중...' : '주문하기'}
                {!submitting && <span aria-hidden="true">→</span>}
              </button>
            </div>
          </div>

          {notice && (
            <p className={`notice notice--${notice.type}`} role="status">
              {notice.message}
            </p>
          )}
        </section>
      </main>

      <footer className="site-footer">
        <span>COZY COFFEE</span>
        <span>오늘도 편안한 한 잔</span>
      </footer>
    </div>
  )
}

export default App
