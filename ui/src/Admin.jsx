import { useEffect, useState } from 'react'
import {
  ADMIN_STORAGE_KEY,
  readAdminData,
  writeAdminData,
} from './adminData.js'
import './Admin.css'

function formatPrice(price) {
  return `${price.toLocaleString('ko-KR')}원`
}

function formatOrderDate(date) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

function getInventoryStatus(quantity) {
  if (quantity === 0) return { label: '품절', tone: 'sold-out' }
  if (quantity < 5) return { label: '주의', tone: 'low' }
  return { label: '정상', tone: 'normal' }
}

function getOrderStatus(status) {
  if (status === 'making') return { label: '제조 중', tone: 'making' }
  if (status === 'completed') return { label: '제조 완료', tone: 'completed' }
  return { label: '주문 접수', tone: 'received' }
}

function createAdminState() {
  try {
    return { data: readAdminData(), error: null }
  } catch {
    return {
      data: null,
      error: '관리자 데이터를 불러오지 못했어요. 저장 공간을 확인한 뒤 다시 시도해 주세요.',
    }
  }
}

function Admin() {
  const [state, setState] = useState(createAdminState)
  const { data, error } = state

  useEffect(() => {
    function syncAdminData(event) {
      if (event.key !== ADMIN_STORAGE_KEY && event.key !== null) return

      try {
        setState({ data: readAdminData(), error: null })
      } catch {
        setState({
          data: null,
          error:
            '관리자 데이터를 불러오지 못했어요. 저장 공간을 확인한 뒤 다시 시도해 주세요.',
        })
      }
    }

    window.addEventListener('storage', syncAdminData)
    return () => window.removeEventListener('storage', syncAdminData)
  }, [])

  function saveData(nextData) {
    try {
      writeAdminData(nextData)
      setState({ data: nextData, error: null })
    } catch {
      setState((current) => ({
        ...current,
        error: '변경 사항을 저장하지 못했어요. 저장 공간을 확인해 주세요.',
      }))
    }
  }

  function changeInventory(menuId, amount) {
    if (!data) return

    saveData({
      ...data,
      inventory: data.inventory.map((menu) =>
        menu.id === menuId
          ? { ...menu, quantity: Math.max(0, menu.quantity + amount) }
          : menu,
      ),
    })
  }

  function advanceOrder(orderId) {
    if (!data) return

    saveData({
      ...data,
      orders: data.orders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status: order.status === 'received' ? 'making' : 'completed',
            }
          : order,
      ),
    })
  }

  function retryLoading() {
    setState(createAdminState())
  }

  const orders = data
    ? [...data.orders].sort(
        (first, second) =>
          new Date(second.createdAt).getTime() -
          new Date(first.createdAt).getTime(),
      )
    : []
  const summary = data
    ? [
        { id: 'total', label: '총 주문', count: data.orders.length },
        {
          id: 'received',
          label: '주문 접수',
          count: data.orders.filter((order) => order.status === 'received').length,
        },
        {
          id: 'making',
          label: '제조 중',
          count: data.orders.filter((order) => order.status === 'making').length,
        },
        {
          id: 'completed',
          label: '제조 완료',
          count: data.orders.filter((order) => order.status === 'completed').length,
        },
      ]
    : []

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="COZY 홈">
          COZY<span className="brand__dot">.</span>
        </a>
        <nav className="main-nav" aria-label="주요 메뉴">
          <a className="main-nav__link" href="/">
            주문하기
          </a>
          <a
            className="main-nav__link main-nav__link--active"
            href="/admin"
            aria-current="page"
          >
            관리자
          </a>
        </nav>
      </header>

      <main className="admin-main-content">
        <section className="admin-panel dashboard-panel" aria-labelledby="dashboard-title">
          <div className="admin-section-heading">
            <div>
              <p className="eyebrow">STORE OVERVIEW</p>
              <h1 id="dashboard-title">관리자 대시보드</h1>
            </div>
            <span className="admin-live-indicator">실시간 현황</span>
          </div>

          {error ? (
            <div className="admin-error" role="alert">
              <p>{error}</p>
              <button
                className="admin-retry-button"
                type="button"
                onClick={retryLoading}
              >
                다시 시도
              </button>
            </div>
          ) : (
            <>
              <div className="dashboard-grid">
                {summary.map((item) => (
                  <article
                    className={`dashboard-stat dashboard-stat--${item.id}`}
                    key={item.id}
                  >
                    <span className="dashboard-stat__label">{item.label}</span>
                    <strong className="dashboard-stat__count">
                      {item.count}
                      <span>건</span>
                    </strong>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="admin-panel inventory-panel" aria-labelledby="inventory-title">
          <div className="admin-section-heading">
            <div>
              <p className="eyebrow">INVENTORY</p>
              <h2 id="inventory-title">재고 현황</h2>
            </div>
            <span className="admin-section-caption">메뉴별 현재 재고</span>
          </div>

          {data && (
            <div className="inventory-grid">
              {data.inventory.map((menu) => {
                const status = getInventoryStatus(menu.quantity)

                return (
                  <article className="inventory-card" key={menu.id}>
                    <div className="inventory-card__top">
                      <h3>{menu.name}</h3>
                      <span
                        className={`inventory-status inventory-status--${status.tone}`}
                      >
                        {status.label}
                      </span>
                    </div>
                    <p className="inventory-card__quantity">
                      <strong>{menu.quantity}</strong>
                      <span>개</span>
                    </p>
                    <div
                      className="inventory-controls"
                      aria-label={`${menu.name} 재고 조정`}
                    >
                      <button
                        className="inventory-controls__button"
                        type="button"
                        aria-label={`${menu.name} 재고 줄이기`}
                        onClick={() => changeInventory(menu.id, -1)}
                        disabled={!data || menu.quantity === 0 || Boolean(error)}
                      >
                        −
                      </button>
                      <span>재고 조정</span>
                      <button
                        className="inventory-controls__button"
                        type="button"
                        aria-label={`${menu.name} 재고 늘리기`}
                        onClick={() => changeInventory(menu.id, 1)}
                        disabled={!data || Boolean(error)}
                      >
                        +
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="admin-panel orders-panel" aria-labelledby="orders-title">
          <div className="admin-section-heading">
            <div>
              <p className="eyebrow">ORDER MANAGEMENT</p>
              <h2 id="orders-title">주문 현황</h2>
            </div>
            {data && (
              <span className="admin-section-caption">
                총 {data.orders.length}건
              </span>
            )}
          </div>

          {data && data.orders.length === 0 ? (
            <div className="orders-empty">
              <span aria-hidden="true">☕</span>
              <p>접수된 주문이 없습니다.</p>
              <span>새로운 주문이 들어오면 이곳에 표시됩니다.</span>
            </div>
          ) : (
            data && (
              <ul className="order-list">
                {orders.map((order) => {
                  const status = getOrderStatus(order.status)

                  return (
                    <li className="order-card" key={order.id}>
                      <div className="order-card__header">
                        <div className="order-card__meta">
                          <span className="order-card__number">
                            주문 #
                            {order.id.startsWith('order-')
                              ? order.id.slice(6, 14)
                              : order.id}
                          </span>
                          <time
                            className="order-card__date"
                            dateTime={order.createdAt}
                          >
                            {formatOrderDate(order.createdAt)}
                          </time>
                        </div>
                        <span
                          className={`order-status order-status--${status.tone}`}
                        >
                          {status.label}
                        </span>
                      </div>

                      <div className="order-card__body">
                        <ul className="order-card__items">
                          {order.items.map((item, index) => (
                            <li
                              className="order-line"
                              key={`${order.id}-${item.id}-${index}`}
                            >
                              <div className="order-line__details">
                                <span className="order-line__name">
                                  {item.name} <span>× {item.quantity}</span>
                                </span>
                                {item.options?.length > 0 && (
                                  <span className="order-line__options">
                                    {item.options
                                      .map((option) => option.name)
                                      .join(' · ')}
                                  </span>
                                )}
                              </div>
                              <span className="order-line__price">
                                {formatPrice(item.unitPrice * item.quantity)}
                              </span>
                            </li>
                          ))}
                        </ul>

                        {order.status !== 'completed' && (
                          <button
                            className="button button--primary order-action"
                            type="button"
                            onClick={() => advanceOrder(order.id)}
                            disabled={Boolean(error)}
                          >
                            {order.status === 'received'
                              ? '제조 시작'
                              : '제조 완료'}
                          </button>
                        )}
                      </div>

                      <div className="order-card__footer">
                        <span>주문 금액</span>
                        <strong>{formatPrice(order.totalPrice)}</strong>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )
          )}
        </section>
      </main>

      {error && data && (
        <p className="admin-save-error" role="alert">
          {error}
        </p>
      )}

      <footer className="site-footer">
        <span>COZY COFFEE</span>
        <span>관리자 화면</span>
      </footer>
    </div>
  )
}

export default Admin
