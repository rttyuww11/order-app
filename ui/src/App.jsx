import { useEffect, useRef, useState } from 'react'
import Admin from './Admin.jsx'
import {
  ADMIN_STORAGE_KEY,
  readAdminData,
  writeAdminData,
} from './adminData.js'
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
const inventoryLoadError =
  '재고 정보를 확인할 수 없어 메뉴를 담을 수 없어요. 관리자 화면에서 재고를 확인해 주세요.'

function loadInventory() {
  try {
    return { inventory: readAdminData().inventory, error: null }
  } catch {
    return { inventory: [], error: inventoryLoadError }
  }
}

function getMenuQuantity(items, menuId) {
  return items
    .filter((item) => item.menuId === menuId)
    .reduce((quantity, item) => quantity + item.quantity, 0)
}

function createAcceptedOrder(items, totalPrice) {
  return {
    id: `order-${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
    status: 'received',
    items,
    totalPrice,
  }
}

function App() {
  const [selectedOptions, setSelectedOptions] = useState({})
  const [cart, setCart] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState(null)
  const [inventoryState, setInventoryState] = useState(loadInventory)
  const submittingRef = useRef(false)
  const cartRef = useRef([])
  const { inventory, error: inventoryError } = inventoryState

  const cartCount = cart.reduce((count, item) => count + item.quantity, 0)
  const totalPrice = cart.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0,
  )
  const cartExceedsInventory = cart.some((item) => {
    const stock = inventory.find((menu) => menu.id === item.menuId)?.quantity
    const menuQuantity = getMenuQuantity(cart, item.menuId)

    return stock === undefined || menuQuantity > stock
  })

  useEffect(() => {
    function syncInventory(event) {
      if (event.key !== ADMIN_STORAGE_KEY && event.key !== null) return

      const nextInventory = loadInventory()
      setInventoryState(nextInventory)
      if (nextInventory.error) {
        setNotice({ type: 'error', message: nextInventory.error })
      }
    }

    window.addEventListener('storage', syncInventory)
    return () => window.removeEventListener('storage', syncInventory)
  }, [])

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
    let latestData
    try {
      latestData = readAdminData()
      setInventoryState({ inventory: latestData.inventory, error: null })
    } catch {
      setInventoryState({ inventory: [], error: inventoryLoadError })
      setNotice({ type: 'error', message: inventoryLoadError })
      return
    }

    const stock = latestData.inventory.find(
      (inventoryItem) => inventoryItem.id === menu.id,
    )?.quantity
    const currentMenuQuantity = getMenuQuantity(cartRef.current, menu.id)

    if (stock === undefined) {
      setNotice({
        type: 'error',
        message: `${menu.name} 메뉴의 재고 정보를 찾을 수 없어요.`,
      })
      return
    }

    if (currentMenuQuantity >= stock) {
      setNotice({
        type: 'error',
        message:
          stock === 0
            ? `${menu.name} 메뉴가 품절되었어요.`
            : `${menu.name} 메뉴의 재고 한도(${stock}개)에 도달했어요.`,
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

    const currentCart = cartRef.current
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
      let latestInventory
      try {
        latestInventory = readAdminData().inventory
        setInventoryState({ inventory: latestInventory, error: null })
      } catch {
        setInventoryState({ inventory: [], error: inventoryLoadError })
        setNotice({ type: 'error', message: inventoryLoadError })
        return
      }

      const stock = latestInventory.find(
        (menu) => menu.id === targetItem.menuId,
      )?.quantity
      const currentMenuQuantity = getMenuQuantity(
        currentCart,
        targetItem.menuId,
      )

      if (stock === undefined || currentMenuQuantity >= stock) {
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

  function submitOrder() {
    const currentCart = cartRef.current
    if (currentCart.length === 0 || submittingRef.current) return

    submittingRef.current = true
    setSubmitting(true)
    setNotice({ type: 'info', message: '주문을 접수하고 있어요.' })

    try {
      const adminData = readAdminData()
      const unavailableItem = currentCart.find((item) => {
        const stock = adminData.inventory.find(
          (inventoryItem) => inventoryItem.id === item.menuId,
        )?.quantity

        return (
          stock === undefined ||
          getMenuQuantity(currentCart, item.menuId) > stock
        )
      })

      if (unavailableItem) {
        setInventoryState({ inventory: adminData.inventory, error: null })
        setNotice({
          type: 'error',
          message: `${unavailableItem.name} 메뉴의 재고가 변경되었어요. 수량을 확인해 주세요.`,
        })
        return
      }

      const orderItems = currentCart.map((item) => ({
        menuId: item.menuId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        options: item.options.map(({ id, name, price }) => ({
          id,
          name,
          price,
        })),
      }))
      const orderTotalPrice = currentCart.reduce(
        (total, item) => total + item.unitPrice * item.quantity,
        0,
      )
      const nextData = {
        ...adminData,
        inventory: adminData.inventory.map((menu) => ({
          ...menu,
          quantity: menu.quantity - getMenuQuantity(currentCart, menu.id),
        })),
        orders: [
          createAcceptedOrder(orderItems, orderTotalPrice),
          ...adminData.orders,
        ],
      }

      writeAdminData(nextData)
      setInventoryState({ inventory: nextData.inventory, error: null })
      replaceCart([])
      setNotice({
        type: 'success',
        message: '주문이 접수되었어요. 관리자 주문 현황에 등록했습니다.',
      })
    } catch {
      setNotice({
        type: 'error',
        message: '주문을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.',
      })
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

          {inventoryError && (
            <p className="notice notice--error" role="alert">
              {inventoryError}
            </p>
          )}

          <div className="menu-grid">
            {menuItems.map((menu) => {
              const stockQuantity = inventory.find(
                (item) => item.id === menu.id,
              )?.quantity
              const cartQuantity = getMenuQuantity(cart, menu.id)
              const atStockLimit =
                stockQuantity === undefined || cartQuantity >= stockQuantity

              return (
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
                      <div className="menu-card__price-group">
                        <span className="menu-card__price">
                          {formatPrice(menu.price)}
                        </span>
                        <span className="menu-card__stock">
                          {inventoryError
                            ? '재고 확인 불가'
                            : `재고 ${stockQuantity ?? '-'}개`}
                        </span>
                      </div>
                    </div>
                    <p className="menu-card__description">{menu.description}</p>

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
                      disabled={Boolean(inventoryError) || atStockLimit}
                    >
                      <span aria-hidden="true">+</span>{' '}
                      {inventoryError
                        ? '재고 확인'
                        : stockQuantity === 0
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
                        disabled={
                          getMenuQuantity(cart, item.menuId) >=
                          (inventory.find(
                            (inventoryItem) => inventoryItem.id === item.menuId,
                          )?.quantity ?? 0)
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
                  Boolean(inventoryError) ||
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
