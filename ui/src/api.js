const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

async function request(path, options = {}) {
  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
    
async function request(path, options = {}) {
  let response

  try {
    response = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('서버에 연결할 수 없습니다. 서버 상태를 확인해 주세요.')
    }
    throw error
  }

  let data
  try {
    data = await response.json()
  } catch {
    throw new Error('서버 응답을 읽을 수 없습니다. 잠시 후 다시 시도해 주세요.')
  }

  if (!response.ok) {
    throw new Error(
      data?.error?.message ?? '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    )
  }

  return data
}

export const api = {
  getMenus: () => request('/api/menus'),
  getAdminMenus: () => request('/api/admin/menus'),
  getAdminOrders: () => request('/api/admin/orders'),
  deleteAdminOrders: () =>
    request('/api/admin/orders', {
      method: 'DELETE',
    }),
  createOrder: (items) =>
    request('/api/orders', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
  changeStock: (menuId, delta) =>
    request(`/api/admin/menus/${menuId}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ delta }),
    }),
  changeOrderStatus: (orderId, status) =>
    request(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
}
