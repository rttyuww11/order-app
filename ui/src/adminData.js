export const ADMIN_STORAGE_KEY = 'cozy-admin-data-v1'

export const inventoryMenus = [
  { id: 'americano-ice', name: '아메리카노 (ICE)' },
  { id: 'americano-hot', name: '아메리카노 (HOT)' },
  { id: 'cafe-latte', name: '카페라떼' },
]

const orderStatuses = ['received', 'making', 'completed']

function createInitialData() {
  return {
    inventory: inventoryMenus.map((menu) => ({ ...menu, quantity: 10 })),
    orders: [],
  }
}

function isValidAdminData(data) {
  return (
    data &&
    Array.isArray(data.inventory) &&
    Array.isArray(data.orders) &&
    data.inventory.every(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        Number.isInteger(item.quantity) &&
        item.quantity >= 0,
    ) &&
    data.orders.every(
      (order) =>
        order &&
        typeof order.id === 'string' &&
        typeof order.createdAt === 'string' &&
        orderStatuses.includes(order.status) &&
        Array.isArray(order.items) &&
        Number.isFinite(order.totalPrice),
    )
  )
}

export function readAdminData() {
  const storedData = window.localStorage.getItem(ADMIN_STORAGE_KEY)

  if (storedData === null) {
    const initialData = createInitialData()
    window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(initialData))
    return initialData
  }

  const parsedData = JSON.parse(storedData)

  if (!isValidAdminData(parsedData)) {
    throw new Error('저장된 관리자 데이터의 형식이 올바르지 않아요.')
  }

  if (parsedData.orders.some((order) => order.id === 'sample-order-1')) {
    const migratedData = {
      ...parsedData,
      orders: parsedData.orders.filter(
        (order) => order.id !== 'sample-order-1',
      ),
    }
    window.localStorage.setItem(
      ADMIN_STORAGE_KEY,
      JSON.stringify(migratedData),
    )
    return migratedData
  }

  return parsedData
}

export function writeAdminData(data) {
  window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(data))
}
