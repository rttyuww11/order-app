import { useEffect, useState } from 'react'
import { api } from './api.js'
import './Admin.css'

const formatPrice = (price) => `${price.toLocaleString('ko-KR')}원`

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
  if (status === 'PREPARING') return { label: '제조 중', tone: 'making' }
  if (status === 'COMPLETED') return { label: '제조 완료', tone: 'completed' }
  return { label: '주문 접수', tone: 'received' }
}

function summarizeOrders(orders) {
  return {
    total: orders.length,
    received: orders.filter((order) => order.status === 'RECEIVED').length,
    preparing: orders.filter((order) => order.status === 'PREPARING').length,
    completed: orders.filter((order) => order.status === 'COMPLETED').length,
  }
}

function Admin() {
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: null,
  })
  const [reloadKey, setReloadKey] = useState(0)
  const [busyMenuIds, setBusyMenuIds] = useState([])
  const [busyOrderIds, setBusyOrderIds] = useState([])
  const [deletingOrders, setDeletingOrders] = useState(false)
  const [notice, setNotice] = useState(null)
  const { data, loading, error } = state

  function retryLoading() {
    setState((current) => ({ ...current, loading: true, error: null }))
    setReloadKey((key) => key + 1)
  }

  useEffect(() => {
    let active = true

    Promise.all([api.getAdminMenus(), api.getAdminOrders()])
      .then(([menus, orderData]) => {
        if (active) {
          setState({
            data: { menus, orders: orderData.orders, summary: orderData.summary },
            loading: false,
            error: null,
          })
        }
      })
      .catch((loadError) => {
        if (active) {
          setState({ data: null, loading: false, error: loadError.message })
        }
      })

    return () => {
      active = false
    }
  }, [reloadKey])

  async function changeInventory(menuId, delta) {
    if (!data || busyMenuIds.includes(menuId)) return

    setBusyMenuIds((ids) => [...ids, menuId])
    setNotice(null)

    try {
      const updatedMenu = await api.changeStock(menuId, delta)
      setState((current) => ({
        ...current,
        data: {
          ...current.data,
          menus: current.data.menus.map((menu) =>
            menu.id === updatedMenu.id ? updatedMenu : menu,
          ),
        },
      }))
      setNotice({ type: 'success', message: '재고를 변경했어요.' })
    } catch (updateError) {
      setNotice({ type: 'error', message: updateError.message })
    } finally {
      setBusyMenuIds((ids) => ids.filter((id) => id !== menuId))
    }
  }

  async function advanceOrder(order) {
    if (deletingOrders || busyOrderIds.includes(order.id)) return
    const nextStatus =
      order.status === 'RECEIVED' ? 'PREPARING' : 'COMPLETED'

    setBusyOrderIds((ids) => [...ids, order.id])
    setNotice(null)

    try {
      const updatedOrder = await api.changeOrderStatus(order.id, nextStatus)
      setState((current) => {
        const orders = current.data.orders.map((currentOrder) =>
          currentOrder.id === updatedOrder.id ? updatedOrder : currentOrder,
        )
        return {
          ...current,
          data: {
            ...current.data,
            orders,
            summary: summarizeOrders(orders),
          },
        }
      })
      setNotice({ type: 'success', message: '주문 상태를 변경했어요.' })
    } catch (updateError) {
      setNotice({ type: 'error', message: updateError.message })
    } finally {
      setBusyOrderIds((ids) => ids.filter((id) => id !== order.id))
    }
  }

  async function deleteAllOrders() {
    if (!data || data.orders.length === 0 || deletingOrders || busyOrderIds.length > 0) {
      return
    }
    if (!window.confirm('주문 현황의 모든 주문을 삭제할까요? 삭제한 주문은 복구할 수 없습니다.')) {
      return
    }

    setDeletingOrders(true)
    setNotice(null)

    try {
      const result = await api.deleteAdminOrders()
      setState((current) => ({
        ...current,
        data: {
          ...current.data,
          orders: [],
          summary: summarizeOrders([]),
        },
      }))
      setNotice({
        type: 'success',
        message: `${result.deletedCount}건의 주문을 삭제했어요.`,
      })
    } catch (deleteError) {
      setNotice({ type: 'error', message: deleteError.message })
    } finally {
      setDeletingOrders(false)
    }
  }

  const summary = data
    ? [
        { id: 'total', label: '총 주문', count: data.summary.total },
        { id: 'received', label: '주문 접수', count: data.summary.received },
        { id: 'making', label: '제조 중', count: data.summary.preparing },
        { id: 'completed', label: '제조 완료', count: data.summary.completed },
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
        <section
          className="admin-panel dashboard-panel"
          aria-labelledby="dashboard-title"
        >
          <div className="admin-section-heading">
            <div>
              <p className="eyebrow">STORE OVERVIEW</p>
              <h1 id="dashboard-title">관리자 대시보드</h1>
            </div>
            <span className="admin-live-indicator">주문 현황</span>
          </div>

          {loading && <p role="status">관리자 데이터를 불러오는 중이에요.</p>}
          {error && (
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
          )}
          {data && (
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
          )}
        </section>

        <section
          className="admin-panel inventory-panel"
          aria-labelledby="inventory-title"
        >
          <div className="admin-section-heading">
            <div>
              <p className="eyebrow">INVENTORY</p>
              <h2 id="inventory-title">재고 현황</h2>
            </div>
            <span className="admin-section-caption">메뉴별 현재 재고</span>
          </div>

          {data && data.menus.length === 0 && (
            <p className="orders-empty">등록된 메뉴가 없습니다.</p>
          )}
          {data && data.menus.length > 0 && (
            <div className="inventory-grid">
              {data.menus.map((menu) => {
                const status = getInventoryStatus(menu.stockQuantity)
                const busy = busyMenuIds.includes(menu.id)

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
                      <output className="inventory-card__count">
                        {menu.stockQuantity}
                      </output>
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
                        disabled={busy || menu.stockQuantity === 0}
                      >
                        −
                      </button>
                      <span>{busy ? '저장 중' : '재고 조정'}</span>
                      <button
                        className="inventory-controls__button"
                        type="button"
                        aria-label={`${menu.name} 재고 늘리기`}
                        onClick={() => changeInventory(menu.id, 1)}
                        disabled={busy}
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

        <section
          className="admin-panel orders-panel"
          aria-labelledby="orders-title"
        >
          <div className="admin-section-heading">
            <div>
              <p className="eyebrow">ORDER MANAGEMENT</p>
              <h2 id="orders-title">주문 현황</h2>
            </div>
            <div className="orders-heading-actions">
              {data && (
                <span className="admin-section-caption">
                  총 {data.orders.length}건
                </span>
              )}
              <button
                className="button button--danger"
                type="button"
                onClick={deleteAllOrders}
                disabled={
                  !data ||
                  data.orders.length === 0 ||
                  deletingOrders ||
                  busyOrderIds.length > 0
                }
              >
                {deletingOrders ? '삭제 중...' : '전체 삭제'}
              </button>
            </div>
          </div>

          {data && data.orders.length === 0 && (
            <div className="orders-empty">
              <span aria-hidden="true">☕</span>
              <p>접수된 주문이 없습니다.</p>
              <span>새로운 주문이 들어오면 이곳에 표시됩니다.</span>
            </div>
          )}
          {data && data.orders.length > 0 && (
            <ul className="order-list">
              {data.orders.map((order) => {
                const status = getOrderStatus(order.status)
                const busy = busyOrderIds.includes(order.id)

                return (
                  <li className="order-card" key={order.id}>
                    <div className="order-card__header">
                      <div className="order-card__meta">
                        <span className="order-card__number">
                          주문 #{order.id.slice(0, 8)}
                        </span>
                        <time
                          className="order-card__date"
                          dateTime={order.orderedAt}
                        >
                          {formatOrderDate(order.orderedAt)}
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
                        {order.items.map((item) => (
                          <li
                            className="order-line"
                            key={item.id}
                          >
                            <div className="order-line__details">
                              <span className="order-line__name">
                                {item.name} <span>× {item.quantity}</span>
                              </span>
                              {item.options.length > 0 && (
                                <span className="order-line__options">
                                  {item.options
                                    .map((option) => option.name)
                                    .join(' · ')}
                                </span>
                              )}
                            </div>
                            <span className="order-line__price">
                              {formatPrice(item.itemAmount)}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {order.status !== 'COMPLETED' && (
                        <button
                          className="button button--primary order-action"
                          type="button"
                          onClick={() => advanceOrder(order)}
                          disabled={busy}
                        >
                          {busy
                            ? '변경 중...'
                            : order.status === 'RECEIVED'
                              ? '제조 시작'
                              : '제조 완료'}
                        </button>
                      )}
                    </div>

                    <div className="order-card__footer">
                      <span>주문 금액</span>
                      <strong>{formatPrice(order.totalAmount)}</strong>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {notice && (
          <p
            className={`notice notice--${notice.type}`}
            role={notice.type === 'error' ? 'alert' : 'status'}
          >
            {notice.message}
          </p>
        )}
      </main>

      <footer className="site-footer">
        <span>COZY COFFEE</span>
        <span>관리자 화면</span>
      </footer>
    </div>
  )
}

export default Admin
