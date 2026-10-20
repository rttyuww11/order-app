import { useEffect, useRef, useState } from 'react'
import Admin from './Admin.jsx'
import { api } from './api.js'
import './App.css'

const formatPrice = (price) => `${price.toLocaleString('ko-KR')}원`

function getMenuQuantity(items, menuId) {
  return items
    .filter((item) => item.menuId === menuId)
    .reduce((quantity, item) => quantity + item.quantity, 0)
}

function getMenuTone(name) {
  if (name.includes('ICE')) return 'ice'
  if (name.includes('HOT')) return 'hot'
  return 'latte'
}

function App() {
  const [menuState, setMenuState] = useState({
    menus: [],
    loading: true,
    error: null,
  })
  const [reloadKey, setReloadKey] = useState(0)
  const [selectedOptions, setSelectedOptions] = useState({})
  const [cart, setCart] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState(null)
  const submittingRef = useRef(false)
  const cartRef = useRef([])

  useEffect(() => {
    let active = true

    api
      .getMenus()
      .then((menus) => {
        if (active) setMenuState({ menus, loading: false, error: null })
      })
      .catch((error) => {
        if (active) {
          setMenuState({ menus: [], loading: false, error: error.message })
        }
      })

    return () => {
      active = false
    }
  }, [reloadKey])

  const { menus, loading, error: menuError } = menuState
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0)
  const totalPrice = cart.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0,
  )
  const cartExceedsInventory = cart.some((item) => {
    const stock = menus.find((menu) => menu.id === item.menuId)?.stockQuantity
    return stock === undefined || getMenuQuantity(cart, item.menuId) > stock
  })

  function retryMenus() {
    setMenuState((current) => ({ ...current, loading: true, error: null }))
    setReloadKey((key) => key + 1)
  }

  function replaceCart(nextCart) {
    cartRef.current = nextCart
    setCart(nextCart)
  }

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
    const currentCart = cartRef.current
    if (getMenuQuantity(currentCart, menu.id) >= menu.stockQuantity) {
      setNotice({
        type: 'error',
        message: `${menu.name} 메뉴의 재고 한도(${menu.stockQuantity}개)에 도달했어요.`,
      })
      return
    }

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
    const existingItem = currentCart.find((item) => item.id === cartItemId)
    const nextCart = existingItem
      ? currentCart.map((item) =>
          item.id === cartItemId
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      : [
          ...currentCart,
          {
            id: cartItemId,
            menuId: menu.id,
            name: menu.name,
            options,
            quantity: 1,
            unitPrice,
          },
        ]

    replaceCart(nextCart)
    setNotice({ type: 'success', message: `${menu.name} 메뉴를 담았어요.` })
  }

  function changeQuantity(itemId, change) {
    const currentCart = cartRef.current
    const targetItem = currentCart.find((item) => item.id === itemId)
    if (!targetItem) return

    if (change > 0) {
      const stock = menus.find(
        (menu) => menu.id === targetItem.menuId,
      )?.stockQuantity
      if (
        stock === undefined ||
        getMenuQuantity(currentCart, targetItem.menuId) >= stock
      ) {
        setNotice({
          type: 'error',
          message: `${targetItem.name} 메뉴의 재고 한도에 도달했어요.`,
        })
        return
      }
    }

    replaceCart(
      currentCart
        .map((item) =>
          item.id === itemId
            ? { ...item, quantity: item.quantity + change }
            : item,
        )
        .filter((item) => item.quantity > 0),
    )
  }

  async function submitOrder() {
    const currentCart = cartRef.current
    if (currentCart.length === 0 || submittingRef.current) return

    submittingRef.current = true
    setSubmitting(true)
    setNotice({ type: 'info', message: '주문을 접수하고 있어요.' })

    try {
      const order = await api.createOrder(
        currentCart.map((item) => ({
          menuId: item.menuId,
          quantity: item.quantity,
          optionIds: item.options.map((option) => option.id),
        })),
      )

      replaceCart([])
      setNotice({
        type: 'success',
        message: `주문이 접수되었어요. 주문 번호 ${order.id.slice(0, 8)}`,
      })

      try {
        const updatedMenus = await api.getMenus()
        setMenuState({ menus: updatedMenus, loading: false, error: null })
      } catch {
        setNotice({
          type: 'success',
          message: `주문은 접수되었어요. 재고 정보를 새로고침하지 못했습니다. 주문 번호 ${order.id.slice(0, 8)}`,
        })
      }
    } catch (error) {
      setNotice({ type: 'error', message: error.message })
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  if (window.location.pathname === '/admin') {
    return <Admin />
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="COZY 홈">
          COZY<span className="brand__dot">.</span>
        </a>
        <nav className="main-nav" aria-label="주요 메뉴">
          <a
            className="main-nav__link main-nav__link--active"
            href="/"
            aria-current="page"
          >
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

          {loading && (
            <p className="notice notice--info" role="status">
              메뉴를 불러오는 중이에요.
            </p>
          )}
          {menuError && (
            <div className="notice notice--error" role="alert">
              <p>{menuError}</p>
              <button
                className="menu-retry-button"
                type="button"
                onClick={retryMenus}
              >
                다시 시도
              </button>
            </div>
          )}
          {!loading && !menuError && menus.length === 0 && (
            <p className="menu-empty" role="status">
              현재 주문 가능한 메뉴가 없습니다.
            </p>
          )}

          {!loading && !menuError && menus.length > 0 && (
            <div className="menu-grid">
              {menus.map((menu) => {
                const stockQuantity = menu.stockQuantity
                const cartQuantity = getMenuQuantity(cart, menu.id)
                const atStockLimit = cartQuantity >= stockQuantity
                const soldOut = stockQuantity === 0
                const tone = getMenuTone(menu.name)

                return (
                  <article className="menu-card" key={menu.id}>
                    <div
                      className={`menu-card__visual menu-card__visual--${tone}`}
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
                        <div className="menu-card__price-group">
                          <span className="menu-card__price">
                            {formatPrice(menu.price)}
                          </span>
                          <span className="menu-card__stock">
                            {soldOut ? '품절' : `재고 ${stockQuantity}개`}
                          </span>
                        </div>
                      </div>
                      <p className="menu-card__description">
                        {menu.description}
                      </p>

                      <fieldset className="option-list">
                        <legend className="sr-only">
                          {menu.name} 옵션 선택
                        </legend>
                        {menu.options.map((option) => {
                          const checked = (
                            selectedOptions[menu.id] ?? []
                          ).includes(option.id)

                          return (
                            <label className="option-row" key={option.id}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  toggleOption(menu.id, option.id)
                                }
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
                        disabled={atStockLimit}
                      >
                        <span aria-hidden="true">+</span>{' '}
                        {soldOut
                          ? '품절'
                          : atStockLimit
                            ? '재고 한도 도달'
                            : '담기'}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
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
                      role="group"
                      aria-label={`${item.name} 수량 ${item.quantity}`}
                    >
                      <button
                        className="cart-quantity-control__button"
                        type="button"
                        aria-label={`${item.name} 수량 줄이기`}
                        onClick={() => changeQuantity(item.id, -1)}
                      >
                        −
                      </button>
                      <button
                        className="cart-quantity-control__button"
                        type="button"
                        aria-label={`${item.name} 수량 늘리기`}
                        onClick={() => changeQuantity(item.id, 1)}
                        disabled={
                          getMenuQuantity(cart, item.menuId) >=
                          (menus.find((menu) => menu.id === item.menuId)
                            ?.stockQuantity ?? 0)
                        }
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
              {cartExceedsInventory && (
                <p className="cart-stock-warning" role="alert">
                  재고가 변경되어 담긴 수량이 남은 재고보다 많아요. 주문 전에
                  수량을 줄여 주세요.
                </p>
              )}
              <button
                className="button button--primary cart-summary__submit"
                type="button"
                onClick={submitOrder}
                disabled={
                  cart.length === 0 ||
                  submitting ||
                  loading ||
                  Boolean(menuError) ||
                  cartExceedsInventory
                }
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
